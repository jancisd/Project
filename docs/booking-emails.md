# Booking emails

The database queues confirmation and cancellation emails for both the customer
and the owner of a real listing. A booking made more than 24 hours ahead also
gets a reminder scheduled for 24 hours before it starts. Sample/demo listings
do not generate emails. The migration does not email historical bookings.

Email delivery is separate from Supabase Auth's signup and password-reset
emails. Configuring SMTP in Supabase does not configure this worker.

This guide explains operator setup and the end-to-end delivery behavior. For
the JavaScript function contracts and complete claimed-job JSON shape, use the
[Netlify function reference](../netlify/README.md). For database ownership,
permissions, and SQL RPCs, use the [Supabase reference](../supabase/README.md).
The [documentation index](README.md) links the other application guides.

## What sends an email

| Action                                                        | Jobs created                                                                                                                                                                                          | Recipient source                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A confirmed booking is inserted for a real host-created space | A confirmation for each valid customer/host recipient. A reminder for each valid recipient only when the appointment starts strictly more than 24 hours after the booking transaction's current time. | Customer: the booking's `guest_email`. Host: the owning account's `auth.users.email`. |
| A confirmed booking changes to cancelled                      | A cancellation for each valid customer/host recipient; pending or processing confirmations/reminders are cancelled.                                                                                   | The booking contact address and owning account address at this cancellation event.    |
| An identical booking request is retried                       | No duplicate jobs for the same booking, event, and recipient role.                                                                                                                                    | The existing jobs are preserved by their unique key.                                  |
| A listing is edited or its opening hours change               | No email event. Existing booking snapshots remain unchanged.                                                                                                                                          | Not applicable.                                                                       |
| A sample/demo studio is booked                                | No jobs.                                                                                                                                                                                              | No real provider is contacted for fictional sample listings.                          |
| The notification migration is applied                         | No historical backfill. A later cancellation of an existing real booking is a new event and can create cancellation jobs.                                                                             | Not applicable until a new booking event occurs.                                      |

The queue has one unique entry for each `(booking_id, emailkind,
recipient_role)`. Customer and host are separate roles even if their addresses
happen to be the same. A missing or invalid host address is skipped; it does not
invent a recipient or prevent the customer from booking.

Message payloads snapshot the booking data for that event. Editing the public
space or changing an account's email later does not rewrite an already queued
message. Booking contact details are used for transactional messages, not a
marketing subscription.

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

The worker's local validation checks the shape of settings, not their real
authorization or DNS state. A nonempty but unusable provider key may pass local
validation and then produce an acknowledged provider failure. Check actual
sender verification and API access in Resend. The repository alone cannot
confirm that a domain or production credentials have been configured.

## How delivery works, in order

1. The customer's booking RPC validates the requested service and time inside
   Supabase and commits the saved appointment.
2. The `booking_email_outbox` database trigger writes jobs in
   `airstethics_private.booking_email_jobs` as part of that database transaction.
   A provider outage therefore cannot make an HTTP request hang the transaction;
   the trigger itself still needs valid database permissions and schema.
3. The scheduled worker validates all five environment values. Missing or
   locally invalid settings leave the queue unclaimed.
4. `claim_booking_emails(5)` suppresses obsolete work, selects eligible jobs
   using row locks with `SKIP LOCKED`, increments attempts, and supplies new
   five-minute lease tokens. Two workers cannot claim the same active lease.
5. `bookingEmail(job, site)` validates the payload and creates a subject, HTML,
   and plain-text alternative. Dynamic HTML is escaped.
6. The worker calls Resend with the configured sender, one job recipient, and
   `Idempotency-Key: booking-email:<job UUID>`.
7. Provider acceptance requires a successful response containing a nonempty
   message `id`. The worker then calls `finish_booking_email` with the exact job
   ID and lease token. A stale token cannot acknowledge another worker's claim.
8. Counters are returned to the scheduled invocation. Messages and recipients
   are not included in that response or logged by the worker.

Delivery is asynchronous. With a 15-minute schedule, an immediately due
confirmation or cancellation normally waits until a scheduled run, and may wait
longer because of backlog, provider errors, or missing configuration. A reminder
is due 24 hours before the appointment, not guaranteed to reach an inbox at
that exact instant.

## Queue states and counters

