# How the iPhone app works

The iPhone project packages airstethics's React application inside Capacitor's
native iOS container. The screens, Supabase accounts, listing ownership,
availability rules, and booking functions are shared with the website. They are
not a second implementation in Swift.

Start with the [project README](../README.md) for the marketplace, the
[frontend function reference](../src/README.md) for screen and account behavior,
and the [iPhone setup guide](../docs/iphone.md) for the Mac/Xcode procedure.

## What is configured

| Setting                   | Current value                         | What it controls                                                                                                       |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Display name              | `airstethics`                         | The app name in the iOS project.                                                                                       |
| Bundle identifier         | `ca.airstethics.app`                  | The working identifier in Capacitor and Xcode. It still needs registration under the eventual Apple developer account. |
| Supported device family   | iPhone (`TARGETED_DEVICE_FAMILY = 1`) | The current target is iPhone; no Android project is included.                                                          |
| Minimum iOS version       | 15.0                                  | Set in the Xcode target and Swift package.                                                                             |
| Capacitor                 | 8.5.3                                 | The JavaScript/native bridge and iOS runtime.                                                                          |
| App plugin                | 8.1.2                                 | Receives app-open links and the initial launch URL.                                                                    |
| Web asset directory       | `dist`                                | Vite's production output copied into the app by `cap sync ios`.                                                        |
| Xcode scheme              | `App`                                 | The scheme Capacitor opens/build tooling uses. This is distinct from the `airstethics:` account-link URL scheme.       |
| Native account URL scheme | `airstethics`                         | Lets an installed app receive `airstethics://auth` callbacks.                                                          |
| Remote `server.url`       | Not configured                        | The app bundles its frontend; the native shell does not simply load the Netlify website as its entire interface.       |

The checked-in project is preparation for an iPhone build. Generation and sync
can run in Linux, but this repository does not establish that an Xcode build was
compiled, run on an iPhone, signed, or approved by Apple.

## Source and generated files

| File or directory                                                        | Purpose                                                                                               | How to change it                                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`../capacitor.config.ts`](../capacitor.config.ts)                       | App name, app ID, web build directory, and iOS container settings.                                    | Edit deliberately, then run `npm run mobile:sync`. If changing the app ID, also update the Xcode target identifier. |
| [`App/App.xcodeproj/project.pbxproj`](App/App.xcodeproj/project.pbxproj) | Native targets, signing/build settings, versions, and iPhone/iOS deployment settings.                 | Use Xcode for target, signing, and release changes.                                                                 |
| [`App/App/Info.plist`](App/App/Info.plist)                               | Registers the account URL scheme and photo/camera usage descriptions; configures the scene lifecycle. | Update when the actual native capabilities or permissions change.                                                   |
| [`App/App/AppDelegate.swift`](App/App/AppDelegate.swift)                 | Provides application startup and chooses `SceneDelegate` for the app's scene.                         | Most marketplace changes do not require editing it.                                                                 |
| [`App/App/SceneDelegate.swift`](App/App/SceneDelegate.swift)             | Creates the Capacitor view controller and forwards scene/link events to Capacitor.                    | Preserve forwarding when changing native lifecycle code.                                                            |
| [`App/CapApp-SPM/`](App/CapApp-SPM/README.md)                            | Connects the Xcode project to Capacitor and plugin Swift packages.                                    | Managed through npm dependencies and `cap sync ios`.                                                                |
| `App/App/public/`                                                        | Generated copy of `dist/` shipped inside the development app.                                         | Do not edit directly; rebuild and sync. Ignored by Git.                                                             |
| `App/App/capacitor.config.json` and `App/App/config.xml`                 | Generated native configuration copies.                                                                | Regenerated by Capacitor and ignored by Git.                                                                        |
| [`App/App/Assets.xcassets/`](App/App/Assets.xcassets/)                   | App icon and splash assets.                                                                           | Replace development placeholders with release branding before distribution.                                         |
| `App/build/`, `App/DerivedData/`, `xcuserdata/`                          | Local build output and developer-specific Xcode state.                                                | Ignored by Git; not application source.                                                                             |

## JavaScript functions used by the native container

### `getAuthRedirectUrl(recovery = false): string`

Source: [`../src/platform.ts`](../src/platform.ts).

The function asks `Capacitor.isNativePlatform()` which runtime is active. It
returns the account callback appropriate for that runtime:

| Runtime and argument       | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| Website, `false`           | The current web origin followed by `/`.                  |
| Website, `true`            | The current web origin followed by `/?account=recovery`. |
| Native iPhone app, `false` | `airstethics://auth`                                     |
| Native iPhone app, `true`  | `airstethics://auth?account=recovery`                    |

[`createPasswordAccount`](../src/account-service.ts) supplies the normal
callback to Supabase signup. `sendPasswordReset` supplies the recovery callback.
[`sendSignInLink`](../src/useMarketplace.ts) uses the normal callback for the
existing-account email-link fallback. Normal password login calls Supabase
directly and does not need to open an email link each time.

### `parseNativeAuthLink(value: string): NativeAuthLink | null`

Source: [`../src/native-auth-links.ts`](../src/native-auth-links.ts).

This is a pure parser: it performs no network request, changes no session, and
does not open the password form itself. A valid result contains only
`accessToken`, `refreshToken`, and `recovery`.

