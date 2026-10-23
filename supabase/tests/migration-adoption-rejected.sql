select test_support.assert(
  (select count(*) = 0 from supabase_migrations.schema_migrations where version = '202610220001'),
  'failed schema validation does not record the migration as applied'
);
select test_support.assert(
  (select not relrowsecurity from pg_class where oid = 'public.bookings'::regclass),
  'adoption does not silently modify a mismatched schema'
);
select test_support.assert_adoption_data_unchanged();

-- Restore the test fixture before checking successful adoption again.
alter table public.bookings enable row level security;
