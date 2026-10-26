import { expect, test, type Locator, type Page } from '@playwright/test';
import { listings as samples, type Listing } from '../src/data';

const api = 'https://airstethics-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-26T12:00:00.000Z';
const hostEmail = 'host-test@example.com';
const owned: Listing = {
  ...samples[0],
  id: '33333333-3333-4333-8333-333333333333',
  name: 'My Strathcona Studio',
  isDemo: false,
  coordinates: { lat: 53.5175, lng: -113.4994 },
  services: samples[0].services.map((service, index) => ({
    ...service,
    id: `host-service-${index}`,
  })),
};
const unrelated: Listing = {
  ...samples[1],
  id: '99999999-9999-4999-8999-999999999999',
  name: 'Another Hosts Nail Studio',
  isDemo: false,
  coordinates: { lat: 51.0447, lng: -114.0719 },
};

function row(listing: Listing) {
  const { services, ...data } = listing;
  return {
    id: listing.id,
    data,
    services,
    is_demo: false,
    created_at: timestamp,
  };
}

function dateIn(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function booking(listing: Listing, ownCustomer = false) {
  return {
    id: ownCustomer
      ? '66666666-6666-4666-8666-666666666666'
      : '55555555-5555-4555-8555-555555555555',
    customer_id: ownCustomer ? userId : '22222222-2222-4222-8222-222222222222',
    listing_id: listing.id,
    service_id: listing.services[0].id,
    listing_name: listing.name,
    listing_image: listing.image,
    city: listing.city,
    service_name: listing.services[0].name,
    booking_date: dateIn(1),
    booking_time: '10:00:00',
    duration: listing.services[0].duration,
    price: listing.services[0].price,
    guest_name: ownCustomer
      ? 'Host Visiting Another Business'
      : 'Visiting Client',
    guest_email: ownCustomer ? hostEmail : 'visiting-client@example.com',
    created_at: timestamp,
    status: 'confirmed',
  };
}

function session(mfa = false) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: hostEmail,
    email_confirmed_at: timestamp,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: timestamp,
    updated_at: timestamp,
    factors: mfa
      ? [
          {
            id: '77777777-7777-4777-8777-777777777777',
            friendly_name: 'Authenticator app',
            factor_type: 'totp',
            status: 'verified',
            created_at: timestamp,
            updated_at: timestamp,
          },
        ]
      : [],
    is_anonymous: false,
  };
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', email: hostEmail, aal: 'aal1', amr: [{ method: 'password', timestamp: now }], iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'hosting-test-refresh-only',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
}

type Call = {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
};

async function mockHost(
  page: Page,
  options: { signedIn?: boolean; mfa?: boolean; empty?: boolean } = {},
) {
  const state = {
    listings: [row(owned), row(unrelated)],
    ownedIds: options.empty ? [] : [owned.id],
    appointments: [booking(owned)],
    customerBookings: [booking(unrelated, true)],
    calls: [] as Call[],
    updateFailure: false,
    hostFailure: false,
    cancelFailure: false,
  };
  if (options.signedIn !== false)
    await page.addInitScript(
      (auth) =>
        localStorage.setItem(
          'sb-airstethics-test-auth-token',
          JSON.stringify(auth),
        ),
      session(options.mfa),
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
    state.calls.push({ path, method, body });
    const reply = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
    const fail = () =>
      reply({ code: 'XX000', message: 'Mock database unavailable' }, 500);
    if (path === '/auth/v1/user') return reply(session(options.mfa).user);
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path === '/rest/v1/listings') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      return reply(
        id
          ? state.listings.find((listing) => listing.id === id)
          : state.listings,
      );
    }
    if (path === '/rest/v1/bookings') return reply(state.customerBookings);
    if (path === '/rest/v1/favorites') return reply([]);
    if (path === '/rest/v1/rpc/get_host_dashboard') {
      if (state.hostFailure) return fail();
      return reply({
        listings: state.listings.filter((listing) =>
          state.ownedIds.includes(listing.id),
        ),
        bookings: state.appointments.filter((appointment) =>
          state.ownedIds.includes(appointment.listing_id),
        ),
      });
    }
    if (path === '/rest/v1/rpc/update_listing') {
      if (state.updateFailure) return fail();
      const candidate = body?.p_listing as Listing;
      if (
        body?.p_listing_id !== owned.id ||
        !state.ownedIds.includes(String(body.p_listing_id))
      )
        return reply({ code: '42501', message: 'Not your listing' }, 403);
      const next = row(candidate);
      state.listings = state.listings.map((listing) =>
        listing.id === candidate.id ? next : listing,
      );
      return reply(next);
    }
    if (
      path === '/rest/v1/rpc/create_additional_listing' ||
      path === '/rest/v1/rpc/create_listing'
    ) {
      const candidate = body?.p_listing as Listing;
      const next = row({
        ...candidate,
        id: '44444444-4444-4444-8444-444444444444',
      });
      state.listings.push(next);
      state.ownedIds.push(next.id);
      return reply(next);
    }
    if (path === '/rest/v1/rpc/host_cancel_booking') {
      if (state.cancelFailure) return fail();
      const appointment = state.appointments.find(
        (item) => item.id === body?.p_id,
      );
      if (!appointment)
        return reply({ code: '42501', message: 'Not your appointment' }, 403);
      appointment.status = 'cancelled';
      return reply(appointment);
    }
    return reply({ message: `Unexpected hosting test request ${path}` }, 400);
  });
  return state;
}

