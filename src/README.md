# Frontend functions and data flow

This is the function reference for the shared website/iPhone frontend. Start
with [the main README](../README.md) for the user-facing flows and setup.
Database functions are documented separately in
[the Supabase README](../supabase/README.md). Email delivery runs outside this
directory; see [the Netlify function reference](../netlify/README.md).

The names below refer to the current source, not hypothetical endpoints.
Promises can reject with an `Error`; callers retain the form and display its
safe message. A successful browser operation does not prove an email reached
an inbox, that a provider is verified, or that an iPhone release was signed.

## Entry point and component responsibilities

| Module                                           | Main export            | Responsibility                                                                                                            |
| ------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [main.tsx](main.tsx)                             | `Application()`        | Mounts `App` inside React Strict Mode and initializes native account links after child effects install account listeners. |
| [App.tsx](App.tsx)                               | `App()`                | Owns navigation, search/filter/map/detail state, dialog selection, account prompts, and user feedback.                    |
| [useMarketplace.ts](useMarketplace.ts)           | `useMarketplace()`     | Owns demo/cloud data, account/security checks, requests, mutations, and account isolation.                                |
| [AccountDialog.tsx](AccountDialog.tsx)           | `AccountDialog()`      | Password login/signup, email-link fallback, recovery, account settings, TOTP setup/challenge/removal, and sign-out.       |
| [BookingDialog.tsx](BookingDialog.tsx)           | `BookingDialog()`      | Service/date/time/contact form, available-start loading, retry identity, submission, and confirmation.                    |
| [PartnerDialog.tsx](PartnerDialog.tsx)           | `PartnerDialog()`      | First-space creation, explicit additional location, and existing-space editing.                                           |
| [HostDashboard.tsx](HostDashboard.tsx)           | `HostDashboard()`      | Owned spaces, guest appointments, filters, counts, refresh, and confirmed host cancellation.                              |
| [AvailabilityDialog.tsx](AvailabilityDialog.tsx) | `AvailabilityDialog()` | Loads and edits a listing's weekly hours, breaks, blocked dates, buffer, and start interval.                              |
| [ListingDetails.tsx](ListingDetails.tsx)         | `ListingDetails()`     | Full listing profile, photos, services, reviews, save action, and booking entry beside the selected map point.            |
| [DiscoverMap.tsx](DiscoverMap.tsx)               | `DiscoverMap()`        | Leaflet view, price markers, clusters, coincident locations, selected previews, bounds, and fallback layers.              |
| [LocationPicker.tsx](LocationPicker.tsx)         | `LocationPicker()`     | Supported-city pin preview, manual coordinate editing, map clicks/dragging, and explicit confirmation.                    |
| [ListingPhotoPicker.tsx](ListingPhotoPicker.tsx) | `ListingPhotoPicker()` | File selection, decoded previews, removal, cover order, and combined retained/new photo limits.                           |

CSS files supply presentation. They do not enforce authentication, ownership,
or booking permissions. Lazily loaded components are shown through React
`Suspense`; public discovery does not need the host editor or native plugins
to perform account/database writes.

## Data objects

### Listing and service

Defined in [data.ts](data.ts):

