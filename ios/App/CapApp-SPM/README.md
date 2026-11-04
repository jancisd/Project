# CapApp-SPM

This Swift package connects the airstethics Xcode project to Capacitor's native
runtime and installed native plugins. It is a dependency container, not a second
app, backend, or place to implement booking functions.

See the [iPhone project README](../../README.md) for the complete native function
reference and the [Mac/Xcode setup guide](../../../docs/iphone.md) for builds and
release preparation.

## What the files do

| File                                                                         | Purpose                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Package.swift`](Package.swift)                                             | Declares package name, minimum platform, native dependencies, and the `CapApp-SPM` library product used by Xcode. Capacitor marks this file as CLI-managed. |
| [`Sources/CapApp-SPM/CapApp-SPM.swift`](Sources/CapApp-SPM/CapApp-SPM.swift) | Contains the marker `public let isCapacitorApp = true`, giving the package a Swift source target. It implements no account, listing, or booking logic.      |
| `.gitignore`                                                                 | Keeps local Swift package build and editor state out of Git.                                                                                                |

The checked-in package uses Swift tools version 5.9 and targets iOS 15. It
declares the `CapApp-SPM` library with these dependencies:

| Dependency     | Where it comes from                                  | Why it is needed                                                                                                     |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Capacitor`    | `ionic-team/capacitor-swift-pm`, exact version 8.5.3 | Provides `CAPBridgeViewController` and the JavaScript/native bridge.                                                 |
| `Cordova`      | A product from the same Capacitor Swift package      | Included in Capacitor's generated integration target. This does not mean the app has custom Cordova booking plugins. |
| `CapacitorApp` | `../../../node_modules/@capacitor/app`               | Provides app URL events and initial-launch URL handling for account email callbacks.                                 |

The relative plugin path resolves to the repository's `node_modules/` directory.
Run `npm ci` at the repository root before opening a fresh checkout in Xcode so
that package exists. Swift Package Manager resolves the remote Capacitor package
when Xcode loads/builds the project.

## How to update native dependencies

1. Change the intended npm dependency/version in the root `package.json` using
   the normal package-manager workflow.
2. Run the repository build and `npm run mobile:sync` from the repository root.
3. Review the generated native package changes and commit the source changes.
4. On a Mac, let Xcode resolve packages and compile/run the app to check native
   compatibility.

Do not hand-edit `Package.swift` to add a plugin while leaving npm and Capacitor
configuration unchanged. A later sync can replace CLI-managed dependency
declarations. The native README explains application behavior; it does not make
manual modifications to generated package code necessary.

## What this package does not do

- It does not read Netlify environment variables or run Netlify email jobs.
- It does not configure the Supabase database, credentials, or account access.
- It does not register the `airstethics:` URL scheme; that registration is in
  [`Info.plist`](../App/Info.plist).
- It does not validate account tokens. The React native-link handler and
  Supabase account service do that after Capacitor forwards the URL.
- Resolving this package alone does not sign an app or publish it to TestFlight
  or the App Store.
