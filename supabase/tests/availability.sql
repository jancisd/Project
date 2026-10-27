-- Runs after the host-management upgrade in an isolated test database.
create function test_support.availability_schedule()
returns jsonb language sql as $$
  select jsonb_build_object(
    'weekly', (select jsonb_agg(jsonb_build_object(
      'day', day, 'enabled', true, 'start', '08:30', 'end', '20:00',
      'breaks', jsonb_build_array(jsonb_build_object('start', '12:00', 'end', '13:00'))
    ) order by day) from generate_series(0, 6) day),
    'blockedDates', '[]'::jsonb, 'bufferMinutes', 15, 'slotMinutes', 30
  );
$$;

insert into auth.users(id) values
  ('88888888-8888-4888-8888-888888888888'),
  ('99999999-9999-4999-8999-999999999999');

select test_support.assert(
  not has_table_privilege('authenticated', 'airstethics_private.listing_schedules', 'SELECT')
  and not has_table_privilege('authenticated', 'airstethics_private.listing_schedules', 'UPDATE'),
  'schedule persistence grants no direct private table access'
);
select test_support.assert((
  select count(*) = 4 and bool_and(p.prosecdef
    and coalesce(p.proconfig, array[]::text[]) && array['search_path=""', 'search_path='])
  from pg_proc p where p.oid in (
    'public.get_listing_schedule(text)'::regprocedure,
    'public.update_listing_schedule(text,jsonb)'::regprocedure,
    'public.available_booking_slots(text,date,text)'::regprocedure,
    'public.create_booking(text,text,date,time without time zone,text,text,uuid)'::regprocedure
  )
), 'availability RPCs use fixed definer search paths');
select test_support.assert(
  has_function_privilege('anon', 'public.get_listing_schedule(text)', 'EXECUTE')
  and has_function_privilege('anon', 'public.available_booking_slots(text,date,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.update_listing_schedule(text,jsonb)', 'EXECUTE'),
  'public schedule and free times are readable but anonymous writes remain forbidden'
);

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
set role authenticated;
select set_config('airstethics.availability_listing', (public.create_listing(
  jsonb_set(test_support.fixture_listing(), '{id}', '"local-80000000-0000-4000-8000-000000000001"')
)).id, false);
select set_config('airstethics.availability_service', (
  select id from public.services where listing_id = current_setting('airstethics.availability_listing') and duration = 60
), false);
select test_support.assert((
  public.get_listing_schedule(current_setting('airstethics.availability_listing')) #>> '{weekly,0,start}' = '09:00'
  and public.get_listing_schedule(current_setting('airstethics.availability_listing')) #>> '{weekly,0,end}' = '18:00'
), 'existing and newly created spaces keep the legacy 9-to-6 default until edited');
select test_support.assert((select count(*) = 9 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
)), 'default 60-minute service retains nine hourly slots');
select test_support.assert((
  public.update_listing_schedule(current_setting('airstethics.availability_listing'), test_support.availability_schedule())
    = test_support.availability_schedule()
), 'owner can save normalized weekly hours, breaks, slot lengths, and buffers');
reset role;

set role anon;
select test_support.assert((
  public.get_listing_schedule(current_setting('airstethics.availability_listing')) = test_support.availability_schedule()
), 'published availability is public business information');
select test_support.assert((select count(*) > 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
)), 'anonymous visitors can see available slots without seeing customer records');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), test_support.availability_schedule())
$q$, '42501');
reset role;

