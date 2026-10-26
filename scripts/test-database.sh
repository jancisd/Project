#!/usr/bin/env bash
# Uses an isolated throwaway Postgres container. No host port or persistent
# volume is attached, and no Supabase credentials or hosted data are accessed.
set -euo pipefail
cd "$(dirname "$0")/.."

container="airstethics-db-test-$$-${RANDOM}"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  rm -f "/tmp/${container}-repair.log"
}
trap cleanup EXIT INT TERM

docker run --detach --rm --name "$container" \
  --label app.airstethics.purpose=isolated-database-test \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:16 >/dev/null

ready=false
for attempt in $(seq 1 60); do
  # The image's temporary initialization server accepts Unix-socket requests
  # before it restarts. TCP becomes available only on the final server.
  if docker exec "$container" pg_isready -U postgres --host 127.0.0.1 >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.25
done
if [[ "$ready" != true ]]; then
  echo 'The isolated PostgreSQL test container did not become ready.' >&2
  exit 1
fi

psql_in() {
  docker exec --interactive "$container" psql --username postgres --dbname postgres \
    --no-psqlrc --set ON_ERROR_STOP=1 --output /dev/null "$@"
}

psql_in --quiet < supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  # Historical fixtures exercise the original multi-space behavior first.
  # Apply the host upgrade to their populated database below, then exercise its
  # explicit first-space/additional-location rules without rewriting history.
  if [[ "$migration" == 'supabase/migrations/202610260001_host_management.sql' ]]; then
    continue
  fi
  psql_in --quiet < "$migration"
done
# The security migration also supports SQL Editor setup followed by a GitHub
# deployment. Reapplying it must not wrap a wrapper or lose the originals.
psql_in --quiet < supabase/migrations/202610230002_account_security.sql
psql_in --quiet < supabase/seed.sql
psql_in --quiet < supabase/tests/marketplace.sql
psql_in --quiet < supabase/tests/storage-policies.sql
psql_in --quiet < supabase/tests/account-security.sql

# Separate concurrent transactions must contend for the same occupied range.
# Exactly one may commit; an application-side availability check cannot provide
# this guarantee because both requests can see an initially free slot.
set +e
psql_in --quiet < supabase/tests/concurrent-booking-a.sql >"/tmp/${container}-a.log" 2>&1 &
pid_a=$!
psql_in --quiet < supabase/tests/concurrent-booking-b.sql >"/tmp/${container}-b.log" 2>&1 &
pid_b=$!
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e
if [[ "$status_a" -eq 0 && "$status_b" -eq 0 ]] || [[ "$status_a" -ne 0 && "$status_b" -ne 0 ]]; then
  cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  echo 'Expected exactly one concurrent booking to succeed.' >&2
  exit 1
fi
if ! rg -q 'That time was just booked' "/tmp/${container}-a.log" "/tmp/${container}-b.log"; then
  cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  echo 'The losing concurrent booking failed for an unexpected reason.' >&2
  exit 1
fi
rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
psql_in --quiet < supabase/tests/after-concurrency.sql

# Repeated copies of the SAME request should both succeed without duplicating
# either the listing/services transaction or the booking transaction.
parallel_retry() {
  local fixture="$1" status_a status_b pid_a pid_b
  set +e
  psql_in --quiet < "$fixture" >"/tmp/${container}-a.log" 2>&1 &
  pid_a=$!
  psql_in --quiet < "$fixture" >"/tmp/${container}-b.log" 2>&1 &
  pid_b=$!
  wait "$pid_a"; status_a=$?
  wait "$pid_b"; status_b=$?
  set -e
  if [[ "$status_a" -ne 0 || "$status_b" -ne 0 ]]; then
    cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
    echo "Parallel identical requests should both succeed: $fixture" >&2
    exit 1
  fi
  rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
}
parallel_retry supabase/tests/concurrent-listing-retry.sql
parallel_retry supabase/tests/concurrent-booking-retry.sql
psql_in --quiet < supabase/tests/after-retries.sql

