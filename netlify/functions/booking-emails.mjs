// Netlify invokes scheduled functions privately. They have no public production
// URL. Validate the scheduler event shape as an additional routing check; the
// Netlify scheduled-only deployment is the actual access boundary.
// No browser or unauthenticated route calls this worker.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const kinds = new Set(['confirmation', 'reminder', 'cancellation']);
const requestTimeoutMs = 3000;
const batchSize = 5;

function email(value) {
  return (
    typeof value === 'string' && value.length <= 254 && emailPattern.test(value)
  );
}

function configuration(env) {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'BOOKING_EMAIL_FROM',
    'SITE_URL',
  ];
  if (required.some((key) => typeof env[key] !== 'string' || !env[key].trim()))
    return null;
  try {
    const project = new URL(env.SUPABASE_URL);
    const site = new URL(env.SITE_URL);
    if (
      [project, site].some(
        (url) =>
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          url.search ||
          url.hash,
      )
    )
      return null;
    if (project.pathname !== '/' || site.pathname !== '/') return null;
    const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();
    // Catch accidental use of the public browser key before claiming any jobs.
    const role = key.startsWith('eyJ')
      ? JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role
      : null;
    if (!key.startsWith('sb_secret_') && role !== 'service_role') return null;
    const from = env.BOOKING_EMAIL_FROM.trim();
    const address = from.match(/^[^<>\r\n]{1,100}\s*<([^<>]+)>$/)?.[1] ?? from;
    if (!email(address) || /[\r\n]/.test(from)) return null;
    return {
      project: project.origin,
      site: site.href,
      key,
      resend: env.RESEND_API_KEY.trim(),
      from,
    };
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ],
  );
}

function text(value, maximum = 200) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function bookingEmail(job, site) {
  const payload = job?.payload;
  if (
    !job ||
    !uuid.test(job.id) ||
    !uuid.test(job.lease_token) ||
    !email(job.recipient) ||
    !kinds.has(job.emailkind) ||
    !payload ||
    !uuid.test(payload.bookingId) ||
    !text(payload.listingId) ||
    !text(payload.listingName) ||
    !text(payload.serviceName) ||
    !text(payload.guestName) ||
    !email(payload.guestEmail) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.date) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(payload.time) ||
    !['customer', 'host'].includes(payload.recipientRole) ||
    payload.timezone !== 'America/Edmonton' ||
    !Number.isInteger(payload.duration) ||
    payload.duration < 1 ||
    payload.duration > 540 ||
    !Number.isFinite(payload.price) ||
    payload.price < 0.01 ||
    payload.price > 10000 ||
    !text(payload.reference, 100)
  )
    throw new Error('invalid_job');
  const date = new Date(`${payload.date}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== payload.date
  )
    throw new Error('invalid_job');
  const dateText = new Intl.DateTimeFormat('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  const [hour, minute] = payload.time.split(':').map(Number);
  const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'} (Alberta time)`;
  const price = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(payload.price);
  const host = payload.recipientRole === 'host';
  const heading =
    job.emailkind === 'cancellation'
      ? 'Appointment cancelled'
      : job.emailkind === 'reminder'
        ? 'Upcoming appointment reminder'
        : host
          ? 'You have a new booking'
          : 'Your appointment is confirmed';
  const intro =
    job.emailkind === 'cancellation'
      ? 'This appointment has been cancelled. The time is available to book again.'
      : job.emailkind === 'reminder'
        ? 'Here are the details for your upcoming appointment.'
        : host
          ? 'A guest has booked an appointment at your space.'
          : 'Your appointment has been saved. We look forward to your visit.';
  const details = [
    ['Space', payload.listingName],
    ['Service', payload.serviceName],
    ['Date', dateText],
    ['Time', time],
    ['Duration', `${payload.duration} minutes`],
    ['Service price', `${price} CAD`],
    ['Booking reference', payload.reference],
    ...(host
      ? [
          ['Guest', payload.guestName],
          ['Guest email', payload.guestEmail],
        ]
      : []),
  ];
  const guidance = `Log in to airstethics and open ${host ? 'My business' : 'My appointments'} to manage your appointment.`;
  const plain = `${heading}\n\n${intro}\n\n${details.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n${guidance}\n${site}\n\nThis email is about your booking. It does not confirm a payment or refund.`;
  const rows = details
    .map(
      ([label, value]) =>
        `<tr><th scope="row" style="text-align:left;vertical-align:top;padding:9px 14px 9px 0;font-weight:500;color:#67756b">${escapeHtml(label)}</th><td style="padding:9px 0;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return {
    subject: `${heading} · airstethics`,
    text: plain,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f8f7f2;color:#233a31;font-family:Arial,sans-serif"><main style="max-width:560px;margin:28px auto;padding:30px;background:#fffefa;border:1px solid #e2e5da;border-radius:12px"><p style="font-weight:bold;font-size:20px">airstethics.</p><h1 style="font-size:26px;line-height:1.2">${heading}</h1><p style="line-height:1.7">${intro}</p><table style="width:100%;font-size:14px;border-collapse:collapse">${rows}</table><p style="line-height:1.7">${guidance}</p><p><a href="${escapeHtml(site)}" style="display:inline-block;padding:13px 20px;background:#233a31;color:white;border-radius:7px;text-decoration:none">Open airstethics</a></p><p style="font-size:11px;line-height:1.7;color:#67756b">This email is about your booking. It does not confirm a payment or refund.</p></main></body></html>`,
  };
}

