import { expect, test, type Locator, type Page } from '@playwright/test';
import { listings as sampleListings, type Listing } from '../src/data';

const api = 'https://airstethics-test.supabase.co';
const userId = '11111111-1111-4111-8111-111111111111';
const email = 'authenticator-test@example.com';
const timestamp = '2026-10-22T12:00:00.000Z';
const secret = 'JBSWY3DPEHPK3PXP';
const validCode = '123456';
const factorId = '44444444-4444-4444-8444-444444444444';
const challengeId = '55555555-5555-4555-8555-555555555555';
const listing: Listing = {
  ...sampleListings[0],
  id: 'mfa-cloud-studio',
  name: 'Authenticator Hair Studio',
  isDemo: false,
  coordinates: { lat: 53.5175, lng: -113.4994 },
  services: sampleListings[0].services.map((service) => ({
    ...service,
    id: `mfa-${service.id}`,
  })),
};

type Level = 'aal1' | 'aal2';
type Factor = {
  id: string;
  friendly_name: string;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
};
type RequestCall = {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
  authorization: string | undefined;
};

function factor(status: Factor['status'] = 'verified'): Factor {
  return {
    id: factorId,
    friendly_name: 'Authenticator app',
    factor_type: 'totp',
    status,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function session(level: Level, factors: Factor[]) {
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
    factors,
    created_at: timestamp,
    updated_at: timestamp,
    is_anonymous: false,
  };
  const amr = [
    { method: 'password', timestamp: now },
    ...(level === 'aal2' ? [{ method: 'totp', timestamp: now }] : []),
  ];
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, aud: 'authenticated', role: 'authenticated', email, aal: level, amr, iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'authenticator-test-refresh-token-only',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  };
}

function authorizationLevel(call: RequestCall) {
  const payload = call.authorization?.replace(/^Bearer /i, '').split('.')[1];
  return payload
    ? (
        JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
          aal?: Level;
        }
      ).aal
    : undefined;
}

function privateCalls(calls: RequestCall[]) {
  return calls.filter(
    ({ path }) =>
      path === '/rest/v1/bookings' ||
      path === '/rest/v1/favorites' ||
      /^\/rest\/v1\/rpc\/(?:create_booking|cancel_booking|create_listing)$/.test(
        path,
      ) ||
      path.startsWith('/storage/v1/object/'),
  );
}

