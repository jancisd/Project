import { supabase } from './backend';

export const PHOTO_BUCKET = 'listing-photos';
export const MAX_LISTING_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const mimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxPreparedBytes = 768 * 1024;

function photoError() {
  return new Error(
    'We couldn’t prepare that photo. Please choose a JPEG, PNG, or WebP image.',
  );
}

// Re-encoding keeps uploads small and removes metadata such as camera location.
async function preparePhoto(file: File): Promise<Blob> {
  if (!mimeTypes.has(file.type))
    throw new Error('Choose JPEG, PNG, or WebP photos.');
  if (!file.size || file.size > MAX_PHOTO_BYTES)
    throw new Error('Each photo must be no larger than 5 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw photoError();
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 60000000
    )
      throw new Error(
        'That photo is too large to process. Please choose a smaller image.',
      );
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw photoError();
    for (const [edge, quality] of [
      [1600, 0.82],
      [1280, 0.72],
      [960, 0.65],
    ]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(photoError())),
          'image/webp',
          quality,
        );
      });
      if (mimeTypes.has(blob.type) && blob.size <= maxPreparedBytes)
        return blob;
    }
    throw new Error(
      'That photo is too large to save. Please choose a smaller image.',
    );
  } finally {
    bitmap.close();
  }
}

async function prepareGallery(files: File[]): Promise<Blob[]> {
  if (files.length > MAX_LISTING_PHOTOS)
    throw new Error('Add up to 8 photos per listing.');
  const prepared: Blob[] = [];
  for (const file of files) prepared.push(await preparePhoto(file));
  return prepared;
}

export async function demoPhotoSources(files: File[]): Promise<string[]> {
  const gallery = await prepareGallery(files);
  if (
    gallery.reduce((total, photo) => total + photo.size, 0) >
    2.5 * 1024 * 1024
  )
    throw new Error(
      'These photos are too large for the browser demo. Please use fewer or smaller photos.',
    );
  return Promise.all(
    gallery.map(
      (photo) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(photoError());
          reader.onerror = () => reject(photoError());
          reader.readAsDataURL(photo);
        }),
    ),
  );
}

export async function uploadListingPhotos(
  userId: string,
  requestId: string,
  files: File[],
  assertAccount: () => void,
): Promise<string[]> {
  if (!supabase) throw new Error('Photo uploads require a connected account.');
  const requestFolder = requestId.replace(/^local-/, '');
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(userId) || !uuid.test(requestFolder))
    throw new Error(
      'We couldn’t start the photo upload. Please reopen the form and try again.',
    );
  const photos = await prepareGallery(files);
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const uploaded: string[] = [];
  const sources: string[] = [];
  try {
    for (const photo of photos) {
      assertAccount();
      const extension =
        photo.type === 'image/webp'
          ? 'webp'
          : photo.type === 'image/png'
            ? 'png'
            : 'jpg';
      const path = `${userId}/${requestFolder}/${crypto.randomUUID()}.${extension}`;
      const { data, error } = await bucket.upload(path, photo, {
        contentType: photo.type,
        cacheControl: '3600',
        upsert: false,
      });
      if (error || !data) {
        if (
          String(error?.statusCode) === '404' ||
          /bucket.*not found/i.test(error?.message ?? '')
        )
          throw new Error(
            'Photo uploads aren’t available yet. Please contact the site owner.',
          );
        throw new Error(
          'We couldn’t upload your photos. Your details are still here; please try again.',
        );
      }
      uploaded.push(data.path);
      sources.push(bucket.getPublicUrl(data.path).data.publicUrl);
    }
    assertAccount();
    return sources;
  } catch (error) {
    // No listing request has started yet, so partial uploads can be removed.
    // Once a listing save starts, keep its photos for an idempotent retry: a
    // lost response can still mean the database committed the listing.
    if (uploaded.length) {
      try {
        await bucket.remove(uploaded);
      } catch {
        /* Retry can proceed even if cleanup is offline. */
      }
    }
    throw error;
  }
}
