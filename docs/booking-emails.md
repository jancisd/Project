# Booking emails

The database queues confirmation and cancellation emails for both the customer
and the owner of a real listing. A booking made more than 24 hours ahead also
gets a reminder scheduled for 24 hours before it starts. Sample/demo listings
do not generate emails. The migration does not email historical bookings.

Email delivery is separate from Supabase Auth's signup and password-reset
emails. Configuring SMTP in Supabase does not configure this worker.

## Turn on delivery

1. Create an account at [Resend](https://resend.com/) and verify a sender domain
   you control. Follow its DNS instructions. Use a real sender address on that
   verified domain, such as `bookings@your-domain.ca`.
2. Create a Resend API key with email-sending access. Enter it directly in
   Netlify; do not put it in chat, source files, or client configuration.
3. In Netlify's environment variables, set these for the **production Functions
   scope** and production deploy context:

   | Variable                    | Value                                                               |
   | --------------------------- | ------------------------------------------------------------------- |
   | `SUPABASE_URL`              | Your project origin, `https://your-project.supabase.co`             |
   | `SUPABASE_SERVICE_ROLE_KEY` | A server-only Supabase service-role key or `sb_secret_…` key        |
   | `RESEND_API_KEY`            | The Resend sending API key                                          |
   | `BOOKING_EMAIL_FROM`        | `airstethics <bookings@your-verified-domain.ca>`                    |
   | `SITE_URL`                  | `https://airsthetic.netlify.app/`, or your production custom origin |

   Mark secret values as secrets. If your Netlify plan cannot restrict scopes,
   restrict their deploy context to production and ensure only Functions code
   reads them. **None of these private keys belongs in a `VITE_` variable.**
   The existing public `VITE_SUPABASE_URL` and publishable key remain unchanged.

4. Let Supabase apply
   [`202610260003_booking_notifications.sql`](../supabase/migrations/202610260003_booking_notifications.sql)
   through the configured migration workflow, then deploy the Netlify change.
5. Netlify's `booking-emails` scheduled function runs every 15 minutes. Confirm
   that it appears under Functions and is scheduled. You can trigger it from
   Netlify's authenticated dashboard when deliberately testing delivery to
   accounts you control. Sending real booking mail requires this configuration;
   the repository's automated tests never send mail.

Missing or invalid configuration disables delivery before any queue items are
claimed. Booking still succeeds and its queued email remains available for a
later configured run. Booking confirmation in the app describes the reservation
itself, not proof that an email was delivered. This worker sends email, not SMS
or iPhone push notifications.

## Delivery and privacy

- Job IDs supply Resend idempotency keys. If delivery succeeds but the database
  acknowledgment is lost, retries reuse that key. This reduces duplicate
  deliveries within Resend's idempotency retention window; it does not promise
  exactly-once email delivery across a prolonged outage.
- SQL claims use a five-minute lease and limited retries with backoff. A stale
  worker cannot acknowledge another worker's lease. Permanent provider failures
  stop after the queue's attempt limit and need site-owner attention.
- Cancelling invalidates queued confirmations and reminders. A message already
  accepted by the provider cannot be recalled; the cancellation email gives the
  updated state. Existing appointments are not moved when opening hours change.
- Messages show the booked service, price, date and Alberta time, and booking
  reference. Hosts also receive the guest's booking name and email. Guests do
  not receive the host's private account email.
- The worker escapes user content in HTML, provides a plain-text alternative,
  makes no payment/refund claims, and never logs recipients, booking content,
  credentials, or raw provider errors. Scheduled responses contain counters.
- Netlify scheduled functions have no publicly callable production HTTP URL.
  The schedule in `netlify.toml` is the access boundary and is required. The
  worker additionally checks Netlify's scheduler POST and `X-NF-Event: schedule`
  header. The local Netlify CLI emulates that scheduler event; a header check is
  not a replacement for the private scheduled-function configuration. Do not
  expose this handler through another public route.

## Check without sending email

```sh
node --test scripts/test-booking-emails.mjs
```

Every request in that suite uses a fake fetch function and fictitious keys. SQL
queue permissions, cancellation suppression, and retry leases are covered by
`npm run test:database` in the disposable PostgreSQL container.

Delivery starts at five jobs per scheduled invocation to keep execution bounded
and respect provider request limits. Increase throughput or use a dedicated
queue runner as real booking volume grows; monitor delivery separately from the
app's booking count.