async function mockAuthenticator(
  page: Page,
  options: { signedIn?: boolean; enrolled?: boolean; level?: Level } = {},
) {
  const state = {
    level: options.level ?? ('aal1' as Level),
    factors: options.enrolled ? [factor()] : ([] as Factor[]),
    calls: [] as RequestCall[],
    securityFailure: false,
    removeFailure: false,
    saved: [listing.id],
    challenges: 0,
  };
  await page.addInitScript(
    ({ initialSession, key }) => {
      // Do not replace the upgraded session when a test reloads the page.
      if (!sessionStorage.getItem('authenticator-fixture-initialized')) {
        if (initialSession)
          localStorage.setItem(key, JSON.stringify(initialSession));
        sessionStorage.setItem('authenticator-fixture-initialized', 'true');
      }
    },
    {
      initialSession:
        options.signedIn === false ? null : session(state.level, state.factors),
      key: 'sb-airstethics-test-auth-token',
    },
  );
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
  await page.route(`${api}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON() as Record<string, unknown> | null;
    state.calls.push({
      path,
      method,
      body,
      authorization: request.headers().authorization,
    });
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    const failure = (code: string, status = 400) =>
      reply(
        { code, error_code: code, message: 'The mocked request was rejected.' },
        status,
      );

    if (path === '/auth/v1/user') {
      if (state.securityFailure) return failure('unexpected_failure', 503);
      return reply(session(state.level, state.factors).user);
    }
    if (path === '/auth/v1/token')
      return reply(session(state.level, state.factors));
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path === '/auth/v1/factors' && method === 'POST') {
      state.factors = [factor('unverified')];
      return reply({
        id: factorId,
        type: 'totp',
        friendly_name: 'Authenticator app',
        totp: {
          qr_code:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg>',
          secret,
          uri: `otpauth://totp/airstethics:test?secret=${secret}&issuer=airstethics`,
        },
      });
    }
    if (path === `/auth/v1/factors/${factorId}/challenge`) {
      state.challenges += 1;
      return reply({
        id: challengeId,
        type: 'totp',
        expires_at: Date.now() / 1000 + 60,
      });
    }
    if (path === `/auth/v1/factors/${factorId}/verify`) {
      if (body?.code !== validCode || body?.challenge_id !== challengeId)
        return failure('mfa_verification_failed', 422);
      state.factors = [factor()];
      state.level = 'aal2';
      return reply(session(state.level, state.factors));
    }
    if (path === `/auth/v1/factors/${factorId}` && method === 'DELETE') {
      if (state.removeFailure) return failure('unexpected_failure');
      state.factors = [];
      return reply({ id: factorId });
    }
    if (path === '/rest/v1/listings') {
      const { services, ...data } = listing;
      return reply([
        {
          id: listing.id,
          data,
          is_demo: false,
          services,
          created_at: timestamp,
        },
      ]);
    }
    if (path === '/rest/v1/bookings') {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      return reply([
        {
          id: '22222222-2222-4222-8222-222222222222',
          customer_id: userId,
          listing_id: listing.id,
          service_id: listing.services[0].id,
          listing_name: listing.name,
          listing_image: listing.image,
          city: listing.city,
          service_name: listing.services[0].name,
          booking_date: tomorrow.toISOString().slice(0, 10),
          booking_time: '09:00:00',
          duration: listing.services[0].duration,
          price: listing.services[0].price,
          guest_name: 'Private MFA Customer',
          guest_email: email,
          created_at: timestamp,
          status: 'confirmed',
        },
      ]);
    }
    if (path === '/rest/v1/favorites') {
      if (method === 'GET')
        return reply(state.saved.map((listing_id) => ({ listing_id })));
      if (method === 'POST')
        state.saved = [...new Set([...state.saved, String(body?.listing_id)])];
      return route.fulfill({ status: 204 });
    }
    if (path === '/rest/v1/rpc/listing_availability') return reply([]);
    return failure('unexpected_mock_route');
  });
  return state;
}

async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  return page.getByRole('dialog');
}

