-- The application uses the public Supabase publishable key and a signed-in
-- user's JWT. Never expose a service-role key in the browser.
begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create schema if not exists airstethics_private;
revoke all on schema airstethics_private from public, anon, authenticated;

create table public.listings (
  id text primary key,
  owner_id uuid references auth.users(id),
  is_demo boolean not null default false,
  request_id uuid,
  request_fingerprint text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint listing_owner check (is_demo or owner_id is not null),
  constraint listing_request check (is_demo or (request_id is not null and request_fingerprint is not null)),
  unique (owner_id, request_id),
  constraint listing_payload check (
    jsonb_typeof(data) = 'object' and data ->> 'id' = id
    and not (data ? 'services')
  )
);

create table public.services (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 200),
  description text not null check (char_length(btrim(description)) between 1 and 5000),
  duration integer not null check (duration between 1 and 540),
  price numeric(10, 2) not null check (price between 0.01 and 10000),
  unique (listing_id, id)
);
create index services_listing_id_idx on public.services(listing_id);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references public.listings(id),
  service_id text not null,
  listing_name text not null,
  listing_image text not null,
  city text not null,
  service_name text not null,
  booking_date date not null,
  booking_time time without time zone not null,
  duration integer not null check (duration between 1 and 540),
  price numeric(10, 2) not null check (price between 0.01 and 10000),
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 200),
  guest_email text not null check (char_length(guest_email) between 3 and 254),
  created_at timestamptz not null default now(),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  foreign key (listing_id, service_id) references public.services(listing_id, id),
  check (ends_at > starts_at),
  constraint no_overlapping_bookings exclude using gist (
    listing_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);
create index bookings_customer_id_idx on public.bookings(customer_id, created_at desc);
create index bookings_availability_idx on public.bookings(listing_id, booking_date)
  where status = 'confirmed';

alter table public.listings enable row level security;
alter table public.services enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;

-- Every listing in this initial model is published. Business moderation and
-- private drafts can be added with an explicit visibility policy later.
create policy listings_public_read on public.listings for select to anon, authenticated using (true);
create policy services_public_read on public.services for select to anon, authenticated using (true);
create policy favorites_own_read on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy favorites_own_insert on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy favorites_own_delete on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));
create policy bookings_customer_read on public.bookings for select to authenticated
  using (customer_id = (select auth.uid()));

-- Mutations use narrow functions; clients cannot edit another user's records,
-- fabricate reviews/ratings, change a price snapshot, or bypass the slot lock.
revoke all on public.listings, public.services, public.favorites, public.bookings from anon, authenticated;
grant select on public.listings, public.services to anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.bookings to authenticated;

create function airstethics_private.required_text(
  p_value jsonb, p_min integer, p_max integer, p_field text
) returns text
language plpgsql set search_path = '' as $$
declare result text;
begin
  if jsonb_typeof(p_value) is distinct from 'string' then
    raise exception 'Please provide a valid %.', p_field using errcode = '22023';
  end if;
  result := btrim(p_value #>> '{}');
  if char_length(result) not between p_min and p_max then
    raise exception 'Please provide a valid %.', p_field using errcode = '22023';
  end if;
  return result;
end;
$$;
revoke all on function airstethics_private.required_text(jsonb, integer, integer, text) from public, anon, authenticated;

create function airstethics_private.text_array(
  p_value jsonb, p_max_count integer, p_max_length integer, p_field text
) returns jsonb
language plpgsql set search_path = '' as $$
declare item jsonb; result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_value) is distinct from 'array' then
    raise exception 'Please provide valid %.', p_field using errcode = '22023';
  end if;
  if jsonb_array_length(p_value) > p_max_count then
    raise exception 'Too many %.', p_field using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_value) loop
    result := result || jsonb_build_array(airstethics_private.required_text(item, 1, p_max_length, p_field));
  end loop;
  return result;
end;
$$;
revoke all on function airstethics_private.text_array(jsonb, integer, integer, text) from public, anon, authenticated;

create function public.create_listing(p_listing jsonb)
returns public.listings
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  listing_id text := gen_random_uuid()::text;
  request_key uuid;
  request_hash text;
  saved public.listings;
  payload jsonb;
  service_payload jsonb;
  service_name text;
  service_description text;
  service_duration numeric;
  service_price numeric;
  category text;
  city text;
  latitude numeric;
  longitude numeric;
  images jsonb;
