export const MAX_LISTING_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const LISTING_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type SelectedListingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function validatePhotoFiles(files: File[], existingCount = 0) {
  if (files.length + existingCount > MAX_LISTING_PHOTOS)
    throw new Error('Add up to 8 photos. Remove a photo before adding more.');
  for (const file of files) {
    if (!LISTING_PHOTO_TYPES.includes(file.type))
      throw new Error(
        `${file.name} isn’t supported. Choose a JPEG, PNG, or WebP photo.`,
      );
    if (!file.size || file.size > MAX_PHOTO_BYTES)
      throw new Error(`${file.name} must be a photo smaller than 5 MB.`);
  }
}
