# Local map data

This directory supplies the map's local background geometry. The interactive
behaviour is implemented in [DiscoverMap.tsx](../../src/DiscoverMap.tsx),
[LocationPicker.tsx](../../src/LocationPicker.tsx), and
[App.tsx](../../src/App.tsx). These assets do not contain the marketplace's
listings, prices, customer details, or booking availability.

See the [main README](../../README.md) for running the app, the
[application function guide](../../src/README.md) for the rest of its functions,
and the [neighbourhood lookup README](../locations/README.md) for location matching.

## What the map does

The Discover page starts around Alberta and permits worldwide panning and
zooming. The marketplace currently supports listing creation in Edmonton,
Calgary, and Canmore; moving the world map does not add support for creating a
listing in another city.

There are two different map interfaces:

| Interface               | Input                                                                                   | Purpose                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Discovery map           | Public listings, selected/highlighted listing IDs, saved IDs, and area-search callbacks | Explore matching businesses, select price pins, preview a listing, save it, or open booking. |
| Listing location picker | Selected city, one coordinate or `null`, `editable`, and an `onChange` callback         | Preview a matched neighbourhood or explicitly place and confirm a host's location.           |

## How discovery and selection work

1. `App` applies the category, city, text, price, and rating filters to listings.
   Text searches include the listing's name, category, city, neighbourhood,
   description, and service names.
2. `getListingCoordinates(listing)` resolves a usable point for each listing.
   `DiscoverMap` excludes a listing from the plotted set if the function returns
   `null`; the underlying listing data is not deleted.
3. `priceOf(listing)` calculates the lowest service price. `shortPrice(value)`
   formats the pin label as a rounded CAD-style dollar amount. These labels are
   starting prices, not the total for every service.
4. `Supercluster` builds its point index from GeoJSON coordinates in
   `[longitude, latitude]` order, with a pixel radius of `64`, `minPoints: 2`,
   and `maxZoom: 13`. Clusters carry the minimum price of their members.
5. Selecting an ordinary pin calls `onSelect(listing.id)`. The map highlights
   that listing and normally displays a preview. Selecting the preview image or
   **View & book** calls `onBook(listing)`, which the app connects to the booking
   flow; selecting a pin alone does not create an appointment.
6. Hovering or focusing a listing card updates `highlightedId`, which highlights
   the related pin or cluster. Saving a preview calls `onSave(id)`; account and
   persistence checks are handled by the marketplace layer, not Leaflet.

Clicking a listing card's view/title/explore control instead uses
`App.openListingDetails(listing)`. It records the current view, map visibility,
scroll position, listing ID, and originating action, then shows full details
alongside that listing's map position. While this detail view is active, the
small map preview is hidden, and selecting another pin updates the full details
to that listing. `closeListingDetails()` restores the previous view and map
visibility, then attempts to restore scroll and focus to the originating card;
if that card is unavailable, focus falls back to a main-content button.

### Clusters and listings at the same point

A cluster click inspects its leaf listings. If its members occupy different
points, it clears the current selection and fits the map to those members, with
`maxZoom: 14`. If all members occupy the same point, it opens a location chooser
instead of continually zooming into overlapping markers.

The separate `coincidentGroups` lookup groups points rounded to six decimal
places. Even after ordinary clustering stops at high zoom, multiple listings at
the same approximate point retain one chooser marker. The chooser exposes the
individual listings and focuses its first choice. This is particularly useful
for historical records that share one neighbourhood or city-centre location.

### Functions and state responsibilities

| Function/component             | Behaviour and side effects                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MapLifecycle`                 | Registers map movement, selection, resize, and filter-driven viewport effects. On changed listing IDs, it fits matching coordinates unless an area search is active. With no coordinates, it fits Alberta bounds.                    |
| `markProgrammatic()`           | Marks automatic map movement for 800 ms so an automatic fit/fly does not immediately offer **Search this area** as though the user dragged the map. Pointer, wheel, keyboard, and explicit navigation events clear this suppression. |
| `PriceMarker`                  | Renders an accessible Leaflet marker, assigns its label/test attributes, and activates its callback on click, Enter, or Space. It does not implement booking or database writes.                                                     |
| `updateViewport(zoom, center)` | Stores the map's zoom and formatted centre so clusters and controls can update.                                                                                                                                                      |
| `searchArea()`                 | Reads Leaflet's current bounds, calls `onSearchArea({north, south, east, west})`, and clears the moved flag.                                                                                                                         |
| `resetAlberta()`               | Clears the active area filter, selected listing, and coincident-location chooser, then fits the Alberta overview bounds.                                                                                                             |
| `openLocationChooser(key)`     | Remembers the currently focused element, clears the selected listing, and opens the list of businesses at the grouped point.                                                                                                         |
| `App.openMap(listing?)`        | Makes the map visible, optionally selects a listing, and scrolls to the map on viewports up to 900 px wide.                                                                                                                          |

### Search this area and world navigation

Dragging or manually navigating the map sets `moved`, which offers **Search this
area**. Merely moving the map does not immediately filter the result cards.
After the user chooses that action, `App` stores the bounds in `mapArea`, clears
the selected pin/detail view, and filters the matching cards by resolved point.
The map receives the data-filtered listing set rather than only the area-filtered
cards, so neighbouring pins can remain available while exploring the viewport.

Latitude is tested against south/north bounds. Longitude is compared modulo
360 degrees so a viewport crossing the international date line is handled
correctly; a longitude span of at least 360 degrees includes all longitudes.
**Clear map area** removes this extra geographic filter without clearing the
other search filters. **Show Alberta** resets the overview and selection;
**World view** centres at `[35, -30]` with zoom `2` and leaves the active area
filter unchanged until the user clears or replaces it.

The map permits zoom levels `2` through `19`, with latitude bounds of ±85 and
longitude bounds of ±180. Selecting a valid listing flies to at least zoom `14`
when it is outside the inner visible bounds or the map is zoomed out. A
`ResizeObserver` calls Leaflet's `invalidateSize({pan: false})` when the map's
container changes size. Mobile starts with a list view; **Show map / Show list**
controls visibility without clearing the current filters.

## Background loading and failures

The discovery map fetches the three local GeoJSON files in parallel using an
`AbortController`. Every response must be successful and have
`type: "FeatureCollection"`. The local layers are installed together after all
three succeed. Unmounting aborts the requests; a failure shows **Map outlines
unavailable** rather than replacing listing data.

Detailed streets load separately from
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`. A successful tile resets the
failure counter. Three successive tile errors disable the tile layer and show
**Detailed map unavailable**. **Retry details** clears the counter, increments a
layer key, and mounts a fresh tile layer. Local countries, provinces, and the
generalized highways remain usable if their local assets loaded successfully.
City/region labels appear while detailed tiles have not loaded or are disabled.
Highway geometry is drawn from zoom `5` upward; fixed city labels begin at zoom
`4` while the fallback is active.

