import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import {
  LISTING_PHOTO_TYPES,
  MAX_LISTING_PHOTOS,
  validatePhotoFiles,
  type SelectedListingPhoto,
} from './photo-files';
import './listing-photos.css';

type Props = {
  photos: SelectedListingPhoto[];
  onChange: (photos: SelectedListingPhoto[]) => void;
  onCheckingChange: (checking: boolean) => void;
  cloud: boolean;
  disabled?: boolean;
};

export default function ListingPhotoPicker({
  photos,
  onChange,
  onCheckingChange,
  cloud,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const allocatedUrls = useRef(new Set<string>());
  const mounted = useRef(true);
  const checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const helpId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const url of allocatedUrls.current) URL.revokeObjectURL(url);
      allocatedUrls.current.clear();
    };
  }, []);

  function release(url: string) {
    URL.revokeObjectURL(url);
    allocatedUrls.current.delete(url);
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || checkingRef.current || disabled) return;
    setError('');
    const added: SelectedListingPhoto[] = [];
    try {
      validatePhotoFiles(files, photos.length);
      checkingRef.current = true;
      setChecking(true);
      onCheckingChange(true);
      for (const file of files) {
        const previewUrl = URL.createObjectURL(file);
        allocatedUrls.current.add(previewUrl);
        const image = new Image();
        image.src = previewUrl;
        try {
          await image.decode();
          if (!image.naturalWidth || !image.naturalHeight) throw new Error();
        } catch {
          release(previewUrl);
          throw new Error(
            `We couldn’t read ${file.name}. Please choose another photo.`,
          );
        }
        if (!mounted.current) {
          release(previewUrl);
          return;
        }
        added.push({ id: crypto.randomUUID(), file, previewUrl });
      }
      if (mounted.current) onChange([...photos, ...added]);
    } catch (cause) {
      for (const photo of added) release(photo.previewUrl);
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'We couldn’t add these photos. Please try again.',
        );
    } finally {
      checkingRef.current = false;
      if (mounted.current) {
        setChecking(false);
        onCheckingChange(false);
      }
    }
  }

  function removePhoto(photo: SelectedListingPhoto) {
    if (checkingRef.current || disabled) return;
    onChange(photos.filter((item) => item.id !== photo.id));
    release(photo.previewUrl);
    setError('');
  }

  function makeCover(photo: SelectedListingPhoto) {
    if (checkingRef.current || disabled) return;
    onChange([photo, ...photos.filter((item) => item.id !== photo.id)]);
    setError('');
  }

  return (
    <section className="listing-photo-picker" aria-labelledby={titleId}>
      <div className="listing-photo-heading">
        <h3 id={titleId}>Photos of your space</h3>
        <span>
          {photos.length} / {MAX_LISTING_PHOTOS}
        </span>
      </div>
      <p className="listing-photo-help" id={helpId}>
        Add up to 8 JPEG, PNG, or WebP photos, under 5 MB each. Your first photo
        is the cover.
      </p>
      <input
        className="listing-photo-input"
        ref={inputRef}
        type="file"
        multiple
        accept={LISTING_PHOTO_TYPES.join(',')}
        aria-label="Listing photos"
        aria-describedby={helpId}
        tabIndex={-1}
        disabled={disabled || checking || photos.length >= MAX_LISTING_PHOTOS}
        onChange={addPhotos}
      />
      {photos.length > 0 && (
        <ol className="listing-photo-grid" aria-label="Selected listing photos">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="listing-photo-item"
              data-testid="listing-photo-preview"
              data-cover={index === 0}
            >
              <div className="listing-photo-preview">
                <img
                  src={photo.previewUrl}
                  alt={`Preview of ${photo.file.name}`}
                />
                {index === 0 && (
                  <span className="listing-photo-cover">
                    <Star size={12} fill="currentColor" />
                    Cover photo
                  </span>
                )}
              </div>
              <span className="listing-photo-name" title={photo.file.name}>
                {photo.file.name}
              </span>
              <div className="listing-photo-actions">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(photo)}
                    disabled={disabled || checking}
                    aria-label={`Make ${photo.file.name} cover`}
                  >
                    <Star size={13} />
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo)}
                  disabled={disabled || checking}
                  aria-label={`Remove ${photo.file.name}`}
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button
        className="listing-photo-add"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || checking || photos.length >= MAX_LISTING_PHOTOS}
      >
        <ImagePlus size={18} />
        Add photos
      </button>
      {checking && (
        <p className="listing-photo-help" role="status">
          Checking your photos…
        </p>
      )}
      {error && (
        <p className="listing-photo-error" role="alert">
          {error}
        </p>
      )}
      <p className="listing-photo-help">
        {cloud
          ? 'Your photos upload when you publish.'
          : 'Your photos are saved with this browser’s demo listing.'}{' '}
        If you skip photos, we’ll use sample images.
      </p>
    </section>
  );
}
