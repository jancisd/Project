-- Adoption must preserve real records, not merely work on an empty schema.
select test_support.assert(
  to_regclass('supabase_migrations.schema_migrations') is null,
  'manual schema setup has no migration history yet'
);
select test_support.assert(
  (select count(*) > 0 from public.bookings),
  'adoption fixture includes existing customer bookings'
);

create table test_support.migration_adoption_snapshot (
  relation_name text primary key,
  row_count bigint not null,
  checksum text not null
);

do $$
declare relation_name text; saved_count bigint; saved_checksum text;
begin
  foreach relation_name in array array[
    'public.listings', 'public.services', 'public.favorites', 'public.bookings',
    'auth.users', 'storage.buckets', 'storage.objects'
  ] loop
    execute format(
      'select count(*), md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text, ''[]'')) from %s r',
      relation_name::regclass
    ) into saved_count, saved_checksum;
    insert into test_support.migration_adoption_snapshot
      values (relation_name, saved_count, saved_checksum);
  end loop;
end;
$$;

create function test_support.assert_adoption_data_unchanged()
returns void language plpgsql as $$
declare snapshot record; actual_count bigint; actual_checksum text;
begin
  for snapshot in select * from test_support.migration_adoption_snapshot loop
    execute format(
      'select count(*), md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text, ''[]'')) from %s r',
      snapshot.relation_name::regclass
    ) into actual_count, actual_checksum;
    perform test_support.assert(
      actual_count = snapshot.row_count and actual_checksum = snapshot.checksum,
      'migration adoption preserves every existing row in ' || snapshot.relation_name
    );
  end loop;
end;
$$;
