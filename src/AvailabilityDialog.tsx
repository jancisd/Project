import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Clock3, Plus, Trash2, X } from 'lucide-react';
import type { Listing } from './data';
import type { ListingSchedule } from './availability';
import { albertaClock, isListingSchedule } from './availability';
import './availability.css';

type Props = {
  listing: Listing;
  onClose: () => void;
  loadSchedule: (listingId: string) => Promise<ListingSchedule>;
  onSave: (schedule: ListingSchedule) => Promise<void>;
  cloud: boolean;
};

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function minutes(time: string) {
  const [hours, minute] = time.split(':').map(Number);
  return hours * 60 + minute;
}

function albertaToday() {
  return albertaClock().date;
}

function scheduleError(schedule: ListingSchedule): string {
  if (
    !Array.isArray(schedule.weekly) ||
    schedule.weekly.length !== 7 ||
    new Set(schedule.weekly.map((day) => day.day)).size !== 7 ||
    schedule.weekly.some(
      (day) => !Number.isInteger(day.day) || day.day < 0 || day.day > 6,
    )
  )
    return 'We couldn’t read the weekly hours. Please reload availability.';
  if (
    !Number.isInteger(schedule.bufferMinutes) ||
    schedule.bufferMinutes < 0 ||
    schedule.bufferMinutes > 120
  )
    return 'Choose a buffer between 0 and 120 whole minutes.';
  if (![15, 30, 60].includes(schedule.slotMinutes))
    return 'Choose a booking interval of 15, 30, or 60 minutes.';
  for (const day of schedule.weekly) {
    if (!timePattern.test(day.start) || !timePattern.test(day.end))
      return `Enter valid opening and closing times for ${days[day.day]}.`;
    if (minutes(day.start) >= minutes(day.end))
      return `${days[day.day]} must close after it opens.`;
    if (!Array.isArray(day.breaks) || day.breaks.length > 12)
      return `Keep up to 12 breaks for ${days[day.day]}.`;
    const breaks = [...day.breaks].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    for (let index = 0; index < breaks.length; index++) {
      const pause = breaks[index];
      if (
        !timePattern.test(pause.start) ||
        !timePattern.test(pause.end) ||
        minutes(pause.start) >= minutes(pause.end) ||
        minutes(pause.start) < minutes(day.start) ||
        minutes(pause.end) > minutes(day.end)
      )
        return `Keep ${days[day.day]} breaks inside opening hours, with an end after the start.`;
      if (index > 0 && minutes(pause.start) < minutes(breaks[index - 1].end))
        return `${days[day.day]} breaks cannot overlap.`;
    }
  }
  if (
    !Array.isArray(schedule.blockedDates) ||
    schedule.blockedDates.length > 366
  )
    return 'Keep up to 366 blocked dates.';
  return '';
}