async function enterCode(dialog: Locator, code = validCode) {
  await dialog
    .getByLabel(/^(?:Authenticator|Verification|6-digit) code$/i)
    .fill(code);
  await dialog
    .getByRole('button', { name: 'Verify code', exact: true })
    .click();
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

test('authenticator setup stays unconfirmed after a rejected code and enables only after verification', async ({
  page,
}) => {
  const state = await mockAuthenticator(page);
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  const dialog = await openAccount(page);
  await dialog
    .getByRole('button', { name: 'Enable authenticator', exact: true })
    .click();
  await dialog.getByText('Enter setup key manually', { exact: true }).click();
  await expect(dialog.getByText(secret, { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('img', {
      name: 'Scan to add airstethics to your authenticator app',
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/airstethics-mfa-setup-${test.info().project.name}.png`,
  });
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toHaveCount(0);
  expect(state.factors[0].status).toBe('unverified');
  expect(
    state.calls.filter(({ path }) => path === '/auth/v1/factors')[0].body,
  ).toMatchObject({ factor_type: 'totp' });

  await enterCode(dialog, '000000');
  await expect(dialog.getByRole('alert')).toContainText(
    /code couldn’t be verified/i,
  );
  await expect(dialog.getByText(secret, { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toHaveCount(0);
  expect(state.factors[0].status).toBe('unverified');

  await enterCode(dialog);
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(secret, { exact: true })).toHaveCount(0);
  expect(state.factors[0].status).toBe('verified');
  expect(state.level).toBe('aal2');
  expect(
    state.calls
      .filter(({ path }) => path.endsWith('/verify'))
      .map(({ body }) => body),
  ).toEqual([
    { challenge_id: challengeId, code: '000000' },
    { challenge_id: challengeId, code: validCode },
  ]);
  expect(
    await page.evaluate(
      (value) =>
        Object.values(localStorage).some((stored) => stored.includes(value)),
      secret,
    ),
  ).toBe(false);
  await dialog
    .getByRole('button', { name: 'Close account', exact: true })
    .click();
  await openAccount(page);
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
});

test('canceling setup deletes its unverified factor and clears the setup secret', async ({
  page,
}) => {
  const state = await mockAuthenticator(page);
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog
    .getByRole('button', { name: 'Enable authenticator', exact: true })
    .click();
  await dialog.getByText('Enter setup key manually', { exact: true }).click();
  await expect(dialog.getByText(secret, { exact: true })).toBeVisible();
  await dialog
    .getByRole('button', { name: /Cancel (?:authenticator )?setup/i })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(secret, { exact: true })).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toHaveCount(0);
  expect(state.factors).toEqual([]);
  const deletion = state.calls.filter(
    ({ path, method }) =>
      path === `/auth/v1/factors/${factorId}` && method === 'DELETE',
  );
  expect(deletion).toHaveLength(1);
  expect(authorizationLevel(deletion[0])).toBe('aal1');
  expect(
    state.calls.filter(({ path }) => path.endsWith('/verify')),
  ).toHaveLength(0);
});

test('a restored account with an authenticator blocks private data and account actions until its code is verified', async ({
  page,
}) => {
  const state = await mockAuthenticator(page, { enrolled: true });
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toBeVisible();
  expect(privateCalls(state.calls)).toEqual([]);
  await enterCode(dialog, '000000');
  await expect(dialog.getByRole('alert')).toContainText(
    /code couldn’t be verified/i,
  );
  expect(privateCalls(state.calls)).toEqual([]);
  await expect(page.getByTestId('appointment-card')).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toHaveCount(0);

  await dialog
    .getByRole('button', { name: 'Close account', exact: true })
    .click();
  await page
    .getByRole('button', { name: `Save ${listing.name}`, exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toBeVisible();
  expect(privateCalls(state.calls)).toEqual([]);
  await dialog
    .getByRole('button', { name: 'Close account', exact: true })
    .click();
  const partner = page.getByRole('button', { name: /^List your space/ });
  if (await partner.isVisible()) await partner.click();
  else
    await page
      .getByRole('button', { name: 'Make yourself at home', exact: true })
      .click();
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByLabel('Your space’s name', { exact: true }),
  ).toHaveCount(0);
  expect(privateCalls(state.calls)).toEqual([]);
  await dialog
    .getByRole('button', { name: 'Close account', exact: true })
    .click();
  await page
    .getByTestId('listing-card')
    .getByRole('button', { name: `View ${listing.name}`, exact: true })
    .click();
  await page
    .getByTestId('listing-details')
    .getByRole('button', { name: 'Choose a service & time', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toBeVisible();
  expect(privateCalls(state.calls)).toEqual([]);

  await enterCode(dialog);
  await expect
    .poll(
      () =>
        privateCalls(state.calls).filter(({ method }) => method === 'GET')
          .length,
    )
    .toBeGreaterThanOrEqual(2);
  const privateReads = privateCalls(state.calls).filter(
    ({ method }) => method === 'GET',
  );
  expect(
    privateReads.every((call) => authorizationLevel(call) === 'aal2'),
  ).toBe(true);
  if (await dialog.isVisible())
    await dialog
      .getByRole('button', { name: 'Close account', exact: true })
      .click();
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('appointment-card')).toContainText(
    listing.name,
  );
  const verifications = state.calls.filter(({ path }) =>
    path.endsWith('/verify'),
  ).length;
  await page.reload();
  await expect
    .poll(
      () =>
        privateCalls(state.calls).filter(({ method }) => method === 'GET')
          .length,
    )
    .toBeGreaterThan(privateReads.length);
  await expect(
    page.getByRole('button', { name: 'Verify code', exact: true }),
  ).toHaveCount(0);
  expect(
    state.calls.filter(({ path }) => path.endsWith('/verify')),
  ).toHaveLength(verifications);
  expect(
    privateCalls(state.calls).every(
      (call) => authorizationLevel(call) === 'aal2',
    ),
  ).toBe(true);
});

test('an interrupted setup is cleaned up before restarting and cleanup errors prevent duplicate factors', async ({
  page,
}) => {
  const state = await mockAuthenticator(page);
  // The browser no longer holds its QR code, but Supabase retained the
  // unverified factor from a setup interrupted by a reload or closed tab.
  state.factors = [factor('unverified')];
  state.removeFailure = true;
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog
    .getByRole('button', { name: 'Enable authenticator', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toBeEnabled();
  expect(
    state.calls.filter(
      ({ path, method }) => path === '/auth/v1/factors' && method === 'POST',
    ),
  ).toEqual([]);
  expect(state.factors).toEqual([factor('unverified')]);

  state.removeFailure = false;
  await dialog
    .getByRole('button', { name: 'Enable authenticator', exact: true })
    .click();
  await expect(
    dialog.getByRole('img', {
      name: 'Scan to add airstethics to your authenticator app',
      exact: true,
    }),
  ).toBeVisible();
  const mutations = state.calls
    .filter(({ path }) => path.startsWith('/auth/v1/factors'))
    .map(({ path, method }) => `${method} ${path}`);
  expect(mutations).toEqual([
    `DELETE /auth/v1/factors/${factorId}`,
    `DELETE /auth/v1/factors/${factorId}`,
    'POST /auth/v1/factors',
  ]);
  await dialog
    .getByRole('button', { name: 'Cancel setup', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toBeVisible();
  expect(state.factors).toEqual([]);
});

test('password login for an enrolled account requests an authenticator code before loading account data', async ({
  page,
}) => {
  const state = await mockAuthenticator(page, {
    signedIn: false,
    enrolled: true,
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog
    .getByLabel('Password', { exact: true })
    .fill('test-password-only');
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Verify code', exact: true }),
  ).toBeVisible();
  expect(privateCalls(state.calls)).toEqual([]);
  expect(
    state.calls.filter(({ path }) => path === '/auth/v1/token'),
  ).toHaveLength(1);
  await enterCode(dialog);
  await expect
    .poll(() => privateCalls(state.calls).length)
    .toBeGreaterThanOrEqual(2);
  expect(
    privateCalls(state.calls).every(
      (call) => authorizationLevel(call) === 'aal2',
    ),
  ).toBe(true);
  expect(
    state.calls.some(({ path }) =>
      ['/auth/v1/otp', '/auth/v1/signup', '/auth/v1/recover'].includes(path),
    ),
  ).toBe(false);
});

test('disabling an authenticator requires the verified session and reports deletion failures without claiming success', async ({
  page,
}) => {
  const state = await mockAuthenticator(page, {
    enrolled: true,
    level: 'aal2',
  });
  state.removeFailure = true;
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog
    .getByRole('button', { name: 'Disable authenticator', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toHaveCount(0);
  expect(state.factors[0].status).toBe('verified');
  state.removeFailure = false;
  const userReads = state.calls.filter(
    ({ path }) => path === '/auth/v1/user',
  ).length;
  await dialog
    .getByRole('button', { name: 'Disable authenticator', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Disable authenticator', exact: true }),
  ).toHaveCount(0);
  expect(state.factors).toEqual([]);
  expect(
    state.calls.filter(({ path }) => path === '/auth/v1/user').length,
  ).toBeGreaterThan(userReads);
  const deletions = state.calls.filter(
    ({ path, method }) =>
      path === `/auth/v1/factors/${factorId}` && method === 'DELETE',
  );
  expect(deletions).toHaveLength(2);
  expect(deletions.every((call) => authorizationLevel(call) === 'aal2')).toBe(
    true,
  );
});

test('a failed security check keeps account data closed until a successful retry', async ({
  page,
}) => {
  const state = await mockAuthenticator(page);
  state.securityFailure = true;
  await page.goto('/');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await openAccount(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText(
    /couldn’t check your account security/i,
  );
  expect(privateCalls(state.calls)).toEqual([]);
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toHaveCount(0);
  state.securityFailure = false;
  await dialog.getByRole('button', { name: /Retry|Try again/i }).click();
  await expect(
    dialog.getByRole('button', { name: 'Enable authenticator', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => privateCalls(state.calls).length)
    .toBeGreaterThanOrEqual(2);
  expect(
    privateCalls(state.calls).every(
      (call) => authorizationLevel(call) === 'aal1',
    ),
  ).toBe(true);
});
