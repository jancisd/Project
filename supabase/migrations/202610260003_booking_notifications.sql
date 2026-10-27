-- Transactional email outbox. The browser cannot read recipients or claim jobs.
-- Delivery is performed by a server-side worker with the service role; booking
-- transactions never make an HTTP/email request and do not depend on a provider.
begin;

create table if not exists airstethics_private.booking_email_jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  emailkind text not null check (emailkind in ('confirmation', 'reminder', 'cancellation')),
  recipient_role text not null check (recipient_role in ('customer', 'host')),
  recipient text not null check (char_length(recipient) between 3 and 254),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'cancelled', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 8),
  lease_token uuid,
  locked_until timestamptz,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (booking_id, emailkind, recipient_role)
);
alter table airstethics_private.booking_email_jobs enable row level security;
revoke all on airstethics_private.booking_email_jobs from public, anon, authenticated, service_role;
create index if not exists booking_email_jobs_ready_idx
  on airstethics_private.booking_email_jobs(due_at, created_at)
  where status in ('pending', 'processing');

create or replace function airstethics_private.queue_booking_emails()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  host_email text;
  owner_id uuid;
  event_kind text;
  recipient_record record;
  message_payload jsonb;
begin
  if TG_OP = 'INSERT' then
    if new.status <> 'confirmed' then return new; end if;
    event_kind := 'confirmation';
  elsif old.status = 'confirmed' and new.status = 'cancelled' then
    event_kind := 'cancellation';
    -- Suppress mail which has not completed delivery. An already in-flight
    -- provider request cannot be recalled, but its obsolete lease cannot ack.
    update airstethics_private.booking_email_jobs
      set status = 'cancelled', lease_token = null, locked_until = null
      where booking_id = new.id and emailkind in ('confirmation', 'reminder')
        and status in ('pending', 'processing');
  else
    return new;
  end if;

  select l.owner_id into owner_id from public.listings l
    where l.id = new.listing_id and not l.is_demo;
  -- Fictional sample studios never trigger real transactional email.
  if owner_id is null then return new; end if;
  select btrim(u.email) into host_email from auth.users u where u.id = owner_id;

  message_payload := jsonb_build_object(
    'bookingId', new.id,
    'listingId', new.listing_id,
    'listingName', new.listing_name,
    'serviceName', new.service_name,
    'guestName', new.guest_name,
    'guestEmail', new.guest_email,
    'date', to_char(new.booking_date, 'YYYY-MM-DD'),
    'time', left(new.booking_time::text, 5),
    'timezone', 'America/Edmonton',
    'duration', new.duration,
    'price', new.price,
    'currency', 'CAD',
    'reference', upper(left(new.id::text, 8))
  );
  for recipient_record in
    select * from (values
      ('customer'::text, btrim(new.guest_email)),
      ('host'::text, host_email)
    ) as recipients(role_name, address)
  loop
    -- A missing host address never invents a recipient or prevents a booking.
    if recipient_record.address is null
      or char_length(recipient_record.address) > 254
      or recipient_record.address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      continue;
    end if;
    insert into airstethics_private.booking_email_jobs(
      booking_id, emailkind, recipient_role, recipient, payload, due_at
    ) values (
      new.id, event_kind, recipient_record.role_name, recipient_record.address,
      message_payload || jsonb_build_object('recipientRole', recipient_record.role_name), now()
    ) on conflict (booking_id, emailkind, recipient_role) do nothing;
    -- A booking made inside the 24-hour window gets its confirmation only.
    if event_kind = 'confirmation' and new.starts_at > now() + interval '24 hours' then
      insert into airstethics_private.booking_email_jobs(
        booking_id, emailkind, recipient_role, recipient, payload, due_at
      ) values (
        new.id, 'reminder', recipient_record.role_name, recipient_record.address,
        message_payload || jsonb_build_object('recipientRole', recipient_record.role_name),
        new.starts_at - interval '24 hours'
      ) on conflict (booking_id, emailkind, recipient_role) do nothing;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function airstethics_private.queue_booking_emails() from public, anon, authenticated, service_role;