export default function AvailabilityDialog({
  listing,
  onClose,
  loadSchedule,
  onSave,
  cloud,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
  const loadVersion = useRef(0);
  const loader = useRef(loadSchedule);
  loader.current = loadSchedule;
  const titleId = useId();
  const formId = useId();
  const [schedule, setSchedule] = useState<ListingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [blockedDate, setBlockedDate] = useState('');

  async function load() {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError('');
    try {
      const result = await loader.current(listing.id);
      const problem = isListingSchedule(result)
        ? scheduleError(result)
        : 'We couldn’t read availability. Please try loading it again.';
      if (problem) throw new Error(problem);
      if (mounted.current && version === loadVersion.current)
        setSchedule(result);
    } catch (cause) {
      if (mounted.current && version === loadVersion.current)
        setLoadError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t load availability. Please try again.',
        );
    } finally {
      if (mounted.current && version === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    void load();
    return () => {
      mounted.current = false;
      loadVersion.current += 1;
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
    // Each listing opens a separate dialog. The latest loader is kept in a ref
    // so account refreshes do not discard unsaved changes in the form.
  }, [listing.id]);

  function close() {
    if (!saving.current) onClose();
  }

  function updateDay(
    dayNumber: number,
    change: Partial<ListingSchedule['weekly'][number]>,
  ) {
    setSchedule((previous) =>
      previous
        ? {
            ...previous,
            weekly: previous.weekly.map((day) =>
              day.day === dayNumber ? { ...day, ...change } : day,
            ),
          }
        : previous,
    );
    setError('');
  }

  function updateBreak(
    dayNumber: number,
    index: number,
    key: 'start' | 'end',
    value: string,
  ) {
    const day = schedule?.weekly.find((item) => item.day === dayNumber);
    if (!day) return;
    updateDay(dayNumber, {
      breaks: day.breaks.map((pause, current) =>
        current === index ? { ...pause, [key]: value } : pause,
      ),
    });
  }

  function addBlockedDate() {
    if (!schedule || !blockedDate) return;
    const parsedDate = new Date(`${blockedDate}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(blockedDate) ||
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== blockedDate ||
      blockedDate < albertaToday()
    ) {
      setError('Choose today or a future date to block.');
      return;
    }
    if (schedule.blockedDates.some((item) => item.date === blockedDate)) {
      setError('That date is already blocked.');
      return;
    }
    if (schedule.blockedDates.length >= 366) {
      setError(
        'Keep up to 366 blocked dates. Remove an old date before adding another.',
      );
      return;
    }
    setSchedule({
      ...schedule,
      blockedDates: [...schedule.blockedDates, { date: blockedDate }].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    });
    setBlockedDate('');
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!schedule || saving.current) return;
    const problem = scheduleError(schedule);
    if (problem) {
      setError(problem);
      return;
    }
    saving.current = true;
    setPending(true);
    setError('');
    try {
      await onSave(schedule);
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t save availability. Your changes are still here; please try again.',
        );
    } finally {
      saving.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="availability-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="availability-heading">
        <div>
          <span className="eyebrow muted-eyebrow">
            MAKE TIME FOR YOUR BUSINESS
          </span>
          <h2 id={titleId}>Availability for {listing.name}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={close}
          disabled={pending}
          aria-label="Close availability"
        >
          <X size={21} />
        </button>
      </div>
      <p className="availability-intro">
        Set the times guests can book. All times are local to Alberta.
      </p>
      <p className="availability-note">
        Changing availability affects new bookings. Existing appointments stay
        confirmed.
      </p>
      {!cloud && (
        <p className="availability-demo-note">
          These hours are saved for your demo space in this browser.
        </p>
      )}
      {loading ? (
        <p className="availability-loading" role="status">
          Loading your availability…
        </p>
      ) : loadError ? (
        <div className="availability-load-error">
          <p role="alert">{loadError}</p>
          <button
            type="button"
            className="host-outline-button"
            onClick={() => void load()}
          >
            Retry availability
          </button>
        </div>
      ) : (
        schedule && (
          <form className="availability-form" onSubmit={submit}>
            <section aria-labelledby={`${formId}-hours`}>
              <h3 id={`${formId}-hours`}>
                <Clock3 size={18} aria-hidden="true" /> Weekly opening hours
              </h3>
              <div className="availability-week">
                {[...schedule.weekly]
                  .sort((a, b) => a.day - b.day)
                  .map((day) => (
                    <fieldset
                      className={`availability-day${day.enabled ? '' : ' availability-day-closed'}`}
                      key={day.day}
                      disabled={pending}
                    >
                      <legend>{days[day.day]}</legend>
                      <div className="availability-day-top">
                        <label className="availability-toggle">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(event) =>
                              updateDay(day.day, {
                                enabled: event.target.checked,
                              })
                            }
                            aria-label={`${days[day.day]} open`}
                          />
                          {day.enabled ? 'Open' : 'Closed'}
                        </label>
                        {day.enabled && (
                          <div className="availability-time-pair">
                            <label>
                              Opening time
                              <input
                                type="time"
                                step={60}
                                required
                                value={day.start}
                                aria-label={`${days[day.day]} opening time`}
                                onChange={(event) =>
                                  updateDay(day.day, {
                                    start: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <span aria-hidden="true">–</span>
                            <label>
                              Closing time
                              <input
                                type="time"
                                step={60}
                                required
                                value={day.end}
                                aria-label={`${days[day.day]} closing time`}
                                onChange={(event) =>
                                  updateDay(day.day, {
                                    end: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        )}
                      </div>
                      {day.enabled && (
                        <div className="availability-breaks">
                          {day.breaks.map((pause, index) => (
                            <div className="availability-break" key={index}>
                              <span className="availability-break-label">
                                Break {index + 1}
                              </span>
                              <div className="availability-time-pair">
                                <label>
                                  Start
                                  <input
                                    type="time"
                                    step={60}
                                    required
                                    value={pause.start}
                                    aria-label={`${days[day.day]} break ${index + 1} start`}
                                    onChange={(event) =>
                                      updateBreak(
                                        day.day,
                                        index,
                                        'start',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <span aria-hidden="true">–</span>
                                <label>
                                  End
                                  <input
                                    type="time"
                                    step={60}
                                    required
                                    value={pause.end}
                                    aria-label={`${days[day.day]} break ${index + 1} end`}
                                    onChange={(event) =>
                                      updateBreak(
                                        day.day,
                                        index,
                                        'end',
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                              </div>
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Remove ${days[day.day]} break ${index + 1}`}
                                onClick={() =>
                                  updateDay(day.day, {
                                    breaks: day.breaks.filter(
                                      (_, current) => current !== index,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="text-button availability-add-break"
                            disabled={day.breaks.length >= 12}
                            onClick={() =>
                              updateDay(day.day, {
                                breaks: [
                                  ...day.breaks,
                                  { start: '12:00', end: '13:00' },
                                ],
                              })
                            }
                          >
                            <Plus size={14} aria-hidden="true" /> Add{' '}
                            {days[day.day]} break
                          </button>
                        </div>
                      )}
                    </fieldset>
                  ))}
              </div>
            </section>
            <section aria-labelledby={`${formId}-booking`}>
              <h3 id={`${formId}-booking`}>
                <Clock3 size={18} aria-hidden="true" /> Booking preferences
              </h3>
              <div className="availability-preferences">
                <label htmlFor={`${formId}-buffer`}>
                  Time after each appointment
                  <input
                    id={`${formId}-buffer`}
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    required
                    disabled={pending}
                    aria-label="Time after each appointment"
                    value={
                      Number.isFinite(schedule.bufferMinutes)
                        ? schedule.bufferMinutes
                        : ''
                    }
                    onChange={(event) =>
                      setSchedule({
                        ...schedule,
                        bufferMinutes:
                          event.target.value === ''
                            ? NaN
                            : Number(event.target.value),
                      })
                    }
                  />
                  <span className="availability-note">
                    Extra minutes for cleanup or a breather, from 0 to 120.
                  </span>
                </label>
                <label htmlFor={`${formId}-interval`}>
                  Booking start intervals
                  <select
                    id={`${formId}-interval`}
                    disabled={pending}
                    aria-label="Booking start intervals"
                    value={schedule.slotMinutes}
                    onChange={(event) =>
                      setSchedule({
                        ...schedule,
                        slotMinutes: Number(event.target.value) as 15 | 30 | 60,
                      })
                    }
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 60 minutes</option>
                  </select>
                  <span className="availability-note">
                    Available starts are counted from each day’s opening time.
                  </span>
                </label>
              </div>
            </section>
            <section aria-labelledby={`${formId}-dates`}>
              <h3 id={`${formId}-dates`}>
                <CalendarDays size={18} aria-hidden="true" /> Blocked dates
              </h3>
              <p className="availability-note">
                Close a whole day for holidays, time off, or a private event.
              </p>
              <div className="availability-block-date">
                <label htmlFor={`${formId}-date`}>
                  Block a date
                  <input
                    id={`${formId}-date`}
                    type="date"
                    min={albertaToday()}
                    value={blockedDate}
                    disabled={pending}
                    onChange={(event) => setBlockedDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="host-outline-button"
                  onClick={addBlockedDate}
                  disabled={pending || !blockedDate}
                >
                  <Plus size={16} aria-hidden="true" /> Add blocked date
                </button>
              </div>
              {schedule.blockedDates.length > 0 ? (
                <ul className="availability-blocked-dates">
                  {schedule.blockedDates.map((item) => (
                    <li key={item.date}>
                      <span>
                        {new Intl.DateTimeFormat('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'UTC',
                        }).format(new Date(`${item.date}T12:00:00Z`))}
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={pending}
                        aria-label={`Unblock ${item.date}`}
                        onClick={() =>
                          setSchedule({
                            ...schedule,
                            blockedDates: schedule.blockedDates.filter(
                              (current) => current.date !== item.date,
                            ),
                          })
                        }
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="availability-note availability-no-dates">
                  No dates blocked.
                </p>
              )}
            </section>
            {error && (
              <p className="availability-error" role="alert">
                {error}
              </p>
            )}
            <div className="availability-actions">
              <button
                type="button"
                className="text-button"
                onClick={close}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={pending}
              >
                {pending ? 'Saving…' : 'Save availability'}
                <Check size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        )
      )}
    </dialog>
  );
}