| Object    | Fields and meaning                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Listing` | `id`, optional `isDemo`, `name`, category, `neighborhood`, city, optional `{lat,lng}` coordinates, description, cover `image`, ordered `images`, rating, review count, tag, amenities, services, professional profile, and reviews. |
| `Service` | `id`, name, description, duration in whole minutes, and CAD price.                                                                                                                                                                  |
| Category  | `Hair`, `Nails`, `Skin`, `Brows & lashes`, `Massage`, or `Makeup`; `All` exists for filtering, not saved listing categories.                                                                                                        |

In cloud mode, the public listing JSON excludes services, which live in a
separate table. `listingFromRow()` combines the row's JSON and service rows.
The server supplies stored IDs and review metadata on creation.

### Booking

Defined in [types.ts](types.ts). It includes `id`, listing ID/name/image/city,
service name, calendar `date`, local `time`, duration, price, guest name/email,
ISO `createdAt`, and status `confirmed | cancelled`.

These are booking snapshots. Editing a listing/service later does not rewrite
an older booking's displayed name, image, city, duration, or price.

### ListingSchedule

Defined in [availability.ts](availability.ts):

```ts
type ListingSchedule = {
  weekly: {
    day: number; // Sunday 0 through Saturday 6, once each
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM, later on the same day
    breaks: { start: string; end: string }[];
  }[];
  blockedDates: { date: string }[]; // YYYY-MM-DD
  bufferMinutes: number; // integer 0–120
  slotMinutes: 15 | 30 | 60;
};
```

The schedule contains seven days, at most 12 breaks per day, and at most 366
unique blocked dates. Breaks must fit the day's hours and not overlap. Even
disabled days retain valid start/end values. Personal blocked-date notes are
not part of this object.

### Account and photo objects

| Object                                     | Fields                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| `AccountSecurityState` / `AccountSecurity` | `currentLevel: 'aal1'                                                                                      | 'aal2' | null`, verified TOTP factor IDs/names, and `needsChallenge`. |
| `AuthenticatorEnrollment`                  | Unfinished factor `id`, safe QR image data URL, and manual `secret`. Kept in the dialog, not demo storage. |
| `SelectedListingPhoto`                     | Picker UUID, original `File`, and temporary preview object URL.                                            |
| `View`                                     | `explore`, `saved`, `appointments`, or `hosting`. These are app state values, not separate server APIs.    |

## App navigation and action handlers

Source: [App.tsx](App.tsx).

| Function/state calculation    | Input → result                                                                | Important side effects or rules                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `goTo(next)`                  | A `View` → switches the screen.                                               | Hosting first calls `needsAccount()`. Clears detail/map selection, closes mobile navigation, and scrolls to the top.            |
| `needsAccount()`              | No arguments → boolean indicating that protected navigation/action must stop. | Demo proceeds. Cloud requires restored session and account-security readiness; otherwise opens Account.                         |
| `clearFilters()`              | No arguments → resets discovery controls.                                     | Clears category/query/city/rating/price/map-area and selection state.                                                           |
| `matchingListings`            | Loaded listings + controls → matching/sorted array.                           | Case-insensitive text search; city/category; minimum service price; `4.9` highly-rated threshold. Recommended retains ordering. |
| `mapListings`                 | Matching array + open detail → map array.                                     | Keeps an open detail listing on the map even when current result filters would omit it.                                         |
| `visibleListings`             | Matching array + applied map bounds → cards.                                  | Handles longitude wrap when a searched area crosses the date line.                                                              |
| `submitSearch(event)`         | Search form → applies trimmed query and location.                             | Clears map-area/detail selection, opens discovery, and scrolls to results.                                                      |
| `openPartner()`               | No arguments → create dialog or hosting screen.                               | Existing spaces, loading ownership, or ownership errors route to My business instead of assuming no space exists.               |
| `editSpace(listing)`          | Owned listing → edit-mode dialog.                                             | Gated by account readiness. Server performs the final ownership check.                                                          |
| `addLocation()`               | No arguments → additional-location dialog.                                    | Selects the explicit additional creation route.                                                                                 |
| `openBooking(listing)`        | Listing → booking dialog.                                                     | Requires a ready account in cloud mode.                                                                                         |
| `toggleSave(id)`              | Listing ID → save/remove action and toast.                                    | Calls the hook and reports success only after it resolves.                                                                      |
| `openMap(listing?)`           | Optional listing → shows map, optionally selects its ID.                      | Scrolls the map into view on smaller screens.                                                                                   |
| `openListingDetails(listing)` | Listing → details and selected map point.                                     | Records prior view/scroll/focus context before opening.                                                                         |
| `closeListingDetails()`       | No arguments → restored previous view.                                        | Restores map/list preference and requests focus/scroll restoration.                                                             |
| `formatTime(time)`            | `HH:MM` → 12-hour label.                                                      | Display helper; does not convert a timestamp to another zone.                                                                   |

`Brand`, `BloomIcon`, and `ArrowUpRightIcon` draw branding/icons. `ListingCard`
dispatches the relevant view/save/locate actions. `EmptyState` renders a
message and action. The shared `Dialog` handles a modal's opening, Escape,
outside-click closing, body scrolling, and prior focus restoration.

The account challenge is automatically prompted once for a session token.
Closing it permits public browsing; another protected action prompts again.
Account changes close forms tied to the previous user. Public map/detail
selection alone never grants permission to edit or book.

## Marketplace hook: data, isolation, and actions

Source: [useMarketplace.ts](useMarketplace.ts).

### Startup and refresh

1. In demo mode, initialize saved IDs, local listings, bookings, and schedules
   through guarded browser-storage reads. Source sample listings remain separate.
2. In connected mode, subscribe to auth events and restore the session. The
   callback only updates state; nested SDK security requests run in effects,
   avoiding Supabase auth-lock deadlocks.
3. Fetch public listings independently of private account data.
4. `refreshSecurity()` checks the current user's factors/assurance. Private
   data remains closed if the check fails or another code is needed.
5. Once ready, fetch customer bookings/favourites and the host dashboard
   separately. A host lookup failure does not silently mean the user has no space.
6. `refresh()` increments the refresh version. Window focus uses the same
   refresh path; there is no subscription to real-time booking changes.

Identity generation and request/security/data revision checks discard stale
responses. Changing identity or token/security readiness clears private arrays
and host readiness. Uploaded-photo promises are scoped to account generation.
These checks prevent an old request from populating another account's page;
the database remains responsible for actual authorization.

### Hook actions

| Function                                                          | Input → returned result                                     | Demo behavior / connected behavior                                                                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `account()`                                                       | No arguments → current identity/generation or throws.       | Connected mutations require an identity, ready security, and loaded customer account state.                                                    |
| `stillCurrent(current)`                                           | Captured identity → returns or throws.                      | Checks mounted state, account generation, and current security before applying asynchronous results.                                           |
| `refreshSecurity()`                                               | No arguments → `Promise<void>`.                             | Clears protected data, reads security, and exposes lookup/challenge state. It catches lookup errors for the UI.                                |
| `refresh()`                                                       | No arguments → schedules reload.                            | Advances the shared refresh version.                                                                                                           |
| `toggleSave(id)`                                                  | Listing ID → `Promise<void>`.                               | Updates demo IDs / saves a favourite and updates cloud state after success.                                                                    |
| `listingPhotoSources(current, requestId, files)`                  | Account/request/files → uploaded URL promise.               | Internal cloud helper caches an upload promise; failed uploads remove the failed cache entry.                                                  |
| `createListing(listing, photos = [], additionalLocation = false)` | Form listing/files/mode → `Promise<void>`.                  | Persists a local space / uploads photos and publishes, then updates public and owned listing state. Requires loaded ownership in cloud mode.   |
| `updateListing(listing, photos = [], requestId)`                  | Existing listing and edit files → `Promise<void>`.          | Requires a locally known owned listing, merges retained/new photos, and saves locally / through the update RPC.                                |
| `createBooking(booking, serviceId)`                               | Draft booking and selected service ID → `Promise<Booking>`. | Rechecks demo slots before storage / returns the server-confirmed booking snapshot.                                                            |
| `cancelBooking(id)`                                               | Customer booking UUID → `Promise<void>`.                    | Marks local booking cancelled / calls customer cancellation and updates matching customer/host state.                                          |
| `cancelHostedBooking(id)`                                         | Host booking UUID → `Promise<void>`.                        | Requires a local booking at a local space / calls host cancellation and updates matching host/customer state.                                  |
| `sendSignInLink(email, mode = 'login')`                           | Email and mode → `Promise<void>`.                           | Requires Supabase; `shouldCreateUser` is true only for explicit signup mode. Current fallback UI uses login mode.                              |
| `signOut()`                                                       | No arguments → `Promise<void>`.                             | Supabase local sign-out; auth events clear private state.                                                                                      |
| `startAuthenticator()`                                            | No arguments → enrollment data.                             | Calls the account service; no local factor is declared verified.                                                                               |
| `confirmAuthenticator(factorId, code)`                            | Factor/code → `Promise<void>`.                              | Verifies first, then refreshes account security. A later lookup error keeps data locked without relabelling a successful factor as unfinished. |
| `deleteAuthenticator(factorId)`                                   | Factor ID → `Promise<void>`.                                | Removes the factor, then refreshes security.                                                                                                   |
| `finishRecovery()`                                                | No arguments → clears recovery UI state.                    | Removes `account=recovery` from the current web URL without changing database records.                                                         |
| `clearDemo()`                                                     | No arguments → resets demo state.                           | Clears saved/listing/booking/schedule state and schedule storage; cloud mode returns without deleting anything.                                |
| `loadSchedule(listingId)`                                         | Listing ID → `Promise<ListingSchedule>`.                    | Local stored schedule or fresh defaults / schedule RPC.                                                                                        |
| `availableSlots(listingId, date, serviceId)`                      | Listing/date/service → `Promise<string[]>`.                 | Calculates from demo schedules + confirmed local bookings / calls the public available-start RPC.                                              |
| `updateSchedule(listingId, schedule)`                             | Listing + valid schedule → `Promise<void>`.                 | Requires a local owned listing and successful storage write / calls owner-protected schedule update.                                           |

The returned hook object also contains `cloud`, `session`, `authReady`,
`accountReady`, security/recovery state, public `listings`, customer `saved`/
`bookings`, and `hostListings`/`hostBookings`/loading/error state. Global
`loading`/`error` combine public/account/security/storage status. Host lookup
status is separate so My business can explain and retry an ownership failure.

## Backend API functions

Source: [backend.ts](backend.ts). These functions use the singleton Supabase
client. They do not accept or need a service-role secret.

| Function                                              | Operation                                                                 | Return / failure behavior                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `configurationError()`                                | Validates public build settings.                                          | Empty string or a fixed connection message. Rejects partial configuration and recognized private key roles.                          |
| `database()`                                          | Gets a usable client.                                                     | Throws if settings/client are unavailable.                                                                                           |
| `fail(error, fallback)`                               | Converts database errors into safe UI errors.                             | Conflict → choose another time; auth/permission → sign in; recognized date/hour errors → date guidance; otherwise supplied fallback. |
| `listingFromRow(row)`                                 | Combines `id`, `data`, `is_demo`, and normalized `services`.              | Validated `Listing`; rejects malformed payloads.                                                                                     |
| `bookingFromRow(row)`                                 | Translates database snake_case snapshot fields.                           | Validated `Booking`, normalized time and timestamp; rejects malformed data.                                                          |
| `rpcRow(value)`                                       | Accepts a composite result object or one-row array.                       | One object; rejects missing/invalid shapes.                                                                                          |
| `fetchListings()`                                     | Public `listings` + nested `services`, newest creation first.             | `Promise<Listing[]>`; does not substitute bundled samples on failure.                                                                |
| `fetchAccountData(userId)`                            | Parallel customer-booking and favourite queries filtered by account.      | `{bookings, saved}`; database ownership/MFA policies still apply.                                                                    |
| `fetchHostDashboard()`                                | Calls `get_host_dashboard` without a caller-supplied owner ID.            | `{listings, bookings}` after validating/mapping both arrays.                                                                         |
| `saveFavourite(userId, listingId, saved)`             | Upsert ignoring an existing favourite, or delete matching favourite.      | `Promise<void>`; ownership enforced by RLS.                                                                                          |
| `publishListing(listing, additionalLocation = false)` | Calls first/additional RPC, then reloads listing/services by returned ID. | Saved `Listing`; a save can have committed even if the follow-up reload fails. Primary-cap `23514` gets existing-space guidance.     |
| `updateHostedListing(listing)`                        | `update_listing` with listing ID and payload, then reload.                | Saved `Listing`; verifies the returned ID matches.                                                                                   |
| `cancelHostReservation(id)`                           | `host_cancel_booking`.                                                    | Server `Booking` snapshot.                                                                                                           |
| `reserveBooking(booking, serviceId)`                  | `create_booking` with IDs/date/time/contact, not client price.            | Confirmed server `Booking`; an already-cancelled retry is not presented as a fresh confirmation.                                     |
| `cancelReservation(id)`                               | Customer `cancel_booking`.                                                | Server `Booking` snapshot.                                                                                                           |
| `fetchAvailability(listingId, date)`                  | Legacy public `listing_availability` busy ranges.                         | `{time, duration}[]`; retained as a helper, while the main booking UI uses bookable starts.                                          |
| `fetchListingSchedule(listingId)`                     | `get_listing_schedule`.                                                   | Structurally valid `ListingSchedule`; invalid data is an error, not a silent default.                                                |
| `saveListingSchedule(listingId, schedule)`            | Validates locally, then `update_listing_schedule`.                        | Validated saved schedule.                                                                                                            |
| `fetchAvailableSlots(listingId, date, serviceId)`     | `available_booking_slots`.                                                | Validated `HH:MM` strings from `booking_time` rows; contains no guest details.                                                       |

`normalizeProjectUrl(value)` in [backend-config.ts](backend-config.ts) accepts
an HTTPS origin or its `/rest/v1/` URL and returns the origin. It permits HTTP
only for localhost/127.0.0.1 development. Embedded credentials, arbitrary paths,
query parameters, and fragments are rejected. The URL is not a publishable key.

`fail()` still contains legacy 9 AM–6 PM wording for some date/hour error
categories. The authoritative opening hours are the saved schedule, not that
fallback message. This documentation describes the current implementation;
it does not change that message or the booking rules.

## Account service functions

Source: [account-service.ts](account-service.ts).

| Function                                 | Input → result                                      | Behavior                                                                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logInWithPassword(email, password)`     | Credentials → `Promise<void>`.                      | Trims/validates email, requires a password, calls Supabase, and requires user/session tokens in the response.                                                                                         |
| `createPasswordAccount(email, password)` | Credentials → `{needsConfirmation}`.                | Requires an eight-character minimum new password, signs up with the platform callback, and distinguishes a user record from a signed-in session.                                                      |
| `sendPasswordReset(email)`               | Email → `Promise<void>`.                            | Requests a recovery link using the platform recovery redirect. Does not itself authenticate or save a password.                                                                                       |
| `setAccountPassword(password)`           | New password → `Promise<void>`.                     | Validates current account against the server, checks MFA/security, calls `updateUser`, and confirms identity.                                                                                         |
| `getAccountSecurity()`                   | No arguments → security object.                     | Reads current factors from the server and current session assurance.                                                                                                                                  |
| `enrollAuthenticator()`                  | No arguments → `{id, qrCode, secret}`.              | Requires eligible account security; removes abandoned unverified TOTP factors named `Authenticator app`, then creates a new unfinished factor. Verified/other registrations are not silently deleted. |
| `verifyAuthenticator(factorId, code)`    | Own TOTP factor + six-digit code → `Promise<void>`. | Confirms the factor, creates a challenge, verifies it, checks the returned session, and requires local assurance `aal2`.                                                                              |
| `removeAuthenticator(factorId)`          | Own TOTP factor ID → `Promise<void>`.               | Cancels unverified setup at normal assurance; removing a verified factor requires `aal2`.                                                                                                             |

