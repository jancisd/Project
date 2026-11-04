# Netlify hosting and booking-email functions

This directory contains the server-side booking-email worker. The website itself
is a static Vite build: Netlify serves `dist/`, while Supabase handles accounts,
listings, availability, and booking transactions. A successful booking does not
wait for Resend or make an email request from the browser.

Start with the [application README](../README.md) for product behavior,
the [frontend function reference](../src/README.md) for browser functions,
and the [email setup guide](../docs/booking-emails.md) to enable delivery.

## Files and responsibilities

| File                                                                                                                             | Responsibility                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [`../netlify.toml`](../netlify.toml)                                                                                             | Builds with `npm run build`, publishes `dist/`, selects Node 24, schedules the email worker, and sends unknown app routes to `index.html`. |
| [`functions/booking-emails.mjs`](functions/booking-emails.mjs)                                                                   | Validates server settings, claims private email jobs, renders messages, calls Resend, and acknowledges each job's exact lease.             |
| [`../supabase/migrations/202610260003_booking_notifications.sql`](../supabase/migrations/202610260003_booking_notifications.sql) | Queues booking events and implements service-role-only claim/finish RPCs.                                                                  |
| [`../scripts/test-booking-emails.mjs`](../scripts/test-booking-emails.mjs)                                                       | Exercises the worker with fake fetch calls and fictitious settings. It sends no real email.                                                |

## Website deployment

`[build]` in `netlify.toml` runs `npm run build` and publishes `dist/`. The
frontend's public Supabase settings are read by Vite at build time. Changing
those settings requires a new build.

The final redirect serves `/index.html` for app routes that do not match an
existing asset. `force = false` allows real files to be served normally. This
redirect is unrelated to authentication redirects: Supabase's allowed account
callback URLs are configured in Supabase, as described in the
[database guide](../supabase/README.md).

## Complete booking-email flow

1. A customer calls the booking RPC with a chosen space, service, date, time,
   booking contact details, and a request UUID.
2. Supabase validates ownership-independent booking rules, availability, and
   conflicts, then inserts the booking.
3. The `booking_email_outbox` trigger snapshots the booked details into private
   email jobs. It does not contact Resend. Fictional sample listings create no
   email jobs.
4. Netlify invokes `booking-emails` every 15 minutes according to
   `schedule = "*/15 * * * *"`.
5. The worker validates its configuration before claiming work. If required
   values are missing or locally invalid, it returns `configured: false` and
   makes no database or provider request.
6. It calls `claim_booking_emails` with `p_limit: 5`. Supabase returns eligible
   jobs with new five-minute leases and incremented attempt counts.
7. For each job, the worker validates its payload, creates HTML and plain text,
   and posts the message to Resend using `booking-email:<job UUID>` as the
   provider idempotency key.
8. It calls `finish_booking_email` with that job's ID and exact lease token.
   Supabase marks acknowledged success as delivered, or schedules a bounded
   retry after acknowledged failure.

A booking can therefore exist while its email is pending, retrying, or failed.
The booking confirmation screen confirms the reservation, not inbox delivery.

## Function reference

All function names below are from
[`booking-emails.mjs`](functions/booking-emails.mjs). Only the functions marked
as exported are available to other JavaScript modules.

### Validation and rendering helpers

| Function                               | Input                                                     | Return or effect                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `email(value)`                         | A candidate recipient or sender-address value.            | `true` only for a string no longer than 254 characters matching the worker's email pattern. This is a format check, not mailbox verification. |
| `configuration(env)`                   | An environment object containing the five settings below. | A normalized `{ project, site, key, resend, from }` object, or `null` if validation fails. No network requests occur here.                    |
| `escapeHtml(value)`                    | A value to insert into message HTML.                      | Converts it to a string and escapes `&`, `<`, `>`, double quotes, and apostrophes.                                                            |
| `text(value, maximum = 200)`           | A candidate text field and maximum length.                | Checks for a nonempty bounded string without control characters.                                                                              |
| `bookingEmail(job, site)` **exported** | A claimed job plus the validated website URL.             | Returns `{ subject, text, html }`, or throws `Error('invalid_job')` before a message is sent.                                                 |
| `timeoutSignal()`                      | No arguments.                                             | An `AbortSignal` with a 3,000 ms deadline, used for each database and Resend fetch.                                                           |

`configuration` requires both URLs to be HTTPS origins with no credentials,
query, fragment, or non-root path. A copied `/rest/v1/` URL is invalid here:
`SUPABASE_URL` must be the project origin. This worker's validation differs from
the frontend's URL-normalization helper.

The Supabase key must start with `sb_secret_`, or be a legacy JWT whose decoded
payload names the `service_role` role. A public publishable or `anon` key is
rejected. Decoding a legacy role is only a local configuration check; Supabase
still authenticates the real request. Likewise, `configured: true` does not
prove that a Resend key, verified domain, or project credential works.

