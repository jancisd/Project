import { expect, test, type Locator, type Page } from '@playwright/test';
import { listings as samples, type Listing } from '../src/data';
import { defaultSchedule, type ListingSchedule } from '../src/availability';

const api = 'https://airstethics-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-26T12:00:00.000Z';
const listing: Listing = {
  ...samples[0],
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Availability Studio',
  isDemo: false,
  coordinates: { lat: 53.5175, lng: -113.4994 },
  services: samples[0].services.map((service, index) => ({
    ...service,
    id: `available-service-${index}`,
  })),
};
function dayIn(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function session(mfa = false) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'availability-host@example.com',
    email_confirmed_at: timestamp,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
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
  };
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: now }], iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'availability-test-refresh-only',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
}

type Call = { path: string; body: Record<string, unknown> | null };

async function mockAvailability(
  page: Page,
  options: { signedIn?: boolean; mfa?: boolean } = {},
) {
  const state = {
    schedule: defaultSchedule(),
    calls: [] as Call[],
    scheduleFailure: false,
    saveFailure: false,
    slotsFailure: false,
    conflict: false,
    bookings: [] as Record<string, unknown>[],
    slotLists: {} as Record<string, string[]>,
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
    const path = new URL(request.url()).pathname;
    const body = request.postDataJSON() as Record<string, unknown> | null;
    state.calls.push({ path, body });
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    const failed = () =>
      reply({ code: 'XX000', message: 'Mock request unavailable' }, 500);
    const { services, ...data } = listing;
    const row = {
      id: listing.id,
      data,
      services,
      is_demo: false,
      created_at: timestamp,
    };
    if (path === '/auth/v1/user') return reply(session(options.mfa).user);
    if (path === '/rest/v1/listings') return reply([row]);
    if (path === '/rest/v1/favorites') return reply([]);
    if (path === '/rest/v1/bookings') return reply(state.bookings);
    if (path === '/rest/v1/rpc/get_host_dashboard')
      return reply({ listings: [row], bookings: [] });
    if (path === '/rest/v1/rpc/get_listing_schedule')
      return state.scheduleFailure ? failed() : reply(state.schedule);
    if (path === '/rest/v1/rpc/update_listing_schedule') {
      if (state.saveFailure) return failed();
      state.schedule = body?.p_schedule as ListingSchedule;
      return reply(state.schedule);
    }
    if (path === '/rest/v1/rpc/available_booking_slots') {
      if (state.slotsFailure) return failed();
      const key = `${body?.p_date}:${body?.p_service_id}`;
      return reply(
        (state.slotLists[key] ?? ['10:15', '12:15', '15:15']).map((time) => ({
          booking_time: `${time}:00`,
        })),
      );
    }
    if (path === '/rest/v1/rpc/create_booking') {
      if (state.conflict)
        return reply(
          { code: '23P01', message: 'That time was just booked' },
          400,
        );
      const service = listing.services.find(
        (item) => item.id === body?.p_service_id,
      )!;
      const booking = {
        id: body?.p_id,
        customer_id: userId,
        listing_id: listing.id,
        service_id: service.id,
        listing_name: listing.name,
        listing_image: listing.image,
        city: listing.city,
        service_name: service.name,
        booking_date: body?.p_date,
        booking_time: `${body?.p_time}:00`,
        duration: service.duration,
        price: service.price,
        guest_name: body?.p_guest_name,
        guest_email: body?.p_guest_email,
        created_at: timestamp,
        status: 'confirmed',
      };
      state.bookings.push(booking);
      return reply(booking);
    }
    return reply({ message: `Unexpected availability request: ${path}` }, 400);
  });
  return state;
}

