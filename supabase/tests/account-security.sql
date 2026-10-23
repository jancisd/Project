-- Exercise real RLS and definer functions using signed-in claims, rather than
-- relying on the browser to hide private data while an MFA challenge is open.
create function test_support.expect_assurance_error(p_sql text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = '42501' and sqlerrm = 'Authenticator verification required' then return; end if;
    raise exception 'Expected authenticator verification error, received %: %', sqlstate, sqlerrm;
  end;
  raise exception 'Expected authenticator verification error, but the command succeeded';
end;
$$;

select test_support.assert(
  (select p.prosecdef and p.provolatile = 's' and p.pronargs = 0
    and p.prorettype = 'boolean'::regtype
    and coalesce(p.proconfig, array[]::text[]) && array['search_path=""', 'search_path=']
    from pg_proc p where p.oid = 'public.account_has_required_assurance()'::regprocedure),
  'assurance helper is a stable, parameter-free definer with a fixed search path'
);
select test_support.assert(
  has_function_privilege('authenticated', 'public.account_has_required_assurance()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.account_has_required_assurance()', 'EXECUTE'),
  'only authenticated clients can call the assurance helper'
);
select test_support.assert(
  not has_table_privilege('authenticated', 'auth.mfa_factors', 'SELECT'),
  'assurance checks do not grant clients access to factor records'
);
select test_support.assert(
  not has_schema_privilege('authenticated', 'airstethics_private', 'USAGE'),
  'clients cannot enter the schema holding the original implementations'
);
select test_support.assert(
  not has_function_privilege('authenticated', 'airstethics_private.create_listing(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'airstethics_private.create_listing(jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'airstethics_private.create_booking(text,text,date,time without time zone,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'airstethics_private.create_booking(text,text,date,time without time zone,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'airstethics_private.cancel_booking(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'airstethics_private.cancel_booking(uuid)', 'EXECUTE'),
  'neither client role can execute the original transactional functions directly'
);
select test_support.assert(
  (select count(*) = 2 and bool_and(not polpermissive and polcmd = '*'
    and polroles = array[(select oid from pg_roles where rolname = 'authenticated')])
    from pg_policy where polname in ('favorites_require_account_assurance', 'bookings_require_account_assurance')
      and polrelid in ('public.favorites'::regclass, 'public.bookings'::regclass)),
  'account policies are restrictive and apply to every authenticated operation'
);

-- Anonymous or malformed sessions cannot use the helper to probe enrollment.
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
set role anon;
select test_support.expect_error('select public.account_has_required_assurance()', '42501');
reset role;
set role authenticated;
select test_support.assert(not public.account_has_required_assurance(), 'AAL2 without a user still fails closed');
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
set role authenticated;
select test_support.assert(public.account_has_required_assurance(), 'password-only account can use AAL1');
select test_support.assert((select count(*) > 0 from public.favorites), 'password-only account can read its saved places');
select test_support.assert((select count(*) > 0 from public.bookings), 'password-only account can read its appointments');
reset role;

insert into auth.mfa_factors(id, user_id, factor_type, status) values
  ('40000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'totp', 'unverified'),
  ('40000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'totp', 'verified');
set role authenticated;
select test_support.assert(public.account_has_required_assurance(), 'unfinished enrollment and another user factor do not lock an account');
reset role;
update auth.mfa_factors set status = 'verified' where id = '40000000-0000-4000-8000-000000000001';

set role authenticated;
select test_support.assert(not public.account_has_required_assurance(), 'verified authenticator requires AAL2');
select test_support.assert((select count(*) = 0 from public.favorites), 'AAL1 cannot read own or other saved places after enrolling');
select test_support.assert((select count(*) = 0 from public.bookings), 'AAL1 cannot read guest contact details in appointments');
select test_support.assert((select count(*) > 0 from public.listings), 'public listing discovery remains available during a challenge');
select test_support.assert((select count(*) > 0 from public.listing_availability('muse-hair-house', (now() at time zone 'America/Edmonton')::date + 1)), 'public slot availability remains available during a challenge');
select test_support.expect_error($q$
  insert into public.favorites(user_id, listing_id) values (auth.uid(), 'the-nail-edit')
$q$, '42501');
delete from public.favorites where user_id = auth.uid();
select test_support.expect_assurance_error('select public.create_listing(test_support.fixture_listing())');
select test_support.expect_assurance_error($q$
  select public.create_booking('muse-hair-house', 'muse-cut', current_date + 2, '09:00',
    'Security Test Guest', 'security-test@example.com', '50000000-0000-4000-8000-000000000001')
$q$);
select test_support.expect_assurance_error($q$
  select public.cancel_booking('20000000-0000-4000-8000-000000000003')
$q$);
select test_support.expect_error('select airstethics_private.create_listing(test_support.fixture_listing())', '42501');
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000020/30000000-0000-4000-8000-000000000020.webp'
  )
$q$, '42501');
reset role;
select test_support.assert(
  (select count(*) > 0 from public.favorites where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'AAL1 delete cannot remove hidden favorites'
);
select test_support.assert(
  (select count(*) = 0 from public.bookings where id = '50000000-0000-4000-8000-000000000001'),
  'rejected booking RPC does not insert a reservation'
);

-- Missing or unknown claims fail closed for a verified account as well.
select set_config('request.jwt.claims', '{}', false);
set role authenticated;
select test_support.assert(public.account_has_required_assurance() = false, 'missing AAL returns false rather than allowing enrolled accounts');
reset role;
select set_config('request.jwt.claims', '{"aal":"aal3"}', false);
set role authenticated;
select test_support.assert(not public.account_has_required_assurance(), 'unrecognized AAL cannot satisfy a verified authenticator');
reset role;

select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
set role authenticated;
select test_support.assert(public.account_has_required_assurance(), 'verified account can proceed with AAL2');
select test_support.assert((select count(*) > 0 and bool_and(user_id = auth.uid()) from public.favorites), 'AAL2 sees only own saved places');
select test_support.assert((select count(*) > 0 and bool_and(customer_id = auth.uid()) from public.bookings), 'AAL2 sees only own appointments');
insert into public.favorites(user_id, listing_id) values (auth.uid(), 'the-nail-edit');
select test_support.assert((select count(*) = 1 from public.favorites where listing_id = 'the-nail-edit'), 'AAL2 can save another listing');
delete from public.favorites where listing_id = 'the-nail-edit';
select test_support.assert((select count(*) = 0 from public.favorites where listing_id = 'the-nail-edit'), 'AAL2 can remove a saved listing');
select set_config('airstethics.security_listing_id', (public.create_listing(
  jsonb_set(test_support.fixture_listing(), '{id}', '"local-10000000-0000-4000-8000-000000000020"')
)).id, false);
select test_support.assert(
  (public.create_listing(jsonb_set(test_support.fixture_listing(), '{id}', '"local-10000000-0000-4000-8000-000000000020"'))).id
    = current_setting('airstethics.security_listing_id'),
  'AAL2 listing wrapper preserves idempotent publication'
);
select test_support.assert(
  (public.create_booking('muse-hair-house', 'muse-cut', current_date + 2, '09:00',
    'Security Test Guest', 'security-test@example.com', '50000000-0000-4000-8000-000000000001')).status = 'confirmed',
  'AAL2 booking wrapper can create an appointment'
);
select test_support.assert(
  (public.create_booking('muse-hair-house', 'muse-cut', current_date + 2, '09:00',
    'Security Test Guest', 'security-test@example.com', '50000000-0000-4000-8000-000000000001')).id = '50000000-0000-4000-8000-000000000001',
  'AAL2 booking wrapper preserves request idempotency'
);
select test_support.assert(
  (public.cancel_booking('50000000-0000-4000-8000-000000000001')).status = 'cancelled',
  'AAL2 cancellation wrapper can cancel the owned appointment'
);
select test_support.expect_error($q$
  select public.cancel_booking('20000000-0000-4000-8000-000000000002')
$q$, '42501');
insert into storage.objects(bucket_id, name) values (
  'listing-photos',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000020/30000000-0000-4000-8000-000000000020.webp'
);
select test_support.assert((select count(*) = 1 from storage.objects), 'AAL2 can upload and list own photo metadata');
reset role;

select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
set role authenticated;
select test_support.assert((select count(*) = 1 from storage.objects), 'photo reads retain the existing owner policy during an MFA challenge');
delete from storage.objects where bucket_id = 'listing-photos';
reset role;
select test_support.assert((select count(*) = 1 from storage.objects), 'AAL1 cannot delete uploads after enrolling');

-- Removing a factor immediately restores normal password access, even for an
-- existing AAL1 token. The browser cannot supply another user's ID to this check.
delete from auth.mfa_factors where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set role authenticated;
select test_support.assert(public.account_has_required_assurance(), 'removing own verified factor restores password-only access');
select test_support.assert((select count(*) > 0 from public.bookings), 'factor removal restores own private reads');
delete from storage.objects where bucket_id = 'listing-photos';
select test_support.assert((select count(*) = 0 from storage.objects), 'factor removal restores owner photo cleanup');
reset role;

-- Leave no enrolled test users behind so the independent concurrent AAL1
-- fixtures exercise the same real transactional implementations as before.
delete from auth.mfa_factors where id = '40000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{}', false);
