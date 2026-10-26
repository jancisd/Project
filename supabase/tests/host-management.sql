-- Run after upgrading a populated marketplace. All identities are disposable
-- fixtures in the isolated PostgreSQL container, never real account data.
create function test_support.host_listing(p_request text)
returns jsonb language sql as $$
  select jsonb_set(test_support.fixture_listing(), '{id}', to_jsonb('local-' || p_request));
$$;
create function test_support.host_payload(p_listing_id text)
returns jsonb language sql stable as $$
  select l.data || jsonb_build_object('services', (
    select jsonb_agg(to_jsonb(s) order by s.id) from public.services s where s.listing_id = l.id
  )) from public.listings l where l.id = p_listing_id;
$$;

insert into auth.users(id) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff');

select test_support.assert((
  select count(*) = 6 and bool_and(p.prosecdef
    and coalesce(p.proconfig, array[]::text[]) && array['search_path=""', 'search_path=']
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and not has_function_privilege('anon', p.oid, 'EXECUTE'))
  from pg_proc p where p.oid in (
    'public.get_host_dashboard()'::regprocedure,
    'public.create_listing(jsonb)'::regprocedure,
    'public.create_additional_listing(jsonb)'::regprocedure,
    'public.update_listing(text,jsonb)'::regprocedure,
    'public.host_cancel_booking(uuid)'::regprocedure,
    'public.create_booking(text,text,date,time without time zone,text,text,uuid)'::regprocedure
  )
), 'host RPCs use fixed definer search paths and authenticated-only execution');
select test_support.assert(
  not has_function_privilege('authenticated', 'airstethics_private.create_owned_listing(jsonb,boolean)', 'EXECUTE')
  and not has_schema_privilege('authenticated', 'airstethics_private', 'USAGE'),
  'clients cannot bypass the public host entry points'
);
select test_support.assert(
  not has_table_privilege('authenticated', 'public.listings', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.services', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.bookings', 'UPDATE'),
  'host features do not grant direct row writes'
);

set role anon;
select test_support.expect_error('select public.get_host_dashboard()', '42501');
select test_support.expect_error('select public.create_additional_listing(test_support.fixture_listing())', '42501');
select test_support.expect_error($q$select public.update_listing('muse-hair-house', test_support.fixture_listing())$q$, '42501');
select test_support.expect_error($q$select public.host_cancel_booking('20000000-0000-4000-8000-000000000002')$q$, '42501');
reset role;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
set role authenticated;
select test_support.expect_assurance_error('select public.get_host_dashboard()');
select test_support.expect_assurance_error('select public.create_additional_listing(test_support.fixture_listing())');
select test_support.expect_assurance_error($q$select public.update_listing('muse-hair-house', test_support.fixture_listing())$q$);
select test_support.expect_assurance_error($q$select public.host_cancel_booking('20000000-0000-4000-8000-000000000002')$q$);
reset role;

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
set role authenticated;
select test_support.assert(public.get_host_dashboard() = '{"listings":[],"bookings":[]}', 'a new host starts with an empty dashboard');
select set_config('airstethics.host_primary', (public.create_listing(test_support.host_listing('60000000-0000-4000-8000-000000000001'))).id, false);
select test_support.assert(
  (public.create_listing(test_support.host_listing('60000000-0000-4000-8000-000000000001'))).id = current_setting('airstethics.host_primary'),
  'first-space creation retry remains idempotent'
);
select test_support.expect_error($q$
  select public.create_listing(test_support.host_listing('60000000-0000-4000-8000-000000000002'))
$q$, '23514');
select test_support.expect_error($q$
  select public.create_listing(jsonb_set(test_support.host_listing('60000000-0000-4000-8000-000000000001'), '{name}', '"Different retry"'))
$q$, '23505');
select set_config('airstethics.host_additional', (public.create_additional_listing(test_support.host_listing('60000000-0000-4000-8000-000000000002'))).id, false);
select test_support.assert(
  (public.create_additional_listing(test_support.host_listing('60000000-0000-4000-8000-000000000002'))).id = current_setting('airstethics.host_additional'),
  'explicit additional-space creation retry remains idempotent'
);
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'listings') = 2, 'explicit additional location adds exactly one second space');
select test_support.assert((
  select bool_and(item ->> 'id' in (current_setting('airstethics.host_primary'), current_setting('airstethics.host_additional')))
  from jsonb_array_elements(public.get_host_dashboard() -> 'listings') item
), 'host dashboard returns only the authenticated account spaces');
select test_support.assert((
  select bool_and(jsonb_array_length(item -> 'services') = 2)
  from jsonb_array_elements(public.get_host_dashboard() -> 'listings') item
), 'host listings include their existing normalized services');
select test_support.expect_error($q$
  select public.create_additional_listing(jsonb_set(test_support.host_listing('60000000-0000-4000-8000-000000000003'), '{services,0,price}', '1'))
$q$, '22023');
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'listings') = 2, 'an invalid additional location is rolled back entirely');
reset role;

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', false);
set role authenticated;
select set_config('airstethics.other_host', (public.create_listing(test_support.host_listing('60000000-0000-4000-8000-000000000004'))).id, false);
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'listings') = 1, 'another host sees only its own first space');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), test_support.host_payload(current_setting('airstethics.host_primary')))
$q$, '42501');
select test_support.assert((
  public.get_host_dashboard() #>> '{listings,0,id}' = current_setting('airstethics.other_host')
), 'public discovery does not grant management of another host listing');
reset role;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
set role authenticated;
select set_config('airstethics.host_booked_service', (
  select id from public.services where listing_id = current_setting('airstethics.host_primary') order by id limit 1
), false);
select public.create_booking(current_setting('airstethics.host_primary'), current_setting('airstethics.host_booked_service'),
  (now() at time zone 'America/Edmonton')::date + 7, '09:00', 'Host Test Customer', 'host-customer@example.com', '70000000-0000-4000-8000-000000000001');
