import { expect, test, type Locator, type Page } from '@playwright/test';
import { listings as sampleListings, type Listing } from '../src/data';

const api = 'https://airstethics-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const email = 'taylor-cloud@example.com';
const timestamp = '2026-10-22T12:00:00.000Z';

const cloudListings: Listing[] = sampleListings
  .slice(0, 2)
  .map((listing, index) => ({
    ...listing,
    id: `cloud-${index}`,
    name: index ? 'Cloud Nail Studio' : 'Cloud Hair Studio',
    coordinates: index
      ? { lat: 51.0447, lng: -114.0719 }
      : { lat: 53.5175, lng: -113.4994 },
    services: listing.services.map((service) => ({
      ...service,
      id: `cloud-${index}-${service.id}`,
    })),
  }));

function catalogRow(listing: Listing) {
  const { services, ...data } = listing;
  return {
    id: listing.id,
    data,
    is_demo: false,
    services,
    created_at: timestamp,
  };
}

function tomorrow() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function appointmentRow(overrides: Record<string, unknown> = {}) {
  const listing = cloudListings[0];
  const service = listing.services[0];
  return {
    id: '22222222-2222-4222-8222-222222222222',
    customer_id: userId,
    listing_id: listing.id,
    service_id: service.id,
    listing_name: listing.name,
    listing_image: listing.image,
    city: listing.city,
    service_name: service.name,
    booking_date: tomorrow(),
    booking_time: '09:00:00',
    duration: service.duration,
    price: service.price,
    guest_name: 'Taylor Cloud',
    guest_email: email,
    created_at: timestamp,
    status: 'confirmed',
    ...overrides,
  };
}

function session() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: timestamp,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    factors: [],
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
  };
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', email, aal: 'aal1', amr: [{ method: 'password', timestamp: now }], iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'test-refresh-token-only',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  };
}

type BookingRow = ReturnType<typeof appointmentRow>;
type RequestCall = {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
  url: string;
};

