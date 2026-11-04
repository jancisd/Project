# Build, test, and release the iPhone app

This guide covers the procedure for preparing airstethics on a Mac and moving
toward TestFlight and App Store submission. The repository includes the native
project; it has not established a signed build, device validation, or Apple
approval.

For the actual function and file behavior, read the [iPhone project
README](../ios/README.md). For shared app functions, use the [frontend function
reference](../src/README.md). The [documentation index](README.md) links the
other setup guides.

## What is already prepared

- A Capacitor iOS project in `ios/` bundles the same React app as the website.
- Capacitor 8.5.3 and the App plugin 8.1.2 use Swift Package Manager.
- The project targets iPhone, with iOS 15.0 as its minimum version.
- The working app name is `airstethics`; the bundle identifier is
  `ca.airstethics.app`. This identifier still needs registration under the
  eventual Apple developer account.
- The native account callback scheme is `airstethics://auth`.
- Passwords, optional authenticator verification, listings, availability, and
  bookings use the same Supabase project as the configured website.
- There is no Android project, push-notification plugin, or native email worker.

## Prerequisites

Use Node.js 24 and npm. Native compilation, Simulator/device runs, signing, and
App Store uploads require a Mac with a compatible current Xcode installation
and an Apple account. An Apple Developer Program membership is needed for App
Store distribution; a free account supports limited development-device testing.

Linux can install dependencies, type-check/build the frontend, generate/sync
the native project, and run the parser tests. It cannot perform the Xcode steps.

The Supabase database and email delivery are separate setup tasks. See the
[database guide](../supabase/README.md) and [booking email guide](booking-emails.md).

## First local setup

1. Clone/open the repository and run `npm ci` at its root. This also installs
   the plugin package used by the native Swift package's local dependency path.
2. For a new local configuration, copy `.env.example` to `.env.local`, then
   replace the placeholders with the Supabase project URL and **public**
   publishable key. Keep an existing configured `.env.local` rather than
   overwriting it.
3. Run `npm run mobile:sync` to check TypeScript, build the frontend, copy its
   assets, and synchronize native plugins.
4. On a Mac, run `npm run ios:open` to open the project in Xcode.

```sh
npm ci
# For a new local configuration only:
cp .env.example .env.local
# Edit .env.local before building; replace the public example settings.
npm run mobile:sync
npm run ios:open
```

Only public settings belong in the bundle:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-public-key
```

A legacy public `anon` key is supported through `VITE_SUPABASE_ANON_KEY`.
Never add Resend keys, a Supabase `service_role`/`sb_secret_` key, or SMTP
credentials to a `VITE_` variable, native config, or source file.

## What the commands do

| Command               | Actual operation                                                                                             | Limit                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run build`       | Runs TypeScript and Vite to produce `dist/`.                                                                 | Does not compile Swift or test an iPhone.                                                        |
| `npm run mobile:sync` | Runs the frontend build, then `cap sync ios` to copy assets and update native plugins/package configuration. | Does not create a signed executable or run the Simulator.                                        |
| `npm run ios:open`    | Opens the project in Xcode.                                                                                  | Does not archive, upload, or obtain App Review approval.                                         |
| `npm run test:native` | Checks the pure native callback parser with fictitious token strings.                                        | Does not contact Supabase, send email, exercise the App plugin, or test native lifecycle events. |

The tracked native project contains source, configuration, and development
assets. `dist/`, `ios/App/App/public/`, generated Capacitor config copies, build
output, and developer-specific Xcode state are ignored by Git. A fresh checkout
needs a build/sync to receive the current frontend.

Do not edit copied files in `ios/App/App/public/`; those changes disappear on
sync. Change the React source and build again. Native dependency declarations
are also managed through npm and Capacitor; see the [Swift package
README](../ios/App/CapApp-SPM/README.md).

## Open and run in Xcode

1. Choose the **App** target and **App** scheme.
2. Review the target's Bundle Identifier. If the release identifier differs
   from `ca.airstethics.app`, update both `capacitor.config.ts` and the Xcode
   target. Register the intended identifier under the Apple developer account.
3. Select a development team under **Signing & Capabilities**. Let Xcode manage
   development signing as appropriate for that team and device.
4. Let Swift Package Manager resolve Capacitor and the locally installed App
   plugin.
5. Select a supported iPhone Simulator or connected iPhone and run the app.
6. Check login, the map, photo selection, keyboard behavior, and bookings before
   preparing a release archive.

The Capacitor setting `ios.scheme: 'App'` is the Xcode scheme, not the URL
scheme for email links. `Info.plist` separately registers `airstethics:` and
contains photo-library/camera purpose strings.

## Website deploys versus iPhone updates

The native config has no production `server.url`. The phone displays bundled
frontend assets, while network calls go to the configured Supabase project.

Vite reads public connection settings at build time. A Netlify variable change
only affects website builds that use it. An installed phone app keeps the
settings and assets included in its own build. To change its frontend or public
connection settings, rebuild/sync and distribute a new native build.

