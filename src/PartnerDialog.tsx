import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  MapPin,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { categories } from './data';
import type { Category, Listing } from './data';
import type { Coordinates } from './geography';
import { isWithinCityArea, resolveNeighbourhood } from './neighbourhoods';
import ListingPhotoPicker from './ListingPhotoPicker';
import type { SelectedListingPhoto } from './photo-files';
import './partner-location.css';
import './host-editor.css';

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
  initialListing,
  additionalLocation = false,
}: {
  onClose: () => void;
  onCreate: (
    listing: Listing,
    photos: File[],
    requestId?: string,
  ) => void | Promise<void>;
  cloud?: boolean;
  initialListing?: Listing;
  additionalLocation?: boolean;
}) {
  const editing = Boolean(initialListing);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialListing?.name ?? '');
  const [professional, setProfessional] = useState(
    initialListing?.professional.name ?? '',
  );
  const [category, setCategory] = useState<Exclude<Category, 'All'>>(
    initialListing?.category ?? 'Hair',
  );
  const [city, setCity] = useState(initialListing?.city ?? 'Edmonton');
  const [neighborhood, setNeighborhood] = useState(
    initialListing?.neighborhood ?? '',
  );
  const [serviceName, setServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [description, setDescription] = useState(
    initialListing?.description ?? '',
  );
  const [existingImages, setExistingImages] = useState(() =>
    initialListing ? [...initialListing.images] : [],
  );
  const [existingServices, setExistingServices] = useState(
    () =>
      initialListing?.services.map((service) => ({
        ...service,
        price: String(service.price),
        duration: String(service.duration),
      })) ?? [],
  );
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<SelectedListingPhoto[]>([]);
  const [checkingPhotos, setCheckingPhotos] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const [chosenMatchId, setChosenMatchId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(
    Boolean(initialListing?.coordinates),
  );
  const [manualPoint, setManualPoint] = useState<Coordinates | null>(
    initialListing?.coordinates ?? null,
  );
  const [manualConfirmed, setManualConfirmed] = useState(
    Boolean(initialListing?.coordinates),
  );
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
    if (checkingPhotos) {
      setFormError('Please wait while we check your photos.');
      return;
    }
    if (
      name.trim().length < 2 ||
      professional.trim().length < 2 ||
      !neighborhood.trim() ||
      description.trim().length < 20 ||
      (!editing && (serviceName.trim().length < 2 || !validPrice(price))) ||
      (editing &&
        existingServices.some(
          (service) =>
            service.name.trim().length < 2 ||
            !service.description.trim() ||
            !validPrice(service.price) ||
            !validDuration(service.duration),
        ))
    ) {
      setFormError(
        'Please complete each field, including a description of at least 20 characters.',
      );
      return;
    }
    if (editing && existingImages.length + photos.length === 0) {
      setFormError(
        'Keep at least one photo, or add a new photo before saving your space.',
      );
      return;
    }
    if (existingImages.length + photos.length > 8) {
      setFormError(
        'Keep up to 8 photos in total. Remove a photo before adding more.',
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
          ? `Set and confirm your pin in ${city} using “Use this pin” before ${editing ? 'saving' : 'creating'} your space.`
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
      existingServices,
      existingImages,
      photos.map((photo) => photo.id),
    ]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: `local-${crypto.randomUUID()}` };
    const id = initialListing?.id ?? attempt.current.id;
    const image = editing ? (existingImages[0] ?? '') : pictures[category];
    const listing: Listing = {
      ...initialListing,
      id,
      name: name.trim(),
      category,
      city,
      coordinates: { ...coordinates },
      neighborhood: manualMode ? neighborhood.trim() : matchedPlace!.name,
      description: description.trim(),
      image,
      images: editing ? existingImages : [image, '/images/salon-pink.webp'],
      rating: initialListing?.rating ?? 0,
      reviewCount: initialListing?.reviewCount ?? 0,
      tag: initialListing?.tag ?? 'New on airstethics',
      amenities: initialListing?.amenities ?? [
        'Independent professional',
        'By appointment',
      ],
      services: editing
        ? existingServices.map((service) => ({
            ...service,
            name: service.name.trim(),
            description: service.description.trim(),
            price: Number(service.price),
            duration: Number(service.duration),
          }))
        : [
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
        avatar:
          initialListing?.professional.avatar ?? '/images/professional-1.webp',
      },
      reviews: initialListing?.reviews ?? [],
    };
    submitting.current = true;
    setPending(true);
    setFormError('');
    try {
      await onCreate(
        listing,
        photos.map((photo) => photo.file),
        attempt.current.id,
      );
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

  function validPrice(value: string) {
    const number = Number(value);
    return (
      Number.isFinite(number) &&
      number >= 5 &&
      number <= 1000 &&
      Math.abs(number * 100 - Math.round(number * 100)) < 0.000001
    );
  }

  function validDuration(value: string) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 540;
  }

  function updateService(
    id: string,
    field: 'name' | 'description' | 'price' | 'duration',
    value: string,
  ) {
    setExistingServices((previous) =>
      previous.map((service) =>
        service.id === id ? { ...service, [field]: value } : service,
      ),
    );
    setFormError('');
  }

  return (
    <dialog
      ref={dialogRef}
      className="small-dialog partner-dialog"
      aria-labelledby="partner-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow muted-eyebrow">LET YOUR PEOPLE FIND YOU</span>
        <button
          className="icon-button"
          aria-label="Close partner form"
          onClick={onClose}
          disabled={pending}
        >
          <X size={21} />
        </button>
      </div>
      <h2 id="partner-title">
        {editing ? (
          'Edit your space'
        ) : additionalLocation ? (
          'Add another location'
        ) : (
          <>
            Beautiful things
            <br />
            start with <em>you.</em>
          </>
        )}
      </h2>
      <p className="dialog-intro">
        {editing
          ? 'Keep your space, services, and photos up to date.'
          : additionalLocation
            ? 'Create a separate listing for another space you own.'
            : 'A little preview of what your space could become.'}
      </p>
      <div className="demo-notice">
        <Sparkles size={17} />
        <p>
          {editing
            ? 'Changes apply to future bookings. Existing appointments keep the service, price, and duration agreed when they were booked.'
            : cloud
              ? 'Publish your listing so it appears across devices. No clients will be contacted, and no payment is collected.'
              : 'Create a demo listing on this device. This won’t publish a real business or contact any clients.'}
        </p>
      </div>
      <p className="partner-image-note partner-location-note">
        Find your neighbourhood in the selected city and preview its map pin. If
        the name isn’t clear, we’ll ask you to choose or confirm a location.
      </p>
      <form className="partner-form" onSubmit={submit} aria-busy={pending}>
        <fieldset
          className="partner-controls"
          disabled={pending || checkingPhotos}
        >
          <label>
            Your space’s name
            <input
              required
              minLength={2}
              maxLength={editing ? 200 : 70}
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
                maxLength={editing ? 200 : 60}
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
                maxLength={editing ? 200 : 60}
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
              maxLength={editing ? 10000 : 500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes an appointment with you feel special?"
            />
          </label>
          {editing ? (
            <section
              className="host-editor-services"
              aria-label="Edit services"
            >
              <div className="partner-service-title">
                <Check size={15} />
                <span>Your services</span>
              </div>
              <p className="host-editor-note">
                Changes apply to future bookings. Existing appointments keep
                their booked details.
              </p>
              {existingServices.map((service, index) => (
                <fieldset key={service.id} className="host-editor-service">
                  <legend>Service {index + 1}</legend>
                  <label>
                    Service name
                    <input
                      required
                      minLength={2}
                      maxLength={200}
                      aria-label={`Service ${index + 1} name`}
                      value={service.name}
                      onChange={(event) =>
                        updateService(service.id, 'name', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Service description
                    <textarea
                      required
                      maxLength={5000}
                      rows={2}
                      aria-label={`Service ${index + 1} description`}
                      value={service.description}
                      onChange={(event) =>
                        updateService(
                          service.id,
                          'description',
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <div className="form-two-col">
                    <label>
                      Price (CAD)
                      <input
                        required
                        type="number"
                        min={5}
                        max={1000}
                        step="0.01"
                        aria-label={`Service ${index + 1} price (CAD)`}
                        value={service.price}
                        onChange={(event) =>
                          updateService(service.id, 'price', event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Duration (minutes)
                      <input
                        required
                        type="number"
                        min={1}
                        max={540}
                        step={1}
                        aria-label={`Service ${index + 1} duration (minutes)`}
                        value={service.duration}
                        onChange={(event) =>
                          updateService(
                            service.id,
                            'duration',
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </fieldset>
              ))}
            </section>
          ) : (
            <>
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
            </>
          )}
          {editing && (
            <section
              className="host-editor-gallery"
              aria-label="Current listing photos"
            >
              <div className="listing-photo-heading">
                <h3>Current photos</h3>
                <span>{existingImages.length} saved</span>
              </div>
              <p className="host-editor-note">
                Keep the photos you want, and choose a cover. New uploads appear
                after these photos. To use a new photo as the cover, remove the
                current photos first.
              </p>
              {existingImages.length > 0 ? (
                <ol
                  className="listing-photo-grid"
                  aria-label="Existing listing photos"
                >
                  {existingImages.map((source, index) => (
                    <li
                      key={`${source}:${index}`}
                      className="listing-photo-item"
                      data-testid="existing-listing-photo"
                      data-cover={index === 0}
                    >
                      <div className="listing-photo-preview">
                        <img
                          src={source}
                          alt={`Current listing photo ${index + 1}`}
                        />
                        {index === 0 && (
                          <span className="listing-photo-cover">
                            <Star size={12} fill="currentColor" />
                            Cover photo
                          </span>
                        )}
                      </div>
                      <div className="listing-photo-actions">
                        {index > 0 && (
                          <button
                            type="button"
                            aria-label={`Make existing photo ${index + 1} cover`}
                            onClick={() =>
                              setExistingImages([
                                source,
                                ...existingImages.filter(
                                  (_, photoIndex) => photoIndex !== index,
                                ),
                              ])
                            }
                          >
                            <Star size={13} />
                            Make cover
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove existing photo ${index + 1}`}
                          onClick={() =>
                            setExistingImages((previous) =>
                              previous.filter(
                                (_, photoIndex) => photoIndex !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="host-editor-note">
                  Add at least one new photo below before saving.
                </p>
              )}
            </section>
          )}
          <ListingPhotoPicker
            photos={photos}
            onChange={(next) => {
              setPhotos(next);
              setFormError('');
            }}
            onCheckingChange={setCheckingPhotos}
            cloud={cloud}
            disabled={pending}
            existingCount={existingImages.length}
            editing={editing}
          />
          {formError && (
            <p className="partner-error" role="alert">
              {formError}
            </p>
          )}
          <button
            className="primary-button"
            type="submit"
            disabled={pending || checkingPhotos}
          >
            {pending
              ? 'Saving your space…'
              : editing
                ? 'Save changes'
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