# SQL Editor setup creates application objects without the CLI's migration
# history. Adopting that existing schema must leave every business row intact,
# be safe to repeat, and refuse to mark a mismatched schema as applied.
psql_in --quiet < supabase/tests/migration-adoption-before.sql
psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql
psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql
psql_in --quiet < supabase/tests/migration-adoption-after.sql
psql_in --quiet < supabase/tests/migration-adoption-invalid.sql
if psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql >"/tmp/${container}-repair.log" 2>&1; then
  echo 'Migration adoption must refuse a schema with booking RLS disabled.' >&2
  exit 1
fi
psql_in --quiet < supabase/tests/migration-adoption-rejected.sql
psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql
psql_in --quiet < supabase/tests/migration-adoption-after.sql

# Recognizing the two named restrictive MFA policies must not weaken the
# repair's refusal to adopt unexpected or altered access controls.
expect_policy_repair_rejection() {
  if psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql >"/tmp/${container}-repair.log" 2>&1; then
    echo 'Migration adoption must refuse unexpected or altered assurance policies.' >&2
    exit 1
  fi
  if ! rg -q 'Adoption stopped:' "/tmp/${container}-repair.log"; then
    cat "/tmp/${container}-repair.log"
    echo 'Migration adoption failed for an unexpected reason.' >&2
    exit 1
  fi
  psql_in --quiet <<'SQL'
select test_support.assert(
  (select count(*) = 0 from supabase_migrations.schema_migrations where version = '202610220001'),
  'rejected policy adoption leaves migration history untouched'
);
select test_support.assert_adoption_data_unchanged();
SQL
}

psql_in --quiet <<'SQL'
delete from supabase_migrations.schema_migrations where version = '202610220001';
create policy unexpected_booking_access on public.bookings for select to authenticated using (true);
SQL
expect_policy_repair_rejection
psql_in --quiet --command 'drop policy unexpected_booking_access on public.bookings;'

psql_in --quiet --command 'alter policy favorites_require_account_assurance on public.favorites using (true);'
expect_policy_repair_rejection
psql_in --quiet < supabase/migrations/202610230002_account_security.sql

psql_in --quiet --command 'alter policy bookings_require_account_assurance on public.bookings with check (true);'
expect_policy_repair_rejection
psql_in --quiet < supabase/migrations/202610230002_account_security.sql

psql_in --quiet --command 'alter policy favorites_require_account_assurance on public.favorites to anon, authenticated;'
expect_policy_repair_rejection
psql_in --quiet < supabase/migrations/202610230002_account_security.sql

psql_in --quiet <<'SQL'
drop policy bookings_require_account_assurance on public.bookings;
create policy bookings_require_account_assurance on public.bookings
for all to authenticated
using ((select public.account_has_required_assurance()))
with check ((select public.account_has_required_assurance()));
SQL
expect_policy_repair_rejection
psql_in --quiet < supabase/migrations/202610230002_account_security.sql
psql_in --quiet < supabase/repairs/adopt_existing_marketplace.sql
psql_in --quiet < supabase/tests/migration-adoption-after.sql
rm -f "/tmp/${container}-repair.log"

# Hosting upgrades preserve every existing business, appointment, and customer.
# A second application must be safe for SQL Editor setup followed by CI.
psql_in --quiet < supabase/migrations/202610260001_host_management.sql
psql_in --quiet < supabase/migrations/202610260001_host_management.sql
psql_in --quiet --command 'select test_support.assert_adoption_data_unchanged();'
psql_in --quiet < supabase/tests/host-management.sql

# Different simultaneous first-space requests must contend on the account,
# even though their request IDs differ. Only one first space may commit.
first_space_attempt() {
  psql_in --quiet --set request_key="$1" <<'SQL'
begin;
select set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-ffffffffffff', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
set local role authenticated;
select public.create_listing(test_support.host_listing(:'request_key'));
select pg_sleep(0.5);
commit;
SQL
}
set +e
first_space_attempt '60000000-0000-4000-8000-000000000101' >"/tmp/${container}-a.log" 2>&1 &
pid_a=$!
first_space_attempt '60000000-0000-4000-8000-000000000102' >"/tmp/${container}-b.log" 2>&1 &
pid_b=$!
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e
if [[ "$status_a" -eq 0 && "$status_b" -eq 0 ]] || [[ "$status_a" -ne 0 && "$status_b" -ne 0 ]]; then
  cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  echo 'Expected exactly one distinct concurrent first-space request to succeed.' >&2
  exit 1