The location picker independently fetches only provinces and highways. It also
disables street tiles after three successive errors, but does not have the
discovery map's tile retry button. If its local outlines fail, the pin and
numeric coordinate controls remain available. A local fallback does not mean
the entire app is offline: accounts, bookings, email delivery, and shared data
still require their respective services.

These screens credit OpenStreetMap contributors for detailed tiles and Natural
Earth for the local background. Opening the map requests tile images from
OpenStreetMap; it does not send an entered neighbourhood name to a geocoder.

## Coordinate formats and fallback precedence

Application records use `{lat, lng}`; Leaflet positions use `[lat, lng]`; GeoJSON
and Supercluster use `[lng, lat]`. Reversing these formats moves a point to the
wrong place even if both numbers pass numeric validation.

`isValidCoordinates(value)` accepts only finite numeric latitude/longitude in
the world ranges `[-90, 90]` and `[-180, 180]`. It does not establish that a point
is a business address or falls in a supported city.

`getListingCoordinates(listing)` uses this order:

1. Valid explicitly stored `listing.coordinates`.
2. The known approximate position for one of the fictional seeded listing IDs.
3. A unique city-scoped record from `resolveNeighbourhood()`.
4. A legacy neighbourhood point in the small compatibility dictionary.
5. The approximate centre of a supported city, or `null` for an unsupported city.

The last two steps keep older listings visible. New host creation and location
editing use stricter matching and confirmation rules documented in the
[location README](../locations/README.md): an unknown neighbourhood in a new
form does not silently become a city-centre pin.

## Files, provenance, and licence

The self-contained fallback map uses [Natural Earth](https://www.naturalearthdata.com/),
a public-domain cartographic dataset supported by [NACIS](https://nacis.org/).
Natural Earth data is free for use in any type of project. See the upstream
[README](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/README.md)
and [Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/).

Source: `nvkelso/natural-earth-vector`, revision
`ca96624a56bd078437bca8184e78163e5039ad19`.

- `world-countries.geojson`: 177 country features from
  `geojson/ne_110m_admin_0_countries.geojson` (1:110 million).
- `canada-provinces.geojson`: the 13 Canadian provinces and territories from
  `geojson/ne_50m_admin_1_states_provinces.geojson` (1:50 million).
- `alberta-roads.geojson`: Canadian highway features intersecting the region
  121°W–109°W, 48°N–60°N, selected from
  `geojson/ne_10m_roads.geojson` (1:10 million). The selection retains complete
  source highway segments, including some connected segments outside Alberta;
  ferry routes are excluded. It is a generalized regional network, not a
  complete street map.

Unused source properties were removed and JSON whitespace compacted. Geometry
coordinates are retained from the source. The provincial features preserve
Natural Earth's label latitude and longitude as `labelLat` and `labelLng`.
These generalized boundaries are suitable for overview maps, rather than
street-level navigation or official boundary decisions.

The approximate neighbourhood and city centres in
[`src/geography.ts`](../../src/geography.ts) locate fictional demo listings and
older records. They are not verified business addresses.

## Updating and checking this area

When replacing geometry, keep its source revision, scale, selection bounds,
licence, and transformations documented here. Preserve `FeatureCollection`
format, GeoJSON longitude-first coordinate order, and the existing asset URLs,
or change both map consumers together. The repository does not include an
automatic Natural Earth download/regeneration command; the extraction notes
above describe the checked-in files.

When changing marker behaviour, review both `DiscoverMap` and its callbacks in
`App`; a marker callback is not interchangeable with the full-details action.
When changing location fallback rules, check old records without explicit
coordinates as well as new host forms.

Relevant automated browser checks can be run from the repository root:

```sh
npx playwright test tests/map.spec.ts tests/listing-details.spec.ts tests/neighbourhood-location.spec.ts tests/neighbourhood-matching.spec.ts
```

Those checks cover blocked tile requests, clusters and coincident points,
keyboard selection, filter synchronization, selected details, mobile layouts,
location confirmation, and city-scoped matching. They exercise browser and demo
behaviour; they do not validate a real business address or every upstream street
tile.