select public.create_booking(current_setting('airstethics.other_host'), (
  select id from public.services where listing_id = current_setting('airstethics.other_host') order by id limit 1
), (now() at time zone 'America/Edmonton')::date + 7, '09:00', 'Other Host Customer', 'other-customer@example.com', '70000000-0000-4000-8000-000000000002');
reset role;
create table test_support.host_booking_snapshot as select to_jsonb(b) as data
  from public.bookings b where id = '70000000-0000-4000-8000-000000000001';
create table test_support.host_listing_snapshot as select id, owner_id, request_id, request_fingerprint, created_at, data
  from public.listings where id = current_setting('airstethics.host_primary');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', false);
set role authenticated;
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'bookings') = 1, 'host sees appointments booked at its spaces');
select test_support.assert(public.get_host_dashboard() #>> '{bookings,0,guest_email}' = 'host-customer@example.com', 'host can read its customer contact details');
select test_support.assert((select count(*) = 0 from public.bookings), 'host appointment access does not broaden customer table RLS');
select test_support.assert(public.get_host_dashboard() #>> '{bookings,0,id}' <> '70000000-0000-4000-8000-000000000002', 'another host customer is never returned');
select public.update_listing(current_setting('airstethics.host_primary'),
  test_support.host_payload(current_setting('airstethics.host_primary')) || '{
    "name":"Updated Host Studio", "city":"Calgary", "neighborhood":"Beltline",
    "coordinates":{"lat":51.042,"lng":-114.072},
    "description":"An updated profile with a complete and useful studio description.",
    "image":"/images/nails.webp", "images":["/images/nails.webp","/images/hair.webp"],
    "rating":5,"reviewCount":900,"reviews":[{"text":"forged"}],"tag":"forged",
    "owner_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "is_demo":true
  }'::jsonb || jsonb_build_object('services', jsonb_set(jsonb_set(jsonb_set(jsonb_set(
    test_support.host_payload(current_setting('airstethics.host_primary')) -> 'services',
    '{0,name}', '"Updated service"'), '{0,description}', '"An updated service description."'),
    '{0,duration}', '120'), '{0,price}', '125'))
);
select test_support.assert(public.get_host_dashboard() #>> '{listings,0,data,name}' = 'Updated Host Studio', 'host edit updates the existing space');
select test_support.assert((
  select count(*) = 2 from public.services where listing_id = current_setting('airstethics.host_primary')
), 'editing keeps the existing service set');
select test_support.assert((
  select price = 125 and duration = 120 and name = 'Updated service'
  from public.services where id = current_setting('airstethics.host_booked_service')
), 'editing updates the existing service ID, price, duration, and name');
select test_support.assert((
  select data -> 'rating' = '0' and data -> 'reviewCount' = '0' and data -> 'reviews' = '[]' and data ->> 'tag' = 'New on airstethics'
  from public.listings where id = current_setting('airstethics.host_primary')
), 'host edits cannot fabricate ratings, reviews, or tags');
select test_support.assert((
  public.create_listing(test_support.host_listing('60000000-0000-4000-8000-000000000001'))
).data ->> 'name' = 'Updated Host Studio', 'retrying the original create request after editing returns the existing updated space');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{coordinates,lat}', '53.5'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{description}', '"Too short"'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{services,0,price}', '55.555'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{services,0,duration}', '30.5'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{images}', '[]'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{id}', '"different-space"'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{services}', '[]'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{services,0,id}', to_jsonb((select id from public.services where listing_id = current_setting('airstethics.other_host') limit 1))))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), jsonb_set(test_support.host_payload(current_setting('airstethics.host_primary')), '{services,0,id}', test_support.host_payload(current_setting('airstethics.host_primary')) #> '{services,1,id}'))
$q$, '22023');
select test_support.assert((
  select data ->> 'name' = 'Updated Host Studio' and data ->> 'city' = 'Calgary'
  from public.listings where id = current_setting('airstethics.host_primary')
), 'rejected edits retain the last valid listing profile');
select test_support.expect_error($q$
  select public.host_cancel_booking('70000000-0000-4000-8000-000000000002')
$q$, '42501');
reset role;

