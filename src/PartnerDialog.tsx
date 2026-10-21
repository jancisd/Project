import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, MapPin, Sparkles, X } from 'lucide-react';
import { categories } from './data';
import type { Category, Listing } from './data';

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
}: {
  onClose: () => void;
  onCreate: (listing: Listing) => void;
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
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
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
    const id = `local-${crypto.randomUUID()}`;
    const image = pictures[category];
    onCreate({
      id,
      name: name.trim(),
      category,
      city,
      neighborhood: neighborhood.trim(),
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
    });
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
          Create a demo listing on this device. This won’t publish a real
          business or contact any clients.
        </p>
      </div>
      <form className="partner-form" onSubmit={submit}>
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
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option>Edmonton</option>
              <option>Calgary</option>
              <option>Canmore</option>
            </select>
          </label>
          <label>
            Neighbourhood
            <input
              required
              maxLength={60}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g. Old Strathcona"
            />
          </label>
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
        <button className="primary-button" type="submit">
          Create my demo space <ArrowRight size={17} />
        </button>
      </form>
    </dialog>
  );
}
