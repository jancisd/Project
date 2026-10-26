import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import type { Listing } from './data';
import type { Booking } from './types';
import './host-dashboard.css';

type Props = {
  listings: Listing[];
  bookings: Booking[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onEdit: (listing: Listing) => void;
  onAddFirst: () => void;
  onAddLocation: () => void;
  onOpenListing: (listing: Listing) => void;
  onCancelBooking: (id: string) => Promise<void>;
  cloud: boolean;
};

type AppointmentFilter = 'upcoming' | 'past' | 'cancelled';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const priceFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function localClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

function isUpcoming(booking: Booking, now: ReturnType<typeof localClock>) {
  const [hour, minute] = booking.time.split(':').map(Number);
  return (
    booking.date > now.date ||
    (booking.date === now.date &&
      hour * 60 + minute + booking.duration > now.minutes)
  );
}

function formatTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function HostDashboard({
  listings,
  bookings,
  loading,
  error,
  onRetry,
  onEdit,
  onAddFirst,
  onAddLocation,
  onOpenListing,
  onCancelBooking,
  cloud,
}: Props) {
  const locationId = useId();
  const filterId = useId();
  const [location, setLocation] = useState('all');
  const [filter, setFilter] = useState<AppointmentFilter>('upcoming');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(localClock);
  const mounted = useRef(true);
  const cancelling = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setClock(localClock()), 60_000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  // Treat a removed/stale selection as all spaces, so a refresh cannot hide
  // another owned location's appointment book behind a missing option.
  const selectedLocation = listings.some((listing) => listing.id === location)
    ? location
    : 'all';
  const ownedIds = useMemo(
    () => new Set(listings.map((listing) => listing.id)),
    [listings],
  );
  const ownedBookings = useMemo(
    () => bookings.filter((booking) => ownedIds.has(booking.listingId)),
    [bookings, ownedIds],
  );
  const upcomingCount = ownedBookings.filter(
    (booking) => booking.status === 'confirmed' && isUpcoming(booking, clock),
  ).length;
  const visibleBookings = ownedBookings
    .filter((booking) => {
      if (selectedLocation !== 'all' && booking.listingId !== selectedLocation)
        return false;
      if (filter === 'cancelled') return booking.status === 'cancelled';
      if (booking.status !== 'confirmed') return false;
      return filter === 'upcoming'
        ? isUpcoming(booking, clock)
        : !isUpcoming(booking, clock);
    })
    .sort((a, b) => {
      const order = `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
      return filter === 'upcoming' ? order : -order;
    });

  async function cancelAppointment(id: string) {
    if (cancelling.current) return;
    cancelling.current = true;
    setPendingId(id);
    setCancelError('');
    setNotice('');
    try {
      await onCancelBooking(id);
      if (mounted.current) {
        setCancelId(null);
        setNotice(
          'Appointment cancelled. The time is available to book again.',
        );
      }
    } catch (cause) {
      if (mounted.current)
        setCancelError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t cancel that appointment. Please try again.',
        );
    } finally {
      cancelling.current = false;
      if (mounted.current) setPendingId(null);
    }
  }

  return (
    <section className="page-width host-dashboard" aria-labelledby="host-title">
      <header className="host-heading">
        <div>
          <span className="eyebrow muted-eyebrow">
            A LITTLE SPACE FOR YOUR BUSINESS
          </span>
          <h1 id="host-title">My business</h1>
          <p className="page-intro">
            Your spaces and the people coming to see you.
          </p>
        </div>
        <div className="host-heading-actions">
          <button
            className="host-outline-button"
            onClick={onRetry}
            disabled={loading || Boolean(pendingId)}
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
          {listings.length > 0 && !loading && !error && (
            <button className="host-outline-button" onClick={onAddLocation}>
              <Plus size={17} aria-hidden="true" /> Add another location
            </button>
          )}
        </div>
      </header>

      {!cloud && (
        <p className="host-demo-notice">
          This is your demo business dashboard. Spaces and appointments stay in
          this browser; no real reservations or payments are made.
        </p>
      )}

      {loading ? (
        <div className="host-loading" role="status">
          <Building2 size={24} aria-hidden="true" />
          Loading your spaces and appointments…
        </div>
      ) : error ? (
        <div className="host-error-panel">
          <p role="alert">{error}</p>
          <button className="host-outline-button" onClick={onRetry}>
            Retry my business
          </button>
        </div>
      ) : (
        <>
          <div className="host-stats" aria-label="Business overview">
            <div>
              <Building2 size={20} aria-hidden="true" />
              <strong>{listings.length}</strong>
              <span>
                {listings.length === 1 ? 'Your space' : 'Your spaces'}
              </span>
            </div>
            <div>
              <CalendarDays size={20} aria-hidden="true" />
              <strong>{upcomingCount}</strong>
              <span>Upcoming appointments</span>
            </div>
          </div>

          <section className="host-spaces" aria-labelledby="host-spaces-title">
            <div className="host-section-heading">
              <div>
                <h2 id="host-spaces-title">Your spaces</h2>
                <p>
                  Keep your listing up to date so your next guest knows what to
                  expect.
                </p>
              </div>
            </div>
            {listings.length ? (
              <>
                <div className="host-listing-grid">
                  {listings.map((listing) => (
                    <article
                      className="host-listing-card"
                      data-testid="host-listing-card"
                      key={listing.id}
                    >
                      <img src={listing.image} alt={listing.name} />
                      <div className="host-listing-content">
                        <span className="host-listing-category">
                          {listing.category}
                        </span>
                        <h3>{listing.name}</h3>
                        <p>
                          <MapPin size={14} aria-hidden="true" />
                          {listing.neighborhood}, {listing.city}
                        </p>
                        <div className="host-listing-actions">
                          <button
                            className="host-outline-button"
                            onClick={() => onEdit(listing)}
                          >
                            <PencilLine size={15} aria-hidden="true" /> Edit
                            space
                          </button>
                          <button
                            className="text-button"
                            onClick={() => onOpenListing(listing)}
                          >
                            View listing{' '}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="host-location-note">
                  Have a separate physical space? Use “Add another location” to
                  give it its own listing and appointment book.
                </p>
              </>
            ) : (
              <div className="host-empty host-first-space">
                <Building2 size={30} aria-hidden="true" />
                <h3>Your business starts here.</h3>
                <p>
                  List your space once, then come back here to edit it and
                  manage its appointments.
                </p>
                <button className="primary-button" onClick={onAddFirst}>
                  List your space <Plus size={17} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <section
            className="host-appointments"
            aria-labelledby="host-appointments-title"
          >
            <div className="host-section-heading">
              <div>
                <h2 id="host-appointments-title">
                  Appointments at your spaces
                </h2>
                <p>
                  Bookings made by your guests. All times are local to Alberta.
                </p>
              </div>
            </div>
            <div className="host-booking-filters">
              <div>
                <label htmlFor={locationId}>Space</label>
                <select
                  id={locationId}
                  value={selectedLocation}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="all">All your spaces</option>
                  {listings.map((listing) => (
                    <option value={listing.id} key={listing.id}>
                      {listing.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={filterId}>Show appointments</label>
                <select
                  id={filterId}
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value as AppointmentFilter);
                    setCancelId(null);
                    setCancelError('');
                  }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {notice && (
              <p className="host-success" role="status">
                {notice}
              </p>
            )}
            {cancelError && (
              <p className="host-cancel-error" role="alert">
                {cancelError}
              </p>
            )}

            {visibleBookings.length ? (
              <div className="host-appointment-list">
                {visibleBookings.map((booking) => (
                  <article
                    className={`host-appointment-card${booking.status === 'cancelled' ? ' host-appointment-cancelled' : ''}`}
                    data-testid="host-appointment-card"
                    key={booking.id}
                  >
                    <div className="host-appointment-main">
                      <span className={`booking-status ${booking.status}`}>
                        <span />
                        {booking.status === 'confirmed'
                          ? 'Confirmed'
                          : 'Cancelled'}
                      </span>
                      <h3>{booking.serviceName}</h3>
                      <p className="host-booking-location">
                        {booking.listingName}
                      </p>
                      <p className="host-booking-date">
                        <CalendarDays size={15} aria-hidden="true" />
                        {dateFormatter.format(
                          new Date(`${booking.date}T12:00:00Z`),
                        )}{' '}
                        at {formatTime(booking.time)}
                      </p>
                      <p>
                        <Clock3 size={15} aria-hidden="true" />
                        {booking.duration} min <span aria-hidden="true">·</span>{' '}
                        Alberta time
                      </p>
                    </div>
                    <div className="host-guest">
                      <p>
                        <UserRound size={15} aria-hidden="true" />
                        <strong>{booking.guestName}</strong>
                      </p>
                      <p>
                        <Mail size={15} aria-hidden="true" />
                        <a href={`mailto:${booking.guestEmail}`}>
                          {booking.guestEmail}
                        </a>
                      </p>
                      <span className="host-booking-reference">
                        Ref. {booking.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="host-booking-actions">
                      <strong>
                        {priceFormatter.format(booking.price)} <span>CAD</span>
                      </strong>
                      <small>No payment collected</small>
                      {booking.status === 'confirmed' &&
                        isUpcoming(booking, clock) &&
                        (cancelId === booking.id ? (
                          <div
                            className="host-cancel-confirm"
                            role="group"
                            aria-label={`Cancel appointment for ${booking.guestName}`}
                          >
                            <p>Cancel this appointment and free up the time?</p>
                            <button
                              className="host-cancel-button"
                              onClick={() => void cancelAppointment(booking.id)}
                              disabled={pendingId !== null}
                            >
                              {pendingId === booking.id
                                ? 'Cancelling…'
                                : 'Confirm cancellation'}
                            </button>
                            <button
                              className="text-button"
                              onClick={() => {
                                setCancelId(null);
                                setCancelError('');
                              }}
                              disabled={pendingId !== null}
                            >
                              Keep appointment
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-button host-cancel-link"
                            disabled={pendingId !== null}
                            onClick={() => {
                              setCancelId(booking.id);
                              setCancelError('');
                              setNotice('');
                            }}
                          >
                            Cancel appointment
                          </button>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="host-empty host-booking-empty">
                <CalendarDays size={28} aria-hidden="true" />
                <h3>
                  {filter === 'upcoming'
                    ? 'Room for your next guest.'
                    : filter === 'past'
                      ? 'No past appointments yet.'
                      : 'No cancelled appointments.'}
                </h3>
                <p>
                  {filter === 'upcoming'
                    ? 'New bookings at your spaces will appear here. You’ll see who’s coming, what they booked, and when.'
                    : 'Appointments matching this view will appear here.'}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
