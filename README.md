# airstethics

A beauty booking marketplace for Alberta, Canada. Discover independent hair, nail, skincare, brow, makeup, and massage experiences in Edmonton, Calgary, and Canmore.

This is an early marketplace with fictional sample providers and host-created spaces. It works as a browser demo or connects to Supabase for accounts, shared listings, private bookings, and host availability. Booking emails for real host-created spaces require a configured email provider; fictional sample spaces do not send emails. No payments are collected and providers are not verified.

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

In the Codex cloud workspace, use `npm ci --cache /workspace/.npm-cache` if the home directory's npm cache is not writable. Dependencies are already installed in the prepared environment.

The development server uses port 5173. To build and serve the production version:

```sh
npm run build
npm run preview
```

## Deploy a live preview on Netlify

1. Push this app, including `netlify.toml`, to the GitHub repository **jancisd/Project**.
2. In [Netlify](https://app.netlify.com/), choose **Add new project → Import an existing project**, connect GitHub, and select **jancisd/Project**.
3. Select the branch containing this app. Leave the base directory empty; the checked-in configuration sets the build command to `npm run build`, the publish directory to `dist`, and Node.js to version 24.
4. Deploy the project. When the deploy is marked **Published**, open its generated `https://…netlify.app` URL. That is the shareable, interactive preview link.

No environment variables or API keys are required for demo mode. Later pushes to the connected branch will trigger new Netlify deployments. Netlify serves the built static assets directly, with an app fallback for other routes.

## Connect a shared database

The Supabase integration adds password accounts with optional authenticator
verification, public listings and services,
private favourites and appointments, shared availability, and database-enforced
protection against overlapping bookings. Follow [the database setup guide](supabase/README.md)
to apply the schema and connect your Netlify build using the project URL and
public publishable key. A hosted Supabase project must be created separately.

Already connected? The photo storage, account security, host management,
availability, and booking-email migrations follow the original four-table
migration. Let your configured GitHub/CLI workflow apply
new files in order. For a manual setup, follow the database guide; do not rerun
the original migration.

If a Supabase GitHub deployment reports `relation "listings" already exists`
after a manual setup, use the [migration history recovery guide](supabase/repairs/README.md)
to record the existing schema before retrying that deployment.

Without configuration, the demo below keeps working. Once configured, saves are
confirmed by the database before the UI reports success. Connection failures
show an error and Retry; they never silently store cloud actions in the browser.
Existing browser demo data is not uploaded automatically.

## What works

- Search by studio, service, city, and neighbourhood; browse six beauty categories.
- Explore a worldwide interactive map, starting in Alberta, alongside the listings. Price pins and clusters open studio previews; **On map** locates a listing, and **View & book** opens its booking form.
- Click a listing to open its complete details beside its selected map location. On mobile, the map stays above the details while you scroll. **Choose a service & time** opens booking, and **Back to results** restores your previous results or favourites.
- Pan or zoom, then use **Search this area** to filter results geographically. **Clear map area** restores the full search. Switch between the list and map with **Show map / Show list**; mobile starts with the list.
- Filter by starting price or rating, and sort by price or rating.
- Save and remove favourites.
- View studio details, services, pricing, and sample reviews.
- Book a service with a date, Alberta-local time, and sample contact details. Past times, appointments beyond 90 days, overlapping bookings, and appointments extending past closing are blocked.
- View, persist, and cancel demo appointments. Cancelling releases the time slot.
- Create a sample partner listing and book its service.
- Add up to eight listing photos, preview them, choose a cover, and remove photos before publishing. Connected listings upload to Supabase Storage; demo photos stay in browser storage. Photos are optional, with sample images as a fallback.
- Manage owned spaces under **My business**. After listing your first space, **List your space** takes you back to it; **Add another location** explicitly creates a separate space. Simultaneous first-space requests cannot create accidental duplicates.
- Edit your space’s details, photos, map location, and existing service names, prices, and durations. Existing appointments retain their original booking details; changes apply to future bookings.
- View upcoming, past, and cancelled client appointments for your own spaces, filter by location, and cancel an appointment after confirmation. **My appointments** continues to show appointments you booked as a customer.
- Choose **Manage availability** on an owned space to set weekly hours, closed days, breaks, blocked dates, booking intervals, and buffers. Customers see only bookable times for their chosen service. Existing appointments retain their details when hours change.
- Queue confirmation, cancellation, and 24-hour reminder emails for customers and hosts of real spaces. A private scheduled worker delivers through Resend after server-only settings and a verified sender are configured; it remains inactive without those settings. See [booking email setup](docs/booking-emails.md).
- Log in with email and password, or choose **Create account** to register. Returning sessions survive a reload. Existing email-link users can set a password through **Forgot password** or their account settings; email-link login remains available.
- Add an optional authenticator app in **Account**. A verified code is required on subsequent logins before accessing private account data or publishing, saving, or booking.
- Match a partner listing’s neighbourhood within its selected city and preview the pin before creating it. Shared names across cities use the selected city; ambiguous names require a choice. Unmatched neighbourhoods require a manually placed, confirmed pin, rather than a city-centre guess. Changing the city, neighbourhood, or manual coordinates clears the previous confirmation.
- Use the responsive desktop or mobile interface and keyboard-accessible dialogs.

In **demo mode**, favourites, listings, availability, and bookings persist in this browser's local storage. Please use sample contact details. **Privacy & demo info → Clear my demo data** clears all saved demo information. In **connected mode**, listings are public, favourites are private, and appointment details are available to the customer and the host of the booked space. Connected booking email delivery needs separate configuration. Neither mode processes payments or verifies providers.

## iPhone app

An iPhone project is included in `ios/`, using Capacitor and the same Supabase
accounts and marketplace data. `npm run mobile:sync` builds and copies the web
app into the native project; `npm run ios:open` opens it in Xcode on a Mac.
See the [iPhone setup and release guide](docs/iphone.md) for native login links,
signing, device tests, TestFlight, and remaining App Store requirements. This
repository prepares the native project; it has not been signed or submitted to
Apple.

## Check the app

```sh
npm run build
npm test
npm run test:cloud
npm run test:database
npm run test:emails
npm run test:native
```

Playwright runs desktop and mobile Chromium tests. The test configuration uses `/usr/bin/chromium` when available, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if set. On other machines, install Playwright's browser first:

```sh
npx playwright install chromium
```

## Project structure

- `src/App.tsx`: discovery, search, favourites, filters, and appointments
- `src/BookingDialog.tsx`: service selection, scheduling, and booking confirmation
- `src/PartnerDialog.tsx`: space creation, additional locations, and editing
- `src/HostDashboard.tsx` and `src/host-dashboard.css`: owned spaces and client appointment management
- `src/AvailabilityDialog.tsx` and `src/availability.ts`: host schedules and matching browser-demo slot rules
- `src/data.ts`: fictional Alberta providers and services
- `src/DiscoverMap.tsx`, `src/map.css`, and `src/discovery.css`: interactive map and responsive discovery layout
- `src/geography.ts`: approximate demo neighbourhood coordinates and supported partner location fallbacks
- `src/neighbourhoods.ts` and `src/neighbourhood-data.ts`: city-scoped neighbourhood matching and the local neighbourhood catalogue
- `src/LocationPicker.tsx`: location preview and confirmed manual pin placement
- `src/types.ts`: shared booking and navigation types
- `src/storage.ts`: safe loading and validation of browser data
- `src/backend.ts` and `src/useMarketplace.ts`: Supabase access, account state, and separate demo persistence
- `src/AccountDialog.tsx`, `src/account-service.ts`, and `src/account.css`: password login, recovery, authenticator setup, and sign-out
- `src/platform.ts`, `src/native-auth.ts`, and `ios/`: shared web/iPhone account redirects and native app project
- `netlify/functions/booking-emails.mjs`: scheduled transactional email delivery
- `src/ListingPhotoPicker.tsx`, `src/photo-files.ts`, and `src/photo-upload.ts`: photo selection, validation, compression, and uploads
- `supabase/`: database migration, optional fictional seed, setup guide, and PostgreSQL access/concurrency checks
- `src/styles.css` and `src/booking.css`: responsive design
- `tests/marketplace.spec.ts`: browser workflow tests

Built with React, TypeScript, Vite, Leaflet, and Lucide icons. Photography, fonts, and a fallback world map are served locally; the app needs no API keys. Detailed street tiles load from OpenStreetMap when available; if that server is unavailable, the bundled world countries, Canadian provinces, and regional highways keep the map usable. Map positions are approximate demo locations, not verified business addresses. Existing saved listings continue to work using neighbourhood or city-centre locations. Photo credits are in [public/images/ASSET-CREDITS.md](public/images/ASSET-CREDITS.md); public-domain map data credits are in [public/maps/README.md](public/maps/README.md).

New partner listings always save explicit coordinates from a selected neighbourhood or a manually confirmed pin. Neighbourhood matching uses 629 local records: municipal-source Edmonton and Calgary geometry from a historical 2013 snapshot, plus the supported Canmore downtown area and documented aliases. The catalogue is not a current, exhaustive list; newer or unlisted areas can be located manually. Matched neighbourhood pins use points inside the source polygon, rather than a generic city centre. Older saved listings may retain their earlier approximate locations. No neighbourhood or manual-pin lookup sends entered names to a geocoding service. Source, coverage, and licence notes are in [public/locations/README.md](public/locations/README.md).

Further production work includes verified providers, multiple staff schedules, listing moderation, payments, push notifications, and self-service account deletion.
