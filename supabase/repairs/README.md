# Adopt an existing marketplace database

This folder contains one guarded repair,
[`adopt_existing_marketplace.sql`](adopt_existing_marketplace.sql). It fixes the
specific deployment-history conflict where the original marketplace schema was
created manually in Supabase SQL Editor, but the automatic migration runner
does not know that version `202610220001` has already been applied.

Use the [database guide](../README.md) for a fresh setup and the [root app
guide](../../README.md) for normal operation. This repair is not part of the
normal application request path: no customer screen, React function, or Netlify
email worker invokes it.

## What the error means

A failed Supabase GitHub deployment may show:

```text
ERROR: relation "listings" already exists (SQLSTATE 42P07)
At statement: create table public.listings (...)
```

The table can exist while the migration-history row does not. Running SQL Editor
creates the objects described by the SQL, but it does not automatically insert
the file version into `supabase_migrations.schema_migrations`. The next CLI/GitHub
migration run then attempts the original `CREATE TABLE` again. The application
table and the deployment ledger disagree.

This repair validates the expected original marketplace setup, then adds only
that original version to the ledger. It does not create replacement application
tables, reset business data, assign owners, regenerate accounts, or rebook appointments.

## When to use this repair

All of the following should describe the situation:

1. The failing deployment is trying to run
   [`202610220001_marketplace.sql`](../migrations/202610220001_marketplace.sql).
2. The original setup was already run manually against the target database.
3. The four app tables are present: `public.listings`, `public.services`,
   `public.favorites`, and `public.bookings`.
4. The failed deployment's target project and database branch are known.

An integration check labelled **Supabase Preview** can target a different branch
from the production dashboard currently open in your browser. A successful query
on production does not repair another preview branch's ledger. Check the failed
deployment's details before choosing the SQL Editor connection.

If the error concerns an unknown column, an unrelated table, permissions,
storage, a later version, or an application request, use that error's own diagnosis.
This script records only `202610220001`; it is not a general migration repair.

## SQL Editor procedure

1. Open the Supabase project and database branch targeted by the failed deployment.
2. Open SQL Editor and create a new query. Paste the complete
   [`adopt_existing_marketplace.sql`](adopt_existing_marketplace.sql), including
   its `begin;` and `commit;` lines, then run it.
3. On success, the script raises a notice that the marketplace setup was
   recorded and existing app records were preserved. Depending on the dashboard,
   this can appear with a general “Success” message rather than returned rows.
4. Run the read-only verification query below on the same connection.
5. Retry or redeploy the failed migration run. An old GitHub check does not
   change to passed merely because a separate SQL query succeeded; deployment
   must execute again.
6. Inspect the new result. It should skip the recorded original version and
   apply any still-pending migrations in filename order.

If the integration does not offer GitHub's normal retry button, use its Supabase
deployment page to redeploy the same branch. Do not rerun the initial marketplace
table-creation SQL or drop app tables to clear this history conflict.

## What the script does, in order

The implementation is a PostgreSQL `DO` block inside one transaction. Its checks
and metadata writes succeed or roll back together. The transaction sets a
five-second `lock_timeout` and a thirty-second `statement_timeout`, bounding
unexpected lock contention or long-running work.

| Stage                       | Checks or changes                                                                                                                                                                                                                                                     | Purpose                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Required relations          | Four expected names must resolve to ordinary tables with RLS enabled.                                                                                                                                                                                                 | Refuses missing tables, views, and disabled RLS.                                           |
| Policy counts               | Requires original counts: listings 1, services 1, favourites 3, bookings 1, excluding only two recognized optional MFA policies.                                                                                                                                      | Unexpected extra access policies stop adoption.                                            |
| Optional MFA policies       | Recognizes only `favorites_require_account_assurance` and `bookings_require_account_assurance` on their expected tables. They must be restrictive, apply to all authenticated operations, and use the recognized helper expressions in both `USING` and `WITH CHECK`. | Allows this repository's security upgrade without accepting altered or unrelated policies. |
| Assurance helper metadata   | If those policies exist, checks a stable boolean definer function with empty fixed search path, authenticated execution, and no anonymous execution.                                                                                                                  | Confirms the helper's expected security shape.                                             |
| Required columns            | Checks required column names and PostgreSQL types, including owner/request fields, services, contacts, booking snapshots, local date/time, and absolute start/end timestamps.                                                                                         | Refuses differently shaped required app objects.                                           |
| Constraints                 | Checks named primary keys, foreign keys, unique/check constraints, and `no_overlapping_bookings` for expected type and validated status.                                                                                                                              | Verifies expected structural markers.                                                      |
| Baseline policy expressions | Checks public-read and account/customer ownership expressions, commands, permissive status, and roles.                                                                                                                                                                | Refuses a similarly named policy with a different recognized access expression.            |
| Function metadata           | Looks up `create_listing(jsonb)`, `create_booking(text,text,date,time,text,text,uuid)`, `cancel_booking(uuid)`, and `listing_availability(text,date)`; checks definer/search-path settings and expected anonymous/authenticated grants.                               | Confirms required entry points and their access boundary exist.                            |
| Table grants                | Checks public listing/service reads, favourite account-read/insert/delete grants, booking account-read grants, and absence of forbidden client writes.                                                                                                                | Refuses unexpected browser privileges.                                                     |
| History schema              | Creates the CLI-compatible history schema/table if absent, adds optional `name` and `statements` columns if needed, and revokes client access.                                                                                                                        | Prepares the deployment ledger, not application content.                                   |
| Initial version             | Inserts `202610220001` / `marketplace` with `ON CONFLICT DO NOTHING`.                                                                                                                                                                                                 | Records the original version without duplicating or replacing an existing row.             |