begin
  if account_id is null then
    raise exception 'Sign in to list your space.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_listing) is distinct from 'object' or octet_length(p_listing::text) > 100000 then
    raise exception 'Please provide a valid listing.' using errcode = '22023';
  end if;
  if coalesce(p_listing ->> 'id', '') !~ '^(local-)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'Please create a new listing request and try again.' using errcode = '22023';
  end if;
  request_key := regexp_replace(p_listing ->> 'id', '^local-', '')::uuid;
  request_hash := md5(p_listing::text);
  select * into saved from public.listings l
    where l.owner_id = account_id and l.request_id = request_key;
  if found then
    if saved.request_fingerprint <> request_hash then
      raise exception 'This listing request changed. Please try again with a new request.' using errcode = '23505';
    end if;
    return saved;
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
  payload := jsonb_build_object(
    'id', listing_id,
    'name', airstethics_private.required_text(p_listing -> 'name', 2, 200, 'space name'),
    'category', category,
    'city', city,
    'neighborhood', airstethics_private.required_text(p_listing -> 'neighborhood', 1, 200, 'neighbourhood'),
    'coordinates', jsonb_build_object('lat', latitude, 'lng', longitude),
    'description', airstethics_private.required_text(p_listing -> 'description', 20, 10000, 'description'),
    'image', airstethics_private.required_text(p_listing -> 'image', 1, 2048, 'image'),
    'images', images,
    'amenities', airstethics_private.text_array(p_listing -> 'amenities', 100, 200, 'amenities'),
    'rating', 0,
    'reviewCount', 0,
    'reviews', '[]'::jsonb,
    'tag', 'New on airstethics',
    'professional', jsonb_build_object(
      'name', airstethics_private.required_text(p_listing #> '{professional,name}', 2, 200, 'professional name'),
      'title', category || ' professional',
      'avatar', airstethics_private.required_text(p_listing #> '{professional,avatar}', 1, 2048, 'professional image')
    )
  );
  if jsonb_typeof(p_listing -> 'services') is distinct from 'array' then
    raise exception 'Include at least one service.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_listing -> 'services') not between 1 and 100 then
    raise exception 'Include between one and 100 services.' using errcode = '22023';
  end if;
  insert into public.listings(id, owner_id, is_demo, request_id, request_fingerprint, data)
    values (listing_id, account_id, false, request_key, request_hash, payload) returning * into saved;
  for service_payload in select value from jsonb_array_elements(p_listing -> 'services') loop
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
    insert into public.services(id, listing_id, name, description, duration, price)
      values (gen_random_uuid()::text, listing_id, service_name, service_description, service_duration::integer, service_price);
  end loop;
  return saved;
exception
  when unique_violation then
    -- Two simultaneous retries can both miss the initial lookup. The unique
    -- request key makes the second insert wait for the first transaction.
    select * into saved from public.listings l
      where l.owner_id = account_id and l.request_id = request_key;
    if not found or saved.request_fingerprint <> request_hash then
      raise exception 'This listing request cannot be reused. Please try again.' using errcode = '23505';
    end if;
    return saved;
end;
$$;

create function public.create_booking(
  p_listing_id text, p_service_id text, p_date date, p_time time without time zone,
  p_guest_name text, p_guest_email text, p_id uuid
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  existing public.bookings;
  listing public.listings;
  service public.services;
  saved public.bookings;
  starts_at timestamptz;
  ends_at timestamptz;
  local_today date := (clock_timestamp() at time zone 'America/Edmonton')::date;
  guest_name text := btrim(p_guest_name);
  guest_email text := btrim(p_guest_email);
begin
  if account_id is null then
    raise exception 'Sign in to book an appointment.' using errcode = '42501';
  end if;
  if p_id is null or p_listing_id is null or p_service_id is null or p_date is null or p_time is null
    or guest_name is null or char_length(guest_name) not between 2 and 200
    or guest_email is null or char_length(guest_email) > 254
    or guest_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Choose a service, day and time, and enter a valid name and email.' using errcode = '22023';
  end if;
  -- A caller-generated UUID makes a retry after a lost response idempotent.
  -- It must identify exactly this customer's original request.
  select * into existing from public.bookings where id = p_id;
  if found then
    if existing.customer_id <> account_id or existing.listing_id <> p_listing_id
      or existing.service_id <> p_service_id or existing.booking_date <> p_date
      or existing.booking_time <> p_time or existing.guest_name <> guest_name
      or existing.guest_email <> guest_email then
      raise exception 'This booking request cannot be reused. Please try again.' using errcode = '23505';
    end if;
    return existing;
  end if;
  select * into listing from public.listings where id = p_listing_id;
  select * into service from public.services where id = p_service_id and listing_id = p_listing_id;
  if listing.id is null or service.id is null then
    raise exception 'This service is no longer available.' using errcode = '22023';
  end if;
  if p_date < local_today or p_date > local_today + 90
    or p_time < time '09:00' or p_time > time '17:00'
    or extract(minute from p_time) <> 0 or extract(second from p_time) <> 0
    or extract(epoch from p_time) / 60 + service.duration > 18 * 60 then
    raise exception 'Choose an available appointment within the next 90 days, from 9 AM to 6 PM Alberta time.' using errcode = '22023';
  end if;
  starts_at := (p_date + p_time) at time zone 'America/Edmonton';
  ends_at := starts_at + service.duration * interval '1 minute';
  if starts_at <= clock_timestamp() then
    raise exception 'That appointment time has already passed. Choose a future time.' using errcode = '22023';
  end if;
  insert into public.bookings(
    id, customer_id, listing_id, service_id, listing_name, listing_image, city,
    service_name, booking_date, booking_time, duration, price, guest_name, guest_email,
    starts_at, ends_at
  ) values (
    p_id, account_id, listing.id, service.id, listing.data ->> 'name', listing.data ->> 'image',
    listing.data ->> 'city', service.name, p_date, p_time, service.duration, service.price,
    guest_name, guest_email, starts_at, ends_at
  ) returning * into saved;
  return saved;
exception
  when exclusion_violation then
    select * into existing from public.bookings where id = p_id;
    if found and existing.customer_id = account_id and existing.listing_id = p_listing_id
      and existing.service_id = p_service_id and existing.booking_date = p_date
      and existing.booking_time = p_time and existing.guest_name = guest_name
      and existing.guest_email = guest_email then
      return existing;
    end if;
    raise exception 'That time was just booked. Please choose another appointment time.' using errcode = '23P01';
  when unique_violation then
    select * into existing from public.bookings where id = p_id;
    if not found or existing.customer_id <> account_id or existing.listing_id <> p_listing_id
      or existing.service_id <> p_service_id or existing.booking_date <> p_date
      or existing.booking_time <> p_time or existing.guest_name <> guest_name
      or existing.guest_email <> guest_email then
      raise exception 'This booking request cannot be reused. Please try again.' using errcode = '23505';
    end if;
    return existing;
end;
$$;

create function public.cancel_booking(p_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); saved public.bookings;
begin
  if account_id is null then
    raise exception 'Sign in to manage your appointment.' using errcode = '42501';
  end if;
  update public.bookings set status = 'cancelled'
    where id = p_id and customer_id = account_id returning * into saved;
  if not found then
    raise exception 'This appointment was not found in your account.' using errcode = '42501';
  end if;
  return saved;
end;
$$;

create function public.listing_availability(p_listing_id text, p_date date)
returns table (booking_time time without time zone, duration integer)
language sql stable security definer set search_path = '' as $$
  select b.booking_time, b.duration
  from public.bookings b
  where b.listing_id = p_listing_id and b.booking_date = p_date and b.status = 'confirmed'
    and p_date between (now() at time zone 'America/Edmonton')::date
      and (now() at time zone 'America/Edmonton')::date + 90
  order by b.booking_time;
$$;

-- Functions are executable by PUBLIC by default in PostgreSQL. Remove that
-- implicit grant, including for helper functions in the private schema.
revoke all on function public.create_listing(jsonb) from public, anon, authenticated;
revoke all on function public.create_booking(text, text, date, time without time zone, text, text, uuid) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
revoke all on function public.listing_availability(text, date) from public, anon, authenticated;
grant execute on function public.create_listing(jsonb) to authenticated;
grant execute on function public.create_booking(text, text, date, time without time zone, text, text, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.listing_availability(text, date) to anon, authenticated;

comment on table public.bookings is 'Private customer data. Public availability exposes only times and durations.';
comment on column public.listings.data is 'Public listing payload excluding services. Ratings and reviews are server controlled.';
comment on constraint no_overlapping_bookings on public.bookings is 'One appointment at a time per listing, independent of service or customer; cancelled appointments release the slot.';

commit;