async function navigate(page: Page, name: string) {
  const button = page.getByRole('button', {
    name: new RegExp(`^${name}(?:\\s*\\d+)?$`),
  });
  if (!(await button.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await button.click();
}

async function openBusiness(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Loading your places and appointments…', { exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'My business');
  await expect(
    page.getByRole('heading', { name: 'My business', exact: true }),
  ).toBeVisible();
}

async function fillNewSpace(dialog: Locator) {
  await dialog
    .getByLabel('Your space’s name', { exact: true })
    .fill('Second Independent Location');
  await dialog.getByLabel('Your name', { exact: true }).fill('Host Owner');
  await dialog
    .getByLabel('Neighbourhood', { exact: true })
    .fill('Old Strathcona');
  await dialog
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill('A separate welcoming studio for our new neighbourhood clients.');
  await dialog
    .getByLabel('Service name', { exact: true })
    .fill('Signature style');
  await dialog.getByLabel('Price (CAD)', { exact: true }).fill('95');
}

test('My business keeps owned spaces and their client appointments separate from customer bookings', async ({
  page,
}) => {
  const host = await mockHost(page);
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await openBusiness(page);
  const spaces = page.getByTestId('host-listing-card');
  await expect(spaces).toHaveCount(1);
  await expect(spaces.first()).toContainText(owned.name);
  await expect(spaces.first()).not.toContainText(unrelated.name);
  const appointment = page.getByTestId('host-appointment-card');
  await expect(appointment).toHaveCount(1);
  await expect(appointment).toContainText('Visiting Client');
  await expect(appointment).toContainText('visiting-client@example.com');
  await expect(appointment).not.toContainText('Host Visiting Another Business');
  await expect(appointment).toContainText(owned.services[0].name);
  const size = await page.locator('body').evaluate((element) => ({
    content: element.scrollWidth,
    width: window.innerWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width);
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('appointment-card')).toContainText(
    unrelated.name,
  );
  expect(
    host.calls.some((call) => call.path === '/rest/v1/rpc/get_host_dashboard'),
  ).toBe(true);
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sign out', exact: true })
    .click();
  await expect(page.getByTestId('host-appointment-card')).toHaveCount(0);
  await navigate(page, 'My business');
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('host-listing-card')).toHaveCount(0);
  await expect(
    page.getByText('visiting-client@example.com', { exact: true }),
  ).toHaveCount(0);
});

test('existing hosts manage their original space and edit details, services, and cover without losing booked snapshots', async ({
  page,
}) => {
  const host = await mockHost(page);
  host.updateFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  await expect(
    page.getByText('Loading your places and appointments…', { exact: true }),
  ).toHaveCount(0);
  const listAction = page.getByRole('button', { name: /^List your space/ });
  if (await listAction.isVisible()) await listAction.click();
  else
    await page
      .getByRole('button', { name: 'Make yourself at home', exact: true })
      .click();
  await expect(page.getByTestId('host-listing-card')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByTestId('host-listing-card')
    .getByRole('button', { name: 'Edit space', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Edit your space', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByLabel('Your space’s name', { exact: true }),
  ).toHaveValue(owned.name);
  await dialog
    .getByLabel('Your space’s name', { exact: true })
    .fill('Renamed Strathcona Studio');
  await dialog.getByLabel('Service 1 price (CAD)', { exact: true }).fill('120');
  await dialog
    .getByRole('button', { name: 'Make existing photo 2 cover', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByLabel('Your space’s name', { exact: true }),
  ).toHaveValue('Renamed Strathcona Studio');
  expect(host.listings[0].data.name).toBe(owned.name);
  host.updateFailure = false;
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('host-listing-card')).toContainText(
    'Renamed Strathcona Studio',
  );
  const edits = host.calls.filter(
    (call) => call.path === '/rest/v1/rpc/update_listing',
  );
  expect(edits).toHaveLength(2);
  const payload = edits[1].body?.p_listing as Listing;
  expect(edits[1].body?.p_listing_id).toBe(owned.id);
  expect(payload.services.map((service) => service.id)).toEqual(
    owned.services.map((service) => service.id),
  );
  expect(payload.services[0].price).toBe(120);
  expect(payload.image).toBe(owned.images[1]);
  expect(host.appointments[0].price).toBe(owned.services[0].price);
  expect(host.appointments[0].listing_name).toBe(owned.name);
  await page.reload();
  await openBusiness(page);
  await expect(page.getByTestId('host-listing-card')).toHaveCount(1);
  await expect(page.getByTestId('host-listing-card')).toContainText(
    'Renamed Strathcona Studio',
  );
  await page
    .getByTestId('host-listing-card')
    .getByRole('button', { name: 'View listing', exact: true })
    .click();
  await expect(page.getByTestId('listing-details')).toContainText(
    'Renamed Strathcona Studio',
  );
  await expect(page.getByTestId('listing-details')).toContainText('$120');
  expect(
    host.calls.filter((call) => call.path === '/rest/v1/rpc/create_listing'),
  ).toEqual([]);
});

test('another physical location is an explicit choice and uses its separate publication action', async ({
  page,
}) => {
  const host = await mockHost(page);
  await page.goto('/');
  await openBusiness(page);
  await page
    .getByRole('button', { name: 'Add another location', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Add another location', exact: true }),
  ).toBeVisible();
  await fillNewSpace(dialog);
  await dialog
    .getByRole('button', { name: /Publish my space|Add location/ })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('host-listing-card')).toHaveCount(2);
  expect(
    host.calls.filter(
      (call) => call.path === '/rest/v1/rpc/create_additional_listing',
    ),
  ).toHaveLength(1);
  expect(
    host.calls.filter((call) => call.path === '/rest/v1/rpc/create_listing'),
  ).toEqual([]);
  const second = host.listings.find(
    (listing) => listing.id === '44444444-4444-4444-8444-444444444444',
  )!;
  host.appointments.push({
    ...booking({ ...second.data, services: second.services }),
    id: '88888888-8888-4888-8888-888888888888',
    guest_name: 'Second Location Client',
  });
  await page.reload();
  await openBusiness(page);
  await expect(page.getByTestId('host-listing-card')).toHaveCount(2);
  await expect(page.getByTestId('host-appointment-card')).toHaveCount(2);
  await page.getByLabel('Space', { exact: true }).selectOption(second.id);
  await expect(page.getByTestId('host-appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('host-appointment-card')).toContainText(
    'Second Location Client',
  );
  await page.getByLabel('Space', { exact: true }).selectOption(owned.id);
  await expect(page.getByTestId('host-appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('host-appointment-card')).toContainText(
    'Visiting Client',
  );
});

test('host cancellation waits for confirmation and server success before moving a client appointment to cancelled', async ({
  page,
}) => {
  const host = await mockHost(page);
  host.cancelFailure = true;
  await page.goto('/');
  await openBusiness(page);
  const card = page.getByTestId('host-appointment-card');
  await card.getByRole('button', { name: /Cancel appointment/ }).click();
  expect(
    host.calls.filter(
      (call) => call.path === '/rest/v1/rpc/host_cancel_booking',
    ),
  ).toEqual([]);
  await card
    .getByRole('button', { name: /Confirm cancellation|Yes, cancel/ })
    .click();
  await expect(page.getByRole('alert')).toContainText(/cancel/i);
  expect(host.appointments[0].status).toBe('confirmed');
  host.cancelFailure = false;
  await card
    .getByRole('button', { name: /Confirm cancellation|Yes, cancel/ })
    .click();
  await expect.poll(() => host.appointments[0].status).toBe('cancelled');
  await page
    .getByLabel('Show appointments', { exact: true })
    .selectOption('cancelled');
  await expect(page.getByTestId('host-appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('host-appointment-card')).toContainText(
    'Cancelled',
  );
  await expect(
    page
      .getByTestId('host-appointment-card')
      .getByRole('button', { name: 'Cancel appointment', exact: true }),
  ).toHaveCount(0);
  expect(host.customerBookings[0].status).toBe('confirmed');
  expect(
    host.calls.filter((call) => call.path === '/rest/v1/rpc/cancel_booking'),
  ).toEqual([]);
});

test('a failed ownership lookup keeps the create action closed until business data is retried', async ({
  page,
}) => {
  const host = await mockHost(page);
  host.hostFailure = true;
  await page.goto('/');
  await openBusiness(page);
  await expect(
    page.getByRole('alert').filter({ hasText: /business|spaces|host/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add another location', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  host.hostFailure = false;
  await page
    .getByRole('button', { name: /Retry|Try again/i })
    .last()
    .click();
  await expect(page.getByTestId('host-listing-card')).toHaveCount(1);
});

for (const protectedState of [
  'signed out',
  'awaiting authenticator',
] as const) {
  test(`business data is never requested while ${protectedState}`, async ({
    page,
  }) => {
    const host = await mockHost(page, {
      signedIn: protectedState !== 'signed out',
      mfa: protectedState === 'awaiting authenticator',
    });
    await page.goto('/');
    if (protectedState === 'signed out') {
      await navigate(page, 'My business');
      await expect(
        page
          .getByRole('dialog')
          .getByRole('button', { name: 'Log in', exact: true }),
      ).toBeVisible();
    } else {
      await expect(
        page
          .getByRole('dialog')
          .getByRole('button', { name: 'Verify code', exact: true }),
      ).toBeVisible();
    }
    expect(
      host.calls.filter(
        (call) => call.path === '/rest/v1/rpc/get_host_dashboard',
      ),
    ).toEqual([]);
    await expect(page.getByTestId('host-appointment-card')).toHaveCount(0);
    await expect(page.getByTestId('host-listing-card')).toHaveCount(0);
  });
}
