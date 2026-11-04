# Neighbourhood lookup data

The local lookup in `src/neighbourhood-data.ts` contains **386 Edmonton** and
**242 Calgary** named neighbourhood/community records, plus one approximate
Canmore downtown record. It does not make requests to an external geocoder.

This is **629 records in total**. It is used to turn a neighbourhood choice in a
host form into a consistent map point; it is not a street-address search,
provider verification service, or directory of businesses.

Read the [main README](../../README.md) for the full app,
[application function guide](../../src/README.md) for other functions, and
[map README](../maps/README.md) for price pins, clusters, area filters, map
backgrounds, and legacy listing-coordinate fallback.

## Record shape and where it is used

[`neighbourhood-data.ts`](../../src/neighbourhood-data.ts) exports the
`NeighbourhoodRecord` type and `neighbourhoodRecords` array:

```ts
type NeighbourhoodRecord = {
  id: string;
  name: string;
  city: 'Edmonton' | 'Calgary' | 'Canmore';
  coordinates: { lat: number; lng: number };
  aliases?: string[];
  description?: string;
};
```

`id` identifies a source-derived area record, `name` is its canonical display
name, `city` scopes the search, and `coordinates` is its representative point.
Aliases are additional accepted names, not separate invented neighbourhoods.
Descriptions can explain a choice when a name is ambiguous. These are local
application data: a host's typed query is compared in the browser, not sent to
a third-party geocoding API.

[`PartnerDialog.tsx`](../../src/PartnerDialog.tsx) uses the lookup when creating
the first space, adding another location, and changing an existing space's
location. [`geography.ts`](../../src/geography.ts) also uses it when resolving
coordinates for old listings displayed on the discovery map.

## Matching functions and exact rules

The matching functions live in
[`neighbourhoods.ts`](../../src/neighbourhoods.ts). Names are normalized for
comparison; the saved neighbourhood display name comes from the selected record
unless the host explicitly uses a manual pin.

