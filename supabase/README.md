# Connect the database

The app supports Supabase PostgreSQL, password accounts, and optional
authenticator verification while remaining
deployable as the existing browser demo. This repository does not provision or
connect a hosted project automatically.

## Set up Supabase and Netlify

1. Create a project at [Supabase](https://supabase.com/dashboard). Choose a
   Canadian database region if available for your account. Keep the database
   password in your own password manager.
2. Create the database schema using one migration workflow. If Supabase's
   GitHub integration or CLI is managing migrations, let that workflow apply
   the files in `migrations/` in filename order. For a SQL Editor-only setup,
   run [`migrations/202610220001_marketplace.sql`](migrations/202610220001_marketplace.sql)
   once, followed by
   [`migrations/202610230001_listing_photos.sql`](migrations/202610230001_listing_photos.sql)
   and [`migrations/202610230002_account_security.sql`](migrations/202610230002_account_security.sql).
   The first creates the four app tables and booking functions; the second
   creates photo storage and permissions; the third enforces authenticator
   verification for enrolled accounts. **If the four app tables already
   exist, do not rerun the initial setup.** Manual SQL does not record migration
   history automatically. Before enabling automatic deployments for an existing
   manual setup, follow the [migration history recovery guide](repairs/README.md).
3. Optionally run [`seed.sql`](seed.sql) in the SQL Editor to populate the
   fictional Alberta studios from the demo. Skip this for an empty catalogue.
   These seeded businesses are marked as samples; their bookings do not notify
   a real provider. The seed does not upload browser data or create accounts.
4. In **Authentication → URL Configuration**, set **Site URL** to your published
   Netlify address and add that exact URL to **Redirect URLs**. Include the
   trailing slash if your app is served at `/`. For local development, also
   allow `http://localhost:5173/` or the exact local origin you use. Add the
   password recovery URL as well, for example
   `https://airsthetic.netlify.app/?account=recovery` (and its local equivalent).
5. Enable the Email authentication provider for email/password accounts. Keep
   email confirmation enabled for new registrations. Supabase's built-in email sender has recipient
   restrictions and rate limits; configure custom SMTP before inviting public
   users. Test confirmation and password-reset delivery with an account you control.
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

## If a sign-in email fails

The default Supabase sender only delivers to email addresses belonging to your
Supabase **organization team**. To test before configuring email delivery, use
your Supabase account's email address. Adding an address under Authentication
→ Users does not make it an approved recipient for the default sender.

For public sign-ups, configure a custom email provider in **Authentication →
SMTP Settings**. Follow the provider's sender/domain verification instructions,
enter its SMTP settings directly in Supabase, and test delivery there. SMTP
passwords and API secrets belong in Supabase's SMTP settings, never in the Vite
frontend or Netlify's `VITE_` variables. See [Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

The sign-in form distinguishes restricted recipients, email request limits,
disabled email sign-in, connection settings, and delivery/network failures.
If a request is rate limited, allow time before requesting another link rather
than repeatedly clicking Send. For an unrecognized failure, inspect the latest
Auth error in Supabase's project logs.

`VITE_SUPABASE_URL` should be the project origin ending in `.supabase.co`, or
your configured custom domain. The app also accepts the Data API panel's
`/rest/v1/` URL and normalizes it to the project origin before making requests.

## Passwords and authenticator apps

**Log in** uses email and password without sending a new email on each login.
**Create account** registers a password and asks for email confirmation when
enabled in Supabase. The app requires at least eight characters for a new
password; stronger password rules configured in Supabase also apply.

Existing email-link users can use **Forgot password** to receive a reset link,
or log in with **Use an email link instead** and set a password under **Account**.
The fallback link cannot create a new account. Password recovery requires the
valid session established by Supabase's recovery link; the URL flag alone does
not authorize a password change. Supabase manages passwords, not app tables or
browser demo storage. Sessions restore after reload until sign-out or expiry.

In **Account**, choose **Enable authenticator**, scan the QR code in an app such
as Google Authenticator, Microsoft Authenticator, or 1Password, then verify its
six-digit code. Setup is not complete until verification succeeds. Cancelling
removes the unfinished factor. Supabase enables TOTP by default; see its
[authenticator guide](https://supabase.com/docs/guides/auth/auth-mfa/totp).

After enrollment, each new password or email-link session requires a code before
private favourites/bookings can load or account actions can proceed. The
database enforces this as well as the UI. A verified session can remove the
authenticator in **Account**. This initial version does not generate backup
codes or provide automatic lost-device recovery; use an authenticator with
secure backup and keep access to it. An account with a lost factor requires
the site owner's identity-checked recovery process in Supabase.

## Data and access rules

- Everyone can read published listings and their services. Signed-in users can
  publish a listing. New listings retain the confirmed map location and receive
  server-generated IDs; fabricated client ratings and reviews are discarded.
- A listing can include up to 8 JPEG, PNG, or WebP photos, up to 5 MiB each.
  The first photo is the cover; it can be changed or removed before publication.
  The browser resizes and re-encodes uploads, removing camera metadata. Photos
  are public in the `listing-photos` Storage bucket and are uploaded when the
  user publishes. Upload permissions are limited to the signed-in user's UUID
  folder; clients cannot overwrite another user's files or delete photos used
  by a published listing. Failed uploads keep form details and can be retried.
  A retry after a listing-save error reuses the existing uploaded URLs.
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
- Enrolled accounts need a Supabase `aal2` session for private reads, favourites,
  listing photo uploads/deletes, and booking/listing RPC mutations. Authenticator
  codes and setup secrets are not saved in app storage. Public discovery,
  listing photos, and anonymous availability remain available.
- Existing local listings, saved places, and demo bookings stay separate. There
  is **no automatic upload or migration** of old contact details.
- Missing both connection settings selects demo mode. Partial/invalid settings,
  authentication failures, and network/database errors are shown as errors;
  configured cloud mode never silently falls back to local storage.

In demo mode, uploaded photos are compressed and saved in browser storage with
the listing. A bounded gallery budget and storage-quota checks keep failed
saves visible. Photos are never automatically uploaded when switching from
demo mode to a connected project. Files left behind by abandoned or interrupted
publication attempts may require periodic cleanup by the site owner; never
delete an upload that might belong to an in-progress publication.

The initial model reserves one appointment at a time per listing. Multiple
staff calendars, provider appointment management, listing editing/moderation,
payments, appointment email delivery, and self-service account
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