The script deliberately recognizes the two named MFA additions. Host management,
availability, and notifications have separate migrations; this repair does not
mark those versions applied.

### What successful validation does not prove

These guards target this repository's known manual setup. They are not a full
schema-diff engine:

- Required constraints are checked by name, type, and validated status; their
  complete SQL definitions are not compared.
- Function signatures, security metadata, and execution grants are checked;
  complete function bodies are not compared byte-for-byte with Git.
- Unrelated extra columns or tables are not automatically rejected. Required
  objects and the specifically checked policies/grants must still match.
- The script does not validate Resend, Netlify settings, account email delivery,
  image bytes, the hosted frontend version, or all later migrations.
- A successful initial-version adoption cannot guarantee that a later deployment
  will not encounter a separate later error.

If the database was customized beyond the known app migrations, review those
changes before treating adoption as full compatibility. The original SQL remains
the source of the original definition.

## Read-only verification

After a successful repair, inspect the original version on the same database:

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '202610220001';
```

An ordinary newly inserted result is `202610220001 | marketplace`. If that
version already existed, its existing row and name remain unchanged. The version
is what tells migration tooling to skip the original file.

To inspect every migration shipped by this repository:

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '202610220001',
  '202610230001',
  '202610230002',
  '202610260001',
  '202610260002',
  '202610260003'
)
ORDER BY version;
```

This query reads the ledger; it does not validate schema definitions or record
missing versions. Immediately after this repair, only the first row may exist
because the automatic retry has not applied later files yet. If the history table
does not exist before recovery, the query itself can report `relation does not
exist`; that alone does not establish whether app tables exist. To inspect names
without changing anything:

```sql
SELECT
  to_regclass('public.listings') AS listings,
  to_regclass('public.services') AS services,
  to_regclass('public.favorites') AS favorites,
  to_regclass('public.bookings') AS bookings;
```

A null result means that named relation is absent on that connection. Presence
alone is not proof of correct schema or permissions; the repair checks more.

## Results and troubleshooting

| Result                                    | Meaning                                                                          | Next action                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Success notice and initial history row    | Guard checks passed and version metadata exists.                                 | Retry the deployment on the same project/branch.                                                                           |
| `Adoption stopped: ...`                   | A required object or access setting did not match; no new history was committed. | Keep the exact error and investigate that mismatch against the source. Do not delete data or disable RLS to force success. |
| Lock/statement timeout                    | The bounded transaction could not complete.                                      | Inspect active maintenance/transactions and retry when available. A timeout does not justify skipping validation.          |
| SQL succeeded, GitHub still shows failure | The old run has not been retried, or SQL ran on a different database branch.     | Check the new run's timestamp, target, and failing version.                                                                |
| A retried run fails in a later version    | The original conflict was passed; another migration needs investigation.         | Read the current error instead of repeating this original-version repair.                                                  |

The repair records **only `202610220001`**. The photo migration supports this
repository's manual-setup-then-deployment path with its own upsert/policy-replace
logic. That does not mean all versions should be manually marked applied or all
table-creation migrations can be rerun over existing data.

## Supabase CLI alternative

For an environment already linked to the correct hosted project:

```sh
supabase migration repair 202610220001 --status applied --linked
supabase migration list --linked
```

Confirm the linked project and branch first. This alternative changes metadata
but does **not** execute the SQL repair's schema, policy, constraint, function,
or privilege guards. Use it only when the schema has already been verified as
applied. It neither executes the original migration nor repairs missing tables.

## Why `statements` can be null

The history table uses the CLI-compatible layout, but the repair does not
reconstruct manually executed SQL from the hosted database. Its new adopted row
leaves optional `statements` null. The original unchanged source remains in
[`202610220001_marketplace.sql`](../migrations/202610220001_marketplace.sql).
Keep the repository's migration files as the source of truth; a ledger query
alone cannot recreate that file.

## Local checks

From the repository root, run `npm run test:database`. Its disposable PostgreSQL
harness adopts original fixtures twice and verifies unchanged business rows. It
also checks rejection when RLS is disabled or policies are unexpected, altered,
assigned to wrong roles, or made permissive. Rejected adoption must leave the
version absent until a valid repair succeeds. Tests use isolated containers;
they do not repair or inspect your hosted database.