Private helpers `service()`, `run()`, and `safeFailure()` obtain the client and
translate provider errors into approved messages. `emailAddress()` and
`requireNewPassword()` validate input; `redirectUrl()` delegates to the platform
redirect helper. `readSecurity()` lists server factors before checking current
assurance: verified factors plus non-`aal2` assurance require a challenge. An
unsupported verified factor fails closed rather than bypassing security.

[auth-errors.ts](auth-errors.ts) supplies `getSignInErrorMessage(error, mode)`
for email-link failures: connection keys, provider/SMTP failures, approved
recipient restrictions, rate limits, disabled login, and network failures.
These messages do not expose raw account/provider error content.

### AccountDialog event helpers

| Helper                                                   | Purpose                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `perform(action)`                                        | Guards concurrent actions, toggles pending state, catches safe errors, and avoids updating an unmounted dialog.                                  |
| `clearPasswords()`                                       | Clears password/confirmation fields.                                                                                                             |
| `chooseMode(nextMode)` / `chooseMethod(nextMethod)`      | Changes login/signup or password/link/reset flow and clears obsolete fields/notices.                                                             |
| `submitAccess(event)`                                    | Validates matching signup passwords and calls the chosen password, signup, link, or reset callback.                                              |
| `savePassword(event)`                                    | Requires matching new passwords, awaits account update, clears fields, and ends recovery state on success.                                       |
| `verifyCode(event)`                                      | Chooses the enrollment/existing factor, validates six digits, awaits verification, clears the code, and marks setup complete only after success. |
| `startEnrollment()`                                      | Requests unfinished setup; if the dialog disappeared, attempts to remove that new factor.                                                        |
| `cancelEnrollment()`                                     | Awaits factor removal before discarding the secret/setup view.                                                                                   |
| `removeFactor(id)`                                       | Awaits removal before showing disabled feedback.                                                                                                 |
| `close()` / `signOut()`                                  | Respect pending work and remove unfinished setup before closing/signing out.                                                                     |
| `passwordFields()` / `codeFields()` / `securityStatus()` | Render correctly labelled password/code inputs and security loading/retry state.                                                                 |

