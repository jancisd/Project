-- Bucket settings are enforced by the Supabase Storage service before writes.
-- The disposable PostgreSQL fixture verifies configuration and real role/RLS
-- behaviour; it does not claim to emulate binary image upload validation.
select test_support.assert(
  (select public and file_size_limit = 5242880
    and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
    from storage.buckets where id = 'listing-photos'),
  'listing photo bucket is public with a 5 MiB raster-image limit'
);

select set_config('request.jwt.claim.sub', '', false);
set role anon;
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000001.webp'
  )
$q$, '42501');
select test_support.assert((select count(*) = 0 from storage.objects), 'anonymous clients cannot list upload metadata');
reset role;

set role authenticated;
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000001.webp'
  )
$q$, '42501');
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
set role authenticated;
insert into storage.objects(bucket_id, name, owner_id) values (
  'listing-photos',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000001.webp',
  auth.uid()::text
);
select test_support.assert((select count(*) = 1 from storage.objects), 'signed-in owner can upload and list own photo');
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000002.webp'
  )
$q$, '42501');
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/arbitrary.svg'
  )
$q$, '42501');
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../30000000-0000-4000-8000-000000000002.webp'
  )
$q$, '42501');
update storage.objects set metadata = '{"replaced":true}' where bucket_id = 'listing-photos';
select test_support.assert((select bool_and(metadata = '{}'::jsonb) from storage.objects), 'existing photos cannot be overwritten through UPDATE');
reset role;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
set role authenticated;
select test_support.assert((select count(*) = 0 from storage.objects), 'other users cannot list owner upload metadata');
select test_support.expect_error($q$
  insert into storage.objects(bucket_id, name) values (
    'listing-photos',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000003.webp'
  )
$q$, '42501');
delete from storage.objects where bucket_id = 'listing-photos';
reset role;
select test_support.assert((select count(*) = 1 from storage.objects), 'other users cannot delete an owner photo');

select set_config('request.jwt.claim.sub', '', false);
set role anon;
delete from storage.objects where bucket_id = 'listing-photos';
reset role;
select test_support.assert((select count(*) = 1 from storage.objects), 'anonymous clients cannot delete photos');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
set role authenticated;
delete from storage.objects where bucket_id = 'listing-photos';
select test_support.assert((select count(*) = 0 from storage.objects), 'owner can clean up an unpublished upload');

insert into storage.objects(bucket_id, name, owner_id) values
  ('listing-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000004.jpg', auth.uid()::text),
  ('listing-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000005.png', auth.uid()::text);
select set_config('airstethics.photo_listing_id', (public.create_listing(
  jsonb_set(jsonb_set(jsonb_set(
    test_support.fixture_listing(),
    '{id}', '"local-10000000-0000-4000-8000-000000000010"'
  ), '{image}', '"https://project.example/storage/v1/object/public/listing-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000004.jpg"'),
    '{images}', '["https://project.example/storage/v1/object/public/listing-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/10000000-0000-4000-8000-000000000010/30000000-0000-4000-8000-000000000005.png"]'
  )
)).id, false);
delete from storage.objects where bucket_id = 'listing-photos';
select test_support.assert((select count(*) = 2 from storage.objects), 'published cover and gallery photos survive owner cleanup');
reset role;

-- Privileged administration can remove the listing; its formerly published
-- uploads then become eligible for normal owner cleanup again.
delete from public.listings where id = current_setting('airstethics.photo_listing_id');
set role authenticated;
delete from storage.objects where bucket_id = 'listing-photos';
select test_support.assert((select count(*) = 0 from storage.objects), 'owner can clean up after a listing has been removed');
reset role;
