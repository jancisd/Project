# Connect the database

The app supports Supabase PostgreSQL and email-link accounts while remaining
deployable as the existing browser demo. This repository does not provision or
connect a hosted project automatically.

## Set up Supabase and Netlify

1. Create a project at [Supabase](https://supabase.com/dashboard). Choose a
   Canadian database region if available for your account. Keep the database
   password in your own password manager.
2. In the project's **SQL Editor**, run
   [`migrations/202610220001_marketplace.sql`](migrations/202610220001_marketplace.sql)
   once. It creates listings, services, favourites, private bookings, policies,
   and the booking functions. For an existing Supabase CLI workflow, apply it
   with your normal migration process instead.
3. Optionally run [`seed.sql`](seed.sql) in the SQL Editor to populate the
   fictional Alberta studios from the demo. Skip this for an empty catalogue.
   These seeded businesses are marked as samples; their bookings do not notify
   a real provider. The seed does not upload browser data or create accounts.
4. In **Authentication → URL Configuration**, set **Site URL** to your published
   Netlify address and add that exact URL to **Redirect URLs**. Include the
   trailing slash if your app is served at `/`. For local development, also
   allow `http://localhost:5173/` or the exact local origin you use.
5. Enable the Email authentication provider. The default magic-link email
   template works with this app. Supabase's built-in email sender has recipient
   restrictions and rate limits; configure custom SMTP before inviting public
   users. Test a sign-in email with a real account you control.
6. In Supabase **Project Settings → API**, copy the **Project URL** and the
   **publishable key**. In Netlify **Project configuration → Environment
   variables**, add these for the builds you want connected:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   A legacy public `anon` key works under `VITE_SUPABASE_ANON_KEY` instead.
   These are intentionally public browser settings. Never put a `service_role`
   or `sb_secret_` key in a `VITE_` variable, repository, or chat. No private key
   is needed by this frontend.

7. Trigger a new Netlify deploy. Vite reads these variables **at build time**.
   Wait for **Published**, then open the site, sign in, publish a listing, and
   check it from a second browser. Test booking and cancellation in both
   browsers. Remove both connection variables and rebuild to return to demo
   mode.

For local use, copy `.env.example` to `.env.local`, replace its placeholders
with your project URL and public key, and restart Vite. `.env.local` is ignored
by Git. Do not copy the placeholder values into a live deployment.

## Data and access rules

- Everyone can read published listings and their services. Signed-in users can
  publish a listing. New listings retain the confirmed map location and receive
  server-generated IDs; fabricated client ratings and reviews are discarded.
- Favourites belong to their signed-in user. Booking names and email addresses
  are readable only by the customer who made the booking. The site owner can
  administer records using Supabase's privileged dashboard.
- Availability exposes only busy times and durations, without customer details.
  The booking function checks the service, uses its database price and duration,
  applies Alberta time and opening hours, and atomically prevents overlapping
  appointments. Request IDs make identical retries safe.
- Cancellation is customer-only. It releases the slot after the database
  confirms the cancellation. There are no direct browser booking-write grants.
- Signed-out pages clear account data. Cloud booking/contact records are not
  written to the old browser demo keys. Supabase keeps a sign-in session in the
  browser so a reload can restore the account.
- Existing local listings, saved places, and demo bookings stay separate. There
  is **no automatic upload or migration** of old contact details.
- Missing both connection settings selects demo mode. Partial/invalid settings,
  authentication failures, and network/database errors are shown as errors;
  configured cloud mode never silently falls back to local storage.

The initial model reserves one appointment at a time per listing. Multiple
staff calendars, provider appointment management, listing editing/moderation,
photo uploads, payments, appointment email delivery, and self-service account
deletion are later work. For account removal, the site owner must remove or
reassign owned listings and their dependent records before deleting the user
in Supabase Auth. Signing out does not delete database records.

## Validate changes

```sh
npm run build
npm test
npm run test:cloud
npm run test:database
```

The default browser suite checks the unconfigured demo. The cloud suite uses a
separate Vite server and mocked Supabase endpoints with fictitious public
settings; it does not connect to your project. The database suite requires
Docker and tests the actual migration in an isolated PostgreSQL 16 container,
including user isolation, server validation, and simultaneous booking attempts.
It publishes no host ports, attaches no persistent volume, and removes its
container afterward. Its minimal `auth.users`/`auth.uid()` substitutes exist only
in the test bootstrap, never in the hosted migration.

To regenerate the optional fictional seed after changing the source listings:

```sh
node supabase/generate-seed.mjs
```