select test_support.assert((
  select to_jsonb(b) = s.data from public.bookings b cross join test_support.host_booking_snapshot s
  where b.id = '70000000-0000-4000-8000-000000000001'
), 'listing/service edits preserve every field of the original appointment snapshot');
select test_support.assert((
  select l.owner_id = s.owner_id and l.request_id = s.request_id and l.request_fingerprint = s.request_fingerprint
    and l.created_at = s.created_at and not l.is_demo
  from public.listings l join test_support.host_listing_snapshot s using(id)
), 'editing preserves listing ownership, request identity, creation time, and real-listing status');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
set role authenticated;
select test_support.assert((public.create_booking(current_setting('airstethics.host_primary'), current_setting('airstethics.host_booked_service'),
  (now() at time zone 'America/Edmonton')::date + 8, '09:00', 'New Host Customer', 'new-customer@example.com', '70000000-0000-4000-8000-000000000003')).price = 125,
  'new appointments use the edited service price');
select test_support.assert((
  select listing_name = 'Updated Host Studio' and city = 'Calgary' and service_name = 'Updated service' and duration = 120
  from public.bookings where id = '70000000-0000-4000-8000-000000000003'
), 'new appointments use the edited profile and duration');
select test_support.expect_error($q$
  select public.create_booking(current_setting('airstethics.host_primary'), current_setting('airstethics.host_booked_service'),
    (now() at time zone 'America/Edmonton')::date + 8, '10:00', 'Overlapping Guest', 'overlap@example.com', '70000000-0000-4000-8000-000000000004')
$q$, '23P01');
select test_support.expect_error($q$
  select public.host_cancel_booking('70000000-0000-4000-8000-000000000001')
$q$, '42501');
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'bookings') = 0, 'being a customer does not grant access to host appointment data');
reset role;

insert into auth.mfa_factors(id,user_id,factor_type,status) values
  ('80000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'totp', 'verified');
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', false);
set role authenticated;
select test_support.expect_assurance_error('select public.get_host_dashboard()');
select test_support.expect_assurance_error('select public.create_additional_listing(test_support.host_listing(''60000000-0000-4000-8000-000000000005''))');
select test_support.expect_assurance_error($q$
  select public.update_listing(current_setting('airstethics.host_primary'), test_support.host_payload(current_setting('airstethics.host_primary')))
$q$);
select test_support.expect_assurance_error($q$
  select public.host_cancel_booking('70000000-0000-4000-8000-000000000001')
$q$);
reset role;
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
set role authenticated;
select test_support.assert(jsonb_array_length(public.get_host_dashboard() -> 'bookings') = 2, 'verified MFA grants the owner its appointments');
select test_support.assert((public.host_cancel_booking('70000000-0000-4000-8000-000000000001')).status = 'cancelled', 'host can cancel an appointment for its space');
select test_support.assert((public.host_cancel_booking('70000000-0000-4000-8000-000000000001')).status = 'cancelled', 'host cancellation retry is idempotent');
select test_support.assert((
  select count(*) = 0 from public.listing_availability(current_setting('airstethics.host_primary'), (now() at time zone 'America/Edmonton')::date + 7)
), 'host cancellation releases the occupied time slot');
reset role;
select test_support.assert((
  select status = 'confirmed' from public.bookings where id = '70000000-0000-4000-8000-000000000002'
), 'rejected host cancellation leaves the other business appointment unchanged');
delete from auth.mfa_factors where id = '80000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{}', false);

select 'Host management SQL assertions passed.' as result;
