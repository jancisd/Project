import { expect, test, type Locator, type Page } from '@playwright/test';

const api = 'https://airstethics-test.supabase.co';
const storageKey = 'sb-airstethics-test-auth-token';
const email = 'password-account@example.com';
const accountId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-23T12:00:00.000Z';
const existingPassword = 'test-existing-password-2026';
const newPassword = 'test-updated-password-2026';

function accountSession(method = 'password') {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const user = {
    id: accountId,
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
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: accountId, aud: 'authenticated', role: 'authenticated', email, aal: 'aal1', amr: [{ method, timestamp: now }], iat: now, exp: now + 3600 })}.test-signature`,
    refresh_token: 'mock-password-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
}

type RequestCall = {
  path: string;
  method: string;
  url: string;
  body: Record<string, unknown> | null;
};

async function mockAccount(page: Page, signedIn = false) {
  const auth = accountSession(signedIn ? 'otp' : 'password');
  const state = {
    calls: [] as RequestCall[],
    loginFailure: false,
    updateFailure: false,
    signupGate: null as Promise<void> | null,
    passwordGate: null as Promise<void> | null,
  };
  if (signedIn)
    await page.addInitScript(
      ({ key, session }) => {
        if (!sessionStorage.getItem('mock-account-seeded')) {
          localStorage.setItem(key, JSON.stringify(session));
          sessionStorage.setItem('mock-account-seeded', 'true');
        }
      },
      { key: storageKey, session: auth },
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
    state.calls.push({ path, method, url: url.href, body });
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'X-Supabase-Api-Version': '2024-01-01' },
        body: JSON.stringify(data),
      });
    if (path === '/auth/v1/token') {
      if (state.loginFailure)
        return reply(
          {
            code: 'invalid_credentials',
            message: `Invalid credentials for ${email}`,
          },
          400,
        );
      return reply(auth);
    }
    if (path === '/auth/v1/signup') {
      if (state.signupGate) await state.signupGate;
      // Confirm-email is enabled: a user record is not a signed-in session.
      return reply({
        user: { ...auth.user, email_confirmed_at: null },
        session: null,
      });
    }
    if (path === '/auth/v1/recover') return reply({});
    if (path === '/auth/v1/user') {
      if (method === 'PUT') {
        if (state.passwordGate) await state.passwordGate;
        if (state.updateFailure)
          return reply(
            { code: 'unexpected_failure', message: 'Mock update failed' },
            500,
          );
      }
      return reply(auth.user);
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path.startsWith('/rest/v1/')) return reply([]);
    return reply({ message: `Unexpected mocked auth request: ${path}` }, 404);
  });
  return state;
}

async function openAccount(page: Page) {
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  return page.getByRole('dialog');
}

async function fillPasswords(dialog: Locator, password: string) {
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByLabel('Confirm password', { exact: true }).fill(password);
}

async function expectNoPasswordStorage(page: Page, ...passwords: string[]) {
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  for (const password of passwords) expect(storage).not.toContain(password);
}

test('password login uses the existing account and survives reload without another email or password request', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/');
  const dialog = await openAccount(page);
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(existingPassword);
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  const logins = account.calls.filter((call) => call.path === '/auth/v1/token');
  expect(logins).toHaveLength(1);
  expect(new URL(logins[0].url).searchParams.get('grant_type')).toBe(
    'password',
  );
  expect(logins[0].body).toMatchObject({ email, password: existingPassword });
  expect(
    account.calls.filter((call) =>
      ['/auth/v1/otp', '/auth/v1/signup', '/auth/v1/recover'].includes(
        call.path,
      ),
    ),
  ).toEqual([]);
  await expectNoPasswordStorage(page, existingPassword);
  await page.reload();
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  expect(
    account.calls.filter((call) => call.path === '/auth/v1/token'),
  ).toHaveLength(1);
  await expectNoPasswordStorage(page, existingPassword);
});

test('invalid credentials keep the login form and never create a session or an account', async ({
  page,
}) => {
  const account = await mockAccount(page);
  account.loginFailure = true;
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(existingPassword);
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('alert')).not.toContainText(email);
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(
    email,
  );
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue(
    existingPassword,
  );
  await expect(
    dialog.getByRole('button', { name: 'Log in', exact: true }),
  ).toBeEnabled();
  expect(
    account.calls.filter((call) => call.path === '/auth/v1/signup'),
  ).toEqual([]);
  expect(
    account.calls.filter((call) =>
      ['/rest/v1/favorites', '/rest/v1/bookings'].includes(call.path),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
  await expectNoPasswordStorage(page, existingPassword);
});

test('signup validates password confirmation and waits for email confirmation without signing in', async ({
  page,
}) => {
  const account = await mockAccount(page);
  let releaseSignup = () => {};
  account.signupGate = new Promise<void>((resolve) => {
    releaseSignup = resolve;
  });
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog
    .getByRole('tab', { name: 'Create account', exact: true })
    .click();
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(existingPassword);
  await dialog
    .getByLabel('Confirm password', { exact: true })
    .fill(newPassword);
  await dialog
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  expect(
    account.calls.filter((call) => call.path === '/auth/v1/signup'),
  ).toHaveLength(0);
  await dialog
    .getByLabel('Confirm password', { exact: true })
    .fill(existingPassword);
  await dialog
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(dialog.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole('tab', { name: 'Log in', exact: true }),
  ).toBeDisabled();
  await expect
    .poll(
      () =>
        account.calls.filter((call) => call.path === '/auth/v1/signup').length,
    )
    .toBe(1);
  releaseSignup();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Account', exact: true }),
  ).toHaveCount(0);
  expect(
    account.calls.filter((call) =>
      ['/auth/v1/otp', '/auth/v1/token'].includes(call.path),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
  await expectNoPasswordStorage(page, existingPassword, newPassword);
});

test('forgot password requests one reset link and does not register or sign in the visitor', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/');
  const dialog = await openAccount(page);
  await dialog.getByLabel('Email address', { exact: true }).fill(email);
  await dialog
    .getByRole('button', { name: 'Forgot password?', exact: true })
    .click();
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue(
    email,
  );
  await dialog
    .getByRole('button', { name: 'Send reset link', exact: true })
    .click();
  await expect(
    dialog.getByRole('heading', { name: 'Check your email.' }),
  ).toBeVisible();
  const reset = account.calls.filter(
    (call) => call.path === '/auth/v1/recover',
  );
  expect(reset).toHaveLength(1);
  expect(reset[0].body).toMatchObject({ email });
  expect(new URL(reset[0].url).searchParams.get('redirect_to')).toBe(
    'http://127.0.0.1:5175/?account=recovery',
  );
  expect(
    account.calls.filter((call) =>
      ['/auth/v1/signup', '/auth/v1/token', '/auth/v1/otp'].includes(call.path),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test('a recovery link opens password replacement, waits for the update, and clears recovery after success', async ({
  page,
}) => {
  const account = await mockAccount(page);
  const session = accountSession('recovery');
  let releasePassword = () => {};
  account.passwordGate = new Promise<void>((resolve) => {
    releasePassword = resolve;
  });
  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: '3600',
    token_type: 'bearer',
    type: 'recovery',
  });
  await page.goto(`/?account=recovery#${hash}`);
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Save password', exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel('Password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'new-password',
  );
  await fillPasswords(dialog, newPassword);
  await dialog
    .getByRole('button', { name: 'Save password', exact: true })
    .click();
  await expect(dialog.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole('heading', { name: 'Password saved.' }),
  ).toHaveCount(0);
  await expect
    .poll(
      () =>
        account.calls.filter(
          (call) => call.path === '/auth/v1/user' && call.method === 'PUT',
        ).length,
    )
    .toBe(1);
  releasePassword();
  await expect(
    dialog.getByRole('heading', { name: 'Password saved.' }),
  ).toBeVisible();
  const updates = account.calls.filter(
    (call) => call.path === '/auth/v1/user' && call.method === 'PUT',
  );
  expect(updates[0].body).toMatchObject({ password: newPassword });
  await expect
    .poll(() => new URL(page.url()).searchParams.get('account'))
    .toBeNull();
  expect(new URL(page.url()).hash).toBe('');
  await expectNoPasswordStorage(page, newPassword);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Account', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save password', exact: true }),
  ).toHaveCount(0);
  expect(
    account.calls.filter((call) =>
      ['/auth/v1/signup', '/auth/v1/token', '/auth/v1/otp'].includes(call.path),
    ),
  ).toEqual([]);
});