## Booking form functions

Source: [BookingDialog.tsx](BookingDialog.tsx).

- `albertaNow()` returns the current Alberta date and minutes after midnight.
  `dayFromNow(days)` creates date-selector bounds without using the visitor's zone.
- `timeInMinutes()`, `prettyTime()`, and `prettyDate()` convert/format local
  values for comparisons and display. They do not accept arbitrary time zones.
- The availability request key includes listing/date/service for `loadSlots`.
  A response for an old selection cannot overwrite the latest selection.
- `slotAvailable(slot)` rejects invalid/past dates, pending/failed lookups,
  and unavailable starts. With `loadSlots`, membership in the returned array
  decides availability. The legacy busy-range fallback retains its older
  hourly/day-end and local-booking checks.
- `confirmBooking(event)` validates selection/contact fields, derives a stable
  request signature/UUID, calls `onBooked`, and shows the returned server booking.
  Failed attempts release the submission guard. A recognized booking conflict
  clears the time and requests updated availability.
- The form manages background inertness, focus trapping/restoration, body
  scrolling, and confirmation-heading focus. Cancel/close handlers restore
  the surrounding page; they do not cancel a saved database appointment.

## Listing editor, dashboard, and availability dialog

### PartnerDialog

Source: [PartnerDialog.tsx](PartnerDialog.tsx).

