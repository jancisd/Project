import { expect, test } from '@playwright/test';

const api = 'https://airstethics-test.supabase.co';
const email = 'signin-test@example.com';

type FailureCase = {
  name: string;
  status?: number;
  code?: string;
  providerMessage?: string;
  message: string;
};

const failures: FailureCase[] = [
  {
    name: 'restricted email delivery',
    status: 403,
    code: 'email_address_not_authorized',
    providerMessage: 'Email address not authorized',
    message:
      'Sign-in emails are currently limited to approved accounts. Please contact the site owner to enable email delivery.',
  },
  {
    name: 'email rate limiting',
    status: 429,
    code: 'over_email_send_rate_limit',
    providerMessage: 'Email rate limit exceeded',
    message:
      'Too many sign-in emails have been requested. Please wait before trying again.',
  },
  {
    name: 'disabled email sign-in',
    status: 400,
    code: 'email_provider_disabled',
    providerMessage: 'Email logins are disabled',
    message: 'Email sign-in isn’t enabled yet. Please contact the site owner.',
  },
  {
    name: 'invalid connection key',
    status: 401,
    providerMessage: 'Invalid API key',
    message:
      'Sign-in is unavailable because the site’s connection settings need to be updated. Please contact the site owner.',
  },
  {
    name: 'email provider failure',
    status: 500,
    code: 'unexpected_failure',
    providerMessage: 'Error sending magic link email',
    message:
      'The email service couldn’t send your sign-in link. Please try again later or contact the site owner.',
  },
  {
    name: 'unreachable sign-in service',
    message:
      'We couldn’t reach the sign-in service. Check your connection and try again.',
  },
  {
    name: 'an unrecognized auth failure',
    status: 400,
    code: 'unrecognized_test_error',
    providerMessage: 'Unexpected failure for signin-test@example.com',
    message:
      'We couldn’t send the sign-in link. Please check the email and try again shortly.',
  },
];

for (const failure of failures) {
  test(`sign-in explains ${failure.name} without reporting email success`, async ({
    page,
  }) => {
    let finishRequest!: () => void;
    const pendingRequest = new Promise<void>((resolve) => {
      finishRequest = resolve;
    });
    const writes: string[] = [];

    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.abort(),
    );
    await page.route(`${api}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() !== 'GET') writes.push(path);
      if (path === '/rest/v1/listings')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
      if (path === '/auth/v1/otp') {
        await pendingRequest;
        if (!failure.status) return route.abort('connectionfailed');
        return route.fulfill({
          status: failure.status,
          contentType: 'application/json',
          headers: { 'X-Supabase-Api-Version': '2024-01-01' },
          body: JSON.stringify({
            code: failure.code,
            error_code: failure.code,
            message: failure.providerMessage,
          }),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unexpected test request' }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Use an email link instead', exact: true })
      .click();
    await dialog.getByLabel('Email address', { exact: true }).fill(email);
    await dialog
      .getByRole('button', { name: 'Send login link', exact: true })
      .click();
    await expect(
      dialog.getByRole('button', { name: 'Sending your link…', exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByLabel('Email address', { exact: true }),
    ).toBeDisabled();
    finishRequest();

    await expect(dialog.getByRole('alert')).toHaveText(failure.message);
    await expect(
      dialog.getByRole('heading', { name: 'Check your email.' }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Send login link', exact: true }),
    ).toBeEnabled();
    await expect(
      dialog.getByLabel('Email address', { exact: true }),
    ).toHaveValue(email);
    expect(writes).toEqual(['/auth/v1/otp']);
    const demoState = await page.evaluate(() =>
      ['saved', 'bookings', 'listings'].map((name) =>
        localStorage.getItem(`airstethics:${name}`),
      ),
    );
    expect(demoState).toEqual([null, null, null]);
  });
}
