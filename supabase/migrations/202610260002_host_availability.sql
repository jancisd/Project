-- Availability is public business information. Writes remain owner-only, and
-- the booking transaction enforces these rules even for direct API clients.
begin;

create table if not exists airstethics_private.listing_schedules (
  listing_id text primary key references public.listings(id) on delete cascade,
  schedule jsonb not null,
  updated_at timestamptz not null default now()
);
revoke all on airstethics_private.listing_schedules from public, anon, authenticated;

create or replace function airstethics_private.default_listing_schedule()
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'weekly', (select jsonb_agg(jsonb_build_object(
      'day', day, 'enabled', true, 'start', '09:00', 'end', '18:00', 'breaks', '[]'::jsonb
    ) order by day) from generate_series(0, 6) day),
    'blockedDates', '[]'::jsonb, 'bufferMinutes', 0, 'slotMinutes', 60
  );
$$;
revoke all on function airstethics_private.default_listing_schedule() from public, anon, authenticated;

create or replace function airstethics_private.validate_listing_schedule(p_schedule jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  entry jsonb;
  pause jsonb;
  blocked jsonb;
  normalized jsonb := '[]'::jsonb;
  pauses jsonb;
  dates jsonb := '[]'::jsonb;
  seen_days integer[] := array[]::integer[];
  seen_dates date[] := array[]::date[];
  day_number integer;
  opens time;
  closes time;
  pause_start time;
  pause_end time;
  blocked_day date;
  buffer_minutes integer;
  slot_minutes integer;
begin
  if jsonb_typeof(p_schedule) is distinct from 'object'
    or octet_length(p_schedule::text) > 60000
    or jsonb_typeof(p_schedule -> 'weekly') is distinct from 'array'
    or jsonb_typeof(p_schedule -> 'blockedDates') is distinct from 'array'
    or jsonb_typeof(p_schedule -> 'bufferMinutes') is distinct from 'number'
    or jsonb_typeof(p_schedule -> 'slotMinutes') is distinct from 'number' then
    raise exception 'Please provide a valid availability schedule.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_schedule -> 'weekly') <> 7
    or jsonb_array_length(p_schedule -> 'blockedDates') > 366
    or (p_schedule ->> 'bufferMinutes')::numeric <> trunc((p_schedule ->> 'bufferMinutes')::numeric)
    or (p_schedule ->> 'slotMinutes')::numeric <> trunc((p_schedule ->> 'slotMinutes')::numeric)
    or (p_schedule ->> 'bufferMinutes')::numeric not between 0 and 120
    or (p_schedule ->> 'slotMinutes')::numeric not in (15, 30, 60) then
    raise exception 'Choose seven weekdays, up to 366 blocked dates, and valid slot and buffer lengths.' using errcode = '22023';
  end if;
  buffer_minutes := (p_schedule ->> 'bufferMinutes')::integer;
  slot_minutes := (p_schedule ->> 'slotMinutes')::integer;
  for entry in select value from jsonb_array_elements(p_schedule -> 'weekly') loop
    if jsonb_typeof(entry) is distinct from 'object'
      or jsonb_typeof(entry -> 'day') is distinct from 'number'
      or jsonb_typeof(entry -> 'enabled') is distinct from 'boolean'
      or jsonb_typeof(entry -> 'breaks') is distinct from 'array'
      or coalesce(entry ->> 'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(entry ->> 'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Please provide valid weekday hours.' using errcode = '22023';
    end if;
    if (entry ->> 'day')::numeric not between 0 and 6
      or (entry ->> 'day')::numeric <> trunc((entry ->> 'day')::numeric)
      or jsonb_array_length(entry -> 'breaks') > 12 then
      raise exception 'Choose each weekday once and up to twelve breaks per day.' using errcode = '22023';
    end if;
    day_number := (entry ->> 'day')::integer;
    if day_number = any(seen_days) then
      raise exception 'Choose each weekday once.' using errcode = '22023';
    end if;
    seen_days := array_append(seen_days, day_number);
    opens := (entry ->> 'start')::time;
    closes := (entry ->> 'end')::time;
    if opens >= closes then
      raise exception 'Closing time must be after opening time on the same day.' using errcode = '22023';
    end if;
    pauses := '[]'::jsonb;
    for pause in select value from jsonb_array_elements(entry -> 'breaks') loop
      if jsonb_typeof(pause) is distinct from 'object'
        or coalesce(pause ->> 'start', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(pause ->> 'end', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Please provide valid break times.' using errcode = '22023';
      end if;
      pause_start := (pause ->> 'start')::time;
      pause_end := (pause ->> 'end')::time;
      if pause_start >= pause_end or pause_start < opens or pause_end > closes
        or exists (select 1 from jsonb_array_elements(pauses) previous
          where (previous ->> 'start')::time < pause_end
            and (previous ->> 'end')::time > pause_start) then
        raise exception 'Breaks must fit within opening hours and cannot overlap.' using errcode = '22023';
      end if;
      pauses := pauses || jsonb_build_array(jsonb_build_object('start', pause ->> 'start', 'end', pause ->> 'end'));
    end loop;
    normalized := normalized || jsonb_build_array(jsonb_build_object(
      'day', day_number, 'enabled', (entry ->> 'enabled')::boolean,
      'start', entry ->> 'start', 'end', entry ->> 'end',
      'breaks', (select coalesce(jsonb_agg(value order by value ->> 'start'), '[]'::jsonb) from jsonb_array_elements(pauses))
    ));
  end loop;
  for blocked in select value from jsonb_array_elements(p_schedule -> 'blockedDates') loop
    if jsonb_typeof(blocked) is distinct from 'object'
      or coalesce(blocked ->> 'date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Please provide valid blocked dates.' using errcode = '22023';
    end if;
    blocked_day := (blocked ->> 'date')::date;
    if blocked_day = any(seen_dates) then
      raise exception 'Choose each blocked date once.' using errcode = '22023';
    end if;
    seen_dates := array_append(seen_dates, blocked_day);
    dates := dates || jsonb_build_array(jsonb_build_object('date', blocked ->> 'date'));
  end loop;
  return jsonb_build_object(
    'weekly', (select jsonb_agg(value order by (value ->> 'day')::integer) from jsonb_array_elements(normalized)),
    'blockedDates', (select coalesce(jsonb_agg(value order by value ->> 'date'), '[]'::jsonb) from jsonb_array_elements(dates)),
    'bufferMinutes', buffer_minutes, 'slotMinutes', slot_minutes
  );
exception when invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
  raise exception 'Please provide valid availability times and dates.' using errcode = '22023';
end;
$$;
revoke all on function airstethics_private.validate_listing_schedule(jsonb) from public, anon, authenticated;

create or replace function public.get_listing_schedule(p_listing_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists (select 1 from public.listings where id = p_listing_id) then
    raise exception 'This space is no longer available.' using errcode = '22023';
  end if;
  select schedule into result from airstethics_private.listing_schedules where listing_id = p_listing_id;
  return coalesce(result, airstethics_private.default_listing_schedule());
end;
$$;

create or replace function public.update_listing_schedule(p_listing_id text, p_schedule jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare normalized jsonb;
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  -- The same listing lock serializes schedule changes, profile/service edits,
  -- and bookings. Existing bookings are deliberately not rewritten/cancelled.
  perform 1 from public.listings where id = p_listing_id and owner_id = auth.uid() and not is_demo for update;
  if not found then
    raise exception 'This space was not found in your account.' using errcode = '42501';
  end if;
  normalized := airstethics_private.validate_listing_schedule(p_schedule);
  insert into airstethics_private.listing_schedules(listing_id, schedule)
    values (p_listing_id, normalized)
    on conflict (listing_id) do update set schedule = excluded.schedule, updated_at = now();
  return normalized;
end;
$$;

create or replace function public.available_booking_slots(p_listing_id text, p_date date, p_service_id text)
returns table (booking_time time without time zone)
language plpgsql security definer set search_path = '' as $$
declare
  schedule jsonb;
  weekday jsonb;
  service_minutes integer;
  buffer_minutes integer;
  slot_minutes integer;
  open_minute integer;
  close_minute integer;
  candidate_minute integer;
  candidate_time time;
  starts timestamptz;
  finishes timestamptz;
  busy_range tstzrange;
  day_closes timestamptz;
begin
  if p_date is null or p_date < (clock_timestamp() at time zone 'America/Edmonton')::date
    or p_date > (clock_timestamp() at time zone 'America/Edmonton')::date + 90 then return; end if;
  select duration into service_minutes from public.services where id = p_service_id and listing_id = p_listing_id;
  if service_minutes is null then return; end if;
  schedule := public.get_listing_schedule(p_listing_id);
  select value into weekday from jsonb_array_elements(schedule -> 'weekly')
    where (value ->> 'day')::integer = extract(dow from p_date)::integer;
  if not (weekday ->> 'enabled')::boolean
    or exists (select 1 from jsonb_array_elements(schedule -> 'blockedDates') value where value ->> 'date' = p_date::text) then return; end if;
  buffer_minutes := (schedule ->> 'bufferMinutes')::integer;
  slot_minutes := (schedule ->> 'slotMinutes')::integer;
  open_minute := extract(epoch from (weekday ->> 'start')::time)::integer / 60;
  close_minute := extract(epoch from (weekday ->> 'end')::time)::integer / 60;
  day_closes := (p_date + (weekday ->> 'end')::time) at time zone 'America/Edmonton';
  for candidate_minute in select generate_series(open_minute, close_minute - service_minutes - buffer_minutes, slot_minutes) loop
    candidate_time := (time '00:00' + candidate_minute * interval '1 minute')::time;
    starts := (p_date + candidate_time) at time zone 'America/Edmonton';
    finishes := starts + (service_minutes + buffer_minutes) * interval '1 minute';
    busy_range := tstzrange(starts, finishes, '[)');
    -- A missing spring-forward local time must never be silently booked as a
    -- different displayed time. Fall-back ambiguity selects PostgreSQL's one
    -- standard-time occurrence and is never offered twice.
    if starts <= clock_timestamp()
      or (starts at time zone 'America/Edmonton')::time <> candidate_time
      or finishes > day_closes
      or exists (select 1 from jsonb_array_elements(weekday -> 'breaks') pause
        where busy_range && tstzrange(
          least((p_date + (pause ->> 'start')::time) at time zone 'America/Edmonton',
            (p_date + (pause ->> 'end')::time) at time zone 'America/Edmonton'),
          greatest((p_date + (pause ->> 'start')::time) at time zone 'America/Edmonton',
            (p_date + (pause ->> 'end')::time) at time zone 'America/Edmonton'), '[)'))
      or exists (select 1 from public.bookings b where b.listing_id = p_listing_id and b.status = 'confirmed'
        and busy_range && tstzrange(b.starts_at, b.ends_at + buffer_minutes * interval '1 minute', '[)')) then
      continue;
    end if;
    booking_time := candidate_time;
    return next;
  end loop;
end;
$$;

create or replace function public.create_booking(
  p_listing_id text, p_service_id text, p_date date, p_time time without time zone,
  p_guest_name text, p_guest_email text, p_id uuid
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  existing public.bookings;
  listing public.listings;
  service public.services;
  saved public.bookings;
  starts_at timestamptz;
  ends_at timestamptz;
  guest_name text := btrim(p_guest_name);
  guest_email text := btrim(p_guest_email);
begin
  if public.account_has_required_assurance() is distinct from true then
    raise exception 'Authenticator verification required' using errcode = '42501';
  end if;
  if p_id is null or p_listing_id is null or p_service_id is null or p_date is null or p_time is null
    or guest_name is null or char_length(guest_name) not between 2 and 200
    or guest_email is null or char_length(guest_email) > 254
    or guest_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Choose a service, day and time, and enter a valid name and email.' using errcode = '22023';
  end if;
  select * into listing from public.listings where id = p_listing_id for share;
  if listing.id is null then
    raise exception 'This service is no longer available.' using errcode = '22023';
  end if;
  -- Slot checks and insert share a listing-scoped lock, protecting buffers as
  -- well as actual occupied ranges when two customers book simultaneously.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('airstethics:booking:' || p_listing_id, 0));
  select * into existing from public.bookings where id = p_id;
  if found then
    if existing.customer_id <> account_id or existing.listing_id <> p_listing_id
      or existing.service_id <> p_service_id or existing.booking_date <> p_date
      or existing.booking_time <> p_time or existing.guest_name <> guest_name
      or existing.guest_email <> guest_email then
      raise exception 'This booking request cannot be reused. Please try again.' using errcode = '23505';
    end if;
    return existing;
  end if;
  select * into service from public.services where id = p_service_id and listing_id = p_listing_id;
  if service.id is null then
    raise exception 'This service is no longer available.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.available_booking_slots(p_listing_id, p_date, p_service_id) candidate where candidate.booking_time = p_time) then
    raise exception 'That time was just booked or is outside this space''s availability. Please choose another time.' using errcode = '23P01';
  end if;
  starts_at := (p_date + p_time) at time zone 'America/Edmonton';
  ends_at := starts_at + service.duration * interval '1 minute';
  insert into public.bookings(
    id, customer_id, listing_id, service_id, listing_name, listing_image, city,
    service_name, booking_date, booking_time, duration, price, guest_name, guest_email,
    starts_at, ends_at
  ) values (
    p_id, account_id, listing.id, service.id, listing.data ->> 'name', listing.data ->> 'image',
    listing.data ->> 'city', service.name, p_date, p_time, service.duration, service.price,
    guest_name, guest_email, starts_at, ends_at
  ) returning * into saved;
  return saved;
exception
  when exclusion_violation then
    raise exception 'That time was just booked. Please choose another appointment time.' using errcode = '23P01';
  when unique_violation then
    select * into existing from public.bookings where id = p_id;
    if not found or existing.customer_id <> account_id or existing.listing_id <> p_listing_id
      or existing.service_id <> p_service_id or existing.booking_date <> p_date
      or existing.booking_time <> p_time or existing.guest_name <> guest_name
      or existing.guest_email <> guest_email then
      raise exception 'This booking request cannot be reused. Please try again.' using errcode = '23505';
    end if;
    return existing;
end;
$$;

revoke all on function public.get_listing_schedule(text) from public, anon, authenticated;
revoke all on function public.update_listing_schedule(text,jsonb) from public, anon, authenticated;
revoke all on function public.available_booking_slots(text,date,text) from public, anon, authenticated;
revoke all on function public.create_booking(text,text,date,time without time zone,text,text,uuid) from public, anon, authenticated;
grant execute on function public.get_listing_schedule(text) to anon, authenticated;
grant execute on function public.available_booking_slots(text,date,text) to anon, authenticated;
grant execute on function public.update_listing_schedule(text,jsonb) to authenticated;
grant execute on function public.create_booking(text,text,date,time without time zone,text,text,uuid) to authenticated;

commit;