`initialListing` selects edit mode. `additionalLocation` selects the explicit
additional-location flow. `onCreate(listing, files, requestId)` is the callback
name for all modes; `App` chooses the matching hook create/update action.

| Helper                            | Behavior                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resetLocation()`                 | Clears selected neighbourhood/manual coordinates/confirmation after relevant field changes.                                                                                             |
| `submit(event)`                   | Validates fields, photo count, existing-service values, and confirmed city location; builds a listing payload and stable request signature; awaits callback and retains input on error. |
| `validPrice(value)`               | Accepts finite $5–$1,000 values with at most two decimals.                                                                                                                              |
| `validDuration(value)`            | Accepts whole-minute durations in the supported 1–540 range.                                                                                                                            |
| `updateService(id, field, value)` | Updates an existing service's editable field without replacing its ID or service set.                                                                                                   |

The signature includes details, location, services, retained images, and
selected photo IDs. Identical submissions reuse an attempt UUID; changed
payloads receive a new one. Edits keep the listing's stored ID while using the
attempt UUID for upload retry scoping. The initial editor pin is confirmed
only while its original location remains unchanged.

### HostDashboard

Source: [HostDashboard.tsx](HostDashboard.tsx).

`localClock()` reads Alberta date/time. `isUpcoming(booking, now)` counts a
confirmed booking as upcoming while its end is still in the future, including
an appointment currently in progress. The clock refreshes every minute.
`formatTime()` displays the local stored time.

Owned listing IDs filter the supplied booking array defensively before the
location/status filters are applied. Upcoming appointments sort earliest first;
past/cancelled results sort latest first. An invalidated location selection
falls back to all owned spaces. `cancelAppointment(id)` guards concurrent
requests and waits for `onCancelBooking` before showing success; errors leave
the appointment available for retry. Source props still come from a protected
server lookup in cloud mode.

### AvailabilityDialog

Source: [AvailabilityDialog.tsx](AvailabilityDialog.tsx).

| Helper                                  | Behavior                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `load()`                                | Requests the listing schedule; invalid/failed results show retry instead of inventing cloud defaults.                 |
| `minutes()` / `albertaToday()`          | Local time conversion and date-input guidance.                                                                        |
| `scheduleError(schedule)`               | Produces a readable validation message for hours, breaks, dates, interval, buffer, and the shared schedule structure. |
| `updateDay(day, patch)`                 | Changes a single weekday without replacing the other six.                                                             |
| `updateBreak(day, index, field, value)` | Changes one break boundary for the selected day.                                                                      |
| `addBlockedDate()`                      | Validates the entered date and duplicate/count rules before adding it.                                                |
| `submit(event)`                         | Validates, guards duplicate submission, awaits `onSave`, and closes only after success. Errors retain settings.       |
| `close()`                               | Prevents closing while a save is pending.                                                                             |

Closed days retain valid stored hours. Schedule changes affect new booking
eligibility and do not move existing confirmed appointments.

## Shared availability calculations

Source: [availability.ts](availability.ts).

| Function                                        | Input → output                                              | Rule                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultSchedule()`                             | None → fresh schedule object.                               | Seven open 09:00–18:00 days, no breaks/blocked dates, zero buffer, hourly starts.                                                            |
| `timeMinutes(time)`                             | `HH:MM` → integer minutes.                                  | Conversion helper; callers validate the input first.                                                                                         |
| `albertaClock()`                                | None → `{date, minutes}`.                                   | Uses `America/Edmonton` regardless of browser zone.                                                                                          |
| `isListingSchedule(value)`                      | Unknown JSON → boolean type guard.                          | Checks seven unique weekdays, time format/order, non-overlapping in-window breaks, unique valid dates, and numerical interval/buffer limits. |
| `isScheduleMap(value)`                          | Unknown JSON → boolean type guard.                          | Up to 1,000 schedule entries with IDs no longer than 256 characters.                                                                         |
| `scheduleSlots(schedule, date, duration, busy)` | Valid schedule/date/service length/busy ranges → `HH:MM[]`. | Calculates browser-demo bookable starts; not a replacement for cloud SQL enforcement.                                                        |

