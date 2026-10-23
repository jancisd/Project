select test_support.assert(
  (select count(*) = 1 from supabase_migrations.schema_migrations where version = '202610220001'),
  'repeated adoption records exactly one initial migration version'
);
select test_support.assert(
  (select name = 'marketplace' from supabase_migrations.schema_migrations where version = '202610220001'),
  'adoption records the original marketplace migration name'
);
select test_support.assert(
  (select count(*) = 0 from supabase_migrations.schema_migrations where version = '202610230001'),
  'adoption does not pretend the separate photo migration was recorded'
);
select test_support.assert(
  not has_table_privilege('anon', 'supabase_migrations.schema_migrations', 'SELECT'),
  'anonymous clients cannot read migration history'
);
select test_support.assert(
  not has_table_privilege('authenticated', 'supabase_migrations.schema_migrations', 'SELECT'),
  'signed-in clients cannot read migration history'
);
select test_support.assert_adoption_data_unchanged();
