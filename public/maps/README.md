# Local map data

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

The approximate neighbourhood and city centres in `src/geography.ts` locate
fictional demo listings. They are not verified business addresses. Existing
user-created demo listings can use their supported city centre when a
neighbourhood-specific centre or explicit coordinates are unavailable.
