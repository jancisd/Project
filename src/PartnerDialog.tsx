import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, MapPin, Sparkles, X } from 'lucide-react';
import { categories } from './data';
import type { Category, Listing } from './data';
import type { Coordinates } from './geography';
import { isWithinCityArea, resolveNeighbourhood } from './neighbourhoods';
import './partner-location.css';

const LocationPicker = lazy(() => import('./LocationPicker'));

const pictures: Record<string, string> = {
  Hair: '/images/hair.webp',
  Nails: '/images/nails.webp',
  Skin: '/images/facial.webp',
  'Brows & lashes': '/images/brows.webp',
  Massage: '/images/salon-interior.webp',
  Makeup: '/images/makeup.webp',
};

export default function PartnerDialog({
  onClose,
  onCreate,
  cloud = false,
}: {
  onClose: () => void;
  onCreate: (listing: Listing) => void | Promise<void>;
  cloud?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [professional, setProfessional] = useState('');
  const [category, setCategory] = useState<Exclude<Category, 'All'>>('Hair');
  const [city, setCity] = useState('Edmonton');
  const [neighborhood, setNeighborhood] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const [chosenMatchId, setChosenMatchId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPoint, setManualPoint] = useState<Coordinates | null>(null);
  const [manualConfirmed, setManualConfirmed] = useState(false);
  const resolution = useMemo(
    () => resolveNeighbourhood(neighborhood, city),
    [neighborhood, city],
  );
  const matchedPlace =
    resolution.status === 'matched'
      ? resolution.matches[0]
      : resolution.matches.find((match) => match.id === chosenMatchId);

  function resetLocation() {
    setChosenMatchId(null);
    setManualMode(false);
    setManualPoint(null);
    setManualConfirmed(false);
    setFormError('');
  }
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (
      name.trim().length < 2 ||
      professional.trim().length < 2 ||
      !neighborhood.trim() ||
      serviceName.trim().length < 2 ||
      description.trim().length < 20 ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 5 ||
      Number(price) > 1000
    ) {
      setFormError(
        'Please complete each field, including a description of at least 20 characters.',
      );
      return;
    }
    const coordinates = manualMode
      ? manualConfirmed && manualPoint && isWithinCityArea(manualPoint, city)
        ? manualPoint
        : null
      : matchedPlace?.coordinates;
    if (!coordinates) {
      setFormError(
        manualMode
          ? `Set and confirm your pin in ${city} using “Use this pin” before creating your space.`
          : resolution.status === 'ambiguous'
            ? `Choose which neighbourhood in ${city} you mean, or set and confirm its location on the map.`
            : `We couldn’t find that neighbourhood in ${city}. Check the name and city, or set and confirm its location on the map.`,
      );
      neighborhoodRef.current?.focus();
      return;
    }
    const signature = JSON.stringify([
      name.trim(),
      professional.trim(),
      category,
      city,
      manualMode ? neighborhood.trim() : matchedPlace!.name,
      coordinates,
      description.trim(),
      serviceName.trim(),
      price,
      duration,
    ]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: `local-${crypto.randomUUID()}` };
    const id = attempt.current.id;
    const image = pictures[category];
    const listing: Listing = {
      id,
      name: name.trim(),
      category,
      city,
      coordinates: { ...coordinates },
      neighborhood: manualMode ? neighborhood.trim() : matchedPlace!.name,
      description: description.trim(),
      image,
      images: [image, '/images/salon-pink.webp'],
      rating: 0,
      reviewCount: 0,
      tag: 'New on airstethics',
      amenities: ['Independent professional', 'By appointment'],
      services: [
        {
          id: `${id}-service`,
          name: serviceName.trim(),
          description: 'Your signature service, thoughtfully delivered.',
          price: Number(price),
          duration: Number(duration),
        },
      ],
      professional: {
        name: professional.trim(),
        title: `${category} professional`,
        avatar: '/images/professional-1.webp',
      },
      reviews: [],
    };
    submitting.current = true;
    setPending(true);
    setFormError('');
    try {
      await onCreate(listing);
    } catch (reason) {
      if (mounted.current)
        setFormError(
          reason instanceof Error
            ? reason.message
            : 'We couldn’t save your space. Please try again.',
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="small-dialog partner-dialog"
      aria-labelledby="partner-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow muted-eyebrow">LET YOUR PEOPLE FIND YOU</span>
        <button
          className="icon-button"
          aria-label="Close partner form"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      <h2 id="partner-title">
        Beautiful things
        <br />
        start with <em>you.</em>
      </h2>
      <p className="dialog-intro">
        A little preview of what your space could become.
      </p>
      <div className="demo-notice">
        <Sparkles size={17} />
        <p>
          {cloud
            ? 'Publish your listing so it appears across devices. No clients will be contacted, and no payment is collected.'
            : 'Create a demo listing on this device. This won’t publish a real business or contact any clients.'}
        </p>
      </div>
      <p className="partner-image-note partner-location-note">
        Find your neighbourhood in the selected city and preview its map pin. If
        the name isn’t clear, we’ll ask you to choose or confirm a location.
      </p>
      <form className="partner-form" onSubmit={submit} aria-busy={pending}>
        <fieldset className="partner-controls" disabled={pending}>
          <label>
            Your space’s name
            <input
              required
              minLength={2}
              maxLength={70}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Sunday Studio"
            />
          </label>
          <div className="form-two-col">
            <label>
              Your name
              <input
                required
                minLength={2}
                maxLength={60}
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
                placeholder="The person behind the beauty"
              />
            </label>
            <label>
              Your specialty
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Exclude<Category, 'All'>)
                }
              >
                {categories
                  .filter((c) => c !== 'All')
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
            </label>
          </div>
          <div className="form-two-col">
            <label>
              <span>
                <MapPin size={13} />
                City
              </span>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  resetLocation();
                }}
              >
                <option>Edmonton</option>
                <option>Calgary</option>
                <option>Canmore</option>
              </select>
            </label>
            <label>
              Neighbourhood
              <input
                ref={neighborhoodRef}
                required
                maxLength={60}
                value={neighborhood}
                onChange={(e) => {
                  setNeighborhood(e.target.value);
                  resetLocation();
                }}
                placeholder="e.g. Old Strathcona"
                aria-describedby="neighbourhood-help"
              />
            </label>
          </div>
          <div className="partner-location" aria-label="Neighbourhood location">
            <p id="neighbourhood-help" className="partner-location-help">
              Neighbourhoods are matched within {city}, Alberta. The pin shows
              an area, not a verified business address.
            </p>
            {neighborhood.trim() && !manualMode && (
              <>
                {matchedPlace ? (
                  <p className="partner-location-matched" role="status">
                    <Check size={15} />
                    <span>
                      Matched:{' '}
                      <strong>
                        {matchedPlace.name}, {matchedPlace.city}
                      </strong>
                    </span>
                  </p>
                ) : resolution.status === 'ambiguous' ? (
                  <p className="partner-location-prompt" role="status">
                    {resolution.matches.length > 1
                      ? 'Several neighbourhoods match.'
                      : 'Did you mean this neighbourhood?'}{' '}
                    Choose the right one in {city}.
                  </p>
                ) : (
                  <p className="partner-location-prompt" role="status">
                    We couldn’t find “{neighborhood.trim()}” in {city}. Check
                    the spelling and city, or set its location on the map.
                  </p>
                )}
                {resolution.otherCities.length > 0 && !matchedPlace && (
                  <p className="partner-location-help">
                    That name is listed in {resolution.otherCities.join(' or ')}
                    . Change the City field if that’s the place you meant.
                  </p>
                )}
                {resolution.status === 'ambiguous' && (
                  <div
                    className="partner-location-options"
                    role="group"
                    aria-label={`Neighbourhood matches in ${city}`}
                  >
                    {resolution.matches.slice(0, 8).map((match) => (
                      <button
                        type="button"
                        key={match.id}
                        aria-label={`Use ${match.name}, ${match.city}`}
                        aria-pressed={matchedPlace?.id === match.id}
                        onClick={() => {
                          setChosenMatchId(match.id);
                          setFormError('');
                        }}
                      >
                        <MapPin size={15} />
                        <span>
                          <strong>{match.name}</strong>
                          <small>
                            {match.city}, Alberta
                            {match.description ? ` · ${match.description}` : ''}
                          </small>
                        </span>
                        {matchedPlace?.id === match.id && <Check size={15} />}
                      </button>
                    ))}
                    {resolution.matches.length > 8 && (
                      <p className="partner-location-help">
                        Showing 8 of {resolution.matches.length} matches. Keep
                        typing to narrow your neighbourhood.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {(manualMode || matchedPlace) && (
              <div className="partner-location-preview">
                <Suspense
                  fallback={
                    <div className="partner-location-loading" role="status">
                      Preparing your location preview…
                    </div>
                  }
                >
                  <LocationPicker
                    city={city}
                    coordinates={
                      manualMode
                        ? manualPoint
                        : (matchedPlace?.coordinates ?? null)
                    }
                    editable={manualMode}
                    label={
                      manualMode
                        ? `Set your location in ${city}`
                        : `${matchedPlace?.name}, ${city}`
                    }
                    onChange={(point) => {
                      if (manualMode) {
                        setManualPoint(point);
                        setManualConfirmed(false);
                        setFormError('');
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}
            {manualMode ? (
              <div className="partner-location-manual">
                <p className="partner-location-help">
                  Show us where your space is in {city}: click the map, drag the
                  pin, or enter its coordinates. Then confirm the pin below.
                </p>
                {manualConfirmed ? (
                  <p className="partner-location-matched" role="status">
                    <Check size={15} />
                    Pin confirmed in {city}.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="partner-location-confirm"
                    disabled={!manualPoint}
                    onClick={() => {
                      if (manualPoint && isWithinCityArea(manualPoint, city)) {
                        setManualConfirmed(true);
                        setFormError('');
                      }
                    }}
                  >
                    <Check size={15} />
                    Use this pin
                  </button>
                )}
                <button
                  type="button"
                  className="partner-location-link"
                  onClick={() => {
                    setManualMode(false);
                    setManualPoint(null);
                    setManualConfirmed(false);
                    setFormError('');
                  }}
                >
                  Back to neighbourhood matches
                </button>
              </div>
            ) : (
              neighborhood.trim() && (
                <button
                  type="button"
                  className="partner-location-link"
                  onClick={() => {
                    setManualMode(true);
                    setManualPoint(null);
                    setManualConfirmed(false);
                    setFormError('');
                  }}
                >
                  <MapPin size={13} />
                  Set location on map
                </button>
              )
            )}
          </div>
          <label>
            Tell us a little about your space
            <textarea
              required
              minLength={20}
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes an appointment with you feel special?"
            />
          </label>
          <div className="partner-service-title">
            <Check size={15} />
            <span>Start with your signature service</span>
          </div>
          <label>
            Service name
            <input
              required
              minLength={2}
              maxLength={70}
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Signature cut & style"
            />
          </label>
          <div className="form-two-col">
            <label>
              Price (CAD)
              <input
                required
                type="number"
                min="5"
                max="1000"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="85"
              />
            </label>
            <label>
              Duration
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {[15, 30, 45, 60, 90, 120, 150, 180].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="partner-image-note">
            We’ll use a sample {category.toLowerCase()} photo for your preview.
          </p>
          {formError && (
            <p className="partner-error" role="alert">
              {formError}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending
              ? 'Saving your space…'
              : cloud
                ? 'Publish my space'
                : 'Create my demo space'}{' '}
            <ArrowRight size={17} />
          </button>
        </fieldset>
      </form>
    </dialog>
  );
}
