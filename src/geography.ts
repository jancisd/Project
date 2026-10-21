import type { Listing } from './data';

export type Coordinates = { lat: number; lng: number };

// Leaflet uses [latitude, longitude] tuples. Start near the Alberta listings,
// while leaving the rest of the world available through panning and zooming.
export const ALBERTA_CENTER: [number, number] = [52.2, -114.5];
export const ALBERTA_BOUNDS: [[number, number], [number, number]] = [
  [50.7, -116.7],
  [54.1, -112.7],
];

// These are approximate neighbourhood centres, never verified business
// addresses. All current studios are fictional demo listings.
const neighbourhoods: Record<string, Record<string, Coordinates>> = {
  edmonton: {
    'old strathcona': { lat: 53.518, lng: -113.496 },
    oliver: { lat: 53.542, lng: -113.523 },
    wîhkwêntôwin: { lat: 53.542, lng: -113.523 },
    '124 street': { lat: 53.55, lng: -113.536 },
    ritchie: { lat: 53.51, lng: -113.477 },
    glenora: { lat: 53.545, lng: -113.565 },
    downtown: { lat: 53.544, lng: -113.493 },
  },
  calgary: {
    kensington: { lat: 51.053, lng: -114.086 },
    beltline: { lat: 51.04, lng: -114.075 },
    inglewood: { lat: 51.039, lng: -114.026 },
    downtown: { lat: 51.048, lng: -114.069 },
  },
  canmore: {
    downtown: { lat: 51.089, lng: -115.359 },
  },
};

const cities: Record<string, Coordinates> = {
  edmonton: { lat: 53.5461, lng: -113.4938 },
  calgary: { lat: 51.0447, lng: -114.0719 },
  canmore: { lat: 51.0895, lng: -115.3593 },
};

const demoLocations: Record<string, Coordinates> = {
  'muse-hair-house': neighbourhoods.edmonton['old strathcona'],
  'the-nail-edit': neighbourhoods.edmonton.oliver,
  'ritual-skin-studio': neighbourhoods.calgary.kensington,
  'arch-and-aura': neighbourhoods.edmonton['124 street'],
  'still-massage': neighbourhoods.calgary.beltline,
  'sunday-beauty-room': neighbourhoods.edmonton.ritchie,
  'forma-hair-studio': neighbourhoods.calgary.inglewood,
  'alpine-glow': neighbourhoods.canmore.downtown,
  'bare-and-polished': neighbourhoods.edmonton.glenora,
};

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<Coordinates>;
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lng) &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

export function getListingCoordinates(
  listing: Pick<Listing, 'id' | 'city' | 'neighborhood'> & {
    coordinates?: Coordinates;
  },
): Coordinates | null {
  if (isValidCoordinates(listing.coordinates)) return listing.coordinates;
  if (Object.hasOwn(demoLocations, listing.id))
    return demoLocations[listing.id];

  const city = listing.city.trim().toLocaleLowerCase('en-CA');
  const neighbourhood = listing.neighborhood.trim().toLocaleLowerCase('en-CA');
  const neighbourhoodsInCity = Object.hasOwn(neighbourhoods, city)
    ? neighbourhoods[city]
    : undefined;
  if (
    neighbourhoodsInCity &&
    Object.hasOwn(neighbourhoodsInCity, neighbourhood)
  ) {
    return neighbourhoodsInCity[neighbourhood];
  }
  return Object.hasOwn(cities, city) ? cities[city] : null;
}