With neither public connection setting, the bundle runs the browser demo. With
a valid connection, it uses the configured shared database. It does not create
a new database or automatically upload old demo data. Cloud connection failures
are shown as errors rather than silently saved as demo bookings.

Supabase data and migrations are shared between website and iPhone clients using
that project. Review compatibility when changing server APIs used by already
installed app versions.

## Configure account email redirects

Passwords are the normal login method. Signup confirmation, password reset, and
the optional existing-account email-link fallback use native redirects when
requested inside Capacitor:

```text
airstethics://auth
airstethics://auth?account=recovery
```

Add both exact URLs to Supabase **Authentication → URL Configuration → Redirect
URLs**. Keep the website's Site URL and web redirects as well. Do not replace
the website Site URL with a native scheme. Confirmation email templates must
preserve Supabase's confirmation URL so the redirect and tokens survive.

These custom-scheme links open the app only when it is installed. The project
does not configure a verified HTTPS universal-link domain or an automatic
App Store/install fallback; use the web account flow for someone without the
app installed.

## How account callbacks are processed

1. `getAuthRedirectUrl` selects the native callback for signup, reset, or
   fallback email-link login requested in the app.
2. Supabase processes the account email's confirmation/recovery URL and
   redirects to that callback with tokens in its `#` fragment.
3. `SceneDelegate` forwards scene and URL events to Capacitor. A running app
   receives `appUrlOpen`; a stopped app's launch link is also exposed through
   `App.getLaunchUrl()`.
4. `initializeNativeAuth` sends both kinds of URL through `parseNativeAuthLink`.
   That parser restricts the endpoint, checks required token fields, and rejects
   malformed, duplicate, or provider-error callbacks.
5. `handleAuthLink` calls `supabase.auth.setSession`. Parsing a JWT-shaped
   string does not prove authentication: Supabase must return a valid user and
   session before the native helper continues.
6. A validated fragment with `type=recovery` emits
   `airstethics:password-recovery`. The shared account hook opens password
   replacement. Password saving still checks the session and any required
   authenticator verification.

The `?account=recovery` query flag alone cannot establish an account or authorize
password replacement. Tokens are not copied into navigation history or logged;
the duplicate-callback guard keeps a SHA-256 fingerprint of the most recently
handled URL. Invalid/expired links currently return quietly. Request a fresh
link in the account form when one cannot be used.

## Real-device test matrix

| Scenario                                 | Expected result                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Password login                           | Existing account opens without requesting another login email.                                 |
| Quit and reopen after login              | Supabase's persisted session restores, subject to expiry/security checks.                      |
| Signup with confirmation enabled         | Confirmation email returns to the installed app and establishes the validated account session. |
| Password reset while running             | Warm callback processing opens password replacement after session validation.                  |
| Password reset after terminating the app | Cold-launch URL processing reaches the same recovery flow.                                     |
| Recovery query flag without tokens       | Does not establish a session or authorize a password change.                                   |
| Malformed, expired, or other-app URL     | Does not establish an unvalidated account; a fresh link may be required.                       |
| Verified authenticator on the account    | Protected actions remain unavailable until the required code is verified.                      |
| Sign out or change accounts              | Previous private bookings and host information clear from the shared account state.            |

Deliberate device tests against a connected project can send real Auth emails.
The automated parser tests send no email and make no account/network requests.

## Photos, maps, and booking emails

Photo selection uses the shared React picker. iOS photo/camera prompts use the
purpose strings in `Info.plist`; test the real picker and any camera option on
supported iPhones. Compression, upload paths, ownership checks, and listing
saving use the same frontend/database functions as the website.

Discovery uses the shared Leaflet map and bundled fallback assets, with detailed
street tiles loaded when available. It is not a separate Apple Maps screen and
does not establish verified business addresses. Test touch gestures, scrolling,
keyboard coverage, and offline tile failure on a device.

Booking confirmations, reminders, and cancellations remain server-side Netlify
email jobs. The phone has no provider key, local reminder scheduler, or push
notification implementation. See [booking email setup](booking-emails.md) for
activation and delivery limits.

## Before TestFlight or App Store submission

1. Replace the generated app icon and splash placeholders with release branding.
2. Choose final version/build numbers and test on supported iPhones.
3. Complete an in-app account-deletion flow; account deletion is not currently
   implemented in this marketplace.
4. Create the App Store Connect record and complete privacy disclosures for
   accounts, photos, and booking contact details. Provide live privacy/support
   URLs.
5. Review current Apple distribution requirements. Email/password login alone
   does not add a need for Sign in with Apple; adding third-party social login
   later requires a separate review of Apple's login rules.
6. Archive a signed Release build in Xcode, upload it to App Store Connect,
   distribute through TestFlight, address device feedback, and then submit for
   App Review.

The project can be generated and synced here. Native compilation, device tests,
signing, TestFlight distribution, and Apple approval remain separate steps.