select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', false);
set role authenticated;
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), test_support.availability_schedule())
$q$, '42501');
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 91,
  current_setting('airstethics.availability_service')
)), 'appointments beyond the 90-day booking horizon are not offered');
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date - 1,
  current_setting('airstethics.availability_service')
)), 'past dates are not offered');
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14, 'muse-cut'
)), 'a service belonging to another listing produces no slots');
select test_support.assert((select count(*) = 1 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
) where booking_time = '08:30'), 'booking slots can start before the old 9 AM limit');
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
) where booking_time in ('08:45', '11:00', '11:30', '12:00', '12:30', '19:00')), 'slots honor opening-anchored grid, full-service breaks, and buffer before closing');
select test_support.assert((select count(*) = 1 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
) where booking_time = '13:00'), 'a service can begin exactly when a break ends');
select test_support.assert((public.create_booking(
  current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
  (now() at time zone 'America/Edmonton')::date + 14, '18:30', 'Availability Guest', 'availability@example.com',
  '80000000-0000-4000-8000-000000000012'
)).booking_time = '18:30', 'authoritative booking supports host hours beyond the old 6 PM close');
select test_support.expect_error($q$
  select public.create_booking(current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
    (now() at time zone 'America/Edmonton')::date + 14, '08:45', 'Availability Guest', 'availability@example.com',
    '80000000-0000-4000-8000-000000000010')
$q$, '23P01');
select test_support.expect_error($q$
  select public.create_booking(current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
    (now() at time zone 'America/Edmonton')::date + 14, '11:00', 'Availability Guest', 'availability@example.com',
    '80000000-0000-4000-8000-000000000010')
$q$, '23P01');
select test_support.assert((public.create_booking(
  current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
  (now() at time zone 'America/Edmonton')::date + 14, '08:30', 'Availability Guest', 'availability@example.com',
  '80000000-0000-4000-8000-000000000010'
)).status = 'confirmed', 'authoritative booking accepts a valid 8:30 start');
select test_support.assert((public.create_booking(
  current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
  (now() at time zone 'America/Edmonton')::date + 14, '08:30', 'Availability Guest', 'availability@example.com',
  '80000000-0000-4000-8000-000000000010'
)).id = '80000000-0000-4000-8000-000000000010', 'same booking request remains idempotent even though its slot is now occupied');
select test_support.expect_error($q$
  select public.create_booking(current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
    (now() at time zone 'America/Edmonton')::date + 14, '09:30', 'Availability Guest', 'availability@example.com',
    '80000000-0000-4000-8000-000000000011')
$q$, '23P01');
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
) where booking_time = '09:30'), 'buffer rejects a non-overlapping but immediately adjacent appointment');
select test_support.assert((select count(*) = 1 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
) where booking_time = '10:00'), 'a sufficient buffer gap allows the next appointment');
reset role;
create table test_support.availability_existing_booking as select to_jsonb(b) data
  from public.bookings b where id = '80000000-0000-4000-8000-000000000010';

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', false);
set role authenticated;
select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(
  test_support.availability_schedule(),
  array['weekly', extract(dow from (now() at time zone 'America/Edmonton')::date + 14)::integer::text, 'enabled'], 'false'
));
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 14,
  current_setting('airstethics.availability_service')
)), 'a closed weekday has no available slots');
select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(
  test_support.availability_schedule(), '{blockedDates}', jsonb_build_array(jsonb_build_object(
    'date', ((now() at time zone 'America/Edmonton')::date + 15)::text, 'label', 'Private personal note'
  ))
));
select test_support.assert((select count(*) = 0 from public.available_booking_slots(
  current_setting('airstethics.availability_listing'), (now() at time zone 'America/Edmonton')::date + 15,
  current_setting('airstethics.availability_service')
)), 'a blocked date has no available slots');
select test_support.assert(public.get_listing_schedule(current_setting('airstethics.availability_listing'))::text not like '%Private personal note%', 'normalization discards blocked-date private notes');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{weekly,0,end}', '"07:00"'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{weekly,0,day}', '1'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{bufferMinutes}', '0.5'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{slotMinutes}', '20'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{weekly,0,breaks}', '[{"start":"11:00","end":"12:30"},{"start":"12:00","end":"13:00"}]'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{weekly,0,breaks}', '[{"start":"07:00","end":"09:00"}]'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{blockedDates}', '[{"date":"2027-02-30"}]'))
$q$, '22023');
select test_support.expect_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(test_support.availability_schedule(), '{weekly,0,start}', '"24:00"'))
$q$, '22023');
reset role;
select test_support.assert((select to_jsonb(b) = snapshot.data from public.bookings b cross join test_support.availability_existing_booking snapshot where b.id = '80000000-0000-4000-8000-000000000010'), 'closing weekdays and blocking dates never modify existing appointment snapshots');

insert into auth.mfa_factors(id,user_id,factor_type,status) values
  ('80000000-0000-4000-8000-000000000099', '88888888-8888-4888-8888-888888888888', 'totp', 'verified');
set role authenticated;
select test_support.expect_assurance_error($q$
  select public.update_listing_schedule(current_setting('airstethics.availability_listing'), test_support.availability_schedule())
$q$);
select test_support.expect_assurance_error($q$
  select public.create_booking(current_setting('airstethics.availability_listing'), current_setting('airstethics.availability_service'),
    (now() at time zone 'America/Edmonton')::date + 16, '10:00', 'Availability Guest', 'availability@example.com',
    '80000000-0000-4000-8000-000000000016')
$q$);
reset role;
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
set role authenticated;
select test_support.assert(public.update_listing_schedule(current_setting('airstethics.availability_listing'), test_support.availability_schedule()) = test_support.availability_schedule(), 'AAL2 owner can update availability');
reset role;
delete from auth.mfa_factors where id = '80000000-0000-4000-8000-000000000099';
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);

-- Keep an open, buffered schedule for the independent concurrent-buffer test.
set role authenticated;
select public.update_listing_schedule(current_setting('airstethics.availability_listing'), jsonb_set(
  test_support.availability_schedule(), '{bufferMinutes}', '30'
));
reset role;
create function test_support.availability_race(p_time time, p_id uuid)
returns public.bookings language sql as $$
  select public.create_booking(
    (select id from public.listings where owner_id = '88888888-8888-4888-8888-888888888888' and not is_demo),
    (select s.id from public.services s join public.listings l on l.id = s.listing_id
      where l.owner_id = '88888888-8888-4888-8888-888888888888' and s.duration = 60),
    (now() at time zone 'America/Edmonton')::date + 20, p_time,
    'Concurrent Availability Guest', 'concurrent-availability@example.com', p_id
  );
$$;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claims', '{}', false);