It accepts the `airstethics:` protocol, the exact `auth` hostname, and an empty
path or `/`. It rejects usernames, passwords, ports, different hosts/paths,
provider errors in the query or fragment, missing/duplicate token fields,
multiple fragment `type` fields, malformed JWT-shaped access tokens, oversized
values, and whitespace in the refresh token.

Tokens must be in the URL **fragment**, after `#`. Recovery is true only when
that fragment has `type=recovery`. The `?account=recovery` query flag alone
does not identify or authorize a password-reset session. The parser validates
format, not the JWT's cryptographic validity; session validation happens next.

### `handleAuthLink(value): Promise<void>`

Source: [`../src/native-auth.ts`](../src/native-auth.ts); internal helper.

1. Returns if no Supabase client is configured or the parser rejects the URL.
2. Hashes the URL with SHA-256 and compares the fingerprint to the most recently
   handled callback. This suppresses a duplicate warm/cold callback without
   retaining the raw token-bearing URL for deduplication.
3. Calls `supabase.auth.setSession` with the two parsed tokens. Supabase must
   return a user ID and a session without an error before the app continues.
4. If this validated callback is recovery, dispatches the browser event
   `airstethics:password-recovery`.
5. Clears the fingerprint on failure so a later attempt can retry. It does not
   log credentials or copy the callback into browser navigation history.

Invalid/expired callbacks currently fail quietly. The user can request a fresh
link from the account form; this native helper does not show its own error
screen.

### `initializeNativeAuth(): Promise<void>`

Source: [`../src/native-auth.ts`](../src/native-auth.ts).

The function returns immediately on the website. In a native app, a module-level
guard prevents duplicate initialization. It dynamically loads `@capacitor/app`,
registers an `appUrlOpen` listener for links opened while the app is running,
then asks `App.getLaunchUrl()` for a link that launched the app from a stopped
state. Both paths call `handleAuthLink`. An initialization failure clears the
guard so a future call can attempt initialization again.

### `Application()` and the recovery listener

Source: [`../src/main.tsx`](../src/main.tsx) and
[`../src/useMarketplace.ts`](../src/useMarketplace.ts).

`Application` renders the normal React `App`. Its effect starts native link
handling after the child app's account listeners mount. `useMarketplace` listens
for `airstethics:password-recovery` and selects recovery mode; the existing
`AccountDialog` then displays password replacement for the signed-in account.
Saving a password still runs through the account service, including its session
and authenticator checks. The event changes UI mode; it does not grant database
access or bypass MFA.

## Swift lifecycle functions

| Function                                             | When iOS calls it                                  | Behavior in this project                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `application(_:didFinishLaunchingWithOptions:)`      | Application startup.                               | Returns `true`; marketplace startup happens through the Capacitor/React app.                                                        |
| `application(_:configurationForConnecting:options:)` | iOS creates the app scene.                         | Returns the default configuration with `SceneDelegate` as its delegate.                                                             |
| `scene(_:willConnectTo:options:)`                    | The scene first connects, including a cold launch. | Creates a `UIWindow`, installs `CAPBridgeViewController`, shows it, and forwards connection options through `SceneDelegateProxy`.   |
| `scene(_:openURLContexts:)`                          | An external URL is opened for an existing scene.   | Forwards URL contexts through `SceneDelegateProxy` so the App plugin can deliver them.                                              |
| `scene(_:continue:)`                                 | iOS continues a user activity.                     | Forwards the activity through the Capacitor proxy. This forwarding alone does not configure a verified HTTPS universal-link domain. |

Other lifecycle methods in `AppDelegate` are template extension points with no
marketplace logic. Booking validation, listing edits, schedule updates, and email
delivery do not run in these Swift callbacks.

## Build settings and data flow

`npm run mobile:sync` executes `npm run build && cap sync ios`. The build first
runs TypeScript checks and Vite's production build. Vite embeds the public
`VITE_SUPABASE_URL` and publishable-key settings into the frontend output.
Capacitor then copies that output into `App/App/public/` and updates native
plugin/package configuration.

A Netlify website deployment does not update an already installed iPhone app.
Frontend changes require another build/sync and an appropriate new native
development or distribution build. Supabase data and migrations are shared, so
server-side database changes affect both clients using that project.

Missing both public Supabase settings creates a browser-demo bundle. Adding
settings later on Netlify does not alter an existing native bundle; set them in
the environment used to build the iPhone app, then build/sync again. A configured
cloud client that loses its connection reports errors; it does not silently
save cloud bookings to demo storage.

Netlify's booking-email worker stays on the server. Neither a Resend key nor a
Supabase service-role/secret key belongs in the iPhone bundle. See the
[booking email guide](../docs/booking-emails.md).

## Verification and release limits

Run `npm run test:native` to check callback parsing with fictitious tokens and
no account/network requests. Browser tests cover shared web workflows;
`npm run mobile:sync` checks build/copy/plugin synchronization. None of these
commands is an iOS Simulator, device, signing, or App Store test.

Use the [iPhone setup guide](../docs/iphone.md) for real-device checks and the
remaining work: Mac/Xcode, Apple signing, final branding, privacy/support URLs,
TestFlight, and a complete in-app account-deletion flow before App Store
submission. No push-notification plugin, Android target, or background mobile
email worker is implemented here.
