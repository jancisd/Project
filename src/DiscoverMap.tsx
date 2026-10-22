import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import type { FeatureCollection, GeoJsonObject, Point } from 'geojson';
import Supercluster from 'supercluster';
import {
  ArrowUpRight,
  Globe2,
  Heart,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Star,
  X,
} from 'lucide-react';
import type { Listing } from './data';
import {
  ALBERTA_BOUNDS,
  ALBERTA_CENTER,
  getListingCoordinates,
} from './geography';
import 'leaflet/dist/leaflet.css';
import './map.css';

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type Props = {
  listings: Listing[];
  selectedId: string | null;
  highlightedId?: string | null;
  hideSelectedPreview?: boolean;
  onSelect: (id: string | null) => void;
  onBook: (listing: Listing) => void;
  onSave: (id: string) => void;
  saved: string[];
  onSearchArea: (bounds: MapBounds) => void;
  onClearArea: () => void;
  areaActive: boolean;
};

type PointProperties = { listingId: string; price: number };
type ClusterProperties = { minPrice: number };
type Outlines = {
  world: GeoJsonObject;
  provinces: GeoJsonObject;
  roads: GeoJsonObject;
};

const cityLabels = [
  { name: 'Edmonton', lat: 53.5461, lng: -113.4938 },
  { name: 'Calgary', lat: 51.0447, lng: -114.0719 },
  { name: 'Canmore', lat: 51.089, lng: -115.359 },
  { name: 'Red Deer', lat: 52.2681, lng: -113.8112 },
  { name: 'Banff', lat: 51.1784, lng: -115.5708 },
  { name: 'Lethbridge', lat: 49.6942, lng: -112.8328 },
  { name: 'Grande Prairie', lat: 55.17, lng: -118.795 },
  { name: 'Kelowna', lat: 49.888, lng: -119.496 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  { name: 'Saskatoon', lat: 52.1332, lng: -106.67 },
];

const priceOf = (listing: Listing) =>
  Math.min(...listing.services.map((service) => service.price));
const shortPrice = (value: number) =>
  `$${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value)}`;

function MapLifecycle({
  onReady,
  onMove,
  onZoom,
  signature,
  listings,
  areaActive,
  selectedId,
}: {
  onReady: (map: LeafletMap) => void;
  onMove: () => void;
  onZoom: (zoom: number, center: string) => void;
  signature: string;
  listings: Listing[];
  areaActive: boolean;
  selectedId: string | null;
}) {
  const map = useMap();
  const programmatic = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaActiveRef = useRef(areaActive);
  areaActiveRef.current = areaActive;
  const latestListings = useRef(listings);
  latestListings.current = listings;

  const markProgrammatic = () => {
    programmatic.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      programmatic.current = false;
    }, 800);
  };

  useMapEvents({
    dragstart() {
      programmatic.current = false;
    },
    moveend() {
      const center = map.getCenter();
      onZoom(
        map.getZoom(),
        `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`,
      );
      if (!programmatic.current) onMove();
    },
    zoomend() {
      const center = map.getCenter();
      onZoom(
        map.getZoom(),
        `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`,
      );
    },
  });

  useEffect(() => {
    onReady(map);
    const allowUserNavigation = () => {
      programmatic.current = false;
    };
    map.on('discover:user-navigation', allowUserNavigation);
    const container = map.getContainer();
    container.addEventListener('pointerdown', allowUserNavigation);
    container.addEventListener('wheel', allowUserNavigation, { passive: true });
    container.addEventListener('keydown', allowUserNavigation);
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (timer.current) clearTimeout(timer.current);
      map.off('discover:user-navigation', allowUserNavigation);
      container.removeEventListener('pointerdown', allowUserNavigation);
      container.removeEventListener('wheel', allowUserNavigation);
      container.removeEventListener('keydown', allowUserNavigation);
    };
  }, [map, onReady]);

  useEffect(() => {
    if (areaActiveRef.current) return;
    const coordinates = latestListings.current
      .map(getListingCoordinates)
      .filter((point) => point !== null);
    markProgrammatic();
    if (coordinates.length) {
      map.fitBounds(
        latLngBounds(coordinates.map((point) => [point.lat, point.lng])),
        { padding: [70, 75], maxZoom: 13, animate: false },
      );
    } else {
      map.fitBounds(ALBERTA_BOUNDS, { padding: [36, 40], animate: false });
    }
    const center = map.getCenter();
    onZoom(map.getZoom(), `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`);
    // Area-only filtering keeps the user's viewport. Data filters fit the matching places.
  }, [signature, map]);

  useEffect(() => {
    const listing = latestListings.current.find(
      (item) => item.id === selectedId,
    );
    const point = listing ? getListingCoordinates(listing) : null;
    if (!point) return;
    if (
      map.getZoom() < 14 ||
      !map.getBounds().pad(-0.1).contains([point.lat, point.lng])
    ) {
      markProgrammatic();
      map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 14), {
        duration: 0.65,
      });
    }
  }, [selectedId, map]);

  return null;
}