| Function                                                            | Inputs and result                             | Specific behaviour                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizeNeighbourhoodName(value)`                                 | String → comparison string                    | Applies Unicode `NFKD`, removes combining accents, lowercases with `en-CA`, removes apostrophes, turns remaining non-letter/non-number separators into spaces, trims, and collapses repeated spaces. For example, `Queen’s-Park` becomes `queens park`.             |
| `namesFor(record)`                                                  | One record → normalized names                 | Compares its canonical `name` plus every alias using the same normalization. This is an internal helper.                                                                                                                                                            |
| `uniqueRecords(records)`                                            | Array → records deduplicated by `id`          | Multiple alias matches for the same record do not become an artificial ambiguity. This is an internal helper.                                                                                                                                                       |
| `compareRecords(left, right)`                                       | Two records → sort order                      | Sorts canonical names using a case-insensitive `en-CA` comparison, then IDs for a stable tie-break.                                                                                                                                                                 |
| `rankedSuggestions(query, city, records)`                           | Query/city/catalogue → ranked local records   | Filters by city first, ranks exact names/aliases before starts-with matches, then contains matches, and omits other records. This is an internal helper.                                                                                                            |
| `suggestNeighbourhoods(query, city, limit = 8)`                     | Query/city → suggestions                      | Returns ranked local records up to a floored, non-negative finite limit; a non-finite limit uses `8`. Suggestions do not themselves confirm a location.                                                                                                             |
| `resolveNeighbourhood(query, city, records = neighbourhoodRecords)` | Query/city → `{status, matches, otherCities}` | Accepts a unique exact normalized name/alias match, asks for a choice when exact or partial matches are ambiguous, and reports other-city exact matches only when there is no exact local match. The optional catalogue parameter supports isolated matching tests. |
| `getCitySearchArea(city)`                                           | City → `{center, bounds}` or `null`           | Normalizes the city name and returns copies of the supported search-area objects so map controls cannot mutate shared configuration.                                                                                                                                |
| `isWithinCityArea(point, city)`                                     | `{lat, lng}` and city → boolean               | Requires finite coordinates within the selected city's inclusive rectangular search bounds. This is a practical pin guard, not a point-in-municipal-polygon test.                                                                                                   |

### Resolution results

`resolveNeighbourhood()` returns one of four statuses:

| Status      | When returned                                                                                                          | What the host form does                                                                                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `empty`     | The normalized query has no text.                                                                                      | Waits for a neighbourhood name.                                                                                                                                                                        |
| `matched`   | Exactly one distinct local record has an exact normalized canonical-name or alias match.                               | Shows the canonical neighbourhood and a non-editable preview pin.                                                                                                                                      |
| `ambiguous` | Multiple local records have exact matches, or any local starts-with/contains suggestions exist without an exact match. | Presents explicit record choices. A single partial suggestion still needs the host to choose it. The UI displays up to eight choices and asks the host to type more when there are additional matches. |
| `not-found` | No exact or partial match exists in the selected city.                                                                 | Requests corrected spelling/city or an explicitly placed and confirmed manual pin.                                                                                                                     |

`otherCities` contains sorted city names with an exact normalized match outside
the selected city when no local exact match exists. It is a hint to change the
City field; it does not move the pin or select that other city automatically.

For example:

```ts
resolveNeighbourhood('Parkdale', 'Edmonton'); // matched: Edmonton's Parkdale
resolveNeighbourhood('Parkdale', 'Calgary'); // matched: Calgary's Parkdale
resolveNeighbourhood('Kensington', 'Calgary'); // ambiguous: Hillhurst or Sunnyside
resolveNeighbourhood('Ritchie', 'Calgary'); // not-found; otherCities includes Edmonton
resolveNeighbourhood('  ', 'Edmonton'); // empty
```

Normalization handles typography, not spelling correction. A close-looking
misspelling is never promoted directly to a confirmed point. An unsupported city
has no local records and no manual pin area.

## Host form and manual pin workflow

1. The host selects **Edmonton**, **Calgary**, or **Canmore** and enters a
   neighbourhood. City and neighbourhood changes call `resetLocation()`, which
   clears any selected suggestion, manual point, and previous pin confirmation.
2. A unique exact match previews its representative point. If the result is
   ambiguous, choosing **Use [name], [city]** sets `chosenMatchId` and previews
   that record; the submit function saves its canonical `name` and coordinates.
3. For an unlisted area or a more specific location, **Set location on map**
   enters manual mode with no initially confirmed point. The host may click the
   map, drag a pin, or enter latitude and longitude and choose **Move pin**.
4. `LocationPicker.selectPoint()` calls `isWithinCityArea()`. An invalid or
   out-of-area point clears the parent's point and shows an error. Editing either
   numeric coordinate field also clears the point immediately, so old confirmed
   coordinates cannot be reused while different numbers are visible.
5. A valid point still needs **Use this pin**. Every subsequent map move or
   coordinate change clears that confirmation. On submission, `PartnerDialog`
   accepts a manual point only when it is both confirmed and still within the
   selected city area.
6. Existing spaces with explicit coordinates open edit mode with that point
   preserved and confirmed. Changing their city or neighbourhood invalidates it;
   editing an unrelated field does not move the saved point.

The location-picker components have separate jobs:

- `PickerViewport` sets the selected city's map bounds, handles editable map
  clicks, fits the city when there is no point, centres a supplied point, and
  resizes Leaflet when its container changes.
- `LocationPin` renders the point and permits dragging only in editable mode. A
  rejected drag restores the marker to its previous coordinate.
- `LocationPicker` owns temporary numeric input/error state and forwards valid
  points through `onChange`; it does not independently confirm the host's pin or
  save a listing to the database.

### Supported manual-pin bounds

All bounds are inclusive and approximate. A point inside one rectangle is not
proof that it lies within the current official municipal boundary.

| Selected city | Latitude range    | Longitude range       |
| ------------- | ----------------- | --------------------- |
| Edmonton      | `53.3` to `53.8`  | `-113.85` to `-113.2` |
| Calgary       | `50.8` to `51.3`  | `-114.4` to `-113.8`  |
| Canmore       | `51.0` to `51.18` | `-115.5` to `-115.2`  |

The connected listing-create and listing-update database functions validate
supported cities and corresponding coordinate ranges again. Client-side pin
confirmation improves the form experience; it does not replace the server's
ownership and validation checks.

### Existing listing fallback is a different path

`getListingCoordinates()` in `geography.ts` can resolve old listings through
explicit coordinates, known seeded listing IDs, a unique catalogue match, legacy
neighbourhood points, or a supported city centre. This compatibility fallback
keeps existing records visible on the map. It is not permission for a new host
form to save an unknown neighbourhood at the city centre.

## Sources and licence

The Edmonton and Calgary geometries come from the municipal-source datasets
mirrored by [Click That 'Hood](https://github.com/codeforgermany/click_that_hood),
pinned at revision `48ba05ad4c6969e3b3c25735492169227ae411f1`:

- [Edmonton boundary GeoJSON](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/edmonton.geojson),
  attributed by the [source metadata](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/edmonton.metadata.json)
  to the City of Edmonton's [Neighbourhoods detailed polygon dataset](https://data.edmonton.ca/City-Administration/Neighbourhoods-detailed-polygon-kml-file-/uyj7-uwun).
- [Calgary boundary GeoJSON](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/calgary.geojson),
  attributed by the [source metadata](https://github.com/codeforgermany/click_that_hood/blob/48ba05ad4c6969e3b3c25735492169227ae411f1/public/data/calgary.metadata.json)
  to Calgary Communities from the [City of Calgary Open Data catalogue](https://data.calgary.ca/).

The mirror's MIT notice is retained in `UPSTREAM-LICENSE.txt`. The municipal
sources are credited above. Only names, source-derived IDs, and representative
points are shipped in the lookup; the large source geometries are not bundled.

## Coverage and precision

This is a **historical municipal boundary snapshot**: the mirror's feature
metadata dates to 2013. It covers hundreds of actual areas but must not be
presented as an exhaustive or current 2026 neighbourhood directory. Newer areas,
informal district names, or places absent from this snapshot need clarification
or a user-confirmed map pin. An unsuccessful lookup must not silently substitute
a city-centre point.

Each Edmonton/Calgary coordinate is a Shapely interior representative point of
its source polygon, rather than an arithmetic centroid that could fall outside
a concave neighbourhood. Five invalid source geometries were repaired with
`make_valid`; all 628 resulting points were checked to lie inside their valid
source geometry. Coordinates were rounded to six decimal places only when the
rounded point remained inside. These are neighbourhood-level points, never
verified business addresses or navigation destinations.

The Canmore downtown coordinate, `51.089, -115.359`, is the existing approximate
downtown map reference already used by the prototype. It is not derived from a
municipal neighbourhood polygon. No other Canmore district has been invented.

## Search aliases and ambiguity

- Edmonton `Strathcona` also matches `Old Strathcona`.
- The historical Edmonton `Oliver` record also matches the neighbourhood's
  current name, `Wîhkwêntôwin`, including the unaccented spelling.
- Calgary's `Kensington` area spans both `Hillhurst` and `Sunnyside`. Both records
  deliberately share that alias so users must choose the part they mean.
- Calgary `Downtown` is an alias for `Downtown Commercial Core`, `Downtown East
Village`, and `Downtown West End`; the lookup must request a choice.
- Canmore `Downtown` also matches `Town Centre`, `Town Center`, and `Downtown
Canmore`.

Names shared across cities, such as `Parkdale`, `Windsor Park`, `Meadowlark Park`,
and `Rideau Park`, are separate records with separate source-derived coordinates.
The selected city must scope matching before any unique match is accepted.

## Updating the catalogue and verifying changes

There is no checked-in command that automatically downloads and regenerates
this catalogue. A deliberate data update should:

1. Obtain a documented municipal source and retain the relevant licence and
   upstream revision information.
2. Derive stable, unique IDs and interior representative points, repairing
   invalid polygon geometry where necessary and checking the points remain
   inside the intended geometry after rounding.
3. Update `neighbourhoodRecords` in `src/neighbourhood-data.ts`. Add aliases only
   for known alternate names; when an area spans multiple records, preserve the
   ambiguity instead of choosing a point arbitrarily.
4. Update the counts, coverage date, source links, precision notes, and licence
   information here. Keep [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt).
5. Run the relevant checks from the repository root:

   ```sh
   npx playwright test tests/neighbourhood-matching.spec.ts tests/neighbourhood-location.spec.ts
   npm run test:database
   ```

Matching checks cover city-scoped duplicate names, exact aliases, accents,
punctuation, partial matches, unknown names, and manually confirmed city-bounded
pins. Database checks verify the connected listing validation and ownership
rules. A passing test does not certify a record as a current official boundary
or a verified street address. Adding a new supported city requires coordinated
changes to UI city options, search-area configuration, and database validation;
adding a catalogue record alone does not enable that city end to end.
