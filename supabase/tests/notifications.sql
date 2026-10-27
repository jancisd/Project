-- Isolated PostgreSQL fixtures only. No provider credentials or emails exist.
grant usage on schema test_support to service_role;
select test_support.assert((select count(*) = 0 from airstethics_private.booking_email_jobs),
  'installing the email outbox does not backfill historical customer records');
select test_support.assert(
  has_function_privilege('service_role', 'public.claim_booking_emails(integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.finish_booking_email(uuid,uuid,boolean,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_booking_emails(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.claim_booking_emails(integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.finish_booking_email(uuid,uuid,boolean,text)', 'EXECUTE')
  and not has_table_privilege('service_role', 'airstethics_private.booking_email_jobs', 'SELECT'),
  'the service worker has narrow RPC access while browser roles and direct tables stay private'
);
set role anon;
select test_support.expect_error('select public.claim_booking_emails(25)', '42501');
select test_support.expect_error('select * from airstethics_private.booking_email_jobs', '42501');
reset role;
set role authenticated;
select test_support.expect_error('select public.claim_booking_emails(25)', '42501');
select test_support.expect_error('select * from airstethics_private.booking_email_jobs', '42501');
select test_support.expect_error($q$select public.finish_booking_email(gen_random_uuid(),gen_random_uuid(),true,null)$q$, '42501');
reset role;

insert into auth.users(id,email) values
  ('90000000-0000-4000-8000-000000000001','notification-host@example.com'),
  ('90000000-0000-4000-8000-000000000002','notification-account@example.com'),
  ('90000000-0000-4000-8000-000000000003',null);
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"aal":"aal1"}',false);
set role authenticated;
select set_config('airstethics.notification_listing', (public.create_listing(
  jsonb_set(test_support.fixture_listing(),'{id}','"local-90000000-0000-4000-8000-000000000010"')
)).id, false);
select set_config('airstethics.notification_service', (select id from public.services
  where listing_id = current_setting('airstethics.notification_listing') and duration=60 limit 1), false);
reset role;

select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',false);
set role authenticated;
select public.create_booking(current_setting('airstethics.notification_listing'),current_setting('airstethics.notification_service'),
  (now() at time zone 'America/Edmonton')::date+5,'09:00','<Example Guest>','notification-guest@example.com',
  '90000000-0000-4000-8000-000000000101');
select public.create_booking(current_setting('airstethics.notification_listing'),current_setting('airstethics.notification_service'),
  (now() at time zone 'America/Edmonton')::date+5,'09:00','<Example Guest>','notification-guest@example.com',
  '90000000-0000-4000-8000-000000000101');