fi
if ! rg -q 'Your account already has a space' "/tmp/${container}-a.log" "/tmp/${container}-b.log"; then
  cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  echo 'The losing first-space request failed for an unexpected reason.' >&2
  exit 1
fi
psql_in --quiet <<'SQL'
select test_support.assert((
  select count(*) = 1 from public.listings
  where owner_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
), 'concurrent distinct primary requests create only one space');
SQL
rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"

# A booking started while an edit holds the listing lock must wait before
# taking any profile/service snapshot, then use the entire committed edit.
edit_space_with_lock() {
  psql_in --quiet <<'SQL'
begin;
set local application_name = 'airstethics-host-edit-test';
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
set local role authenticated;
select public.update_listing(l.id,
  jsonb_set(jsonb_set(jsonb_set(jsonb_set(
    test_support.host_payload(l.id), '{name}', '"Concurrent edited studio"'),
    '{services,0,name}', '"Concurrent edited service"'),
    '{services,0,price}', '175'), '{services,0,duration}', '180')
) from public.listings l
where l.owner_id = auth.uid() and l.request_id = '60000000-0000-4000-8000-000000000001';
select pg_sleep(2);
commit;
SQL
}
book_during_edit() {
  psql_in --quiet <<'SQL'
begin;
set local application_name = 'airstethics-host-book-test';
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
set local role authenticated;
select public.create_booking(l.id, (
  select s.id from public.services s where s.listing_id = l.id order by s.id limit 1
), (now() at time zone 'America/Edmonton')::date + 10, '09:00',
  'Concurrent Guest', 'concurrent@example.com', '70000000-0000-4000-8000-000000000010')
from public.listings l
where l.owner_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  and l.request_id = '60000000-0000-4000-8000-000000000001';
commit;
SQL
}
activity_count() {
  docker exec "$container" psql --username postgres --dbname postgres \
    --no-psqlrc --tuples-only --no-align --command "$1"
}
set +e
edit_space_with_lock >"/tmp/${container}-a.log" 2>&1 &
pid_a=$!
set -e
editor_ready=false
for attempt in $(seq 1 40); do
  if [[ "$(activity_count "select count(*) from pg_stat_activity where application_name = 'airstethics-host-edit-test' and wait_event = 'PgSleep';")" == 1 ]]; then
    editor_ready=true
    break
  fi
  sleep 0.05
done
if [[ "$editor_ready" != true ]]; then
  cat "/tmp/${container}-a.log"
  echo 'The concurrent editor did not acquire its listing lock.' >&2
  exit 1
fi
set +e
book_during_edit >"/tmp/${container}-b.log" 2>&1 &
pid_b=$!
set -e
booking_waited=false
for attempt in $(seq 1 25); do
  if [[ "$(activity_count "select count(*) from pg_stat_activity where application_name = 'airstethics-host-book-test' and wait_event_type = 'Lock';")" == 1 ]]; then
    booking_waited=true
    break
  fi
  sleep 0.05
done
set +e
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e
if [[ "$status_a" -ne 0 || "$status_b" -ne 0 || "$booking_waited" != true ]]; then
  cat "/tmp/${container}-a.log" "/tmp/${container}-b.log"
  echo 'Concurrent edit and booking should both succeed after the booking waits for the edit.' >&2
  exit 1
fi
psql_in --quiet <<'SQL'
select test_support.assert((
  select listing_name = 'Concurrent edited studio' and service_name = 'Concurrent edited service'
    and price = 175 and duration = 180 and city = 'Calgary'
  from public.bookings where id = '70000000-0000-4000-8000-000000000010'
), 'booking waits for the edit and snapshots its whole committed profile and service');
select test_support.assert((
  select listing_name = 'Updated Host Studio' and service_name = 'Updated service'
    and price = 125 and duration = 120
  from public.bookings where id = '70000000-0000-4000-8000-000000000003'
), 'later concurrent edits preserve earlier appointment snapshots');
SQL
rm -f "/tmp/${container}-a.log" "/tmp/${container}-b.log"
echo 'Database and photo storage policies, account assurance, booking validation, idempotency, cancellation, concurrent slots, strict migration adoption, host ownership/editing/appointment management, and concurrent edit/booking snapshots passed.'
