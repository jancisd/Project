-- Accounts can use a password without MFA. Once an authenticator is verified,
-- sensitive account operations require a Supabase AAL2 access token, including
-- requests made directly to PostgREST or Storage rather than through the app.
begin;

create or replace function public.account_has_required_assurance()
returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    )
  );
$$;
revoke all on function public.account_has_required_assurance() from public, anon, authenticated;
grant execute on function public.account_has_required_assurance() to authenticated;

-- Restrictive policies add an assurance requirement to the existing ownership
-- policies. They never grant access to another customer's records.
drop policy if exists favorites_require_account_assurance on public.favorites;
create policy favorites_require_account_assurance on public.favorites
as restrictive for all to authenticated
using ((select public.account_has_required_assurance()))
with check ((select public.account_has_required_assurance()));

drop policy if exists bookings_require_account_assurance on public.bookings;
create policy bookings_require_account_assurance on public.bookings
as restrictive for all to authenticated
using ((select public.account_has_required_assurance()))
with check ((select public.account_has_required_assurance()));

-- Public image delivery stays public. Uploads and cleanup for this app's bucket
-- require the same assurance as publishing a listing. Other buckets keep their
-- own policies, and the existing owner namespace checks still apply.
drop policy if exists airstethics_listing_photos_insert_assurance on storage.objects;
create policy airstethics_listing_photos_insert_assurance on storage.objects
as restrictive for insert to authenticated
with check (bucket_id <> 'listing-photos' or (select public.account_has_required_assurance()));

drop policy if exists airstethics_listing_photos_delete_assurance on storage.objects;
create policy airstethics_listing_photos_delete_assurance on storage.objects
as restrictive for delete to authenticated
using (bucket_id <> 'listing-photos' or (select public.account_has_required_assurance()));

-- Keep the existing transactional implementations unchanged, with their row
-- locks, booking exclusion constraint, snapshots, and request retry handling.
-- Moving only once makes a manual SQL Editor run safe to apply again through
-- the GitHub integration without replacing an original with its wrapper.
do $$
begin
  if to_regprocedure('airstethics_private.create_listing(jsonb)') is null then
    alter function public.create_listing(jsonb) set schema airstethics_private;
  end if;
  if to_regprocedure('airstethics_private.create_booking(text,text,date,time without time zone,text,text,uuid)') is null then
    alter function public.create_booking(text, text, date, time without time zone, text, text, uuid)
      set schema airstethics_private;
  end if;
  if to_regprocedure('airstethics_private.cancel_booking(uuid)') is null then
    alter function public.cancel_booking(uuid) set schema airstethics_private;
  end if;
end;
$$;
revoke all on schema airstethics_private from public, anon, authenticated;
revoke all on function airstethics_private.create_listing(jsonb) from public, anon, authenticated;
revoke all on function airstethics_private.create_booking(text, text, date, time without time zone, text, text, uuid) from public, anon, authenticated;
revoke all on function airstethics_private.cancel_booking(uuid) from public, anon, authenticated;

create or replace function public.create_listing(p_listing jsonb)
returns public.listings
language plpgsql security definer set search_path = '' as $$
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  return airstethics_private.create_listing(p_listing);
end;
$$;

create or replace function public.create_booking(
  p_listing_id text, p_service_id text, p_date date, p_time time without time zone,
  p_guest_name text, p_guest_email text, p_id uuid
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  return airstethics_private.create_booking(
    p_listing_id, p_service_id, p_date, p_time, p_guest_name, p_guest_email, p_id
  );
end;
$$;

create or replace function public.cancel_booking(p_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  return airstethics_private.cancel_booking(p_id);
end;
$$;

revoke all on function public.create_listing(jsonb) from public, anon, authenticated;
revoke all on function public.create_booking(text, text, date, time without time zone, text, text, uuid) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid) from public, anon, authenticated;
grant execute on function public.create_listing(jsonb) to authenticated;
grant execute on function public.create_booking(text, text, date, time without time zone, text, text, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

commit;
