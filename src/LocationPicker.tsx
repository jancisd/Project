import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import type { Coordinates } from './geography';
import { getCitySearchArea, isWithinCityArea } from './neighbourhoods';
import 'leaflet/dist/leaflet.css';
import './location-picker.css';

type Props = {
  city: string;
  coordinates: Coordinates | null;
  onChange: (coordinates: Coordinates | null) => void;
  editable: boolean;
  label: string;
};

function PickerViewport({
  city,
  coordinates,
  editable,
  onReady,
  onPick,
}: {
  city: string;
  coordinates: Coordinates | null;
  editable: boolean;
  onReady: (map: LeafletMap) => void;
  onPick: (point: Coordinates) => boolean;
}) {
  const map = useMap();
  useMapEvents({
    click(event) {
      if (editable) onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  useEffect(() => {
    onReady(map);
    const container = map.getContainer();
    container.setAttribute('data-testid', 'location-picker-map');
    container.setAttribute(
      'aria-label',
      editable
        ? `Choose a location in ${city}`
        : `Location of ${city} neighbourhood`,
    );
    let frame = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    resize.observe(container);
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map, onReady, city, editable]);

  useEffect(() => {
    const area = getCitySearchArea(city);
    if (!area) return;
    map.setMaxBounds([
      [area.bounds.south, area.bounds.west],
      [area.bounds.north, area.bounds.east],
    ]);
    if (coordinates) {
      map.setView(
        [coordinates.lat, coordinates.lng],
        editable ? Math.max(11, map.getZoom()) : 14,
        { animate: false },
      );
    } else {
      map.fitBounds(
        [
          [area.bounds.south, area.bounds.west],
          [area.bounds.north, area.bounds.east],
        ],
        { padding: [12, 12], maxZoom: 11, animate: false },
      );
    }
  }, [map, city, coordinates?.lat, coordinates?.lng, editable]);

  return null;
}

function LocationPin({
  coordinates,
  editable,
  label,
  onPick,
}: {
  coordinates: Coordinates;
  editable: boolean;
  label: string;
  onPick: (point: Coordinates) => boolean;
}) {
  const ref = useRef<LeafletMarker>(null);
  const icon = useMemo(
    () =>
      divIcon({
        className: 'location-picker-pin',
        html: '<svg width="30" height="39" viewBox="0 0 30 39" aria-hidden="true"><path d="M15 1C7.3 1 1 7.3 1 15c0 10.2 14 23 14 23s14-12.8 14-23C29 7.3 22.7 1 15 1Z" fill="#233a31" stroke="#fffdf5" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fffdf5"/></svg>',
        iconSize: [30, 39],
        iconAnchor: [15, 39],
      }),
    [],
  );

  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    element.setAttribute('data-testid', 'location-pin');
    element.setAttribute('data-latitude', String(coordinates.lat));
    element.setAttribute('data-longitude', String(coordinates.lng));
    element.setAttribute(
      'aria-label',
      editable ? 'Drag to adjust your pin' : `Location pin for ${label}`,
    );
  }, [coordinates.lat, coordinates.lng, editable, label]);

  return (
    <Marker
      ref={ref}
      position={[coordinates.lat, coordinates.lng]}
      icon={icon}
      draggable={editable}
      keyboard={editable}
      title={editable ? 'Drag to adjust your pin' : label}
      eventHandlers={{
        dragend(event) {
          const marker = event.target as LeafletMarker;
          const point = marker.getLatLng();
          if (!onPick({ lat: point.lat, lng: point.lng }))
            marker.setLatLng([coordinates.lat, coordinates.lng]);
        },
      }}
    />
  );
}

export default function LocationPicker({
  city,
  coordinates,
  onChange,
  editable,
  label,
}: Props) {
  const id = useId();
  const area = getCitySearchArea(city);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [provinces, setProvinces] = useState<GeoJsonObject | null>(null);
  const [roads, setRoads] = useState<GeoJsonObject | null>(null);
  const [tileVisible, setTileVisible] = useState(true);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const tileErrors = useRef(0);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const previousCity = useRef(city);

  useEffect(() => {
    const cityChanged = previousCity.current !== city;
    previousCity.current = city;
    if (coordinates) {
      setLatitude(String(coordinates.lat));
      setLongitude(String(coordinates.lng));
      setError('');
    } else if (cityChanged) {
      setLatitude('');
      setLongitude('');
      setError('');
    }
  }, [city, coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await Promise.all(
          ['canada-provinces', 'alberta-roads'].map(async (file) => {
            const response = await fetch(`/maps/${file}.geojson`, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error('Map outlines unavailable');
            const data = (await response.json()) as GeoJsonObject;
            if (data.type !== 'FeatureCollection')
              throw new Error('Invalid map outlines');
            return data;
          }),
        );
        if (!controller.signal.aborted) {
          setProvinces(data[0]);
          setRoads(data[1]);
        }
      } catch {
        if (!controller.signal.aborted) setFallbackFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function selectPoint(point: Coordinates) {
    if (!isWithinCityArea(point, city)) {
      onChange(null);
      setError(
        `Please choose a point in the ${city} area, or change the city above.`,
      );
      return false;
    }
    setError('');
    onChange(point);
    return true;
  }

  if (!area)
    return (
      <p className="location-picker-unavailable">
        Choose a supported city before placing a pin.
      </p>
    );

  return (
    <div className="location-picker" data-testid="location-picker">
      <div className="location-picker-heading">
        <MapPin size={15} />
        <span>{editable ? `Place your pin in ${city}` : label}</span>
      </div>
      <p className="location-picker-instructions">
        {editable
          ? 'Click the map or drag the pin to show where your space is. You can also enter coordinates below.'
          : 'This pin marks the matched neighbourhood area. It is not a verified street address.'}
      </p>
      <div className="location-picker-map-wrap">
        <MapContainer
          key={city}
          center={[area.center.lat, area.center.lng]}
          zoom={11}
          minZoom={9}
          maxZoom={19}
          zoomControl={false}
          attributionControl={false}
          maxBoundsViscosity={1}
          className="location-picker-map"
          scrollWheelZoom={false}
        >
          <PickerViewport
            city={city}
            coordinates={coordinates}
            editable={editable}
            onReady={setMap}
            onPick={selectPoint}
          />
          {provinces && (
            <Pane name="location-province" style={{ zIndex: 190 }}>
              <GeoJSON
                data={provinces}
                interactive={false}
                style={{
                  color: '#c2ccb2',
                  weight: 1,
                  fillColor: '#e9eedf',
                  fillOpacity: 1,
                }}
              />
            </Pane>
          )}
          {roads && (
            <Pane name="location-roads" style={{ zIndex: 191 }}>
              <GeoJSON
                data={roads}
                interactive={false}
                style={{ color: '#fffdf4', weight: 3, opacity: 1 }}
              />
            </Pane>
          )}
          {tileVisible && (
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              eventHandlers={{
                tileload() {
                  tileErrors.current = 0;
                },
                tileerror() {
                  tileErrors.current += 1;
                  if (tileErrors.current >= 3) setTileVisible(false);
                },
              }}
            />
          )}
          {coordinates && (
            <LocationPin
              coordinates={coordinates}
              editable={editable}
              label={label}
              onPick={selectPoint}
            />
          )}
        </MapContainer>
        <div className="location-picker-controls">
          <button
            type="button"
            aria-label="Zoom location map in"
            onClick={() => map?.zoomIn()}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom location map out"
            onClick={() => map?.zoomOut()}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label={`Show ${city} area`}
            onClick={() =>
              map?.fitBounds(
                [
                  [area.bounds.south, area.bounds.west],
                  [area.bounds.north, area.bounds.east],
                ],
                { padding: [12, 12], animate: false },
              )
            }
          >
            <LocateFixed size={16} />
          </button>
        </div>
        {!coordinates && editable && (
          <span className="location-picker-empty-pin">
            Choose a spot to place your pin
          </span>
        )}
        {!tileVisible && (
          <span className="location-picker-detail-note">
            {editable
              ? 'Street detail unavailable · use the coordinates below if needed'
              : 'Street detail unavailable · the neighbourhood pin is still shown'}
          </span>
        )}
        <div className="location-picker-attribution">
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
        </div>
      </div>
      {fallbackFailed && (
        <p className="location-picker-status">
          Local map outlines could not load. The pin and coordinate controls
          remain available.
        </p>
      )}
      {coordinates && (
        <p className="location-picker-coordinates" role="status">
          Pin: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}{' '}
          <span>· {city}, Alberta</span>
        </p>
      )}
      {editable && (
        <div className="location-picker-coordinate-controls">
          <div className="location-picker-coordinate-fields">
            <label htmlFor={`${id}-latitude`}>
              Pin latitude
              <input
                id={`${id}-latitude`}
                type="number"
                step="any"
                value={latitude}
                onChange={(event) => {
                  setLatitude(event.target.value);
                  setError('');
                  onChange(null);
                }}
                placeholder="53.52"
                inputMode="decimal"
              />
            </label>
            <label htmlFor={`${id}-longitude`}>
              Pin longitude
              <input
                id={`${id}-longitude`}
                type="number"
                step="any"
                value={longitude}
                onChange={(event) => {
                  setLongitude(event.target.value);
                  setError('');
                  onChange(null);
                }}
                placeholder="-113.54"
                inputMode="decimal"
              />
            </label>
          </div>
          <button
            className="location-picker-move"
            type="button"
            onClick={() => {
              if (
                !latitude.trim() ||
                !longitude.trim() ||
                !Number.isFinite(Number(latitude)) ||
                !Number.isFinite(Number(longitude))
              ) {
                onChange(null);
                setError(
                  'Enter both a valid latitude and longitude before moving the pin.',
                );
                return;
              }
              selectPoint({ lat: Number(latitude), lng: Number(longitude) });
            }}
          >
            Move pin
          </button>
        </div>
      )}
      {error && (
        <p className="location-picker-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
