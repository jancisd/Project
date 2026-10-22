# Neighbourhood lookup data

The local lookup in `src/neighbourhood-data.ts` contains **386 Edmonton** and
**242 Calgary** named neighbourhood/community records, plus one approximate
Canmore downtown record. It does not make requests to an external geocoder.

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