`BOOKING_EMAIL_FROM` accepts an address or a display-name form such as
`airstethics <bookings@example.com>`. Carriage returns and line feeds are
rejected. The actual sender must also be permitted by Resend.

### `bookingEmail(job, site)`

The job must contain valid job and lease UUIDs, an email recipient, one of
`confirmation`, `reminder`, or `cancellation`, and the payload described below.
Validation checks the real calendar date, `HH:MM` time, the exact
`America/Edmonton` timezone, integer duration from 1 to 540 minutes, and finite
price from 0.01 to 10,000. Invalid jobs never reach the provider.

The renderer chooses its heading from the event and recipient role:

| Event          | Customer subject prefix         | Host subject prefix             |
| -------------- | ------------------------------- | ------------------------------- |
| `confirmation` | `Your appointment is confirmed` | `You have a new booking`        |
| `reminder`     | `Upcoming appointment reminder` | `Upcoming appointment reminder` |
| `cancellation` | `Appointment cancelled`         | `Appointment cancelled`         |

Each subject ends in ` · airstethics`. Messages include space, service,
calendar date, Alberta-local time, duration, CAD price, and booking reference.
Host messages additionally include the guest's booking name and email. The
customer message does not expose the host's private account email.

Dynamic details are escaped in HTML and retained literally in the plain-text
alternative. The date is formatted from its date-only value using UTC, avoiding
an accidental date shift; the stored appointment time is displayed as Alberta
time. Messages link to the configured site and direct customers to **My
appointments** or hosts to **My business**. They explicitly make no claim that
a payment or refund occurred.

### `runBookingEmails(options = {})` — exported

| Option      | Default                      | Purpose                                                                                |
| ----------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `env`       | `process.env`                | Supplies server-only connection and sender settings.                                   |
| `fetchImpl` | Global `fetch`               | Makes database and provider requests; tests replace it with a fake implementation.     |
| `pause`     | A promise using `setTimeout` | Spaces provider send starts. Tests replace it so they do not wait.                     |
| `now`       | `Date.now`                   | Supplies milliseconds for the send-start schedule; injectable for deterministic tests. |

Its nested `rpc(name, body)` posts JSON to
`<SUPABASE_URL>/rest/v1/rpc/<name>`, sends the key as `apikey`, and adds bearer
authorization only for a legacy JWT. Modern `sb_secret_` keys are opaque API
keys, not bearer JWTs. Both claim and finish requests have the same three-second
deadline.

The claim response must be an array containing at most five jobs. A failed
claim, invalid JSON response, non-array response, or oversized array returns
`unavailable: true`; no jobs are sent from that response.

The nested `sendSlot()` spaces send starts by at least 600 ms within one
invocation. The nested `deliver(job)` renders, sends, and acknowledges one job.
Jobs run in groups of at most two; a failure in one job does not prevent the
remaining jobs from being processed. These limits are local to one invocation,
not a global rate limiter across multiple workers.

Resend counts as accepted only when its response is successful and its JSON
body contains a nonempty provider `id`. The worker then acknowledges success in
Supabase. A positive provider response with a lost or rejected database
acknowledgment is counted as unacknowledged, not as confirmed delivery.

The returned counters contain no recipient or booking data:

```json
{
  "configured": true,
  "claimed": 2,
  "delivered": 1,
  "retrying": 1,
  "unacknowledged": 0
}
```

