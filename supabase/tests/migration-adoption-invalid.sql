-- Deliberately break one safety property only in this disposable database.
delete from supabase_migrations.schema_migrations where version = '202610220001';
alter table public.bookings disable row level security;
