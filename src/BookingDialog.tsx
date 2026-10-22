import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { Listing } from './data';
import type { Booking } from './types';
import './booking.css';

type Props = {
  listing: Listing;
  bookings: Booking[];
  onClose: () => void;
  onBooked: (
    booking: Booking,
    serviceId: string,
  ) => Promise<Booking> | Booking | void;
  cloud?: boolean;
  loadAvailability?: (
    listingId: string,
    date: string,
  ) => Promise<{ time: string; duration: number }[]>;
};

function albertaNow() {
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

function dayFromNow(days: number) {
  const date = new Date(`${albertaNow().date}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeInMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function prettyTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

function prettyDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const times = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];
const money = (amount: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);

export default function BookingDialog({
  listing,
  bookings,
  onClose,
  onBooked,
  cloud = false,
  loadAvailability,
}: Props) {
  const [serviceId, setServiceId] = useState(listing.services[0]?.id ?? '');
  const [date, setDate] = useState(dayFromNow(1));
  const [time, setTime] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [availability, setAvailability] = useState<{
    key: string;
    busy: { time: string; duration: number }[];
    loading: boolean;
    error: string;
  }>({ key: '', busy: [], loading: false, error: '' });
  const mounted = useRef(true);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const submitted = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const service =
    listing.services.find((item) => item.id === serviceId) ??
    listing.services[0];
  const today = dayFromNow(0);
  const lastDate = dayFromNow(90);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date <= lastDate;

  const availabilityKey = `${listing.id}:${date}`;
  const loadingAvailability =
    Boolean(loadAvailability) &&
    (availability.key !== availabilityKey || availability.loading);
  const availabilityError =
    availability.key === availabilityKey ? availability.error : '';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loadAvailability || !validDate) return;
    let cancelled = false;
    setAvailability({
      key: availabilityKey,
      busy: [],
      loading: true,
      error: '',
    });
    loadAvailability(listing.id, date)
      .then((busy) => {
        if (!cancelled)
          setAvailability({
            key: availabilityKey,
            busy,
            loading: false,
            error: '',
          });
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setAvailability({
            key: availabilityKey,
            busy: [],
            loading: false,
            error:
              reason instanceof Error
                ? reason.message
                : 'We couldn’t check availability. Please try again.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    listing.id,
    date,
    loadAvailability,
    validDate,
    availabilityKey,
    availabilityVersion,
  ]);

  function slotAvailable(slot: string) {
    const now = albertaNow();
    if (
      !validDate ||
      loadingAvailability ||
      Boolean(availabilityError) ||
      !service ||
      date < now.date ||
      (date === now.date && timeInMinutes(slot) <= now.minutes)
    )
      return false;
    const start = timeInMinutes(slot);
    const end = start + service.duration;
    if (end > 18 * 60) return false;
    if (
      loadAvailability &&
      availability.busy.some((busy) => {
        const bookedStart = timeInMinutes(busy.time);
        return start < bookedStart + busy.duration && end > bookedStart;
      })
    )
      return false;
    return !bookings.some((booking) => {
      if (
        booking.listingId !== listing.id ||
        booking.date !== date ||
        booking.status !== 'confirmed'
      )
        return false;
      const bookedStart = timeInMinutes(booking.time);
      return start < bookedStart + booking.duration && end > bookedStart;
    });
  }

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const overlay = dialogRef.current?.parentElement;
    const background = new Map<HTMLElement, boolean>();
    function inertBackground() {
      if (!overlay?.parentElement) return;
      Array.from(overlay.parentElement.children).forEach((element) => {
        if (
          !(element instanceof HTMLElement) ||
          element === overlay ||
          background.has(element)
        )
          return;
        background.set(element, element.inert);
        element.inert = true;
      });
    }
    inertBackground();
    const backgroundObserver = new MutationObserver(inertBackground);
    if (overlay?.parentElement)
      backgroundObserver.observe(overlay.parentElement, { childList: true });
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:enabled, input:enabled, select:enabled, textarea:enabled, a[href], [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) return;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
      backgroundObserver.disconnect();
      background.forEach((wasInert, element) => {
        element.inert = wasInert;
      });
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    if (confirmed)
      dialogRef.current
        ?.querySelector<HTMLElement>('.booking-success-heading')
        ?.focus();
  }, [confirmed]);

  async function confirmBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (submitted.current) return;
    if (
      !service ||
      !validDate ||
      !time ||
      !times.includes(time) ||
      !slotAvailable(time)
    ) {
      setError('Please choose an available date and time for your service.');
      return;
    }
    if (
      guestName.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())
    ) {
      setError('Please enter your name and a valid email address.');
      return;
    }
    const signature = JSON.stringify([
      listing.id,
      service.id,
      date,
      time,
      guestName.trim(),
      guestEmail.trim(),
    ]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    const booking: Booking = {
      id: attempt.current.id,
      listingId: listing.id,
      listingName: listing.name,
      listingImage: listing.image,
      city: listing.city,
      serviceName: service.name,
      date,
      time,
      duration: service.duration,
      price: service.price,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    submitted.current = true;
    setPending(true);
    try {
      const saved = await onBooked(booking, service.id);
      if (mounted.current) setConfirmed(saved ?? booking);
    } catch (reason) {
      submitted.current = false;
      if (mounted.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'We couldn’t save your booking. Please try again.',
        );
        if (reason instanceof Error && reason.message.includes('just booked')) {
          setTime('');
          setAvailabilityVersion((value) => value + 1);
        }
      }
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div
      className="booking-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`booking-dialog${confirmed ? ' booking-dialog-confirmed' : ''}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
      >
        <button
          className="booking-close"
          ref={closeRef}
          onClick={onClose}
          aria-label="Close booking details"
        >
          <X size={20} />
        </button>
        {confirmed ? (
          <div className="booking-success">
            <div className="booking-success-icon">
              <CheckCircle2 size={37} strokeWidth={1.4} />
            </div>
            <span className="booking-eyebrow">A LITTLE TIME FOR YOU</span>
            <h2
              id="booking-dialog-title"
              className="booking-success-heading"
              tabIndex={-1}
            >
              You’re all booked in.
            </h2>
            <p>
              {cloud
                ? 'Your appointment is saved to your account. Find all the details in '
                : 'Your demo appointment is in your appointment book. Find all the details in '}
              <strong>My appointments</strong>.
            </p>
            <div className="booking-success-card">
              <img src={listing.image} alt={listing.name} />
              <div>
                <h3>{listing.name}</h3>
                <span>{confirmed.serviceName}</span>
                <span>
                  <CalendarDays size={14} />
                  {prettyDate(confirmed.date)}
                </span>
                <span>
                  <Clock3 size={14} />
                  {prettyTime(confirmed.time)} · {confirmed.duration} min
                </span>
              </div>
            </div>
            <div className="booking-success-total">
              <span>Appointment total</span>
              <strong>{money(confirmed.price)} CAD</strong>
            </div>
            <p className="booking-demo-note">
              <ShieldCheck size={15} />{' '}
              {cloud
                ? 'Saved to your account. No provider has been contacted, no email sent, and no payment collected.'
                : 'This is a demo. No provider has been contacted, no email sent, and no payment collected.'}
            </p>
            <button className="booking-primary" onClick={onClose}>
              Keep exploring <ChevronRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="booking-cover">
              <img src={listing.image} alt={`Inside ${listing.name}`} />
              <span>
                <Sparkles size={13} /> {listing.tag}
              </span>
            </div>
            <div className="booking-content">
              <section className="booking-about">
                <span className="booking-eyebrow">
                  {listing.category} · {listing.city.toUpperCase()}
                </span>
                <h2 id="booking-dialog-title">{listing.name}</h2>
                <div className="booking-meta">
                  {listing.reviewCount > 0 ? (
                    <span>
                      <Star size={14} fill="currentColor" />
                      {listing.rating.toFixed(2)}{' '}
                      <small>({listing.reviewCount} reviews)</small>
                    </span>
                  ) : (
                    <span>
                      <Sparkles size={14} />
                      New · no reviews yet
                    </span>
                  )}
                  <span>
                    <MapPin size={14} />
                    {listing.neighborhood}, {listing.city}
                  </span>
                </div>
                <p className="booking-description">{listing.description}</p>
                <div className="booking-professional">
                  <img
                    src={listing.professional.avatar}
                    alt={listing.professional.name}
                  />
                  <div>
                    <strong>Meet {listing.professional.name}</strong>
                    <span>{listing.professional.title}</span>
                  </div>
                  <span className="booking-verified">
                    <ShieldCheck size={15} />{' '}
                    {cloud ? 'Unverified profile' : 'Demo profile'}
                  </span>
                </div>
                <div className="booking-amenities">
                  {listing.amenities.map((amenity) => (
                    <span key={amenity}>
                      <Check size={13} />
                      {amenity}
                    </span>
                  ))}
                </div>
                <div className="booking-reviews">
                  <h3>
                    {listing.reviews.length
                      ? 'A few kind words'
                      : 'A fresh find.'}
                  </h3>
                  <p className="booking-review-note">
                    {listing.reviews.length
                      ? 'Sample reviews for this fictional studio.'
                      : 'New to airstethics. This demo studio has no reviews yet.'}
                  </p>
                  {listing.reviews.slice(0, 2).map((review) => (
                    <article key={review.id}>
                      <div>
                        <strong>{review.name}</strong>
                        <span>
                          <Star size={12} fill="currentColor" />
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      <p>“{review.text}”</p>
                    </article>
                  ))}
                </div>
              </section>
              <form
                className="booking-form"
                onSubmit={confirmBooking}
                aria-busy={pending}
              >
                <fieldset className="booking-controls" disabled={pending}>
                  <div className="booking-form-heading">
                    <span className="booking-eyebrow">
                      MAKE ROOM FOR YOURSELF
                    </span>
                    <h3>Find your little reset.</h3>
                    <p>Choose a service and a time that’s yours.</p>
                  </div>
                  <fieldset className="booking-fieldset">
                    <legend>Choose your service</legend>
                    <div className="booking-services">
                      {listing.services.map((item) => (
                        <label
                          className={`booking-service${item.id === serviceId ? ' is-selected' : ''}`}
                          key={item.id}
                        >
                          <input
                            type="radio"
                            name="service"
                            value={item.id}
                            checked={serviceId === item.id}
                            onChange={() => {
                              setServiceId(item.id);
                              setTime('');
                              setError('');
                            }}
                          />
                          <span
                            className="booking-service-radio"
                            aria-hidden="true"
                          >
                            {item.id === serviceId && <span />}
                          </span>
                          <span className="booking-service-copy">
                            <strong>{item.name}</strong>
                            <span>
                              {item.duration} min · {item.description}
                            </span>
                          </span>
                          <strong className="booking-service-price">
                            {money(item.price)}
                          </strong>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="booking-label" htmlFor="booking-date">
                    Your day
                  </label>
                  <input
                    className="booking-input booking-date"
                    id="booking-date"
                    name="date"
                    type="date"
                    min={today}
                    max={lastDate}
                    value={date}
                    required
                    onChange={(event) => {
                      setDate(event.target.value);
                      setTime('');
                      setError('');
                    }}
                  />
                  <fieldset className="booking-fieldset booking-time-fieldset">
                    <legend>
                      Available times <span>Alberta local time</span>
                    </legend>
                    {loadingAvailability && (
                      <p className="booking-availability" role="status">
                        Checking available times…
                      </p>
                    )}
                    {availabilityError && (
                      <div
                        className="booking-availability booking-error"
                        role="alert"
                      >
                        <p>{availabilityError}</p>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            setTime('');
                            setAvailabilityVersion((value) => value + 1);
                          }}
                        >
                          Try again
                        </button>
                      </div>
                    )}
                    <div className="booking-times">
                      {times.map((slot) => (
                        <button
                          type="button"
                          className={`booking-time${time === slot ? ' is-selected' : ''}`}
                          key={slot}
                          disabled={!slotAvailable(slot)}
                          aria-pressed={time === slot}
                          onClick={() => {
                            setTime(slot);
                            setError('');
                          }}
                        >
                          {prettyTime(slot)}
                        </button>
                      ))}
                    </div>
                    {validDate &&
                      !loadingAvailability &&
                      !availabilityError &&
                      !times.some(slotAvailable) && (
                        <p className="booking-empty-times">
                          No times left on this day. Try another date.
                        </p>
                      )}
                  </fieldset>
                  <div className="booking-guest-fields">
                    <div>
                      <label className="booking-label" htmlFor="booking-name">
                        Your name
                      </label>
                      <input
                        className="booking-input"
                        id="booking-name"
                        name="name"
                        autoComplete="name"
                        placeholder="First and last name"
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="booking-label" htmlFor="booking-email">
                        Email address
                      </label>
                      <input
                        className="booking-input"
                        id="booking-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={guestEmail}
                        onChange={(event) => setGuestEmail(event.target.value)}
                        required
                        maxLength={200}
                      />
                    </div>
                  </div>
                  <div className="booking-price-line">
                    <span>
                      Service total <small>No extra booking fees</small>
                    </span>
                    <strong>
                      {money(service?.price ?? 0)} <small>CAD</small>
                    </strong>
                  </div>
                  {error && (
                    <p className="booking-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="booking-primary"
                    type="submit"
                    disabled={pending || !time || !slotAvailable(time)}
                  >
                    {pending
                      ? 'Saving your appointment…'
                      : 'Book my appointment'}{' '}
                    <ChevronRight size={17} />
                  </button>
                  <p className="booking-demo-note">
                    <ShieldCheck size={14} />{' '}
                    {cloud
                      ? 'Early release · no payment collected.'
                      : 'Demo booking · no payment collected.'}
                    <br />
                    {cloud
                      ? 'Saved to your account; no provider notification or email is sent.'
                      : 'Saved on this device; no email is sent.'}
                  </p>
                </fieldset>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