drop trigger if exists booking_email_outbox on public.bookings;
create trigger booking_email_outbox after insert or update of status on public.bookings
  for each row execute function airstethics_private.queue_booking_emails();

create or replace function public.claim_booking_emails(p_limit integer default 25)
returns table (
  id uuid, recipient text, emailkind text, payload jsonb, attempts integer, lease_token uuid
)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Choose a batch size from 1 to 100.' using errcode = '22023';
  end if;
  -- A cancelled/past appointment must not receive a late reminder. Processing
  -- leases can expire safely if a worker is interrupted; retries are bounded.
  update airstethics_private.booking_email_jobs j
    set status = 'cancelled', lease_token = null, locked_until = null
    where j.status in ('pending', 'processing')
      and j.emailkind in ('confirmation', 'reminder')
      and exists (select 1 from public.bookings b where b.id = j.booking_id
        and (b.status <> 'confirmed' or b.starts_at <= now()));
  update airstethics_private.booking_email_jobs j
    set status = 'failed', lease_token = null, locked_until = null,
      last_error = 'delivery_attempts_exhausted'
    where j.attempts >= 8 and (
      j.status = 'pending' or (j.status = 'processing' and j.locked_until <= now())
    );
  return query
  with ready as (
    select j.id from airstethics_private.booking_email_jobs j
    where j.attempts < 8 and j.due_at <= now() and (
      j.status = 'pending' or (j.status = 'processing' and j.locked_until <= now())
    )
    order by j.due_at, j.created_at, j.id
    for update skip locked limit p_limit
  ), claimed as (
    update airstethics_private.booking_email_jobs j
      set status = 'processing', attempts = j.attempts + 1,
        lease_token = gen_random_uuid(), locked_until = now() + interval '5 minutes'
      from ready r where j.id = r.id
      returning j.id, j.recipient, j.emailkind, j.payload, j.attempts, j.lease_token
  ) select c.id, c.recipient, c.emailkind, c.payload, c.attempts, c.lease_token from claimed c;
end;
$$;

create or replace function public.finish_booking_email(
  p_id uuid, p_lease_token uuid, p_delivered boolean, p_error text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare job airstethics_private.booking_email_jobs;
begin
  if p_id is null or p_lease_token is null or p_delivered is null then
    return false;
  end if;
  select * into job from airstethics_private.booking_email_jobs j
    where j.id = p_id for update;
  if not found or job.lease_token is distinct from p_lease_token then return false; end if;
  -- Repeating the same successful acknowledgement is harmless.
  if job.status = 'delivered' then return p_delivered; end if;
  if job.status <> 'processing' then return false; end if;
  if p_delivered then
    update airstethics_private.booking_email_jobs j
      set status = 'delivered', delivered_at = now(), locked_until = null, last_error = null
      where j.id = p_id;
  else
    update airstethics_private.booking_email_jobs j
      set status = case when job.attempts >= 8 then 'failed' else 'pending' end,
        due_at = now() + make_interval(secs => least(3600, 60 * power(2, job.attempts - 1))::integer),
        lease_token = null, locked_until = null,
        last_error = case when p_error ~ '^[a-z0-9_:-]{1,80}$' then p_error else 'delivery_failed' end
      where j.id = p_id;
  end if;
  return true;
end;
$$;

revoke all on function public.claim_booking_emails(integer) from public, anon, authenticated, service_role;
revoke all on function public.finish_booking_email(uuid, uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.claim_booking_emails(integer) to service_role;
grant execute on function public.finish_booking_email(uuid, uuid, boolean, text) to service_role;
comment on table airstethics_private.booking_email_jobs is
  'Private transactional booking email outbox. Server worker RPCs only; provider requests never run inside booking transactions. Existing bookings are not backfilled.';

commit;