`scheduleSlots()` rejects invalid dates, dates outside today through +90 days,
invalid durations, blocked/closed days, and elapsed starts. It iterates from the
opening time in `slotMinutes` steps. Candidate end is start + service duration

- buffer; the whole interval must fit before closing and avoid breaks and
  each confirmed booking's buffered interval. Only `time` and `duration` are
  used from the `busy` input; returned slots contain no guest details.

## Photo selection and processing functions

Sources: [ListingPhotoPicker.tsx](ListingPhotoPicker.tsx),
[photo-files.ts](photo-files.ts), [photo-upload.ts](photo-upload.ts).

| Function                                                       | Input → output / side effect                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validatePhotoFiles(files, existingCount = 0)`                 | Validates JPEG/PNG/WebP, nonempty files up to 5 MiB, and a combined maximum of eight photos; throws descriptive errors.                             |
| `addPhotos(event)`                                             | Validates and decodes selected image previews, then adds selected-photo objects; errors release partial object URLs.                                |
| `release(url)`                                                 | Revokes one temporary object URL and removes it from the allocated set.                                                                             |
| `removePhoto(photo)`                                           | Removes the selected item and releases its preview.                                                                                                 |
| `makeCover(photo)`                                             | Moves a selected file to the first position. Retained edit images have separate cover/removal controls.                                             |
| `photoError()`                                                 | Creates a safe image-preparation error.                                                                                                             |
| `preparePhoto(file)`                                           | Decodes orientation, rejects invalid/over-60-million-pixel images, resizes/re-encodes via canvas, and closes the bitmap; returns a prepared `Blob`. |
| `prepareGallery(files)`                                        | Prepares files sequentially, enforcing the eight-file maximum.                                                                                      |
| `demoPhotoSources(files)`                                      | Converts prepared images to data URLs, rejecting a prepared gallery over 2.5 MiB.                                                                   |
| `uploadListingPhotos(userId, requestId, files, assertAccount)` | Validates UUIDs, prepares files, checks account scope around uploads, and returns public Storage URLs.                                              |

Preparation attempts use longest edges of 1600, 1280, then 960 pixels with
decreasing quality, avoiding upscaling. It requests WebP, accepts supported
browser output types, and requires each prepared image to be at most 768 KiB.
Re-encoding removes embedded camera metadata. Upload paths are
`<account UUID>/<request UUID>/<photo UUID>.<extension>` in `listing-photos`,
with `upsert: false`.

Failures before listing publication attempt to remove partial uploads. The
hook keeps successful upload promises for ambiguous listing-save retries so
it does not delete a photo that a committed listing may use. Editing a gallery
does not automatically delete removed Storage objects. Selected object URLs
are released on picker unmount; file previews are not the persisted public URLs.

## Browser storage guards

Source: [storage.ts](storage.ts).

| Function/helper                                              | What it checks                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `readStored(key, fallback, guard)`                           | Catches storage/JSON failures and accepts only values approved by the supplied guard.                |
| `isStringArray(value)`                                       | A bounded array of nonempty text values.                                                             |
| `isListingArray(value)`                                      | Up to 1,000 valid listing objects, service arrays, reviews, coordinates, and supported image values. |
| `isBookingArray(value)`                                      | Up to 10,000 valid booking snapshots, dates/times, contact strings, and statuses.                    |
| `isDate()` / `isTimestamp()`                                 | Calendar-valid ISO date and normalized ISO timestamp, not regex shape alone.                         |
| `isArrayOf()`                                                | Shared array bound and per-item validation.                                                          |
| `isImageSource()`                                            | Nonempty bounded source strings or bounded JPEG/PNG/WebP base64 data URLs.                           |
| `isService()` / `isReview()` / `isListing()` / `isBooking()` | Nested object/type/range validation.                                                                 |

These guards protect rendering from malformed local or API-shaped data. They
are not server authorization or an external image-domain allowlist. Cloud
permissions remain enforced in Supabase.

## Map and native functions

Map helper names and behavior are detailed in the
[map README](../public/maps/README.md) and
[neighbourhood README](../public/locations/README.md). Core exports include
`getListingCoordinates`, `isValidCoordinates`, `normalizeNeighbourhoodName`,
`suggestNeighbourhoods`, `resolveNeighbourhood`, `getCitySearchArea`, and
`isWithinCityArea`. The distinction between legacy coordinate fallbacks and a
new host's explicitly confirmed pin is intentional.

`getAuthRedirectUrl(recovery)` in [platform.ts](platform.ts) selects the web
origin or `airstethics://auth`, optionally with `account=recovery`.
`parseNativeAuthLink(value)` in [native-auth-links.ts](native-auth-links.ts)
only parses the allowed native callback and complete credential fragments.
`initializeNativeAuth()` and its private `handleAuthLink()` in
[native-auth.ts](native-auth.ts) register warm/cold callbacks, deduplicate using
a SHA-256 fingerprint of the callback URL, ask Supabase to establish/validate the session, and only then emit
the password-recovery event. Parsing alone does not authorize an account.
See the [iPhone function/file guide](../ios/README.md).

