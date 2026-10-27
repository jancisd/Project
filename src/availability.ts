export type ListingSchedule = {
  weekly: {
    day: number;
    enabled: boolean;
    start: string;
    end: string;
    breaks: { start: string; end: string }[];
  }[];
  blockedDates: { date: string }[];
  bufferMinutes: number;
  slotMinutes: 15 | 30 | 60;
};

export function defaultSchedule(): ListingSchedule {
  return {
    weekly: Array.from({ length: 7 }, (_, day) => ({
      day,
      enabled: true,
      start: '09:00',
      end: '18:00',
      breaks: [],
    })),
    blockedDates: [],
    bufferMinutes: 0,
    slotMinutes: 60,
  };
}

export function timeMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function albertaClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const time = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const date = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export function isListingSchedule(value: unknown): value is ListingSchedule {
  if (
    !record(value) ||
    !Array.isArray(value.weekly) ||
    value.weekly.length !== 7 ||
    !Array.isArray(value.blockedDates) ||
    value.blockedDates.length > 366 ||
    !Number.isInteger(value.bufferMinutes) ||
    Number(value.bufferMinutes) < 0 ||
    Number(value.bufferMinutes) > 120 ||
    typeof value.slotMinutes !== 'number' ||
    ![15, 30, 60].includes(value.slotMinutes)
  )
    return false;
  const days = new Set<number>();
  for (const day of value.weekly) {
    if (
      !record(day) ||
      !Number.isInteger(day.day) ||
      Number(day.day) < 0 ||
      Number(day.day) > 6 ||
      days.has(Number(day.day)) ||
      typeof day.enabled !== 'boolean' ||
      !time(day.start) ||
      !time(day.end) ||
      timeMinutes(day.start) >= timeMinutes(day.end) ||
      !Array.isArray(day.breaks) ||
      day.breaks.length > 12
    )
      return false;
    days.add(Number(day.day));
    const breaks: { start: number; end: number }[] = [];
    for (const pause of day.breaks) {
      if (!record(pause) || !time(pause.start) || !time(pause.end))
        return false;
      const start = timeMinutes(pause.start),
        end = timeMinutes(pause.end);
      if (
        start < timeMinutes(day.start) ||
        end > timeMinutes(day.end) ||
        start >= end ||
        breaks.some((other) => start < other.end && end > other.start)
      )
        return false;
      breaks.push({ start, end });
    }
  }
  return (
    value.blockedDates.every((item) => record(item) && date(item.date)) &&
    new Set(value.blockedDates.map((item) => (item as { date: string }).date))
      .size === value.blockedDates.length
  );
}

export function isScheduleMap(
  value: unknown,
): value is Record<string, ListingSchedule> {
  return (
    record(value) &&
    Object.keys(value).length <= 1000 &&
    Object.entries(value).every(
      ([id, schedule]) => id.length <= 256 && isListingSchedule(schedule),
    )
  );
}

export function scheduleSlots(
  schedule: ListingSchedule,
  bookingDate: string,
  duration: number,
  busy: { time: string; duration: number }[],
): string[] {
  const now = albertaClock();
  const lastDay = new Date(`${now.date}T12:00:00Z`);
  lastDay.setUTCDate(lastDay.getUTCDate() + 90);
  if (
    !date(bookingDate) ||
    bookingDate < now.date ||
    bookingDate > lastDay.toISOString().slice(0, 10) ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 540 ||
    schedule.blockedDates.some((item) => item.date === bookingDate)
  )
    return [];
  const day = schedule.weekly.find(
    (item) => item.day === new Date(`${bookingDate}T12:00:00Z`).getUTCDay(),
  );
  if (!day?.enabled) return [];
  const slots: string[] = [];
  for (
    let start = timeMinutes(day.start);
    start + duration + schedule.bufferMinutes <= timeMinutes(day.end);
    start += schedule.slotMinutes
  ) {
    const end = start + duration + schedule.bufferMinutes;
    if (bookingDate === now.date && start <= now.minutes) continue;
    if (
      day.breaks.some(
        (pause) =>
          start < timeMinutes(pause.end) && end > timeMinutes(pause.start),
      )
    )
      continue;
    if (
      busy.some(
        (item) =>
          start <
            timeMinutes(item.time) + item.duration + schedule.bufferMinutes &&
          end > timeMinutes(item.time),
      )
    )
      continue;
    slots.push(
      `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
    );
  }
  return slots;
}