function timeoutSignal() {
  return AbortSignal.timeout(requestTimeoutMs);
}

export async function runBookingEmails({
  env = process.env,
  fetchImpl = fetch,
  pause = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now = Date.now,
} = {}) {
  const config = configuration(env);
  if (!config)
    return {
      configured: false,
      claimed: 0,
      delivered: 0,
      retrying: 0,
      unacknowledged: 0,
    };
  const rpc = async (name, body) => {
    const response = await fetchImpl(`${config.project}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        // Modern secret keys are opaque API keys, not bearer JWTs. Netlify's
        // server-side request uses their service role through the API gateway.
        ...(config.key.startsWith('eyJ')
          ? { Authorization: `Bearer ${config.key}` }
          : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: timeoutSignal(),
    });
    if (!response.ok) throw new Error('database_unavailable');
    return response.json();
  };
  const result = {
    configured: true,
    claimed: 0,
    delivered: 0,
    retrying: 0,
    unacknowledged: 0,
  };
  let jobs;
  try {
    jobs = await rpc('claim_booking_emails', { p_limit: batchSize });
  } catch {
    return { ...result, unavailable: true };
  }
  if (!Array.isArray(jobs) || jobs.length > batchSize)
    return { ...result, unavailable: true };
  result.claimed = jobs.length;
  let nextSend = now();
  const sendSlot = async () => {
    const delay = Math.max(0, nextSend - now());
    nextSend = Math.max(nextSend, now()) + 600;
    if (delay) await pause(delay);
  };
  const deliver = async (job) => {
    let delivered = false;
    let category = 'invalid_job';
    try {
      const message = bookingEmail(job, config.site);
      await sendSlot();
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resend}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `booking-email:${job.id}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: [job.recipient],
          ...message,
        }),
        signal: timeoutSignal(),
      });
      category =
        response.status === 429
          ? 'provider_rate_limited'
          : response.status >= 500
            ? 'provider_unavailable'
            : 'provider_rejected';
      if (response.ok) {
        const body = await response.json();
        if (typeof body?.id === 'string' && body.id) delivered = true;
      }
    } catch (error) {
      category =
        error?.message === 'invalid_job' ? 'invalid_job' : 'provider_network';
    }
    // A malformed ID/lease cannot be acknowledged; its lease expires instead.
    if (!uuid.test(job?.id) || !uuid.test(job?.lease_token)) {
      result.unacknowledged += 1;
      return;
    }
    try {
      const finished = await rpc('finish_booking_email', {
        p_id: job.id,
        p_lease_token: job.lease_token,
        p_delivered: delivered,
        p_error: delivered ? null : category,
      });
      if (finished !== true) throw new Error('lease_not_finished');
      if (delivered) result.delivered += 1;
      else result.retrying += 1;
    } catch {
      result.unacknowledged += 1;
    }
  };
  // At most two deliveries run together; their starts are spaced for Resend's
  // normal rate limit, and per-request deadlines bound scheduled execution.
  for (let index = 0; index < jobs.length; index += 2)
    await Promise.all(jobs.slice(index, index + 2).map(deliver));
  return result;
}

export function createScheduledHandler(run = runBookingEmails) {
  return async (event = {}) => {
    // Netlify's scheduler sends POST with X-NF-Event: schedule. Header casing
    // varies between the platform and its local CLI. A body containing a
    // next_run value alone is never sufficient to dispatch the worker.
    const scheduled = Object.entries(event.headers ?? {}).some(
      ([name, value]) =>
        name.toLowerCase() === 'x-nf-event' && value === 'schedule',
    );
    if (event.httpMethod !== 'POST' || !scheduled)
      return { statusCode: 405, body: 'Scheduled invocation only.' };
    const result = await run();
    return {
      statusCode: result.unavailable || result.unacknowledged ? 503 : 200,
      body: JSON.stringify(result),
    };
  };
}

export const handler = createScheduledHandler();
