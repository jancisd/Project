-- Host access is derived from the signed-in account, never from a caller's
-- claimed owner ID. Existing listings and appointment snapshots stay intact.
begin;

create index if not exists listings_owner_id_created_at_idx
  on public.listings(owner_id, created_at desc) where not is_demo;
create index if not exists bookings_listing_id_created_at_idx
  on public.bookings(listing_id, created_at desc);

create or replace function public.get_host_dashboard()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'data', l.data, 'is_demo', l.is_demo,
        'services', coalesce((
          select jsonb_agg(to_jsonb(s) order by s.id)
          from public.services s where s.listing_id = l.id
        ), '[]'::jsonb)
      ) order by l.created_at, l.id)
      from public.listings l where l.owner_id = auth.uid() and not l.is_demo
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.booking_date, b.booking_time, b.created_at)
      from public.bookings b join public.listings l on l.id = b.listing_id
      where l.owner_id = auth.uid() and not l.is_demo
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- Both entry points share an account lock. A double click or two browser tabs
-- cannot accidentally create two first spaces. The original request key still
-- handles ambiguous network responses and retries after a later listing edit.
create or replace function airstethics_private.create_owned_listing(
  p_listing jsonb, p_additional boolean
) returns public.listings
language plpgsql security definer set search_path = '' as $$
declare request_key uuid;
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_listing) is distinct from 'object'
    or coalesce(p_listing ->> 'id', '') !~ '^(local-)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'Please create a new listing request and try again.' using errcode = '22023';
  end if;
  request_key := regexp_replace(p_listing ->> 'id', '^local-', '')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'airstethics:listing-owner:' || auth.uid()::text, 0
  ));
  if not p_additional
    and exists (select 1 from public.listings where owner_id = auth.uid() and not is_demo)
    and not exists (select 1 from public.listings where owner_id = auth.uid() and request_id = request_key) then
    raise exception 'Your account already has a space. Manage it or choose Add another location.' using errcode = '23514';
  end if;
  return airstethics_private.create_listing(p_listing);
end;
$$;
revoke all on function airstethics_private.create_owned_listing(jsonb, boolean) from public, anon, authenticated;

create or replace function public.create_listing(p_listing jsonb)
returns public.listings
language plpgsql security definer set search_path = '' as $$
begin
  return airstethics_private.create_owned_listing(p_listing, false);
end;
$$;

create or replace function public.create_additional_listing(p_listing jsonb)
returns public.listings
language plpgsql security definer set search_path = '' as $$
begin
  return airstethics_private.create_owned_listing(p_listing, true);
end;
$$;