| Field            | Exact meaning                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configured`     | The local environment format checks passed. It is not a provider-health check.                                                                                               |
| `claimed`        | Number of jobs returned in a valid claim response.                                                                                                                           |
| `delivered`      | Provider acceptance and the matching database success acknowledgment both completed. It does not establish inbox placement.                                                  |
| `retrying`       | A failed send or invalid job received a positive failure acknowledgment. SQL decides whether another attempt remains; the counter can also include the final failed attempt. |
| `unacknowledged` | A job could not be acknowledged because its ID/lease was malformed, the finish request failed, or SQL rejected the lease.                                                    |
| `unavailable`    | Present as `true` when the claim endpoint failed or returned an invalid batch.                                                                                               |

### `createScheduledHandler(run = runBookingEmails)` — exported

This factory returns the Netlify handler and lets tests inject a fake worker.
It accepts only an event with `httpMethod: 'POST'` and a header whose
case-insensitive name is `X-NF-Event` and whose value is exactly `schedule`.
Other events receive HTTP 405 and `Scheduled invocation only.` without
dispatching the worker. A body containing `next_run` is not sufficient.

After dispatch, it returns the counters as JSON with HTTP 503 when
`unavailable` is true or `unacknowledged` is nonzero; otherwise it returns HTTP 200. Missing configuration therefore produces HTTP 200 with `configured:
false`. An acknowledged provider failure can also produce HTTP 200 with a
nonzero `retrying` count. HTTP 200 alone does not mean that emails were sent.

`handler` is the exported handler instance created by
`createScheduledHandler()`.

Netlify's scheduled-only deployment is the access boundary: scheduled functions
have no publicly callable production HTTP endpoint. The header check is an
additional routing check, not authentication that would make a public route
safe. Keep the schedule in `netlify.toml`; do not expose this worker through a
new public route.

## Claimed-job contract

The following example is fictitious. UUIDs, addresses, and payload are shown
only to explain the data contract.

```json
{
  "id": "10000000-0000-4000-8000-000000000001",
  "recipient": "guest@example.com",
  "emailkind": "confirmation",
  "attempts": 1,
  "lease_token": "20000000-0000-4000-8000-000000000001",
  "payload": {
    "bookingId": "30000000-0000-4000-8000-000000000001",
    "listingId": "40000000-0000-4000-8000-000000000001",
    "listingName": "Example Studio",
    "serviceName": "Signature cut",
    "guestName": "Alex Example",
    "guestEmail": "guest@example.com",
    "date": "2026-12-10",
    "time": "14:30",
    "timezone": "America/Edmonton",
    "duration": 60,
    "price": 85,
    "currency": "CAD",
    "recipientRole": "customer",
    "reference": "30000000"
  }
}
```

The SQL worker APIs are:

- `claim_booking_emails(p_limit integer default 25)`: service-role-only;
  accepts 1–100 and returns claimed rows with leases. The JavaScript worker
  deliberately requests five, rather than using the SQL default of 25.
- `finish_booking_email(p_id uuid, p_lease_token uuid, p_delivered boolean,
p_error text default null)`: service-role-only; returns whether the exact
  lease could be acknowledged. The worker supplies only fixed error categories.

See [the database reference](../supabase/README.md) for table permissions,
trigger behavior, and SQL function details.

## Delivery state, retries, and operational limits

The private queue uses `pending → processing → delivered` for acknowledged
success. A claim increments `attempts` and creates a five-minute lease. A failed
send acknowledged with the current lease returns the job to `pending`, unless
its eighth attempt has been reached, when it becomes `failed`.

Failure backoff is `min(3600, 60 × 2^(attempts − 1))` seconds: one, two, four,
eight minutes, and so on, capped at an hour. Eligibility does not cause an
immediate run: delivery waits for the next scheduled invocation and available
batch capacity. A crashed worker's expired lease can be reclaimed; a new claim
gets a new token, so the old worker cannot finish the new worker's lease.

Cancelling a booking marks pending or processing confirmation/reminder jobs
`cancelled`, clears their leases, and queues cancellation messages. Claiming
also suppresses unsent confirmations/reminders for appointments that are already
past or no longer confirmed. Delivered messages are not recalled. A provider
request already in flight may still arrive after cancellation; the old lease
cannot acknowledge it, and the cancellation message communicates the new state.

The provider key `booking-email:<job UUID>` stays the same after a lease retry.
It reduces duplicates within Resend's idempotency-retention window; it does not
promise exactly-once delivery after a prolonged outage. No provider response,
recipient, token, or message body is logged by this worker.

## Required server settings

| Setting                     | Example or expected value                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | `https://your-project.supabase.co`                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | A real server-only service-role JWT or `sb_secret_…` key; never the browser key.                          |
| `RESEND_API_KEY`            | A Resend key authorized to send email.                                                                    |
| `BOOKING_EMAIL_FROM`        | A sender permitted on your verified domain, such as `airstethics <bookings@example.com>`.                 |
| `SITE_URL`                  | Your HTTPS website origin with an optional trailing slash, for example `https://airsthetic.netlify.app/`. |

Set these for Netlify's production Functions environment and production deploy
context. Never use a `VITE_` prefix for private keys: Vite values can be included
in the public website and iPhone bundle. A repository cannot establish whether
the hosted settings or DNS have been configured; verify them in the service
dashboards. The [setup guide](../docs/booking-emails.md) explains domain
verification and activation.

## Verification and troubleshooting

Run `npm run test:emails` for mocked worker checks and `npm run test:database`
for isolated PostgreSQL queue/permission/concurrency checks. Neither requires
production keys or sends real email. Tests cover the event guard, malformed
jobs, escaping, provider failures, unavailable database claims, lost
acknowledgments, stable provider keys, and modern/legacy key headers.

For hosted troubleshooting, use the counter meanings above together with the
operator steps in [booking-emails.md](../docs/booking-emails.md#troubleshooting).
Do not add queue-read grants for browser users to inspect a delivery problem.
