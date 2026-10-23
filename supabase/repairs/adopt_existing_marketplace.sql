-- Run once in SQL Editor on the SAME project and database branch as the failed
-- GitHub deployment. Use only when the original marketplace migration was
-- already run manually and deployment reports: relation "listings" exists.
-- This checks the existing setup and records its migration history. It does
-- not run CREATE TABLE on app tables, change app records, or skip photo setup.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $adopt$
declare
  expected record;
  relation_oid oid;
  function_oid oid;
  policy_expression text;
  policy_check_expression text;
begin
  for expected in
    select * from (values
      ('listings', 1), ('services', 1), ('favorites', 3), ('bookings', 1)
    ) as tables(table_name, policy_count)
  loop
    relation_oid := to_regclass('public.' || expected.table_name);
    if relation_oid is null or not exists (
      select 1 from pg_class c
      where c.oid = relation_oid and c.relkind = 'r' and c.relrowsecurity
    ) then
      raise exception 'Adoption stopped: public.% must exist with row-level security enabled. No migration history was changed.', expected.table_name;
    end if;
    -- The optional account-security migration adds only these two named
    -- restrictive policies. Validate them below before accepting the schema;
    -- every other extra policy must still make adoption fail closed.
    if (select count(*) from pg_policy where polrelid = relation_oid
      and not (
        (expected.table_name = 'favorites' and polname = 'favorites_require_account_assurance')
        or (expected.table_name = 'bookings' and polname = 'bookings_require_account_assurance')
      )) <> expected.policy_count then
      raise exception 'Adoption stopped: public.% has unexpected access policies. No migration history was changed.', expected.table_name;
    end if;
  end loop;

  for expected in
    select p.*, c.relname as table_name
    from pg_policy p join pg_class c on c.oid = p.polrelid
    where (p.polrelid = to_regclass('public.favorites') and p.polname = 'favorites_require_account_assurance')
      or (p.polrelid = to_regclass('public.bookings') and p.polname = 'bookings_require_account_assurance')
  loop
    policy_expression := regexp_replace(pg_get_expr(expected.polqual, expected.polrelid), '[[:space:]]', '', 'g');
    policy_check_expression := regexp_replace(pg_get_expr(expected.polwithcheck, expected.polrelid), '[[:space:]]', '', 'g');
    if expected.polpermissive or expected.polcmd <> '*'
      or expected.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]
      or policy_expression is null or policy_check_expression is null
      or policy_expression not in (
        '(SELECTaccount_has_required_assurance()ASaccount_has_required_assurance)',
        '(SELECTpublic.account_has_required_assurance()ASaccount_has_required_assurance)'
      )
      or policy_check_expression <> policy_expression
      or not exists (
        select 1 from pg_proc p
        where p.oid = to_regprocedure('public.account_has_required_assurance()')
          and p.prosecdef and p.provolatile = 's' and p.prorettype = 'boolean'::regtype
          and coalesce(p.proconfig, array[]::text[]) && array['search_path=""', 'search_path=']
          and has_function_privilege('authenticated', p.oid, 'EXECUTE')
          and not has_function_privilege('anon', p.oid, 'EXECUTE')
      ) then
      raise exception 'Adoption stopped: access policy % does not match the account security setup. No migration history was changed.', expected.polname;
    end if;
  end loop;

  for expected in
    select * from (values
      ('listings', 'id', 'text'),
      ('listings', 'owner_id', 'uuid'),
      ('listings', 'is_demo', 'boolean'),
      ('listings', 'request_id', 'uuid'),
      ('listings', 'request_fingerprint', 'text'),
      ('listings', 'data', 'jsonb'),
      ('listings', 'created_at', 'timestamptz'),
      ('services', 'id', 'text'),
      ('services', 'listing_id', 'text'),
      ('services', 'name', 'text'),
      ('services', 'description', 'text'),
      ('services', 'duration', 'integer'),
      ('services', 'price', 'numeric'),
      ('favorites', 'user_id', 'uuid'),
      ('favorites', 'listing_id', 'text'),
      ('favorites', 'created_at', 'timestamptz'),
      ('bookings', 'id', 'uuid'),
      ('bookings', 'customer_id', 'uuid'),
      ('bookings', 'listing_id', 'text'),
      ('bookings', 'service_id', 'text'),
      ('bookings', 'listing_name', 'text'),
      ('bookings', 'listing_image', 'text'),
      ('bookings', 'city', 'text'),
      ('bookings', 'service_name', 'text'),
      ('bookings', 'booking_date', 'date'),
      ('bookings', 'booking_time', 'time'),
      ('bookings', 'duration', 'integer'),
      ('bookings', 'price', 'numeric'),
      ('bookings', 'guest_name', 'text'),
      ('bookings', 'guest_email', 'text'),
      ('bookings', 'created_at', 'timestamptz'),
      ('bookings', 'status', 'text'),
      ('bookings', 'starts_at', 'timestamptz'),
      ('bookings', 'ends_at', 'timestamptz')
    ) as columns(table_name, column_name, type_name)
  loop
    if not exists (
      select 1 from pg_attribute a
      where a.attrelid = to_regclass('public.' || expected.table_name)
        and a.attname = expected.column_name and not a.attisdropped
        and a.atttypid = to_regtype(expected.type_name)
    ) then
      raise exception 'Adoption stopped: public.%.% is missing or has the wrong type. No migration history was changed.', expected.table_name, expected.column_name;
    end if;
  end loop;

  for expected in
    select * from (values
      ('listings', 'listings_pkey', 'p'),
      ('listings', 'listings_owner_id_fkey', 'f'),
      ('listings', 'listings_owner_id_request_id_key', 'u'),
      ('listings', 'listing_owner', 'c'),
      ('listings', 'listing_request', 'c'),
      ('listings', 'listing_payload', 'c'),
      ('services', 'services_pkey', 'p'),
      ('services', 'services_listing_id_fkey', 'f'),
      ('services', 'services_listing_id_id_key', 'u'),
      ('favorites', 'favorites_pkey', 'p'),
      ('favorites', 'favorites_user_id_fkey', 'f'),
      ('favorites', 'favorites_listing_id_fkey', 'f'),
      ('bookings', 'bookings_pkey', 'p'),
      ('bookings', 'bookings_customer_id_fkey', 'f'),
      ('bookings', 'bookings_listing_id_fkey', 'f'),
      ('bookings', 'bookings_listing_id_service_id_fkey', 'f'),
      ('bookings', 'no_overlapping_bookings', 'x')
    ) as constraints(table_name, constraint_name, constraint_type)
  loop
    if not exists (
      select 1 from pg_constraint c
      where c.conrelid = to_regclass('public.' || expected.table_name)
        and c.conname = expected.constraint_name
        and c.contype::text = expected.constraint_type and c.convalidated
    ) then
      raise exception 'Adoption stopped: public.% is missing constraint %. No migration history was changed.', expected.table_name, expected.constraint_name;
    end if;
  end loop;

  for expected in
    select * from (values
      ('listings', 'listings_public_read', 'r', 'public', false),
      ('services', 'services_public_read', 'r', 'public', false),
      ('favorites', 'favorites_own_read', 'r', 'user_id', false),
      ('favorites', 'favorites_own_insert', 'a', 'user_id', true),
      ('favorites', 'favorites_own_delete', 'd', 'user_id', false),
      ('bookings', 'bookings_customer_read', 'r', 'customer_id', false)
    ) as policies(table_name, policy_name, command, account_column, uses_check)
  loop
    select regexp_replace(
      pg_get_expr(case when expected.uses_check then p.polwithcheck else p.polqual end, p.polrelid),
      '[[:space:]]', '', 'g'
    ) into policy_expression
    from pg_policy p
    where p.polrelid = to_regclass('public.' || expected.table_name)
      and p.polname = expected.policy_name and p.polcmd::text = expected.command
      and p.polpermissive
      and p.polroles @> array[(select oid from pg_roles where rolname = 'authenticated')]
      and (expected.account_column <> 'public'
        or p.polroles @> array[(select oid from pg_roles where rolname = 'anon')]);
    if policy_expression is null or (
      expected.account_column = 'public' and policy_expression <> 'true'
    ) or (
      expected.account_column <> 'public'
      and policy_expression not in (
        '(' || expected.account_column || '=(SELECTauth.uid()ASuid))',
        '(' || expected.account_column || '=(SELECTauth.uid()))'
      )
    ) then
      raise exception 'Adoption stopped: access policy % does not match the marketplace setup. No migration history was changed.', expected.policy_name;
    end if;
  end loop;

  for expected in
    select * from (values
      ('public.create_listing(jsonb)', false),
      ('public.create_booking(text,text,date,time without time zone,text,text,uuid)', false),
      ('public.cancel_booking(uuid)', false),
      ('public.listing_availability(text,date)', true)
    ) as functions(signature, anonymous_allowed)
  loop
    function_oid := to_regprocedure(expected.signature);
    if function_oid is null or not exists (
      select 1 from pg_proc p where p.oid = function_oid and p.prosecdef
        and coalesce(p.proconfig, array[]::text[]) && array['search_path=""', 'search_path=']
    ) then
      raise exception 'Adoption stopped: function % is missing or has unexpected security settings. No migration history was changed.', expected.signature;
    end if;
    if not has_function_privilege('authenticated', function_oid, 'EXECUTE')
      or has_function_privilege('anon', function_oid, 'EXECUTE') <> expected.anonymous_allowed then
      raise exception 'Adoption stopped: function % has unexpected permissions. No migration history was changed.', expected.signature;
    end if;
  end loop;

  for expected in
    select * from (values
      ('listings', true, true, false, false),
      ('services', true, true, false, false),
      ('favorites', false, true, true, true),
      ('bookings', false, true, false, false)
    ) as grants(table_name, anonymous_read, account_read, account_insert, account_delete)
  loop
    relation_oid := to_regclass('public.' || expected.table_name);
    if has_table_privilege('anon', relation_oid, 'SELECT') <> expected.anonymous_read
      or has_table_privilege('anon', relation_oid, 'INSERT,UPDATE,DELETE')
      or has_table_privilege('authenticated', relation_oid, 'SELECT') <> expected.account_read
      or has_table_privilege('authenticated', relation_oid, 'INSERT') <> expected.account_insert
      or has_table_privilege('authenticated', relation_oid, 'DELETE') <> expected.account_delete
      or has_table_privilege('authenticated', relation_oid, 'UPDATE') then
      raise exception 'Adoption stopped: public.% has unexpected permissions. No migration history was changed.', expected.table_name;
    end if;
  end loop;

  -- Same history layout used by the Supabase CLI. Optional statements are left
  -- null: the original, unchanged SQL remains in this repository's migrations.
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text not null primary key
  );
  alter table supabase_migrations.schema_migrations add column if not exists statements text[];
  alter table supabase_migrations.schema_migrations add column if not exists name text;
  revoke all on schema supabase_migrations from public, anon, authenticated;
  revoke all on table supabase_migrations.schema_migrations from public, anon, authenticated;
  insert into supabase_migrations.schema_migrations(version, name)
    values ('202610220001', 'marketplace')
    on conflict (version) do nothing;

  raise notice 'Marketplace setup recorded as applied. Existing app records were preserved. Re-run the failed Supabase deployment to apply remaining migrations.';
end;
$adopt$;

commit;
