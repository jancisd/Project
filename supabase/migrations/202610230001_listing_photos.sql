-- Apply after 202610220001_marketplace.sql. This configures Supabase's managed
-- Storage tables; it does not create or replace the storage schema itself.
begin;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve their image URLs without authentication. Listing the
-- underlying object metadata is limited to the owner's upload namespace.
drop policy if exists airstethics_listing_photos_select on storage.objects;
create policy airstethics_listing_photos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Keys contain only UUIDs and an allowed extension:
-- {user UUID}/{listing request UUID}/{photo UUID}.{jpg|jpeg|png|webp}
-- There is no UPDATE policy: uploads use upsert=false and unique object keys.
drop policy if exists airstethics_listing_photos_insert on storage.objects;
create policy airstethics_listing_photos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

-- Unpublished uploads can be removed when an attempt is abandoned. Keep images
-- already attached to a listing, including when publication succeeded but its
-- HTTP response was lost and a client attempts cleanup. The public listing
-- read policy makes this check cover every published listing.
drop policy if exists airstethics_listing_photos_delete on storage.objects;
create policy airstethics_listing_photos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1
    from public.listings l
    where right(
      l.data ->> 'image',
      char_length('/storage/v1/object/public/listing-photos/' || name)
    ) = '/storage/v1/object/public/listing-photos/' || name
    or exists (
      select 1
      from jsonb_array_elements_text(
        case when jsonb_typeof(l.data -> 'images') = 'array'
          then l.data -> 'images' else '[]'::jsonb end
      ) as photo(url)
      where right(
        photo.url,
        char_length('/storage/v1/object/public/listing-photos/' || name)
      ) = '/storage/v1/object/public/listing-photos/' || name
    )
  )
);

commit;
