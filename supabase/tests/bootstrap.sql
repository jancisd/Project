-- Only for the isolated PostgreSQL test container, never a hosted Supabase DB.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key, email text);
create table auth.mfa_factors (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  factor_type text not null,
  status text not null
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;

-- Supabase normally owns this schema. Only the disposable PostgreSQL test
-- container needs these minimal Storage substitutes to exercise its policies.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id text,
  metadata jsonb not null default '{}'::jsonb,
  unique (bucket_id, name)
);
create function storage.foldername(p_name text)
returns text[] language sql immutable as $$
  select (string_to_array(p_name, '/'))[1:array_length(string_to_array(p_name, '/'), 1) - 1];
$$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
