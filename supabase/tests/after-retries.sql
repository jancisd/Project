select test_support.assert((
  select count(*) = 1 from public.listings
  where owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    and request_id = '10000000-0000-4000-8000-000000000099'
), 'parallel listing retries create one listing');
select test_support.assert((
  select count(*) = 2 from public.services s join public.listings l on s.listing_id = l.id
  where l.owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    and l.request_id = '10000000-0000-4000-8000-000000000099'
), 'parallel listing retries do not duplicate services');
select test_support.assert((
  select count(*) = 1 from public.bookings
  where id = '30000000-0000-4000-8000-000000000003'
), 'parallel booking retries create one booking');
