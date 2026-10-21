import { categories } from './data';
import type { Listing, Service } from './data';
import type { Booking } from './types';

type RecordValue = Record<string, unknown>;
type Guard<T> = (value: unknown) => value is T;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown, max = 500): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const isDuration = (value: unknown): value is number =>
  inRange(value, 1, 1440) && Number.isInteger(value);

const isPrice = (value: unknown): value is number =>
  inRange(value, 0.01, 10000);

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

function isTimestamp(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isArrayOf<T>(
  value: unknown,
  guard: Guard<T>,
  max = 1000,
): value is T[] {
  return Array.isArray(value) && value.length <= max && value.every(guard);
}

export function isStringArray(value: unknown): value is string[] {
  return isArrayOf(value, (entry): entry is string => isText(entry, 2048));
}

function isService(value: unknown): value is Service {
  return (
    isRecord(value) &&
    isText(value.id, 256) &&
    isText(value.name, 200) &&
    isText(value.description, 5000) &&
    isDuration(value.duration) &&
    isPrice(value.price)
  );
}

function isReview(value: unknown): value is Listing['reviews'][number] {
  return (
    isRecord(value) &&
    isText(value.id, 256) &&
    isText(value.name, 200) &&
    isText(value.date, 100) &&
    inRange(value.rating, 1, 5) &&
    isText(value.text, 10000)
  );
}

function isListing(value: unknown): value is Listing {
  if (!isRecord(value)) return false;
  return (
    isText(value.id, 256) &&
    isText(value.name, 200) &&
    typeof value.category === 'string' &&
    value.category !== 'All' &&
    categories.some((category) => category === value.category) &&
    isText(value.neighborhood, 200) &&
    isText(value.city, 200) &&
    (value.coordinates === undefined ||
      (isRecord(value.coordinates) &&
        inRange(value.coordinates.lat, -90, 90) &&
        inRange(value.coordinates.lng, -180, 180))) &&
    isText(value.description, 10000) &&
    isText(value.image, 2048) &&
    isStringArray(value.images) &&
    value.images.length > 0 &&
    value.images.length <= 100 &&
    inRange(value.rating, 0, 5) &&
    inRange(value.reviewCount, 0, 10000000) &&
    Number.isInteger(value.reviewCount) &&
    isText(value.tag, 200) &&
    isStringArray(value.amenities) &&
    value.amenities.length <= 100 &&
    isArrayOf(value.services, isService, 100) &&
    value.services.length > 0 &&
    isRecord(value.professional) &&
    isText(value.professional.name, 200) &&
    isText(value.professional.title, 200) &&
    isText(value.professional.avatar, 2048) &&
    isArrayOf(value.reviews, isReview)
  );
}

function isBooking(value: unknown): value is Booking {
  return (
    isRecord(value) &&
    isText(value.id, 256) &&
    isText(value.listingId, 256) &&
    isText(value.listingName, 200) &&
    isText(value.listingImage, 2048) &&
    isText(value.city, 200) &&
    isText(value.serviceName, 200) &&
    isDate(value.date) &&
    isTime(value.time) &&
    isDuration(value.duration) &&
    isPrice(value.price) &&
    isText(value.guestName, 200) &&
    isText(value.guestEmail, 254) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.guestEmail) &&
    isTimestamp(value.createdAt) &&
    (value.status === 'confirmed' || value.status === 'cancelled')
  );
}

export function isBookingArray(value: unknown): value is Booking[] {
  return isArrayOf(value, isBooking, 10000);
}

export function isListingArray(value: unknown): value is Listing[] {
  return isArrayOf(value, isListing, 1000);
}

// Local storage may be unavailable or manually edited. Treat stored JSON as
// untrusted data and restore defaults instead of letting it break rendering.
export function readStored<T>(key: string, fallback: T, guard: Guard<T>): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const value: unknown = JSON.parse(stored);
    return guard(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