function PriceMarker({
  position,
  label,
  testId,
  listingId,
  icon,
  onClick,
  tooltip,
}: {
  position: [number, number];
  label: string;
  testId: string;
  listingId?: string;
  icon: ReturnType<typeof divIcon>;
  onClick: () => void;
  tooltip: string;
}) {
  const marker = useRef<LeafletMarker>(null);
  useEffect(() => {
    const element = marker.current?.getElement();
    if (!element) return;
    element.setAttribute('aria-label', label);
    element.setAttribute('data-testid', testId);
    element.setAttribute('role', 'button');
    if (listingId) element.setAttribute('data-listing-id', listingId);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  }, [icon, label, testId, listingId, onClick]);
  return (
    <Marker
      ref={marker}
      position={position}
      icon={icon}
      keyboard
      autoPanOnFocus={false}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip
        direction="top"
        offset={[0, -19]}
        className="map-marker-tooltip"
        opacity={1}
      >
        {tooltip}
      </Tooltip>
    </Marker>
  );
}

export default function DiscoverMap({
  listings,
  selectedId,
  highlightedId = null,
  hideSelectedPreview = false,
  onSelect,
  onBook,
  onSave,
  saved,
  onSearchArea,
  onClearArea,
  areaActive,
}: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(6);
  const [center, setCenter] = useState(ALBERTA_CENTER.join(','));
  const [moved, setMoved] = useState(false);
  const [outlines, setOutlines] = useState<Outlines | null>(null);
  const [outlinesFailed, setOutlinesFailed] = useState(false);
  const [tileVisible, setTileVisible] = useState(true);
  const [tileLoaded, setTileLoaded] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [chooserKey, setChooserKey] = useState<string | null>(null);
  const chooserRef = useRef<HTMLDivElement>(null);
  const chooserReturnFocus = useRef<HTMLElement | null>(null);
  const tileFailures = useRef(0);

  const plottedListings = useMemo(
    () => listings.filter((listing) => getListingCoordinates(listing) !== null),
    [listings],
  );
  const signature = plottedListings
    .map((listing) => listing.id)
    .sort()
    .join('|');
  const selected = plottedListings.find((listing) => listing.id === selectedId);
  const coincidentGroups = useMemo(() => {
    const groups = new Map<string, Listing[]>();
    for (const listing of plottedListings) {
      const point = getListingCoordinates(listing)!;
      const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
      groups.set(key, [...(groups.get(key) ?? []), listing]);
    }
    return groups;
  }, [plottedListings]);
  const chooserListings = chooserKey
    ? (coincidentGroups.get(chooserKey) ?? [])
    : [];
  const index = useMemo(() => {
    const points: FeatureCollection<Point, PointProperties>['features'] =
      plottedListings.map((listing) => {
        const point = getListingCoordinates(listing)!;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
          properties: { listingId: listing.id, price: priceOf(listing) },
        };
      });
    return new Supercluster<PointProperties, ClusterProperties>({
      radius: 64,
      maxZoom: 13,
      minPoints: 2,
      map: (properties) => ({ minPrice: properties.price }),
      reduce: (accumulated, properties) => {
        accumulated.minPrice = Math.min(
          accumulated.minPrice,
          properties.minPrice,
        );
      },
    }).load(points);
  }, [plottedListings]);
  const clusters = useMemo(
    () => index.getClusters([-180, -85, 180, 85], Math.floor(zoom)),
    [index, zoom],
  );

  useEffect(() => {
    const container = map?.getContainer();
    if (!container) return;
    container.setAttribute('data-testid', 'map-canvas');
    container.setAttribute('data-zoom', String(zoom));
    container.setAttribute('data-center', center);
    container.setAttribute('aria-label', 'Interactive world map');
  }, [map, zoom, center]);

  useEffect(() => {
    if (chooserKey)
      chooserRef.current
        ?.querySelector<HTMLButtonElement>('[data-choose-listing]')
        ?.focus();
  }, [chooserKey]);

  useEffect(() => {
    if (selectedId) setChooserKey(null);
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await Promise.all(
          ['world-countries', 'canada-provinces', 'alberta-roads'].map(
            async (file) => {
              const response = await fetch(`/maps/${file}.geojson`, {
                signal: controller.signal,
              });
              if (!response.ok) throw new Error('Map outline unavailable');
              const result = (await response.json()) as GeoJsonObject;
              if (result.type !== 'FeatureCollection')
                throw new Error('Invalid map outline');
              return result;
            },
          ),
        );
        if (!controller.signal.aborted)
          setOutlines({ world: data[0], provinces: data[1], roads: data[2] });
      } catch {
        if (!controller.signal.aborted) setOutlinesFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function updateViewport(nextZoom: number, nextCenter: string) {
    setZoom(nextZoom);
    setCenter(nextCenter);
  }
  function searchArea() {
    if (!map) return;
    const bounds = map.getBounds();
    onSearchArea({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    setMoved(false);
  }
  function resetAlberta() {
    onClearArea();
    onSelect(null);
    setChooserKey(null);
    map?.fitBounds(ALBERTA_BOUNDS, { padding: [40, 40], animate: true });
    setMoved(false);
  }

  function openLocationChooser(key: string) {
    chooserReturnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    onSelect(null);
    setChooserKey(key);
  }

  return (
    <section
      className={`discover-map${selected ? ' map-has-selection' : ''}${chooserListings.length > 1 ? ' map-has-chooser' : ''}`}
      data-testid="discover-map"
      data-zoom={zoom}
      data-center={center}
      aria-label="Beauty locations on a world map"
    >
      <p className="sr-only">
        Interactive world map with {plottedListings.length} beauty locations in
        Alberta. Use zoom controls to explore. Select a price pin to preview a
        studio. The same places are available in the listing cards.
      </p>
      <MapContainer
        center={ALBERTA_CENTER}
        zoom={6}
        minZoom={2}
        maxZoom={19}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={0.8}
        worldCopyJump={false}
        zoomControl={false}
        attributionControl={false}
        className="map-canvas"
        data-testid="map-canvas"
        scrollWheelZoom
        keyboard
      >
        <MapLifecycle
          onReady={setMap}
          onMove={() => setMoved(true)}
          onZoom={updateViewport}
          signature={signature}
          listings={plottedListings}
          areaActive={areaActive}
          selectedId={selectedId}
        />
        {outlines && (
          <>
            <Pane name="map-world-outline" style={{ zIndex: 190 }}>
              <GeoJSON
                data={outlines.world}
                interactive={false}
                style={{
                  color: '#c8cdbd',
                  weight: 0.8,
                  fillColor: '#eef0e5',
                  fillOpacity: 1,
                }}
              />
            </Pane>
            <Pane name="map-province-outline" style={{ zIndex: 191 }}>
              <GeoJSON
                data={outlines.provinces}
                interactive={false}
                style={(feature) =>
                  feature?.properties?.name === 'Alberta'
                    ? {
                        color: '#afbc9a',
                        weight: 1.4,
                        fillColor: '#e4ebd9',
                        fillOpacity: 1,
                      }
                    : {
                        color: '#c8d0b9',
                        weight: 0.8,
                        fillColor: '#edf0e2',
                        fillOpacity: 1,
                      }
                }
              />
            </Pane>
            {zoom >= 5 && (
              <Pane name="map-highways" style={{ zIndex: 192 }}>
                <GeoJSON
                  data={outlines.roads}
                  interactive={false}
                  style={{ color: '#d5d9ca', weight: 4, opacity: 0.8 }}
                />
                <GeoJSON
                  data={outlines.roads}
                  interactive={false}
                  style={{ color: '#fffdf3', weight: 2, opacity: 1 }}
                />
              </Pane>
            )}
          </>
        )}
        {tileVisible && (
          <TileLayer
            key={tileAttempt}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
            maxZoom={19}
            eventHandlers={{
              tileload() {
                tileFailures.current = 0;
                setTileLoaded(true);
              },
              tileerror() {
                tileFailures.current += 1;
                if (tileFailures.current >= 3) {
                  setTileVisible(false);
                  setTileLoaded(false);
                }
              },
            }}
          />
        )}
        {(!tileVisible || !tileLoaded) && (
          <Pane
            name="map-local-labels"
            style={{ zIndex: 450, pointerEvents: 'none' }}
          >
            {zoom >= 4 &&
              cityLabels.map((city) => (
                <Marker
                  key={city.name}
                  position={[city.lat, city.lng]}
                  keyboard={false}
                  interactive={false}
                  icon={divIcon({
                    className: 'map-place-label',
                    html: `<span>${city.name}</span>`,
                    iconSize: [100, 20],
                    iconAnchor: [50, 38],
                  })}
                />
              ))}
            {zoom < 10 && (
              <Marker
                position={[52.7, -114.1]}
                keyboard={false}
                interactive={false}
                icon={divIcon({
                  className: 'map-region-label',
                  html: '<span>ALBERTA</span>',
                  iconSize: [130, 22],
                  iconAnchor: [65, 11],
                })}
              />
            )}
            {zoom < 5 && (
              <Marker
                position={[59, -108]}
                keyboard={false}
                interactive={false}
                icon={divIcon({
                  className: 'map-country-label',
                  html: '<span>CANADA</span>',
                  iconSize: [180, 30],
                  iconAnchor: [90, 15],
                })}
              />
            )}
          </Pane>
        )}
        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const properties = feature.properties;
          if ('cluster_id' in properties) {
            const leaves = index.getLeaves(properties.cluster_id, Infinity);
            const cities = [
              ...new Set(
                leaves
                  .map(
                    (leaf) =>
                      plottedListings.find(
                        (item) => item.id === leaf.properties.listingId,
                      )?.city,
                  )
                  .filter(Boolean),
              ),
            ];
            const active = leaves.some(
              (leaf) =>
                leaf.properties.listingId === (highlightedId ?? selectedId),
            );
            const label = `Explore ${properties.point_count} beauty places${cities.length === 1 ? ` near ${cities[0]}` : ''}`;
            const icon = divIcon({
              className: `map-price-icon map-cluster-icon${active ? ' map-pin-active' : ''}`,
              html: `<span class="map-price-label">${shortPrice(properties.minPrice)}<span class="map-price-plus">+</span><span class="map-cluster-count">${properties.point_count}</span></span>`,
              iconSize: [94, 38],
              iconAnchor: [47, 19],
            });
            return (
              <PriceMarker
                key={`cluster-${properties.cluster_id}`}
                position={[lat, lng]}
                label={label}
                testId="map-cluster"
                icon={icon}
                tooltip={`${cities.length === 1 ? cities[0] : 'Alberta'} · ${properties.point_count} places`}
                onClick={() => {
                  const locationKeys = new Set(
                    leaves.map(
                      (leaf) =>
                        `${leaf.geometry.coordinates[1].toFixed(6)},${leaf.geometry.coordinates[0].toFixed(6)}`,
                    ),
                  );
                  if (locationKeys.size === 1) {
                    openLocationChooser([...locationKeys][0]);
                    return;
                  }
                  onSelect(null);
                  setChooserKey(null);
                  map?.fire('discover:user-navigation');
                  const members = leaves.map((leaf): [number, number] => [
                    leaf.geometry.coordinates[1],
                    leaf.geometry.coordinates[0],
                  ]);
                  map?.fitBounds(latLngBounds(members), {
                    padding: [55, 70],
                    maxZoom: 14,
                    animate: true,
                  });
                }}
              />
            );
          }
          const listing = plottedListings.find(
            (item) => item.id === properties.listingId,
          );
          if (!listing) return null;
          const coordinateKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          const sameLocation = coincidentGroups.get(coordinateKey) ?? [];
          if (sameLocation.length > 1) {
            if (sameLocation[0].id !== listing.id) return null;
            const active = sameLocation.some(
              (item) => item.id === (highlightedId ?? selectedId),
            );
            const icon = divIcon({
              className: `map-price-icon map-cluster-icon${active ? ' map-pin-active' : ''}`,
              html: `<span class="map-price-label">${shortPrice(Math.min(...sameLocation.map(priceOf)))}<span class="map-price-plus">+</span><span class="map-cluster-count">${sameLocation.length}</span></span>`,
              iconSize: [94, 38],
              iconAnchor: [47, 19],
            });
            return (
              <PriceMarker
                key={`location-${coordinateKey}`}
                position={[lat, lng]}
                label={`Explore ${sameLocation.length} beauty places near ${listing.city}`}
                testId="map-cluster"
                icon={icon}
                tooltip={`${sameLocation.length} studios at this approximate location`}
                onClick={() => {
                  openLocationChooser(coordinateKey);
                }}
              />
            );
          }
          const active = listing.id === (highlightedId ?? selectedId);
          const icon = divIcon({
            className: `map-price-icon${active ? ' map-pin-active' : ''}`,
            html: `<span class="map-price-label">${shortPrice(properties.price)}</span>`,
            iconSize: [64, 36],
            iconAnchor: [32, 18],
          });
          return (
            <PriceMarker
              key={listing.id}
              position={[lat, lng]}
              label={`View ${listing.name} on map`}
              testId="map-price-marker"
              listingId={listing.id}
              icon={icon}
              tooltip={listing.name}
              onClick={() => onSelect(listing.id)}
            />
          );
        })}
        <ScaleControl position="bottomleft" imperial={false} maxWidth={95} />
      </MapContainer>

      <div className="map-area-controls">
        {moved && (
          <button className="map-search-area" onClick={searchArea}>
            <RefreshCw size={14} />
            Search this area
          </button>
        )}
        {areaActive && (
          <button
            className="map-clear-area"
            onClick={() => {
              onClearArea();
              setMoved(false);
            }}
          >
            Clear map area <X size={13} />
          </button>
        )}
      </div>
      <div className="map-view-controls">
        <button
          title="Show Alberta"
          aria-label="Show Alberta"
          onClick={resetAlberta}
        >
          <LocateFixed size={17} />
        </button>
        <button
          title="World view"
          aria-label="World view"
          onClick={() => {
            onSelect(null);
            setChooserKey(null);
            map?.fire('discover:user-navigation');
            map?.setView([35, -30], 2, { animate: true });
          }}
        >
          <Globe2 size={17} />
        </button>
      </div>
      <div className="map-zoom-controls">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          disabled={zoom >= 19}
          onClick={() => {
            map?.fire('discover:user-navigation');
            map?.zoomIn();
          }}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          disabled={zoom <= 2}
          onClick={() => {
            map?.fire('discover:user-navigation');
            map?.zoomOut();
          }}
        >
          <Minus size={18} />
        </button>
      </div>
      {(!tileVisible || outlinesFailed) && (
        <div className="map-detail-status" role="status">
          <span>
            {!tileVisible
              ? 'Detailed map unavailable'
              : 'Map outlines unavailable'}
          </span>
          {!tileVisible && (
            <button
              onClick={() => {
                tileFailures.current = 0;
                setTileLoaded(false);
                setTileAttempt((value) => value + 1);
                setTileVisible(true);
              }}
            >
              Retry details
            </button>
          )}
        </div>
      )}
      {!plottedListings.length && (
        <div className="map-empty">
          <MapPin size={22} />
          <h3>No places match just yet.</h3>
          <p>Try another category or a wider search.</p>
        </div>
      )}

      {selected && !hideSelectedPreview && (
        <div
          className="map-preview"
          role="region"
          aria-label={`Map preview for ${selected.name}`}
        >
          <button
            className="map-preview-close"
            aria-label="Close map preview"
            onClick={() => onSelect(null)}
          >
            <X size={15} />
          </button>
          <button
            className="map-preview-image"
            aria-label={`View ${selected.name} details`}
            onClick={() => onBook(selected)}
          >
            <img src={selected.image} alt={selected.name} />
          </button>
          <div className="map-preview-copy">
            <span className="map-preview-meta">
              {selected.category} <span>·</span> {selected.city}
            </span>
            <h3>{selected.name}</h3>
            <p>
              {selected.reviewCount > 0 ? (
                <>
                  <Star size={11} fill="currentColor" />
                  {selected.rating.toFixed(2)}{' '}
                  <span>({selected.reviewCount})</span>
                </>
              ) : (
                'New on airstethics'
              )}
            </p>
            <div className="map-preview-bottom">
              <span>
                From <strong>{shortPrice(priceOf(selected))}</strong> CAD
              </span>
              <button
                className="map-book-button"
                onClick={() => onBook(selected)}
              >
                View & book
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <button
            className={`map-preview-save${saved.includes(selected.id) ? ' map-preview-is-saved' : ''}`}
            aria-label={`${saved.includes(selected.id) ? 'Unsave' : 'Save'} ${selected.name}`}
            aria-pressed={saved.includes(selected.id)}
            onClick={() => onSave(selected.id)}
          >
            <Heart
              size={16}
              fill={saved.includes(selected.id) ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      )}

      {chooserListings.length > 1 && (
        <div
          ref={chooserRef}
          className="map-location-chooser"
          data-testid="map-location-chooser"
          role="region"
          aria-label="Studios at this location"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setChooserKey(null);
              chooserReturnFocus.current?.focus();
            }
          }}
        >
          <button
            className="map-preview-close"
            aria-label="Close studios at this location"
            onClick={() => {
              setChooserKey(null);
              chooserReturnFocus.current?.focus();
            }}
          >
            <X size={15} />
          </button>
          <h3>A little beauty, in good company.</h3>
          <p>These demo studios share an approximate location.</p>
          <div className="map-location-options">
            {chooserListings.map((listing) => (
              <button
                key={listing.id}
                className="map-location-option"
                data-choose-listing
                aria-label={`Preview ${listing.name}`}
                onClick={() => {
                  setChooserKey(null);
                  onSelect(listing.id);
                }}
              >
                <img src={listing.image} alt="" />
                <span>
                  <strong>{listing.name}</strong>
                  <small>
                    {listing.category} · {listing.city}
                  </small>
                  <span>
                    From <b>{shortPrice(priceOf(listing))}</b> CAD
                  </span>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="map-footer">
        <span className="map-demo-label">
          <MapPin size={10} />
          Approximate demo locations
        </span>
        <span className="map-attribution">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
          <span> · </span>
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Natural Earth
          </a>
        </span>
      </div>
    </section>
  );
}