async function mockDatabase(page: Page, signedIn = false) {
  const state = {
    listings: cloudListings.map(catalogRow),
    bookings: [] as BookingRow[],
    saved: [] as string[],
    calls: [] as RequestCall[],
    catalogFailure: false,
    availabilityFailure: false,
    bookingFailure: '' as '' | 'conflict' | 'offline',
    listingFailure: false,
    cancellationFailure: false,
    authFailure: '',
    authGate: null as Promise<void> | null,
    busy: [] as { booking_time: string; duration: number }[],
    availabilityGate: null as Promise<void> | null,
  };
  await page.addInitScript(
    ({ auth, key }) => {
      if (auth) localStorage.setItem(key, JSON.stringify(auth));
    },
    {
      auth: signedIn ? session() : null,
      key: 'sb-airstethics-test-auth-token',
    },
  );
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route(`${api}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = request.postDataJSON() as Record<string, unknown> | null;
    state.calls.push({ path, method, body, url: url.href });
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    const failure = (message = 'Database unavailable', code = 'XX000') =>
      reply({ message, code, details: null, hint: null }, 400);

    if (path === '/rest/v1/rpc/get_host_dashboard')
      return reply({
        listings: state.listings.filter(
          (listing) => listing.id === '33333333-3333-4333-8333-333333333333',
        ),
        bookings: [],
      });
    if (path === '/auth/v1/user') return reply(session().user);
    if (path === '/auth/v1/token' || path === '/auth/v1/signup') {
      if (state.authGate) await state.authGate;
      if (state.authFailure)
        return reply(
          {
            code: state.authFailure,
            error_code: state.authFailure,
            message: 'This login request cannot be completed',
          },
          400,
        );
      if (path === '/auth/v1/signup')
        return reply({ user: session().user, session: null });
      return reply(session());
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path === '/auth/v1/otp') {
      if (state.authGate) await state.authGate;
      if (state.authFailure)
        return reply(
          {
            code: state.authFailure,
            error_code: state.authFailure,
            message: 'This login request cannot be completed',
          },
          400,
        );
      return reply({});
    }
    if (path === '/rest/v1/listings') {
      if (state.catalogFailure) return failure();
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      return reply(
        id
          ? state.listings.find((listing) => listing.id === id)
          : state.listings,
      );
    }
    if (path === '/rest/v1/bookings') return reply(state.bookings);
    if (path === '/rest/v1/favorites') {
      if (method === 'GET')
        return reply(state.saved.map((listing_id) => ({ listing_id })));
      if (method === 'POST')
        state.saved = [...new Set([...state.saved, String(body?.listing_id)])];
      if (method === 'DELETE')
        state.saved = state.saved.filter(
          (id) =>
            id !== url.searchParams.get('listing_id')?.replace(/^eq\./, ''),
        );
      return route.fulfill({ status: 204 });
    }
    if (path === '/rest/v1/rpc/listing_availability') {
      if (state.availabilityGate) await state.availabilityGate;
      if (state.availabilityFailure) return failure();
      return reply(state.busy);
    }
    if (path === '/rest/v1/rpc/create_booking') {
      if (state.bookingFailure === 'conflict')
        return failure('Appointment overlaps an existing booking', '23P01');
      if (state.bookingFailure === 'offline') return failure();
      const listing = cloudListings.find(
        (listing) => listing.id === body?.p_listing_id,
      )!;
      const service = listing.services.find(
        (service) => service.id === body?.p_service_id,
      )!;
      const booking = appointmentRow({
        id: body?.p_id,
        service_id: service.id,
        service_name: service.name,
        duration: service.duration,
        price: service.price,
        booking_date: body?.p_date,
        booking_time: `${body?.p_time}:00`,
        guest_name: body?.p_guest_name,
        guest_email: body?.p_guest_email,
      });
      state.bookings = [
        booking,
        ...state.bookings.filter((existing) => existing.id !== booking.id),
      ];
      return reply(booking);
    }
    if (path === '/rest/v1/rpc/cancel_booking') {
      if (state.cancellationFailure) return failure();
      const booking = state.bookings.find(
        (booking) => booking.id === body?.p_id,
      )!;
      booking.status = 'cancelled';
      return reply(booking);
    }
    if (path === '/rest/v1/rpc/create_listing') {
      if (state.listingFailure) return failure();
      const candidate = body?.p_listing as Listing;
      const listing = {
        ...candidate,
        id: '33333333-3333-4333-8333-333333333333',
      };
      listing.services = listing.services.map((service, index) => ({
        ...service,
        id: `${listing.id}-service-${index}`,
      }));
      const row = catalogRow(listing);
      state.listings = [
        row,
        ...state.listings.filter((existing) => existing.id !== row.id),
      ];
      return reply(row);
    }
    return failure(`Unexpected mocked route: ${path}`);
  });
  return state;
}

async function navigate(page: Page, destination: 'Saved' | 'My appointments') {
  const name =
    destination === 'Saved'
      ? /^Saved(?:\s*\d+)?$/
      : /^My appointments(?:\s*\d+)?$/;
  const button = page.getByRole('button', { name });
  if (!(await button.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await button.click();
}

async function openBooking(page: Page) {
  await page
    .getByTestId('listing-card')
    .filter({ hasText: 'Cloud Hair Studio' })
    .getByRole('button', { name: 'View Cloud Hair Studio', exact: true })
    .click();
  await page
    .getByTestId('listing-details')
    .getByRole('button', { name: 'Choose a service & time', exact: true })
    .click();
  return page.getByRole('dialog');
}

async function fillGuest(dialog: Locator) {
  await dialog.getByLabel('Your name', { exact: true }).fill('Taylor Cloud');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
}

async function openPartner(page: Page) {
  const headerAction = page.getByRole('button', { name: /^List your space/ });
  if (await headerAction.isVisible()) await headerAction.click();
  else
    await page
      .getByRole('button', { name: 'Make yourself at home', exact: true })
      .click();
}

test('cloud browsing ignores old local demo data and asks for an account before saving, listing, or booking', async ({
  page,
}) => {
  const db = await mockDatabase(page);
  await page.addInitScript(
    ({ oldListing }) => {
      localStorage.setItem(
        'airstethics:listings',
        JSON.stringify([oldListing]),
      );
      localStorage.setItem(
        'airstethics:saved',
        JSON.stringify([oldListing.id]),
      );
    },
    { oldListing: { ...sampleListings[2], name: 'Old Browser Only Listing' } },
  );
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await expect(page.getByText('Old Browser Only Listing')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Save Cloud Hair Studio', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close account' }).click();
  await openPartner(page);
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close account' }).click();
  await page
    .getByRole('button', {
      name: 'Locate Cloud Hair Studio on map',
      exact: true,
    })
    .click();
  const mapPreview = page.getByRole('region', {
    name: 'Map preview for Cloud Hair Studio',
    exact: true,
  });
  await mapPreview
    .getByRole('button', { name: 'View & book', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close account' }).click();
  const showList = page.getByRole('button', { name: 'Show list', exact: true });
  if (await showList.isVisible()) await showList.click();
  const dialog = await openBooking(page);
  await expect(
    dialog.getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  expect(db.calls.filter((call) => call.method !== 'GET')).toEqual([]);
});

test('email-link sign-in sends the submitted email and reports success only after the auth response', async ({
  page,
}) => {
  const db = await mockDatabase(page);
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await page.getByRole('button', { name: /^(?:Log in|Account)$/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Use an email link instead', exact: true })
    .click();
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog
    .getByRole('button', { name: 'Send login link', exact: true })
    .click();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toBeVisible();
  expect(
    db.calls.find((call) => call.path === '/auth/v1/otp')?.body?.email,
  ).toBe(email);
  expect(
    db.calls.find((call) => call.path === '/auth/v1/otp')?.body?.create_user,
  ).toBe(false);
});

test('creating an account is an explicit choice and pending requests cannot switch modes', async ({
  page,
}) => {
  const db = await mockDatabase(page);
  let release = () => {};
  db.authGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const loginTab = dialog.getByRole('tab', { name: 'Log in', exact: true });
  const signupTab = dialog.getByRole('tab', {
    name: 'Create account',
    exact: true,
  });
  await expect(loginTab).toHaveAttribute('aria-selected', 'true');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await signupTab.click();
  await expect(signupTab).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(
    email,
  );
  await dialog
    .getByLabel('Password', { exact: true })
    .fill('test-account-password-2026');
  await dialog
    .getByLabel('Confirm password', { exact: true })
    .fill('test-account-password-2026');
  await dialog
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(loginTab).toBeDisabled();
  await expect(signupTab).toBeDisabled();
  await expect(
    dialog.getByLabel('Email address', { exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: 'Creating account…', exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toBeVisible();
  const requests = db.calls.filter((call) => call.path === '/auth/v1/signup');
  expect(requests).toHaveLength(1);
  expect(requests[0].body).toMatchObject({
    email,
    password: 'test-account-password-2026',
  });
  await loginTab.click();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(
    email,
  );
  await expect(loginTab).toHaveAttribute('aria-selected', 'true');
  expect(
    db.calls.filter((call) => call.path === '/auth/v1/signup'),
  ).toHaveLength(1);
});

test('a rejected password login never creates an account and switching to signup clears the old error', async ({
  page,
}) => {
  const db = await mockDatabase(page);
  db.authFailure = 'invalid_credentials';
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog
    .getByLabel('Password', { exact: true })
    .fill('test-rejected-password-2026');
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toHaveCount(0);
  const requests = db.calls.filter((call) => call.path === '/auth/v1/token');
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0].url).searchParams.get('grant_type')).toBe(
    'password',
  );
  expect(requests[0].body).toMatchObject({ email });
  expect(
    db.calls.filter((call) => call.path === '/auth/v1/signup'),
  ).toHaveLength(0);
  await dialog
    .getByRole('tab', { name: 'Create account', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(
    email,
  );
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue('');
  db.authFailure = '';
  await dialog
    .getByLabel('Password', { exact: true })
    .fill('test-account-password-2026');
  await dialog
    .getByLabel('Confirm password', { exact: true })
    .fill('test-account-password-2026');
  await dialog
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toBeVisible();
  const signups = db.calls.filter((call) => call.path === '/auth/v1/signup');
  expect(signups).toHaveLength(1);
  expect(signups[0].body).toMatchObject({ email });
  expect(db.calls.filter((call) => call.path === '/auth/v1/otp')).toHaveLength(
    0,
  );
});

test('account data loads from the database, stays out of demo storage, and clears on sign-out', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  db.bookings = [appointmentRow()];
  db.saved = [cloudListings[0].id];
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await navigate(page, 'Saved');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card')).toContainText(
    'Cloud Hair Studio',
  );
  await page
    .getByRole('button', { name: 'Unsave Cloud Hair Studio', exact: true })
    .click();
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
  expect(db.saved).toEqual([]);
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'airstethics home', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Save Cloud Hair Studio', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Unsave Cloud Hair Studio', exact: true }),
  ).toBeVisible();
  expect(
    db.calls.find(
      (call) => call.path === '/rest/v1/favorites' && call.method === 'POST',
    )?.body,
  ).toEqual({ user_id: userId, listing_id: cloudListings[0].id });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  await navigate(page, 'Saved');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('appointment-card')).toContainText(
    'Cloud Hair Studio',
  );
  const local = await page.evaluate(() => ({
    bookings: localStorage.getItem('airstethics:bookings'),
    saved: localStorage.getItem('airstethics:saved'),
    listings: localStorage.getItem('airstethics:listings'),
  }));
  expect(local).toEqual({ bookings: null, saved: null, listings: null });
  expect(
    db.calls.find((call) => call.path === '/rest/v1/bookings')?.url,
  ).toContain(`customer_id=eq.${userId}`);
  expect(db.calls.filter((call) => call.path === '/auth/v1/otp')).toEqual([]);
  await page
    .getByRole('button', { name: /^(?:Your account|Account)$/i })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sign out', exact: true })
    .click();
  await expect(page.getByTestId('appointment-card')).toHaveCount(0);
  await navigate(page, 'Saved');
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
});

test('a failed cloud catalogue shows a retry instead of substituting local or sample listings', async ({
  page,
}) => {
  const db = await mockDatabase(page);
  db.catalogFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
  await expect(
    page.getByRole('alert').filter({ hasText: /couldn’t load the listings/i }),
  ).toBeVisible();
  db.catalogFailure = false;
  await page
    .getByRole('button', { name: /Try again|Retry/i })
    .first()
    .click();
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
});

test('availability loads before booking, fails closed, and respects occupied service durations', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  let release = () => {};
  db.availabilityGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  const dialog = await openBooking(page);
  await expect(
    dialog.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: 'Book my appointment' }),
  ).toBeDisabled();
  db.availabilityFailure = true;
  release();
  await expect(
    dialog.getByText(/couldn’t check available times/i),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toBeDisabled();
  db.availabilityFailure = false;
  db.busy = [{ booking_time: '09:00:00', duration: 90 }];
  await dialog.getByRole('button', { name: /Try again|Retry/i }).click();
  await expect(
    dialog.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: '10:00 AM', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: '11:00 AM', exact: true }),
  ).toBeEnabled();
});

test('booking errors keep the form open, retry uses the same request ID, and server-confirmed bookings persist', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  db.bookingFailure = 'offline';
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  const dialog = await openBooking(page);
  await expect(
    dialog.getByRole('button', { name: '11:00 AM', exact: true }),
  ).toBeEnabled();
  await dialog.getByRole('button', { name: '11:00 AM', exact: true }).click();
  await fillGuest(dialog);
  await dialog.getByRole('button', { name: 'Book my appointment' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    /couldn’t save your appointment/i,
  );
  await expect(
    dialog.getByRole('heading', { name: /all booked in/ }),
  ).toHaveCount(0);
  db.bookingFailure = '';
  await dialog.getByRole('button', { name: 'Book my appointment' }).click();
  await expect(
    dialog.getByRole('heading', { name: /all booked in/ }),
  ).toBeVisible();
  const requests = db.calls.filter(
    (call) => call.path === '/rest/v1/rpc/create_booking',
  );
  expect(requests).toHaveLength(2);
  expect(requests[0].body?.p_id).toBe(requests[1].body?.p_id);
  expect(requests[1].body).not.toHaveProperty('price');
  expect(requests[1].body).not.toHaveProperty('duration');
  await dialog.getByRole('button', { name: 'Keep exploring' }).click();
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
  await page.reload();
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
});

test('a competing booking returns a clear conflict instead of a false confirmation', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  db.bookingFailure = 'conflict';
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  const dialog = await openBooking(page);
  await expect(
    dialog.getByRole('button', { name: '11:00 AM', exact: true }),
  ).toBeEnabled();
  await dialog.getByRole('button', { name: '11:00 AM', exact: true }).click();
  await fillGuest(dialog);
  await dialog.getByRole('button', { name: 'Book my appointment' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'That time was just booked',
  );
  await expect(
    dialog.getByRole('heading', { name: /all booked in/ }),
  ).toHaveCount(0);
  expect(db.bookings).toHaveLength(0);
});

test('failed cancellation leaves the appointment confirmed and a successful retry cancels it', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  db.bookings = [appointmentRow()];
  db.cancellationFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await navigate(page, 'My appointments');
  const card = page.getByTestId('appointment-card');
  await card
    .getByRole('button', { name: 'Cancel appointment', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Yes, cancel appointment', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    /couldn’t cancel your appointment/i,
  );
  await expect(card.locator('.booking-status')).toHaveText('Confirmed');
  db.cancellationFailure = false;
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Yes, cancel appointment', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card.locator('.booking-status')).toHaveText('Cancelled');
});

test('publishing waits for the database, preserves failed form details, and uses the saved canonical listing', async ({
  page,
}) => {
  const db = await mockDatabase(page, true);
  db.listingFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await openPartner(page);
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Your space’s name', { exact: true })
    .fill('Shared Strathcona Studio');
  await dialog.getByLabel('Your name', { exact: true }).fill('Taylor Cloud');
  await dialog.getByLabel(/^City/).selectOption('Edmonton');
  await dialog
    .getByLabel('Neighbourhood', { exact: true })
    .fill('Old Strathcona');
  await dialog
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill('A warm and welcoming independent beauty studio in Old Strathcona.');
  await dialog
    .getByLabel('Service name', { exact: true })
    .fill('Signature cloud styling');
  await dialog.getByLabel('Price (CAD)', { exact: true }).fill('85');
  await dialog
    .getByRole('button', { name: /Publish|Create my space/i })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    /couldn’t publish your listing/i,
  );
  await expect(
    dialog.getByLabel('Your space’s name', { exact: true }),
  ).toHaveValue('Shared Strathcona Studio');
  expect(db.listings).toHaveLength(2);
  db.listingFailure = false;
  await dialog
    .getByRole('button', { name: /Publish|Create my space/i })
    .click();
  await expect(dialog).toHaveCount(0);
  const card = page
    .getByTestId('listing-card')
    .filter({ hasText: 'Shared Strathcona Studio' });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute(
    'data-listing-id',
    '33333333-3333-4333-8333-333333333333',
  );
  const requests = db.calls.filter(
    (call) => call.path === '/rest/v1/rpc/create_listing',
  );
  expect((requests[0].body?.p_listing as Listing).id).toBe(
    (requests[1].body?.p_listing as Listing).id,
  );
});
