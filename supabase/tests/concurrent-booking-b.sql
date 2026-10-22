begin;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
set local role authenticated;
select public.create_booking('muse-hair-house','muse-cut',(now() at time zone 'America/Edmonton')::date+2,'09:00','Other Example','other@example.com','30000000-0000-4000-8000-000000000002');
select pg_sleep(0.5);
commit;