| Queue state  | Meaning                                                                                            | What can happen next                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pending`    | A new or failed-attempt job is waiting for its `due_at` time.                                      | A future worker claims it, or cancellation/past-booking suppression removes it from delivery eligibility. |
| `processing` | A worker has claimed the job and received a five-minute lease.                                     | A matching acknowledgment marks success/failure. An expired lease can be reclaimed if attempts remain.    |
| `delivered`  | Provider acceptance and the success acknowledgment were recorded.                                  | Repeating the same successful acknowledgment is harmless. The status is not an inbox-placement receipt.   |
| `cancelled`  | The confirmation/reminder became obsolete, or its booking was cancelled/past before a later claim. | The worker does not send it through normal claims. A separate cancellation job may still be pending.      |
| `failed`     | The maximum of eight claims has been exhausted.                                                    | Site-owner investigation is required; it is not automatically retried by normal claims.                   |

On acknowledged failure, the delay is
`min(3600, 60 × 2^(attempts − 1))` seconds. The worker reports a fixed category
such as `provider_rate_limited`, `provider_unavailable`, `provider_rejected`,
`provider_network`, or `invalid_job`, rather than storing a raw provider error.
The next scheduled run must still occur after the job becomes due.

The worker response has `configured`, `claimed`, `delivered`, `retrying`, and
`unacknowledged` fields, plus `unavailable: true` on a failed/invalid claim
response. HTTP 200 can mean delivery is inactive (`configured: false`), no work
was due, or provider failures were acknowledged (`retrying > 0`). HTTP 503 means
a claim was unavailable or a job acknowledgment could not be confirmed. The
`retrying` counter includes acknowledged failed sends even when SQL has reached
its final attempt; inspect queue state when investigating exhaustion.

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

## Troubleshooting

| Symptom                                         | Check                                                                                                                                                                                                  | Expected next step                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function returns `configured: false`            | All five variables exist in the deployed production Functions environment; both URLs are HTTPS origins; the Supabase value is a private server key; the sender is a valid address without line breaks. | Correct the environment and deploy the relevant configuration. The worker should not claim jobs until these local checks pass.                                                    |
| Function returns `unavailable: true`            | The notification migration is applied to the same project named by `SUPABASE_URL`; the project origin has no `/rest/v1/` suffix; the service key works.                                                | Restore the server connection or missing RPCs. Do not replace the key with a public browser key.                                                                                  |
| `retrying` increases                            | Resend's sender-domain verification, key permissions, account limits, and provider health.                                                                                                             | Resolve the provider problem and let eligible jobs retry. A failed-attempt HTTP 200 is not proof of delivery.                                                                     |
| `unacknowledged` increases                      | Database reachability, the finish RPC, and whether a booking was cancelled or a lease was replaced during work.                                                                                        | Inspect the queue from the privileged dashboard. An email may already have reached the provider; keep its existing job ID for idempotency rather than creating a fresh duplicate. |
| Booking exists but no job exists                | The space is a real non-demo listing with an owner; the event happened after the migration; addresses are valid.                                                                                       | Sample bookings intentionally create no jobs. Applying the migration does not backfill old bookings.                                                                              |
| Host gets no email while the customer does      | The owner's account has a usable email address.                                                                                                                                                        | Fix the account address for future events. No private host email is copied from a public listing field.                                                                           |
| No 24-hour reminder exists                      | The booking was created strictly more than 24 hours ahead.                                                                                                                                             | Near-term bookings intentionally receive confirmations without an immediate extra reminder.                                                                                       |
| Job remains `pending`                           | Its `due_at`, the production function schedule, active deployment, and earlier jobs in the batch order.                                                                                                | Wait for its due time and an available scheduled batch, or fix the stopped schedule.                                                                                              |
| Worker claims zero jobs                         | Jobs may be future-due, actively leased, delivered, cancelled, or exhausted; sample bookings may have created none.                                                                                    | Inspect status totals before assuming a delivery failure.                                                                                                                         |
| Job is `delivered` but no inbox message appears | Resend's delivery events and the recipient's spam/quarantine handling.                                                                                                                                 | Investigate provider delivery and mailbox handling; the database status means provider acceptance plus acknowledgment.                                                            |

For an authorized site owner, this read-only SQL Editor query gives queue
totals without printing recipients, booking payloads, or keys:

```sql
select status, emailkind, recipient_role,
       count(*) as jobs,
       min(due_at) as earliest_due_at
from airstethics_private.booking_email_jobs
group by status, emailkind, recipient_role
order by status, emailkind, recipient_role;
```

Use Supabase's privileged dashboard for that inspection. Do not add browser
grants to the private queue, expose the service key in `VITE_` variables, or
make the worker a public HTTP route. `claim_booking_emails` is not a read-only
inspection tool: calling it changes attempt counts and leases.

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
