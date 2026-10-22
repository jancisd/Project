import { expect, test } from '@playwright/test';
import {
  getCitySearchArea,
  isWithinCityArea,
  normalizeNeighbourhoodName,
  resolveNeighbourhood,
  suggestNeighbourhoods,
} from '../src/neighbourhoods';
import type { NeighbourhoodRecord } from '../src/neighbourhood-data';

test('the same neighbourhood name is resolved within the selected city', () => {
  const edmonton = resolveNeighbourhood('Parkdale', 'Edmonton');
  const calgary = resolveNeighbourhood('Parkdale', 'Calgary');
  expect(edmonton.status).toBe('matched');
  expect(calgary.status).toBe('matched');
  expect(edmonton.matches).toHaveLength(1);
  expect(calgary.matches).toHaveLength(1);
  expect(edmonton.matches[0].city).toBe('Edmonton');
  expect(calgary.matches[0].city).toBe('Calgary');
  expect(edmonton.matches[0].coordinates).not.toEqual(
    calgary.matches[0].coordinates,
  );
});

test('real shared area names ask which civic neighbourhood the user means', () => {
  const kensington = resolveNeighbourhood('Kensington', 'Calgary');
  expect(kensington.status).toBe('ambiguous');
  expect(kensington.matches.map((match) => match.name).sort()).toEqual([
    'Hillhurst',
    'Sunnyside',
  ]);
  const downtown = resolveNeighbourhood('Downtown', 'Calgary');
  expect(downtown.status).toBe('ambiguous');
  expect(downtown.matches.length).toBeGreaterThan(1);
  expect(downtown.matches.every((match) => match.city === 'Calgary')).toBe(
    true,
  );
});

test('known aliases and typographic differences resolve without changing city', () => {
  const modern = resolveNeighbourhood('  WÎHKWÊNTÔWIN  ', ' eDmOnToN ');
  const unaccented = resolveNeighbourhood('wihkwentowin', 'Edmonton');
  const historical = resolveNeighbourhood('Oliver', 'Edmonton');
  expect(modern.status).toBe('matched');
  expect(unaccented.matches[0].id).toBe(modern.matches[0].id);
  expect(historical.matches[0].id).toBe(modern.matches[0].id);
  expect(resolveNeighbourhood('Old-Strathcona', 'Edmonton').status).toBe(
    'matched',
  );
  expect(resolveNeighbourhood('Town Centre', 'Canmore').status).toBe('matched');
  expect(normalizeNeighbourhoodName(' Queen’s-Park  ')).toBe('queens park');
});

test('partial names and within-city duplicates require explicit clarification', () => {
  const records: NeighbourhoodRecord[] = [
    {
      id: 'north-meadow',
      name: 'Meadow',
      city: 'Edmonton',
      coordinates: { lat: 53.6, lng: -113.5 },
      description: 'Northern fixture district',
    },
    {
      id: 'south-meadow',
      name: 'Meadow',
      city: 'Edmonton',
      coordinates: { lat: 53.4, lng: -113.5 },
      description: 'Southern fixture district',
    },
    {
      id: 'other-city-meadow',
      name: 'Meadow',
      city: 'Calgary',
      coordinates: { lat: 51.05, lng: -114.1 },
    },
  ];
  const duplicate = resolveNeighbourhood('Meadow', 'Edmonton', records);
  expect(duplicate.status).toBe('ambiguous');
  expect(duplicate.matches.map((match) => match.id).sort()).toEqual([
    'north-meadow',
    'south-meadow',
  ]);
  expect(resolveNeighbourhood('Mead', 'Calgary', records).status).toBe(
    'ambiguous',
  );
  expect(resolveNeighbourhood('Meadow', 'Calgary', records).status).toBe(
    'matched',
  );
});

test('unknown places do not resolve to the city centre or another city', () => {
  const wrongCity = resolveNeighbourhood('Ritchie', 'Calgary');
  expect(wrongCity.status).toBe('not-found');
  expect(wrongCity.matches).toEqual([]);
  expect(wrongCity.otherCities).toContain('Edmonton');
  const unknown = resolveNeighbourhood(
    'No Such Neighbourhood 9927',
    'Edmonton',
  );
  expect(unknown).toEqual({
    status: 'not-found',
    matches: [],
    otherCities: [],
  });
  expect(resolveNeighbourhood('  ', 'Edmonton').status).toBe('empty');
  expect(resolveNeighbourhood('Parkdale', 'Unknown City').status).toBe(
    'not-found',
  );
});

test('suggestions stay local and exact entries rank ahead of partial names', () => {
  const suggestions = suggestNeighbourhoods('Downtown', 'Calgary', 2);
  expect(suggestions.length).toBeGreaterThan(0);
  expect(suggestions.length).toBeLessThanOrEqual(2);
  expect(suggestions.every((match) => match.city === 'Calgary')).toBe(true);
  expect(suggestNeighbourhoods('Parkdale', 'Edmonton')[0].name).toBe(
    'Parkdale',
  );
  expect(suggestNeighbourhoods('', 'Edmonton')).toEqual([]);
  expect(suggestNeighbourhoods('Parkdale', 'Edmonton', 0)).toEqual([]);
});

test('manual pin checks keep finite points within the selected city search area', () => {
  const area = getCitySearchArea('Edmonton');
  expect(area).not.toBeNull();
  expect(isWithinCityArea(area!.center, 'Edmonton')).toBe(true);
  expect(isWithinCityArea(area!.center, 'Calgary')).toBe(false);
  expect(isWithinCityArea({ lat: Number.NaN, lng: -113.5 }, 'Edmonton')).toBe(
    false,
  );
  expect(isWithinCityArea({ lat: 53.5, lng: Infinity }, 'Edmonton')).toBe(
    false,
  );
  expect(getCitySearchArea('__proto__')).toBeNull();
  expect(getCitySearchArea('Unknown City')).toBeNull();
  expect(isWithinCityArea(area!.center, 'Unknown City')).toBe(false);
  area!.center.lat = 0;
  area!.bounds.north = 0;
  expect(getCitySearchArea('Edmonton')!.center.lat).toBeGreaterThan(53);
  expect(getCitySearchArea('Edmonton')!.bounds.north).toBeGreaterThan(53);
});
