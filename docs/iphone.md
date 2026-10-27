# iPhone app preparation

The repository includes a Capacitor iOS project in `ios/`. It bundles the same
React app used by the website and connects to the same Supabase project. The
website remains deployable to Netlify. No Android project is included yet.

The scaffold uses Capacitor 8, Swift Package Manager, iOS 15+, and the working
bundle identifier `ca.airstethics.app`. It targets iPhone. Register a bundle
identifier under your Apple developer account before distribution; if another
identifier is needed, update both `capacitor.config.ts` and the App target's
Bundle Identifier in Xcode. The identifier in this repository is not proof of
registration or ownership.

## Build and open on a Mac

Use Node.js 24, a Mac with a compatible current Xcode installation, and your
Apple account. The cloud Linux workspace can generate and sync the project,
but it cannot compile, sign, run the iOS Simulator, or upload an Apple build.

```sh
npm ci
cp .env.example .env.local
# Set the Supabase project URL and public publishable key in .env.local.
npm run mobile:sync
npm run ios:open
```

`mobile:sync` builds the frontend and copies `dist/` into the native project.
It also updates native plugins through Capacitor. Run it after changing the
frontend or public build settings. Generated web assets and Capacitor config
copies are ignored by Git. Only public Supabase settings belong in the bundle;
never include server-only email keys or a Supabase service-role key.

In Xcode, choose the **App** target, set your development team under **Signing
& Capabilities**, and select an iPhone simulator or a connected iPhone. Let Swift
Package Manager resolve Capacitor and the App plugin, then run the app. A free
Apple account can be used for limited development-device testing; App Store
distribution requires membership in the Apple Developer Program.

There is intentionally no production `server.url` in the Capacitor config.
The native app uses bundled assets rather than opening the hosted website as
its entire interface. Netlify server-side email jobs remain on Netlify; the
phone does not need email-provider credentials.

## Account email links on iPhone

Passwords are the normal login method on the website and in the app. Account
confirmation, password reset, and the optional email-link login use a native
callback while running inside Capacitor:

```text
airstethics://auth
airstethics://auth?account=recovery
```

Add both exact native callback URLs to Supabase **Authentication → URL
Configuration → Redirect URLs**. Keep the website's existing Site URL and web
redirect URLs; do not replace them with the native scheme. Confirmation emails
must use Supabase's confirmation URL so its redirect and tokens are preserved.

The iOS project registers the `airstethics` scheme. The App plugin delivers
warm/cold-launch links to the frontend, which accepts only the `auth` callback
with complete token fragments. Supabase validates the session before the app
opens password recovery. Tokens are never written to navigation history or
logs. Existing Supabase session persistence continues to work in the native
WebView. Authenticator verification still applies to protected account actions.

Test on a real development build before distribution: password login, restored
session after relaunch, signup confirmation, email-link login, reset password
while the app is open and terminated, invalid/expired links, and MFA. These need
a connected Supabase project and its email delivery configuration. A native
custom-scheme redirect opens only when the app is installed; use the web flow
for people who have not installed it.

## Before TestFlight or App Store submission

The generated app icon and splash images are development placeholders. Replace
them with approved airstethics branding, choose the final version/build numbers,
and test layout, keyboard behavior, photo selection, map interaction, accessibility,
and account recovery on supported iPhones.

Set up the app in App Store Connect, complete its privacy disclosures for
accounts, photos, and booking contact details, and provide live privacy/support
URLs. Account creation currently needs a complete in-app account-deletion flow
before an App Store submission. Review the current Apple requirements while
preparing the release. Email/password login alone does not introduce a need for
Sign in with Apple; adding third-party social login later requires a separate
review of Apple's login rules.

Use Xcode to archive a signed Release build, upload it to App Store Connect,
and distribute through TestFlight before submitting for App Review. Native
project generation is complete here; an iPhone build, device validation, signing,
and Apple approval have not been performed.

## Local callback checks

```sh
npm run test:native
```

These checks validate callback parsing without sending emails or accessing a
real account. Browser tests continue to validate the web account flows.