reset role;
select test_support.assert((select count(*) = 4 from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000101'),
  'a confirmed real booking queues exactly one confirmation and reminder for customer and host even after a retry');
select test_support.assert((select count(*) = 2 and bool_and(recipient='notification-guest@example.com')
  from airstethics_private.booking_email_jobs where booking_id='90000000-0000-4000-8000-000000000101' and recipient_role='customer'),
  'customer notifications use the booking contact email, not another arbitrary account address');
select test_support.assert((select count(*) = 2 and bool_and(recipient='notification-host@example.com')
  from airstethics_private.booking_email_jobs where booking_id='90000000-0000-4000-8000-000000000101' and recipient_role='host'),
  'host notifications use the private owner account address');
select test_support.assert((select bool_and(payload->>'guestName'='<Example Guest>'
  and payload->>'timezone'='America/Edmonton' and payload->>'currency'='CAD'
  and payload->>'time'='09:00' and not(payload ? 'html')) from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000101'),
  'the queue stores structured booking snapshots and original text, never executable HTML');
select test_support.assert((select bool_and(j.due_at = b.starts_at-interval '24 hours')
  from airstethics_private.booking_email_jobs j join public.bookings b on b.id=j.booking_id
  where j.booking_id='90000000-0000-4000-8000-000000000101' and j.emailkind='reminder'),
  'reminders are scheduled 24 hours before the original booking instant');

set role service_role;
select test_support.expect_error('select public.claim_booking_emails(0)','22023');
select test_support.expect_error('select public.claim_booking_emails(101)','22023');
select set_config('airstethics.notification_claim', (select jsonb_agg(to_jsonb(c))::text from public.claim_booking_emails(25) c), false);
select test_support.assert(jsonb_array_length(current_setting('airstethics.notification_claim')::jsonb)=2,
  'worker claims due confirmations without sending future reminders early');
select test_support.assert((select count(*)=0 from public.claim_booking_emails(25)),
  'an active lease keeps a second worker from claiming the same jobs');
select test_support.assert(not public.finish_booking_email(
  (current_setting('airstethics.notification_claim')::jsonb #>> '{0,id}')::uuid, gen_random_uuid(),true,null),
  'a worker cannot acknowledge a job using another lease');
select test_support.assert(public.finish_booking_email(
  (current_setting('airstethics.notification_claim')::jsonb #>> '{0,id}')::uuid,
  (current_setting('airstethics.notification_claim')::jsonb #>> '{0,lease_token}')::uuid,true,null),
  'successful provider delivery can be acknowledged');
select test_support.assert(public.finish_booking_email(
  (current_setting('airstethics.notification_claim')::jsonb #>> '{0,id}')::uuid,
  (current_setting('airstethics.notification_claim')::jsonb #>> '{0,lease_token}')::uuid,true,null),
  'repeated successful acknowledgement is idempotent');
select test_support.assert(public.finish_booking_email(
  (current_setting('airstethics.notification_claim')::jsonb #>> '{1,id}')::uuid,
  (current_setting('airstethics.notification_claim')::jsonb #>> '{1,lease_token}')::uuid,false,'provider_unavailable'),
  'failed delivery can be retried without losing the booking');
reset role;
select test_support.assert((select status='pending' and attempts=1 and due_at>now() and lease_token is null
  and last_error='provider_unavailable' from airstethics_private.booking_email_jobs
  where id=(current_setting('airstethics.notification_claim')::jsonb #>> '{1,id}')::uuid),
  'delivery failure applies backoff and invalidates its old lease');
update airstethics_private.booking_email_jobs set due_at=now()-interval '1 minute'
  where id=(current_setting('airstethics.notification_claim')::jsonb #>> '{1,id}')::uuid;
set role service_role;
select set_config('airstethics.notification_retry', (select to_jsonb(c)::text from public.claim_booking_emails(1) c), false);
select test_support.assert((current_setting('airstethics.notification_retry')::jsonb->>'attempts')::integer=2,
  'a retried job increments attempts and receives a fresh lease');
select test_support.assert(not public.finish_booking_email(
  (current_setting('airstethics.notification_claim')::jsonb #>> '{1,id}')::uuid,
  (current_setting('airstethics.notification_claim')::jsonb #>> '{1,lease_token}')::uuid,true,null),
  'a stale first-worker acknowledgement cannot change a retried job');
reset role;

-- Cancellation invalidates both pending and already claimed obsolete mail.
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',false);
set role authenticated;
select public.cancel_booking('90000000-0000-4000-8000-000000000101');
select public.cancel_booking('90000000-0000-4000-8000-000000000101');
reset role;
select test_support.assert((select count(*)=2 from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000101' and emailkind='cancellation'),
  'repeated cancellation queues exactly one cancellation email per recipient');
select test_support.assert((select count(*)=3 and bool_and(status='cancelled' and lease_token is null)
  from airstethics_private.booking_email_jobs where booking_id='90000000-0000-4000-8000-000000000101'
    and emailkind in ('confirmation','reminder') and status<>'delivered'),
  'cancellation suppresses unsent confirmations and all pending reminders');
select test_support.assert((select count(*)=1 from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000101' and status='delivered'),
  'a delivered confirmation remains recorded after cancellation');
set role service_role;
select test_support.assert(not public.finish_booking_email(
  (current_setting('airstethics.notification_retry')::jsonb->>'id')::uuid,
  (current_setting('airstethics.notification_retry')::jsonb->>'lease_token')::uuid,true,null),
  'an invalidated cancellation lease cannot be acknowledged');
select test_support.assert((select count(*)=2 and bool_and(emailkind='cancellation') from public.claim_booking_emails(25)),
  'the next worker sees only the cancellation messages for the cancelled booking');
reset role;

-- No reminders for a booking made within 24 hours, and no mail for samples.
insert into public.bookings(id,customer_id,listing_id,service_id,listing_name,listing_image,city,service_name,
  booking_date,booking_time,duration,price,guest_name,guest_email,starts_at,ends_at)
select '90000000-0000-4000-8000-000000000102','90000000-0000-4000-8000-000000000002',l.id,s.id,
  l.data->>'name',l.data->>'image',l.data->>'city',s.name,
  (now() at time zone 'America/Edmonton')::date,(now() at time zone 'America/Edmonton')::time,
  s.duration,s.price,'Soon Guest','soon@example.com',now()+interval '2 hours',now()+interval '3 hours'
from public.listings l join public.services s on s.listing_id=l.id
where l.id=current_setting('airstethics.notification_listing') and s.id=current_setting('airstethics.notification_service');
select test_support.assert((select count(*)=2 and bool_and(emailkind='confirmation')
  from airstethics_private.booking_email_jobs where booking_id='90000000-0000-4000-8000-000000000102'),
  'near-term bookings get confirmation but no confusing immediate reminder');
insert into public.bookings(id,customer_id,listing_id,service_id,listing_name,listing_image,city,service_name,
  booking_date,booking_time,duration,price,guest_name,guest_email,starts_at,ends_at)
select '90000000-0000-4000-8000-000000000103','90000000-0000-4000-8000-000000000002',l.id,s.id,
  l.data->>'name',l.data->>'image',l.data->>'city',s.name,
  current_date+10,'09:00',s.duration,s.price,'Sample Guest','sample@example.com',
  ((current_date+10)+time '09:00') at time zone 'America/Edmonton',
  ((current_date+10)+time '10:00') at time zone 'America/Edmonton'
from public.listings l join public.services s on s.listing_id=l.id
where l.id='muse-hair-house' and s.id='muse-cut';
select test_support.assert((select count(*)=0 from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000103'),
  'fictional sample studio bookings never trigger real transactional email');

-- An expired worker lease can be reclaimed and attempt exhaustion is terminal.
update airstethics_private.booking_email_jobs set locked_until=now()-interval '1 minute',attempts=7
  where booking_id='90000000-0000-4000-8000-000000000101' and emailkind='cancellation';
set role service_role;
select set_config('airstethics.notification_expired', (select to_jsonb(c)::text from public.claim_booking_emails(1) c), false);
select test_support.assert((current_setting('airstethics.notification_expired')::jsonb->>'attempts')::integer=8,
  'expired processing leases can be claimed again up to the bounded maximum');
select test_support.assert(public.finish_booking_email(
  (current_setting('airstethics.notification_expired')::jsonb->>'id')::uuid,
  (current_setting('airstethics.notification_expired')::jsonb->>'lease_token')::uuid,false,'unsafe provider response contains email@example.com'),
  'the final failure is acknowledged without retaining arbitrary provider text');
reset role;
select test_support.assert((select status='failed' and last_error='delivery_failed'
  from airstethics_private.booking_email_jobs where id=(current_setting('airstethics.notification_expired')::jsonb->>'id')::uuid),
  'maximum attempts stop and raw provider errors cannot enter stored logs');

-- A missing optional host address must not suppress the customer's receipt.
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',false);
set role authenticated;
select set_config('airstethics.notification_no_email_listing', (public.create_listing(
  jsonb_set(test_support.fixture_listing(),'{id}','"local-90000000-0000-4000-8000-000000000011"')
)).id, false);
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',false);
set role authenticated;
select public.create_booking(current_setting('airstethics.notification_no_email_listing'),(
  select id from public.services where listing_id=current_setting('airstethics.notification_no_email_listing') and duration=60 limit 1
), (now() at time zone 'America/Edmonton')::date+6,'09:00','No Host Email Guest','no-host-guest@example.com',
  '90000000-0000-4000-8000-000000000104');
reset role;
select test_support.assert((select count(*)=2 and bool_and(recipient_role='customer'
  and recipient='no-host-guest@example.com') from airstethics_private.booking_email_jobs
  where booking_id='90000000-0000-4000-8000-000000000104'),
  'a missing host email leaves the booking and customer notifications intact without inventing a recipient');
-- Simulate the reminder due time without sleeping or contacting a provider.
update airstethics_private.booking_email_jobs set status='delivered',lease_token=null,locked_until=null
  where status in ('pending','processing') and not (
    booking_id='90000000-0000-4000-8000-000000000104' and emailkind='reminder'
  );
update airstethics_private.booking_email_jobs set due_at=now()-interval '1 minute'
  where booking_id='90000000-0000-4000-8000-000000000104' and emailkind='reminder';
set role service_role;
select test_support.assert((select count(*)=1 and bool_and(emailkind='reminder'
  and payload->>'bookingId'='90000000-0000-4000-8000-000000000104') from public.claim_booking_emails(25)),
  'a reminder becomes claimable when due while preserving its original booking snapshot');
reset role;

-- Leave one due job available for the parallel worker harness.
update airstethics_private.booking_email_jobs set status='delivered',lease_token=null,locked_until=null
  where status in ('pending','processing');
update airstethics_private.booking_email_jobs set status='pending',attempts=0,due_at=now()-interval '1 minute',lease_token=null,locked_until=null
  where booking_id='90000000-0000-4000-8000-000000000102' and recipient_role='customer';
create table test_support.notification_parallel_claims(worker text primary key, jobs jsonb not null);
grant insert, select on test_support.notification_parallel_claims to service_role;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{}',false);
