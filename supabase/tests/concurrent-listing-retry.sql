begin;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
set local role authenticated;
select public.create_listing(jsonb_set(test_support.fixture_listing(),'{id}','"local-10000000-0000-4000-8000-000000000099"'));
select pg_sleep(0.5);
commit;
