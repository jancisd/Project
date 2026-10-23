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
  psql_in --quiet < "$migration"
done
psql_in --quiet < supabase/seed.sql
psql_in --quiet < supabase/tests/marketplace.sql
psql_in --quiet < supabase/tests/storage-policies.sql

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
rm -f "/tmp/${container}-repair.log"
echo 'Database and photo storage policies, booking validation, idempotency, cancellation, concurrent slots, and non-destructive migration adoption passed.'
