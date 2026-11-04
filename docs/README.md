# Documentation guide

Use this index to choose the guide for the task you are doing. The documents
describe the checked-in implementation; they do not prove that a hosted deploy,
email provider, Apple account, or sender domain has been configured.

## Start here

| You want to…                                            | Read                                                               | What it explains                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Understand what customers and hosts can do              | [Application README](../README.md)                                 | Features, browser demo versus connected mode, setup commands, limitations, and the overall application flow. |
| Understand individual frontend functions                | [Frontend function reference](../src/README.md)                    | Components, account and marketplace operations, inputs, results, state ownership, and error handling.        |
| Set up or inspect the database                          | [Supabase README](../supabase/README.md)                           | Migration order, data ownership, schema, RPCs, availability, MFA, and booking/email transactions.            |
| Repair an existing manual SQL setup's migration history | [Migration recovery README](../supabase/repairs/README.md)         | The guarded adoption repair, preconditions, verification queries, and what it refuses to change.             |
| Turn on booking emails                                  | [Booking email setup](booking-emails.md)                           | Sender-domain verification, Resend, server-only Netlify settings, delivery states, and troubleshooting.      |
| Understand the scheduled worker's functions             | [Netlify README](../netlify/README.md)                             | Function-by-function contracts, job payload, scheduling, headers, deadlines, counters, and retries.          |
| Prepare the iPhone app                                  | [iPhone setup guide](iphone.md) and [iOS README](../ios/README.md) | Building and syncing bundled assets, native account links, Xcode, signing, device tests, and release work.   |
| Understand the generated Swift package                  | [CapApp-SPM README](../ios/App/CapApp-SPM/README.md)               | How Capacitor and the App plugin are linked into the native target and which files are generated.            |
| Understand map rendering and fallback assets            | [Map README](../public/maps/README.md)                             | Map selection, clusters, geographic filtering, offline fallback data, sources, and licenses.                 |
| Understand neighbourhood matching and manual pins       | [Location README](../public/locations/README.md)                   | Supported-city matching, ambiguous names, coordinate confirmation, catalogue coverage, and provenance.       |

## Suggested reading paths

For a site owner setting up a working deployment:

1. Run the app using the [application README](../README.md#run-locally).
2. Apply migrations and connect public browser settings using the
   [Supabase guide](../supabase/README.md).
3. Test with a customer account and a host account: list a space, edit it, set
   availability, book, and cancel.
4. Enable real booking-email delivery only after completing
   [the email setup guide](booking-emails.md).
5. Prepare an iPhone development build using [the iPhone guide](iphone.md).

For a developer changing application behavior:

1. Find the UI action and owning function in the
   [frontend reference](../src/README.md).
2. Check the [database reference](../supabase/README.md) before changing a
   mutation or permission rule. The server validates booking and ownership
   rules independently of the UI.
3. For email-related changes, compare the SQL job contract with
   [the worker reference](../netlify/README.md).
4. Run the existing check appropriate to the changed layer; commands and their
   scope are listed below.

## What the checks establish

| Command                 | Checks                                                                                                      | Does not establish                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run build`         | TypeScript and the production web build.                                                                    | Hosted settings, provider delivery, or Apple compilation/signing.    |
| `npm test`              | Browser-demo flows in desktop and mobile Chromium.                                                          | Real shared-user database behavior or iPhone device behavior.        |
| `npm run test:cloud`    | Connected-mode browser flows using mocked Supabase endpoints.                                               | Your hosted Supabase project's state or production connectivity.     |
| `npm run test:database` | Real SQL migrations, permissions, snapshots, and concurrent operations in an isolated PostgreSQL container. | Changes to or inspection of your hosted database.                    |
| `npm run test:emails`   | Worker rendering, scheduled-event routing, failures, and acknowledgment behavior with fake requests.        | Real sender verification, provider acceptance, or inbox delivery.    |
| `npm run test:native`   | Native account-callback parsing with fictitious values.                                                     | A signed iPhone app, a real account session, or App Review approval. |
| `npm run mobile:sync`   | Web build and copying/configuration of the iOS project through Capacitor.                                   | Compilation, simulator/device testing, signing, or upload to Apple.  |
| `npm run format:check`  | Formatting of files included by the repository's Prettier configuration.                                    | Runtime correctness.                                                 |

## Important system boundaries

- The website and iPhone app use the same frontend and Supabase data. They do
  not have separate account or booking databases.
- Browser-demo storage stays on that browser/device. It is never automatically
  uploaded into a connected account.
- Public `VITE_` connection settings belong in frontend builds. Private
  provider/service-role keys belong only in Netlify Functions settings.
- Booking emails and Supabase account-confirmation/password-reset emails are
  separate systems. Configuring one does not enable the other.
- Booking confirmation records a saved appointment. It does not prove an email
  arrived, collect money, verify a provider, or submit an app to Apple.

When changing a function, update the README for its owning layer and the links
from the application README rather than copying the same implementation
description into every guide.