## Follow a complete operation through the files

| User action              | Frontend path                                                                            | Authoritative boundary                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Book                     | `BookingDialog.confirmBooking` → hook `createBooking` → `reserveBooking`                 | `create_booking` validates and saves; trigger queues email.             |
| Publish first space      | `PartnerDialog.submit` → hook `createListing` → `publishListing`                         | `create_listing` assigns owner and guards first-space/request rules.    |
| Publish additional space | Same form/hook with explicit additional flag                                             | `create_additional_listing` with authenticated owner and account lock.  |
| Edit space               | Edit-mode form → hook `updateListing` → `updateHostedListing`                            | `update_listing` checks owner and preserves booked references/metadata. |
| Save availability        | `AvailabilityDialog.submit` → hook `updateSchedule` → `saveListingSchedule`              | `update_listing_schedule` checks ownership/MFA and normalizes rules.    |
| Cancel as customer       | App confirmation → hook `cancelBooking` → `cancelReservation`                            | `cancel_booking` checks booking customer.                               |
| Cancel as host           | `HostDashboard.cancelAppointment` → hook `cancelHostedBooking` → `cancelHostReservation` | `host_cancel_booking` checks listing owner.                             |
| Deliver email            | No browser action; scheduled worker                                                      | Private queue and service-only claim/finish functions.                  |

Use [the main command table](../README.md#commands-and-verification) for
verification commands and their limits. Browser tests mock connected APIs;
the PostgreSQL suite checks real SQL authorization/concurrency. Neither is
proof of a production configuration, inbox delivery, or an iPhone device build.
