begin;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
set local role authenticated;
select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+3,'09:00','Taylor Example','taylor@example.com','30000000-0000-4000-8000-000000000003');
select pg_sleep(0.5);
commit;
