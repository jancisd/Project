# airstethics

A beauty booking marketplace for Alberta, Canada. Discover independent hair, nail, skincare, brow, makeup, and massage experiences in Edmonton, Calgary, and Canmore.

This is a working **front-end prototype**, with fictional providers, reviews, prices, and availability. Bookings do not contact a business, send an email, charge a card, or reserve a real appointment.

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

No environment variables or API keys are required for this prototype. Later pushes to the connected branch will trigger new Netlify deployments. Netlify serves the built static assets directly, with an app fallback for other routes.

## What works

- Search by studio, service, city, and neighbourhood; browse six beauty categories.
- Explore a worldwide interactive map, starting in Alberta, alongside the listings. Price pins and clusters open studio previews; **On map** locates a listing, and **View & book** opens its booking form.
- Pan or zoom, then use **Search this area** to filter results geographically. **Clear map area** restores the full search. Switch between the list and map with **Show map / Show list**; mobile starts with the list.
- Filter by starting price or rating, and sort by price or rating.
- Save and remove favourites.
- View studio details, services, pricing, and sample reviews.
- Book a service with a date, Alberta-local time, and sample contact details. Past times, appointments beyond 90 days, overlapping bookings, and appointments extending past closing are blocked.
- View, persist, and cancel demo appointments. Cancelling releases the time slot.
- Create a sample partner listing and book its service.
- Use the responsive desktop or mobile interface and keyboard-accessible dialogs.

Favourites, listings, and bookings persist in this browser's local storage. Please use sample contact details. **Privacy & demo info → Clear my demo data** clears all saved demo information. There is no server-side persistence, authentication, payment processing, provider verification, email delivery, or shared availability across devices.

## Check the app

```sh
npm run build
npm test
```

Playwright runs desktop and mobile Chromium tests. The test configuration uses `/usr/bin/chromium` when available, or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if set. On other machines, install Playwright's browser first:

```sh
npx playwright install chromium
```

## Project structure

- `src/App.tsx`: discovery, search, favourites, filters, and appointments
- `src/BookingDialog.tsx`: service selection, scheduling, and booking confirmation
- `src/PartnerDialog.tsx`: local demo listing creation
- `src/data.ts`: fictional Alberta providers and services
- `src/DiscoverMap.tsx`, `src/map.css`, and `src/discovery.css`: interactive map and responsive discovery layout
- `src/geography.ts`: approximate demo neighbourhood coordinates and supported partner location fallbacks
- `src/types.ts`: shared booking and navigation types
- `src/storage.ts`: safe loading and validation of browser data
- `src/styles.css` and `src/booking.css`: responsive design
- `tests/marketplace.spec.ts`: browser workflow tests

Built with React, TypeScript, Vite, Leaflet, and Lucide icons. Photography, fonts, and a fallback world map are served locally; the app needs no API keys. Detailed street tiles load from OpenStreetMap when available; if that server is unavailable, the bundled world countries, Canadian provinces, and regional highways keep the map usable. Map positions are approximate demo locations, not verified business addresses. Existing saved listings continue to work using neighbourhood or city-centre locations. Photo credits are in [public/images/ASSET-CREDITS.md](public/images/ASSET-CREDITS.md); public-domain map data credits are in [public/maps/README.md](public/maps/README.md).

The next production steps are user and provider accounts, a database/API, verified businesses, a shared availability system, and payment and notification integrations.