async function navigate(page: Page, name: string) {
  const nav = page.getByRole('button', { name, exact: true });
  if (!(await nav.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await nav.click();
}

async function openAvailability(page: Page) {
  await expect(
    page.getByText('Loading your places and appointments…', { exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'My business');
  await page
    .getByTestId('host-listing-card')
    .getByRole('button', { name: 'Manage availability', exact: true })
    .click();
  return page.getByRole('dialog');
}

async function openBooking(page: Page) {
  await page
    .getByTestId('listing-card')
    .getByRole('button', { name: `View ${listing.name}`, exact: true })
    .click();
  await page
    .getByTestId('listing-details')
    .getByRole('button', { name: 'Choose a service & time', exact: true })
    .click();
  return page.getByRole('dialog');
}

async function fillGuest(dialog: Locator) {
  await dialog
    .getByLabel('Your name', { exact: true })
    .fill('Availability Guest');
  await dialog
    .getByLabel('Email address', { exact: true })
    .fill('availability-guest@example.com');
}

test('hosts save weekly hours, breaks, days off, blocked dates, and buffers without losing changes after an error', async ({
  page,
}) => {
  const account = await mockAvailability(page);
  account.saveFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const dialog = await openAvailability(page);
  await expect(
    dialog.getByLabel('Monday opening time', { exact: true }),
  ).toHaveValue('09:00');
  await dialog.getByLabel('Monday opening time', { exact: true }).fill('10:00');
  await dialog.getByLabel('Monday closing time', { exact: true }).fill('19:00');
  await dialog
    .getByRole('button', { name: 'Add Monday break', exact: true })
    .click();
  await dialog
    .getByLabel('Monday break 1 start', { exact: true })
    .fill('12:00');
  await dialog.getByLabel('Monday break 1 end', { exact: true }).fill('13:00');
  await dialog.getByLabel('Sunday open', { exact: true }).uncheck();
  await dialog
    .getByLabel('Time after each appointment', { exact: true })
    .fill('15');
  await dialog
    .getByLabel('Booking start intervals', { exact: true })
    .selectOption('30');
  const blockedDate = dayIn(8);
  await dialog.getByLabel('Block a date', { exact: true }).fill(blockedDate);
  await dialog
    .getByRole('button', { name: 'Add blocked date', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Save availability', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(/couldn’t save|retry/i);
  await expect(
    dialog.getByLabel('Monday opening time', { exact: true }),
  ).toHaveValue('10:00');
  expect(account.schedule.weekly[1].start).toBe('09:00');
  account.saveFailure = false;
  await dialog
    .getByRole('button', { name: 'Save availability', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(account.schedule.weekly.find((item) => item.day === 1)).toMatchObject({
    enabled: true,
    start: '10:00',
    end: '19:00',
    breaks: [{ start: '12:00', end: '13:00' }],
  });
  expect(account.schedule.weekly.find((item) => item.day === 0)?.enabled).toBe(
    false,
  );
  expect(account.schedule).toMatchObject({
    bufferMinutes: 15,
    slotMinutes: 30,
    blockedDates: [{ date: blockedDate }],
  });
  const updates = account.calls.filter(
    (call) => call.path === '/rest/v1/rpc/update_listing_schedule',
  );
  expect(updates).toHaveLength(2);
  expect(updates[1].body?.p_listing_id).toBe(listing.id);
  await page.reload();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const restored = await openAvailability(page);
  await expect(
    restored.getByLabel('Monday opening time', { exact: true }),
  ).toHaveValue('10:00');
  await expect(
    restored.getByLabel('Sunday open', { exact: true }),
  ).not.toBeChecked();
  await expect(
    restored.getByRole('button', {
      name: `Unblock ${blockedDate}`,
      exact: true,
    }),
  ).toBeVisible();
});

test('a failed schedule load must be retried before the editor permits saving', async ({
  page,
}) => {
  const account = await mockAvailability(page);
  account.scheduleFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const dialog = await openAvailability(page);
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Save availability', exact: true }),
  ).toHaveCount(0);
  account.scheduleFailure = false;
  await dialog
    .getByRole('button', { name: 'Retry availability', exact: true })
    .click();
  await expect(
    dialog.getByLabel('Monday opening time', { exact: true }),
  ).toHaveValue('09:00');
  expect(
    account.calls.filter(
      (call) => call.path === '/rest/v1/rpc/update_listing_schedule',
    ),
  ).toEqual([]);
});

test('customer time choices come from the selected service and date and availability failures stay closed', async ({
  page,
}) => {
  const account = await mockAvailability(page);
  account.slotsFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const dialog = await openBooking(page);
  await expect(
    dialog.getByText(/couldn’t check available times/i),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Book my appointment', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toHaveCount(0);
  account.slotsFailure = false;
  await dialog.getByRole('button', { name: /Try again|Retry/i }).click();
  await expect(
    dialog.getByRole('button', { name: '10:15 AM', exact: true }),
  ).toBeEnabled();
  const day = await dialog.getByLabel('Your day', { exact: true }).inputValue();
  account.slotLists[`${day}:${listing.services[1].id}`] = ['11:45', '15:45'];
  await dialog.getByText(listing.services[1].name, { exact: true }).click();
  await expect(
    dialog.getByRole('radio', { name: new RegExp(listing.services[1].name) }),
  ).toBeChecked();
  await expect(
    dialog.getByRole('button', { name: '11:45 AM', exact: true }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole('button', { name: '10:15 AM', exact: true }),
  ).toHaveCount(0);
  const blocked = dayIn(3);
  account.slotLists[`${blocked}:${listing.services[1].id}`] = [];
  await dialog.getByLabel('Your day', { exact: true }).fill(blocked);
  await expect(
    dialog.getByText(/No available times on this day/i),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Book my appointment', exact: true }),
  ).toBeDisabled();
  const slotRequests = account.calls.filter(
    (call) => call.path === '/rest/v1/rpc/available_booking_slots',
  );
  expect(slotRequests.at(-1)?.body).toMatchObject({
    p_listing_id: listing.id,
    p_service_id: listing.services[1].id,
    p_date: blocked,
  });
});

test('a time taken after selection cannot produce a false booking confirmation', async ({
  page,
}) => {
  const account = await mockAvailability(page);
  account.conflict = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const dialog = await openBooking(page);
  await dialog.getByRole('button', { name: '10:15 AM', exact: true }).click();
  await fillGuest(dialog);
  await dialog
    .getByRole('button', { name: 'Book my appointment', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    'That time was just booked',
  );
  await expect(
    dialog.getByRole('heading', { name: /all booked in/i }),
  ).toHaveCount(0);
  expect(account.bookings).toEqual([]);
  await expect(dialog.getByLabel('Your name', { exact: true })).toHaveValue(
    'Availability Guest',
  );
});

for (const state of ['signed out', 'awaiting authenticator'] as const) {
  test(`availability cannot be managed while ${state}`, async ({ page }) => {
    const account = await mockAvailability(page, {
      signedIn: state !== 'signed out',
      mfa: state === 'awaiting authenticator',
    });
    await page.goto('/');
    await expect(page.getByTestId('listing-card')).toHaveCount(1);
    if (state === 'signed out') await navigate(page, 'My business');
    await expect(
      page.getByRole('dialog').getByRole('button', {
        name: state === 'signed out' ? 'Log in' : 'Verify code',
        exact: true,
      }),
    ).toBeVisible();
    expect(
      account.calls.filter((call) =>
        [
          '/rest/v1/rpc/update_listing_schedule',
          '/rest/v1/rpc/get_host_dashboard',
        ].includes(call.path),
      ),
    ).toEqual([]);
    await expect(
      page.getByRole('button', { name: 'Manage availability', exact: true }),
    ).toHaveCount(0);
  });
}