test('an existing email-link account can set a password without registering again and failed updates stay editable', async ({
  page,
}) => {
  const account = await mockAccount(page, true);
  account.updateFailure = true;
  await page.goto('/');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Set or change password', exact: true })
    .click();
  await fillPasswords(dialog, newPassword);
  await dialog
    .getByRole('button', { name: 'Save password', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Password saved.' }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Save password', exact: true }),
  ).toBeEnabled();
  account.updateFailure = false;
  await dialog
    .getByRole('button', { name: 'Save password', exact: true })
    .click();
  await expect(
    dialog.getByRole('heading', { name: 'Password saved.' }),
  ).toBeVisible();
  expect(
    account.calls.filter(
      (call) => call.path === '/auth/v1/user' && call.method === 'PUT',
    ),
  ).toHaveLength(2);
  expect(
    account.calls.filter((call) =>
      [
        '/auth/v1/signup',
        '/auth/v1/token',
        '/auth/v1/otp',
        '/auth/v1/recover',
      ].includes(call.path),
    ),
  ).toEqual([]);
  await expectNoPasswordStorage(page, newPassword);
});

test('the recovery URL flag alone cannot give an unauthenticated visitor a password update form', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/?account=recovery');
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Log in', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save password', exact: true }),
  ).toHaveCount(0);
  expect(
    account.calls.filter(
      (call) => call.path === '/auth/v1/user' && call.method === 'PUT',
    ),
  ).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});