create or replace function public.update_listing(p_listing_id text, p_listing jsonb)
returns public.listings
language plpgsql security definer set search_path = '' as $$
declare
  saved public.listings;
  payload jsonb;
  category text;
  city text;
  latitude numeric;
  longitude numeric;
  images jsonb;
  service_payload jsonb;
  service_id text;
  service_name text;
  service_description text;
  service_duration numeric;
  service_price numeric;
  seen_service_ids text[] := array[]::text[];
  existing_service_count integer;
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  select * into saved from public.listings
    where id = p_listing_id and owner_id = auth.uid() and not is_demo for update;
  if not found then
    raise exception 'This space was not found in your account.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_listing) is distinct from 'object'
    or octet_length(p_listing::text) > 100000
    or (p_listing ->> 'id') is distinct from p_listing_id then
    raise exception 'Please provide a valid listing.' using errcode = '22023';
  end if;
  category := airstethics_private.required_text(p_listing -> 'category', 1, 100, 'category');
  city := airstethics_private.required_text(p_listing -> 'city', 1, 100, 'city');
  if category not in ('Hair', 'Nails', 'Skin', 'Brows & lashes', 'Massage', 'Makeup')
    or city not in ('Edmonton', 'Calgary', 'Canmore') then
    raise exception 'Choose a supported category and Alberta city.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_listing #> '{coordinates,lat}') is distinct from 'number'
    or jsonb_typeof(p_listing #> '{coordinates,lng}') is distinct from 'number' then
    raise exception 'Choose and confirm your location.' using errcode = '22023';
  end if;
  latitude := (p_listing #>> '{coordinates,lat}')::numeric;
  longitude := (p_listing #>> '{coordinates,lng}')::numeric;
  if not (
    (city = 'Edmonton' and latitude between 53.3 and 53.8 and longitude between -113.85 and -113.2)
    or (city = 'Calgary' and latitude between 50.8 and 51.3 and longitude between -114.4 and -113.8)
    or (city = 'Canmore' and latitude between 51 and 51.18 and longitude between -115.5 and -115.2)
  ) then
    raise exception 'Choose a location near the selected city.' using errcode = '22023';
  end if;
  images := airstethics_private.text_array(p_listing -> 'images', 100, 2048, 'images');
  if jsonb_array_length(images) = 0 then
    raise exception 'Include at least one listing image.' using errcode = '22023';
  end if;
  -- Merge only editable fields into the server record. Ratings, reviews, tags,
  -- owner, request fingerprint, and creation time are never taken from input.
  payload := saved.data || jsonb_build_object(
    'id', saved.id,
    'name', airstethics_private.required_text(p_listing -> 'name', 2, 200, 'space name'),
    'category', category,
    'city', city,
    'neighborhood', airstethics_private.required_text(p_listing -> 'neighborhood', 1, 200, 'neighbourhood'),
    'coordinates', jsonb_build_object('lat', latitude, 'lng', longitude),
    'description', airstethics_private.required_text(p_listing -> 'description', 20, 10000, 'description'),
    'image', airstethics_private.required_text(p_listing -> 'image', 1, 2048, 'image'),
    'images', images,
    'amenities', airstethics_private.text_array(p_listing -> 'amenities', 100, 200, 'amenities'),
    'professional', jsonb_build_object(
      'name', airstethics_private.required_text(p_listing #> '{professional,name}', 2, 200, 'professional name'),
      'title', category || ' professional',
      'avatar', airstethics_private.required_text(p_listing #> '{professional,avatar}', 1, 2048, 'professional image')
    )
  );
  if jsonb_typeof(p_listing -> 'services') is distinct from 'array' then
    raise exception 'Include the services for this space.' using errcode = '22023';
  end if;
  select count(*) into existing_service_count from public.services where listing_id = saved.id;
  if jsonb_array_length(p_listing -> 'services') <> existing_service_count
    or existing_service_count not between 1 and 100 then
    raise exception 'Keep the existing services when editing your space.' using errcode = '22023';
  end if;
  for service_payload in select value from jsonb_array_elements(p_listing -> 'services') loop
    service_id := airstethics_private.required_text(service_payload -> 'id', 1, 200, 'service');
    if service_id = any(seen_service_ids) or not exists (
      select 1 from public.services s where s.id = service_id and s.listing_id = saved.id
    ) then
      raise exception 'Choose the existing services for this space.' using errcode = '22023';
    end if;
    seen_service_ids := array_append(seen_service_ids, service_id);
    service_name := airstethics_private.required_text(service_payload -> 'name', 2, 200, 'service name');
    service_description := airstethics_private.required_text(service_payload -> 'description', 1, 5000, 'service description');
    if jsonb_typeof(service_payload -> 'duration') is distinct from 'number'
      or jsonb_typeof(service_payload -> 'price') is distinct from 'number' then
      raise exception 'Enter a valid service duration and price.' using errcode = '22023';
    end if;
    service_duration := (service_payload ->> 'duration')::numeric;
    service_price := (service_payload ->> 'price')::numeric;
    if service_duration not between 1 and 540 or trunc(service_duration) <> service_duration
      or service_price not between 5 and 1000 or round(service_price, 2) <> service_price then
      raise exception 'Enter a whole-minute duration and a price from $5 to $1,000 (up to two decimal places).' using errcode = '22023';
    end if;
    update public.services set name = service_name, description = service_description,
      duration = service_duration::integer, price = service_price
      where id = service_id and listing_id = saved.id;
  end loop;
  update public.listings set data = payload where id = saved.id returning * into saved;
  return saved;
end;
$$;

create or replace function public.host_cancel_booking(p_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare saved public.bookings;
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  update public.bookings b set status = 'cancelled'
    where b.id = p_id and exists (
      select 1 from public.listings l
      where l.id = b.listing_id and l.owner_id = auth.uid() and not l.is_demo
    ) returning b.* into saved;
  if not found then
    raise exception 'This appointment was not found for your space.' using errcode = '42501';
  end if;
  return saved;
end;
$$;

-- An edit changes the profile and normalized services in one transaction.
-- Acquire a compatible read lock before the existing booking implementation
-- reads either record, so its immutable snapshot is entirely before or after
-- an edit, never a mixture. Concurrent bookings can hold SHARE together.
create or replace function public.create_booking(
  p_listing_id text, p_service_id text, p_date date, p_time time without time zone,
  p_guest_name text, p_guest_email text, p_id uuid
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  perform 1 from public.listings where id = p_listing_id for share;
  return airstethics_private.create_booking(
    p_listing_id, p_service_id, p_date, p_time, p_guest_name, p_guest_email, p_id
  );
end;
$$;

revoke all on function public.get_host_dashboard() from public, anon, authenticated;
revoke all on function public.create_listing(jsonb) from public, anon, authenticated;
revoke all on function public.create_additional_listing(jsonb) from public, anon, authenticated;
revoke all on function public.update_listing(text, jsonb) from public, anon, authenticated;
revoke all on function public.host_cancel_booking(uuid) from public, anon, authenticated;
revoke all on function public.create_booking(text, text, date, time without time zone, text, text, uuid) from public, anon, authenticated;
grant execute on function public.get_host_dashboard() to authenticated;
grant execute on function public.create_listing(jsonb) to authenticated;
grant execute on function public.create_additional_listing(jsonb) to authenticated;
grant execute on function public.update_listing(text, jsonb) to authenticated;
grant execute on function public.host_cancel_booking(uuid) to authenticated;
grant execute on function public.create_booking(text, text, date, time without time zone, text, text, uuid) to authenticated;

comment on table public.bookings is 'Private appointment data readable by its customer and, through the authenticated host dashboard, the account owning its space. Public availability exposes only times and durations.';

commit;
