import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Heart,
  MapPin,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Listing } from './data';
import './listing-details.css';

type Props = {
  listing: Listing;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onBook: () => void;
};

const price = (value: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);

export default function ListingDetails({
  listing,
  saved,
  onSave,
  onClose,
  onBook,
}: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gallery = useMemo(
    () => [...new Set([listing.image, ...listing.images])],
    [listing.image, listing.images],
  );
  const [photo, setPhoto] = useState({
    listingId: listing.id,
    image: listing.image,
  });
  const activePhoto =
    photo.listingId === listing.id && gallery.includes(photo.image)
      ? photo.image
      : listing.image;
  const startingPrice = Math.min(...listing.services.map((item) => item.price));

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [listing.id]);

  return (
    <section
      className="listing-details"
      data-testid="listing-details"
      aria-label={`Details for ${listing.name}`}
    >
      <div className="listing-details-toolbar">
        <button
          className="listing-details-back"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft size={16} />
          Back to results
        </button>
        <button
          className={`listing-details-save${saved ? ' is-saved' : ''}`}
          type="button"
          aria-label={`${saved ? 'Unsave' : 'Save'} ${listing.name}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <header className="listing-details-header">
        <div className="listing-details-eyebrow">
          <span>{listing.category}</span>
          <span aria-hidden="true">·</span>
          <span>{listing.tag}</span>
        </div>
        <h2 ref={titleRef} tabIndex={-1}>
          {listing.name}
        </h2>
        <div className="listing-details-meta">
          <span>
            <MapPin size={14} />
            {listing.neighborhood}, {listing.city}
          </span>
          <span className="listing-details-rating">
            {listing.reviewCount > 0 ? (
              <>
                <Star size={13} fill="currentColor" />
                <strong>{listing.rating.toFixed(2)}</strong>
                <span>({listing.reviewCount} sample reviews)</span>
              </>
            ) : (
              <>
                <Sparkles size={13} />
                New on airstethics
              </>
            )}
          </span>
        </div>
      </header>

      <div className="listing-details-gallery">
        <div className="listing-details-main-photo">
          <img src={activePhoto} alt={`Photo of ${listing.name}`} />
          {gallery.length > 1 && (
            <span className="listing-details-photo-count">
              {gallery.indexOf(activePhoto) + 1} / {gallery.length}
            </span>
          )}
        </div>
        {gallery.length > 1 && (
          <div
            className="listing-details-thumbnails"
            role="group"
            aria-label={`Photo gallery for ${listing.name}`}
          >
            {gallery.map((image, index) => (
              <button
                className={image === activePhoto ? 'is-active' : ''}
                type="button"
                key={image}
                aria-label={`Show photo ${index + 1} of ${listing.name}`}
                aria-pressed={image === activePhoto}
                onClick={() => setPhoto({ listingId: listing.id, image })}
              >
                <img src={image} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="listing-details-location-note">
        <MapPin size={14} />
        <span>
          {listing.isDemo === false
            ? 'Highlighted on the map. This pin shows the selected neighbourhood or confirmed location; the business address has not been verified.'
            : 'Highlighted on the map. This is an approximate demo location, not a verified business address.'}
        </span>
      </p>

      <div className="listing-details-booking">
        <div>
          <span>Make a little time for you</span>
          <p>
            From <strong>{price(startingPrice)}</strong>{' '}
            <span>CAD / service</span>
          </p>
        </div>
        <button type="button" onClick={onBook}>
          Choose a service &amp; time
          <ArrowRight size={16} />
        </button>
      </div>

      <section
        className="listing-details-section"
        aria-label="About this space"
      >
        <h3>A little about this space.</h3>
        <p className="listing-details-description">{listing.description}</p>
        <div className="listing-details-professional">
          <img
            src={listing.professional.avatar}
            alt="Illustrative professional portrait"
            loading="lazy"
          />
          <div>
            <strong>Meet {listing.professional.name}</strong>
            <span>{listing.professional.title}</span>
          </div>
          <span className="listing-details-demo-profile">
            <Sparkles size={13} />
            {listing.isDemo === false ? 'Unverified profile' : 'Demo profile'}
          </span>
        </div>
        {listing.amenities.length > 0 && (
          <ul
            className="listing-details-amenities"
            aria-label="Studio amenities"
          >
            {listing.amenities.map((amenity) => (
              <li key={amenity}>
                <Check size={14} />
                {amenity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="listing-details-section"
        aria-label="Available services"
      >
        <div className="listing-details-section-heading">
          <h3>Your next little reset.</h3>
          <span>
            {listing.services.length}{' '}
            {listing.services.length === 1 ? 'service' : 'services'}
          </span>
        </div>
        <ul className="listing-details-services">
          {listing.services.map((service) => (
            <li key={service.id}>
              <div className="listing-details-service-heading">
                <h4>{service.name}</h4>
                <strong>
                  {price(service.price)} <span>CAD</span>
                </strong>
              </div>
              <p>{service.description}</p>
              <span className="listing-details-duration">
                <Clock3 size={13} />
                {service.duration} minutes
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="listing-details-section"
        aria-label="Sample studio reviews"
      >
        <h3>A few kind words.</h3>
        <p className="listing-details-review-note">
          Sample reviews for this fictional studio.
        </p>
        {listing.reviews.length > 0 ? (
          <div className="listing-details-reviews">
            {listing.reviews.map((review) => (
              <article key={review.id}>
                <div>
                  <strong>{review.name}</strong>
                  <span>
                    <Star size={12} fill="currentColor" />
                    {review.rating.toFixed(1)}
                  </span>
                </div>
                <p>“{review.text}”</p>
                <small>{review.date}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="listing-details-no-reviews">
            New here, and ready for your first little reset. No sample reviews
            have been added yet.
          </p>
        )}
      </section>

      <p className="listing-details-demo-note">
        {listing.isDemo === false
          ? 'Bookings are recorded in your account. Provider verification, payments, and appointment notifications are not yet available.'
          : 'This is a demo studio. No real reservation, payment, or message to a professional will be made.'}
      </p>
    </section>
  );
}
