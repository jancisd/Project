import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bookingEmail,
  createScheduledHandler,
  handler,
  runBookingEmails,
} from '../netlify/functions/booking-emails.mjs';

const env = {
  SUPABASE_URL: 'https://email-worker-test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_fictitious_test_key',
  RESEND_API_KEY: 're_fictitious_test_key',
  BOOKING_EMAIL_FROM: 'airstethics <bookings@example.com>',
  SITE_URL: 'https://airsthetic.netlify.app/',
};

function job(
  index = 1,
  emailkind = 'confirmation',
  recipientRole = 'customer',
) {
  return {
    id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    lease_token: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    recipient:
      recipientRole === 'host' ? 'host@example.com' : 'guest@example.com',
    emailkind,
    attempts: 1,
    payload: {
      bookingId: `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      listingId: 'test-studio',
      listingName: 'Example Studio',
      serviceName: 'Signature cut',
      guestName: 'Alex Example',
      guestEmail: 'guest@example.com',
      date: '2026-11-04',
      time: '14:30',
      timezone: 'America/Edmonton',
      duration: 60,
      price: 85,
      recipientRole,
      reference: 'ABC12345',
    },
  };
}

function mockNetwork(jobs, options = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, request) => {
      const body = JSON.parse(request.body);
      calls.push({ url, ...request, body });
      assert(
        request.signal instanceof AbortSignal,
        'Every request has a deadline',
      );
      if (url.endsWith('/claim_booking_emails')) {
        if (options.claimFailure) throw new Error('Mock offline');
        return Response.json(jobs);
      }
      if (url === 'https://api.resend.com/emails') {
        if (options.providerNetworkFailure)
          throw new Error('Secret provider details must not leak');
        if (options.providerStatus)
          return Response.json(
            { message: 'Secret provider details must not leak' },
            { status: options.providerStatus },
          );
        return Response.json({ id: `fictitious-provider-${calls.length}` });
      }
      if (url.endsWith('/finish_booking_email')) {
        if (options.ackFailure) throw new Error('Mock ack timeout');
        return Response.json(options.staleLease ? false : true);
      }
      throw new Error(`Unexpected mock URL: ${url}`);
    },
    pause: async () => {},
    now: () => 1000,
  };
}

test('missing or public configuration never claims jobs or sends messages', async () => {
  for (const key of Object.keys(env)) {
    const network = mockNetwork([job()]);
    const result = await runBookingEmails({
      env: { ...env, [key]: '' },
      ...network,
    });
    assert.equal(result.configured, false);
    assert.deepEqual(network.calls, []);
  }
  for (const settings of [
    { SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_fictitious_public_key' },
    { SUPABASE_URL: 'https://email-worker-test.supabase.co/rest/v1/' },
    { SITE_URL: 'http://airsthetic.netlify.app/' },
    { BOOKING_EMAIL_FROM: 'bookings@example.com\r\nBCC: other@example.com' },
  ]) {
    const network = mockNetwork([job()]);
    const result = await runBookingEmails({
      env: { ...env, ...settings },
      ...network,
    });
    assert.equal(result.configured, false);
    assert.equal(network.calls.length, 0);
  }
});

test('confirmation, cancellation and reminder jobs deliver to their intended recipients and acknowledge the exact lease', async () => {
  const jobs = [job(1), job(2, 'cancellation', 'host'), job(3, 'reminder')];
  const network = mockNetwork(jobs);
  const result = await runBookingEmails({ env, ...network });
  assert.deepEqual(result, {
    configured: true,
    claimed: 3,
    delivered: 3,
    retrying: 0,
    unacknowledged: 0,
  });
  const sent = network.calls.filter(
    (call) => call.url === 'https://api.resend.com/emails',
  );
  assert.equal(sent.length, 3);
  for (const queued of jobs) {
    const request = sent.find(
      (call) =>
        call.headers['Idempotency-Key'] === `booking-email:${queued.id}`,
    );
    assert.deepEqual(request.body.to, [queued.recipient]);
    assert.equal(request.body.from, env.BOOKING_EMAIL_FROM);
    assert.match(request.body.text, /2:30 PM \(Alberta time\)/);
    assert.match(request.body.text, /Wednesday, November 4, 2026/);
    assert.match(request.body.text, /does not confirm a payment or refund/);
    assert.match(
      request.body.text,
      queued.payload.recipientRole === 'host'
        ? /My business/
        : /My appointments/,
    );
    const finish = network.calls.find(
      (call) =>
        call.url.endsWith('/finish_booking_email') &&
        call.body.p_id === queued.id,
    );
    assert.deepEqual(finish.body, {
      p_id: queued.id,
      p_lease_token: queued.lease_token,
      p_delivered: true,
      p_error: null,
    });
  }
  assert.match(sent[0].body.subject, /confirmed/);
  assert.match(sent[1].body.subject, /cancelled/);
  assert.match(sent[2].body.subject, /reminder/);
  assert(!JSON.stringify(result).includes('example.com'));
  assert(!JSON.stringify(result).includes(env.SUPABASE_SERVICE_ROLE_KEY));
});

test('user content is escaped in HTML and retained as literal text', () => {
  const queued = job();
  queued.payload.listingName = '<img src=x onerror="alert(1)"> & studio';
  queued.payload.serviceName = "Brows <script>alert('x')</script>";
  const message = bookingEmail(queued, env.SITE_URL);
  assert.match(message.html, /&lt;img/);
  assert.match(message.html, /&amp; studio/);
  assert(!message.html.includes('<script>'));
  assert(!message.html.includes('<img'));
  assert(message.text.includes(queued.payload.listingName));
  assert(message.text.includes(queued.payload.serviceName));
});

test('provider failures schedule a redacted retry and other jobs still run', async () => {
  for (const [providerStatus, expected] of [
    [429, 'provider_rate_limited'],
    [503, 'provider_unavailable'],
    [400, 'provider_rejected'],
  ]) {
    const network = mockNetwork([job(1), job(2)], { providerStatus });
    const result = await runBookingEmails({ env, ...network });
    assert.equal(result.delivered, 0);
    assert.equal(result.retrying, 2);
    const acknowledgments = network.calls.filter((call) =>
      call.url.endsWith('/finish_booking_email'),
    );
    assert.equal(acknowledgments.length, 2);
    assert(
      acknowledgments.every(
        (call) =>
          call.body.p_error === expected && call.body.p_delivered === false,
      ),
    );
    assert(
      !JSON.stringify(acknowledgments).includes('Secret provider details'),
    );
  }
});

test('provider network errors are retried without exposing provider content', async () => {
  const network = mockNetwork([job()], { providerNetworkFailure: true });
  const result = await runBookingEmails({ env, ...network });
  assert.equal(result.retrying, 1);
  assert.equal(network.calls.at(-1).body.p_error, 'provider_network');
});

test('an unavailable claim endpoint sends no email', async () => {
  const network = mockNetwork([job()], { claimFailure: true });
  const result = await runBookingEmails({ env, ...network });
  assert.equal(result.unavailable, true);
  assert.equal(network.calls.length, 1);
});

test('lost acknowledgments and stale leases are not reported as delivered and retries reuse the provider key', async () => {
  const queued = job();
  for (const failure of [{ ackFailure: true }, { staleLease: true }]) {
    const network = mockNetwork([queued], failure);
    const result = await runBookingEmails({ env, ...network });
    assert.equal(result.delivered, 0);
    assert.equal(result.unacknowledged, 1);
    const retried = {
      ...queued,
      lease_token: '22222222-2222-4222-8222-222222222222',
      attempts: 2,
    };
    const retryNetwork = mockNetwork([retried]);
    const retry = await runBookingEmails({ env, ...retryNetwork });
    assert.equal(retry.delivered, 1);
    const firstKey = network.calls.find((call) =>
      call.url.includes('api.resend.com'),
    ).headers['Idempotency-Key'];
    const retryKey = retryNetwork.calls.find((call) =>
      call.url.includes('api.resend.com'),
    ).headers['Idempotency-Key'];
    assert.equal(firstKey, retryKey);
    assert.equal(
      retryNetwork.calls.at(-1).body.p_lease_token,
      retried.lease_token,
    );
  }
});

test('invalid jobs are not sent and cannot contaminate another job in the same batch', async () => {
  const invalid = job(1);
  invalid.payload.date = '2026-02-31';
  const network = mockNetwork([invalid, job(2)]);
  const result = await runBookingEmails({ env, ...network });
  assert.equal(result.retrying, 1);
  assert.equal(result.delivered, 1);
  assert.equal(
    network.calls.filter((call) => call.url.includes('api.resend.com')).length,
    1,
  );
  assert.equal(
    network.calls.find(
      (call) =>
        call.url.endsWith('/finish_booking_email') &&
        call.body.p_id === invalid.id,
    ).body.p_error,
    'invalid_job',
  );
});

test('ordinary HTTP events and body-only scheduler claims cannot dispatch the worker', async () => {
  assert.deepEqual(
    await handler({
      httpMethod: 'POST',
      body: '{"next_run":"2026-11-04T00:00:00Z"}',
    }),
    { statusCode: 405, body: 'Scheduled invocation only.' },
  );
  assert.deepEqual(await handler({ httpMethod: 'GET' }), {
    statusCode: 405,
    body: 'Scheduled invocation only.',
  });
  const invoke = createScheduledHandler(() => {
    assert.fail('A malformed scheduler event must not dispatch the worker');
  });
  for (const event of [
    {},
    { headers: { 'X-NF-Event': 'schedule' } },
    { httpMethod: 'GET', headers: { 'X-NF-Event': 'schedule' } },
    { httpMethod: 'POST', headers: { 'X-NF-Event': 'request' } },
    { httpMethod: 'POST', body: '{"next_run":"2026-11-04T00:00:00Z"}' },
  ])
    assert.equal((await invoke(event)).statusCode, 405);
});

test('real scheduler POST events dispatch with case-insensitive header names', async () => {
  const result = {
    configured: false,
    claimed: 0,
    delivered: 0,
    retrying: 0,
    unacknowledged: 0,
  };
  let dispatched = 0;
  const invoke = createScheduledHandler(async () => {
    dispatched += 1;
    return result;
  });
  for (const name of ['X-NF-Event', 'x-nf-event', 'X-Nf-Event']) {
    const response = await invoke({
      httpMethod: 'POST',
      headers: { [name]: 'schedule' },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), result);
  }
  assert.equal(dispatched, 3);
  for (const failure of [{ unavailable: true }, { unacknowledged: 1 }]) {
    const failed = createScheduledHandler(async () => ({
      ...result,
      ...failure,
    }));
    const response = await failed({
      httpMethod: 'POST',
      headers: { 'x-nf-event': 'schedule' },
    });
    assert.equal(response.statusCode, 503);
  }
});

test('server API keys use the API-key header and legacy service JWTs retain bearer authorization', async () => {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const legacyKey = `${encode({ alg: 'HS256' })}.${encode({ role: 'service_role' })}.fictitious-test-signature`;
  for (const key of [env.SUPABASE_SERVICE_ROLE_KEY, legacyKey]) {
    const network = mockNetwork([job()]);
    const result = await runBookingEmails({
      env: { ...env, SUPABASE_SERVICE_ROLE_KEY: key },
      ...network,
    });
    assert.equal(result.delivered, 1);
    const databaseCalls = network.calls.filter((call) =>
      call.url.startsWith(env.SUPABASE_URL),
    );
    assert.equal(databaseCalls.length, 2);
    for (const call of databaseCalls) {
      assert.equal(call.headers.apikey, key);
      assert.equal(
        call.headers.Authorization,
        key === legacyKey ? `Bearer ${key}` : undefined,
      );
    }
  }
});
