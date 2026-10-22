import {
  neighbourhoodRecords,
  type NeighbourhoodRecord,
} from './neighbourhood-data';
import type { Coordinates } from './geography';

export type NeighbourhoodResolution = {
  status: 'empty' | 'matched' | 'ambiguous' | 'not-found';
  matches: NeighbourhoodRecord[];
  otherCities: string[];
};

export type CitySearchArea = {
  center: Coordinates;
  bounds: { north: number; south: number; east: number; west: number };
};

// Ignore typographic differences, while keeping actual name differences intact.
// A partial or misspelled name must never silently become a confirmed location.
export function normalizeNeighbourhoodName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-CA')
    .replace(/['’‘ʼ`´]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');
}

function namesFor(record: NeighbourhoodRecord): string[] {
  return [record.name, ...(record.aliases ?? [])].map(
    normalizeNeighbourhoodName,
  );
}

function uniqueRecords(records: readonly NeighbourhoodRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function compareRecords(left: NeighbourhoodRecord, right: NeighbourhoodRecord) {
  return (
    left.name.localeCompare(right.name, 'en-CA', { sensitivity: 'base' }) ||
    left.id.localeCompare(right.id, 'en-CA')
  );
}

function rankedSuggestions(
  query: string,
  city: string,
  records: readonly NeighbourhoodRecord[],
): NeighbourhoodRecord[] {
  const needle = normalizeNeighbourhoodName(query);
  const selectedCity = normalizeNeighbourhoodName(city);
  if (!needle || !selectedCity) return [];

  return uniqueRecords(records)
    .filter(
      (record) => normalizeNeighbourhoodName(record.city) === selectedCity,
    )
    .map((record) => {
      const names = namesFor(record);
      const rank = names.some((name) => name === needle)
        ? 0
        : names.some((name) => name.startsWith(needle))
          ? 1
          : names.some((name) => name.includes(needle))
            ? 2
            : 3;
      return { record, rank };
    })
    .filter(({ rank }) => rank < 3)
    .sort((left, right) =>
      left.rank !== right.rank
        ? left.rank - right.rank
        : compareRecords(left.record, right.record),
    )
    .map(({ record }) => record);
}

export function suggestNeighbourhoods(
  query: string,
  city: string,
  limit = 8,
): NeighbourhoodRecord[] {
  const count = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 8;
  return rankedSuggestions(query, city, neighbourhoodRecords).slice(0, count);
}

// An optional catalogue makes exact-name collisions independently testable and
// supports future city data without changing the matching rules.
export function resolveNeighbourhood(
  query: string,
  city: string,
  records: readonly NeighbourhoodRecord[] = neighbourhoodRecords,
): NeighbourhoodResolution {
  const needle = normalizeNeighbourhoodName(query);
  if (!needle) return { status: 'empty', matches: [], otherCities: [] };

  const selectedCity = normalizeNeighbourhoodName(city);
  const exact = uniqueRecords(
    records.filter(
      (record) =>
        normalizeNeighbourhoodName(record.city) === selectedCity &&
        namesFor(record).includes(needle),
    ),
  ).sort(compareRecords);

  if (exact.length) {
    return {
      status: exact.length === 1 ? 'matched' : 'ambiguous',
      matches: exact,
      otherCities: [],
    };
  }

  const partial = rankedSuggestions(query, city, records);
  const otherCities = [
    ...new Set(
      records
        .filter(
          (record) =>
            normalizeNeighbourhoodName(record.city) !== selectedCity &&
            namesFor(record).includes(needle),
        )
        .map((record) => record.city),
    ),
  ].sort((left, right) => left.localeCompare(right, 'en-CA'));

  return {
    status: partial.length ? 'ambiguous' : 'not-found',
    matches: partial,
    otherCities,
  };
}

// These are approximate search areas, not official municipal boundaries. They
// keep a manually chosen Alberta pin near the city selected in the form.
const citySearchAreas: Record<string, CitySearchArea> = {
  edmonton: {
    center: { lat: 53.5461, lng: -113.4938 },
    bounds: { north: 53.8, south: 53.3, east: -113.2, west: -113.85 },
  },
  calgary: {
    center: { lat: 51.0447, lng: -114.0719 },
    bounds: { north: 51.3, south: 50.8, east: -113.8, west: -114.4 },
  },
  canmore: {
    center: { lat: 51.0895, lng: -115.3593 },
    bounds: { north: 51.18, south: 51, east: -115.2, west: -115.5 },
  },
};

export function getCitySearchArea(city: string): CitySearchArea | null {
  const name = normalizeNeighbourhoodName(city);
  if (!Object.hasOwn(citySearchAreas, name)) return null;
  const area = citySearchAreas[name];
  // Callers may use these objects to initialise map controls; return copies so
  // map libraries cannot mutate the shared matching configuration.
  return { center: { ...area.center }, bounds: { ...area.bounds } };
}

export function isWithinCityArea(point: Coordinates, city: string): boolean {
  const area = getCitySearchArea(city);
  return Boolean(
    area &&
      point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat >= area.bounds.south &&
      point.lat <= area.bounds.north &&
      point.lng >= area.bounds.west &&
      point.lng <= area.bounds.east,
  );
}
