-- Real PostgreSQL assertions under the same anon/authenticated roles used by
-- the browser. These helpers and fixtures exist only in the disposable DB.
create schema test_support;
grant usage on schema test_support to anon, authenticated;
create function test_support.assert(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'Assertion failed: %', p_message;
  end if;
end;
$$;
create function test_support.expect_error(p_sql text, p_state text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_state then return; end if;
    raise exception 'Expected SQLSTATE %, received %: %', p_state, sqlstate, sqlerrm;
  end;
  raise exception 'Expected SQLSTATE %, but the command succeeded: %', p_state, p_sql;
end;
$$;
create function test_support.fixture_listing()
returns jsonb language sql as $$
  select '{
    "id": "local-10000000-0000-4000-8000-000000000001",
    "name": "Test Beauty Studio",
    "category": "Hair",
    "city": "Edmonton",
    "neighborhood": "Parkdale",
    "coordinates": {"lat":53.565,"lng":-113.472},
    "description": "A test studio with a sufficiently detailed description.",
    "image": "/images/hair.webp",
    "images": ["/images/hair.webp"],
    "amenities": ["By appointment"],
    "rating": 5,
    "reviewCount": 200,
    "reviews": [{"text":"Forged review"}],
    "is_demo": true,
    "owner_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "professional": {"name":"Test Professional","title":"Verified expert","avatar":"/images/professional-1.webp"},
    "services": [
      {"id":"forged-service-id","name":"Test haircut","description":"A careful cut.","duration":60,"price":55},
      {"id":"forged-service-id-2","name":"Test colour","description":"A thoughtful colour.","duration":90,"price":95}
    ]
  }'::jsonb;
$$;

insert into auth.users(id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

set role anon;
select test_support.assert((select count(*) = 9 from public.listings), 'anonymous catalogue is readable');
select test_support.assert((select count(*) > 9 from public.services), 'anonymous services are readable');
select test_support.expect_error('select * from public.bookings', '42501');
select test_support.expect_error('select * from public.favorites', '42501');
select test_support.expect_error('select public.create_listing(test_support.fixture_listing())', '42501');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',current_date+1,'09:00','Guest','guest@example.com',gen_random_uuid())$q$, '42501');
select test_support.expect_error($q$select public.cancel_booking('00000000-0000-4000-8000-000000000001')$q$, '42501');
select test_support.assert((select count(*) = 0 from public.listing_availability('muse-hair-house', current_date + 1)), 'availability is public and initially empty');
reset role;

-- An authenticated role without a JWT must also fail closed.
set role authenticated;
select test_support.expect_error('select public.create_listing(test_support.fixture_listing())', '42501');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',current_date+1,'09:00','Guest','guest@example.com',gen_random_uuid())$q$, '42501');
select test_support.assert((select count(*) = 0 from public.bookings), 'missing JWT cannot read bookings');
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
select set_config('airstethics.test_listing_id', (public.create_listing(test_support.fixture_listing())).id, false);
select test_support.assert((select owner_id = auth.uid() and not is_demo from public.listings where id = current_setting('airstethics.test_listing_id')), 'server chooses owner and real-listing marker');
select test_support.assert((select data -> 'rating' = '0' and data -> 'reviewCount' = '0' and data -> 'reviews' = '[]' from public.listings where id = current_setting('airstethics.test_listing_id')), 'forged ratings and reviews are discarded');
select test_support.assert((select data #>> '{professional,title}' = 'Hair professional' and data ->> 'id' = id and not(data ? 'services') from public.listings where id = current_setting('airstethics.test_listing_id')), 'server normalizes payload');
select test_support.assert(current_setting('airstethics.test_listing_id') <> 'local-10000000-0000-4000-8000-000000000001', 'server chooses canonical listing ID');
select test_support.assert((select count(*) = 2 and bool_and(id not like 'forged%') from public.services where listing_id = current_setting('airstethics.test_listing_id')), 'service IDs are generated atomically');
select test_support.assert((public.create_listing(test_support.fixture_listing())).id = current_setting('airstethics.test_listing_id'), 'listing retry is idempotent');
select test_support.assert((select count(*) = 10 from public.listings), 'retry did not duplicate listing');
select test_support.expect_error($q$select public.create_listing(jsonb_set(test_support.fixture_listing(),'{name}','"Changed name"'))$q$, '23505');
select test_support.expect_error($q$select public.create_listing(jsonb_set(jsonb_set(test_support.fixture_listing(),'{id}','"local-10000000-0000-4000-8000-000000000002"'),'{services,0,duration}','2.5'))$q$, '22023');
select test_support.expect_error($q$select public.create_listing(jsonb_set(jsonb_set(test_support.fixture_listing(),'{id}','"local-10000000-0000-4000-8000-000000000003"'),'{services,0,price}','55.555'))$q$, '22023');
select test_support.expect_error($q$select public.create_listing(jsonb_set(jsonb_set(test_support.fixture_listing(),'{id}','"local-10000000-0000-4000-8000-000000000004"'),'{coordinates,lat}','51.06'))$q$, '22023');
select test_support.expect_error($q$select public.create_listing(jsonb_set(jsonb_set(test_support.fixture_listing(),'{id}','"local-10000000-0000-4000-8000-000000000005"'),'{professional,name}','null'))$q$, '22023');
select test_support.assert((select count(*) = 10 from public.listings), 'invalid service and coordinate requests roll back whole listing');
select test_support.expect_error($q$insert into public.listings(id,owner_id,data) values ('bypass',auth.uid(),'{}')$q$, '42501');
select test_support.expect_error($q$update public.listings set is_demo = true$q$, '42501');
select test_support.expect_error($q$delete from public.services$q$, '42501');
select test_support.expect_error($q$select airstethics_private.required_text('"hello"',1,10,'test')$q$, '42501');

insert into public.favorites(user_id,listing_id) values (auth.uid(), 'muse-hair-house');
select test_support.expect_error($q$insert into public.favorites(user_id,listing_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','muse-hair-house')$q$, '42501');
select test_support.assert((select count(*) = 1 from public.favorites), 'customer sees own favorite');
delete from public.favorites where user_id = auth.uid() and listing_id = 'muse-hair-house';
select test_support.assert((select count(*) = 0 from public.favorites), 'customer can remove own favorite');
insert into public.favorites(user_id,listing_id) values (auth.uid(), 'muse-hair-house');
reset role;

-- A second customer's favorites and bookings cannot leak across accounts.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
set role authenticated;
select test_support.assert((select count(*) = 0 from public.favorites), 'other customer cannot read favorite');
delete from public.favorites where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select test_support.assert((select count(*) = 0 from public.favorites), 'deleting another customer favorite changes nothing');

select public.create_booking(
  'muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00',
  'Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000001'
);
select test_support.assert((select count(*) = 1 from public.bookings), 'customer sees own booking');
select test_support.assert((select price = (select price from public.services where id='muse-cut') and duration = (select duration from public.services where id='muse-cut') and customer_id = auth.uid() from public.bookings), 'server derives totals and customer');
select test_support.assert((select starts_at = (booking_date + booking_time) at time zone 'America/Edmonton' and ends_at = starts_at + duration * interval '1 minute' from public.bookings), 'server derives Alberta-time interval');
select test_support.assert((public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000001')).id = '20000000-0000-4000-8000-000000000001', 'booking retry is idempotent');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'10:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000001')$q$, '23505');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-balayage',(now() at time zone 'America/Edmonton')::date+1,'09:00','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '23P01');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date-1,'09:00','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+91,'09:00','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'08:00','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:30','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00','T','not-an-email',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$select public.create_booking('the-nail-edit','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00','Taylor Example','taylor@example.com',gen_random_uuid())$q$, '22023');
select test_support.expect_error($q$update public.bookings set status='cancelled'$q$, '42501');
select test_support.expect_error($q$delete from public.bookings$q$, '42501');
select test_support.expect_error($q$insert into public.bookings(id) values (gen_random_uuid())$q$, '42501');
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
select test_support.assert((select count(*) = 0 from public.bookings), 'another customer cannot read booking contact details');
select test_support.assert((select count(*) = 1 from public.favorites), 'another account could not delete original favorite');
select test_support.expect_error($q$select public.cancel_booking('20000000-0000-4000-8000-000000000001')$q$, '42501');
select test_support.expect_error($q$select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000001')$q$, '23505');
select test_support.assert((select count(*) = 1 from public.listing_availability('muse-hair-house',(now() at time zone 'America/Edmonton')::date+1)), 'other customers can see occupied interval');
reset role;

set role anon;
select test_support.assert((select to_jsonb(a) - 'booking_time' - 'duration' = '{}'::jsonb from public.listing_availability('muse-hair-house',(now() at time zone 'America/Edmonton')::date+1) a limit 1), 'availability exposes only time and duration');
select test_support.assert((select count(*) = 1 from public.listing_availability('muse-hair-house',(now() at time zone 'America/Edmonton')::date+1)), 'anonymous availability sees busy slot');
reset role;

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
set role authenticated;
select test_support.assert((public.cancel_booking('20000000-0000-4000-8000-000000000001')).status = 'cancelled', 'customer cancellation succeeds');
select test_support.assert((public.cancel_booking('20000000-0000-4000-8000-000000000001')).status = 'cancelled', 'cancellation retry is idempotent');
select test_support.assert((select count(*) = 0 from public.listing_availability('muse-hair-house',(now() at time zone 'America/Edmonton')::date+1)), 'cancellation releases availability');
-- Cancelling must also release the database exclusion constraint.
select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'09:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000002');
select test_support.assert((select count(*) = 2 and count(*) filter(where status='confirmed') = 1 from public.bookings), 'a new booking can reuse the cancelled interval');
select test_support.assert((public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'10:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000005')).booking_time = time '10:00', 'an adjacent appointment can start exactly when another ends');
select test_support.assert((public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+1,'17:00','Taylor Example','taylor@example.com','20000000-0000-4000-8000-000000000006')).ends_at at time zone 'America/Edmonton' = ((now() at time zone 'America/Edmonton')::date+1) + time '18:00', 'an appointment may finish exactly at closing');
reset role;

-- Create a 90-minute appointment and demonstrate half-open interval semantics.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
set role authenticated;
select set_config('airstethics.test_service_id',(select id from public.services where listing_id=current_setting('airstethics.test_listing_id') and duration=90),false);
select public.create_booking(current_setting('airstethics.test_listing_id'), current_setting('airstethics.test_service_id'),(now() at time zone 'America/Edmonton')::date+1,'09:00','Robin Example','robin@example.com','20000000-0000-4000-8000-000000000003');
select test_support.expect_error($q$select public.create_booking(current_setting('airstethics.test_listing_id'), current_setting('airstethics.test_service_id'),(now() at time zone 'America/Edmonton')::date+1,'10:00','Robin Example','robin@example.com',gen_random_uuid())$q$, '23P01');
select public.create_booking(current_setting('airstethics.test_listing_id'), current_setting('airstethics.test_service_id'),(now() at time zone 'America/Edmonton')::date+1,'11:00','Robin Example','robin@example.com','20000000-0000-4000-8000-000000000004');
select test_support.expect_error($q$select public.create_booking(current_setting('airstethics.test_listing_id'), current_setting('airstethics.test_service_id'),(now() at time zone 'America/Edmonton')::date+1,'17:00','Robin Example','robin@example.com',gen_random_uuid())$q$, '22023');
reset role;

select 'Marketplace SQL assertions passed.' as result;
