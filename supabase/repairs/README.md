# Adopt an existing marketplace database

Use this recovery when Supabase's GitHub deployment fails with
`relation "listings" already exists` while trying to run
`202610220001_marketplace.sql`.

Running the initial setup through SQL Editor creates the app's tables but does
not add that file to Supabase CLI's migration history. A later GitHub deployment
can therefore try to create the same tables again. The fix is to record the
already-applied version after checking the database's existing setup.

## SQL Editor recovery

1. Open the Supabase project **and database branch targeted by the failed
   deployment**. The GitHub check may be labelled “Supabase Preview”; use its
   deployment details to confirm the target. It must be the database where the
   original marketplace setup was already run.
2. Copy [adopt_existing_marketplace.sql](adopt_existing_marketplace.sql) into a
   new SQL Editor query and run it once.
3. On success, retry the failed Supabase deployment/check. The original version
   is now recorded, so the deployment can apply and record the remaining photo
   migration normally. If GitHub does not offer a retry for this integration,
   use its Supabase deployment page to redeploy the same branch.

The repair verifies the four table schemas, row-level security, access
policies, key constraints, booking functions, and client permissions before
writing migration metadata. It preserves app tables and their records. It
records **only `202610220001`** and is safe to repeat. It does not mark the photo
migration applied. If photo setup was already run manually, that migration is
safe for the deployment to run again.

If validation fails, the transaction stops without recording migration history.
Keep the error message so the schema mismatch can be investigated. Do not drop
the app's tables to resolve a deployment history conflict.

## Supabase CLI alternative

For an environment already linked to the correct hosted project, the supported
CLI equivalent is:

```sh
supabase migration repair 202610220001 --status applied --linked
supabase migration list --linked
```

Confirm the linked project and branch before using the CLI. The guarded SQL
repair is intended for this repository's original manual setup; it is not a
general-purpose migration repair for unrelated databases.

The SQL repair uses the CLI-compatible history schema. Its optional `statements`
metadata remains null because the original SQL source is retained unchanged in
`supabase/migrations/202610220001_marketplace.sql`. Use the repository as the
source of migration files; remote metadata alone does not reconstruct this
manually adopted file.
