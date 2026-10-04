import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Users, Clock, ShieldCheck, Crosshair, Moon, Sun, ArrowRight, MapPin } from 'lucide-react';
import { PlaceImg } from './PlaceImg.tsx';
import { fetchPlaceImage } from '../placeImages.ts';
import { venueArtDataUri } from '../venueArt.ts';
import { CATEGORY_LABELS } from '../categories.ts';

type WaitStatus = 'LOW_WAIT' | 'MEDIUM_WAIT' | 'HIGH_WAIT';

interface LocationMarker {
  id: string;
  name: string;
  org_name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  travel_time_minutes: number;
  travel_buffer_minutes: number;
  people_waiting: number;
  currently_serving: string;
  estimated_wait_minutes: number;
  wait_status: WaitStatus;
  is_verified: boolean;
  banner_url?: string;
  services: any[];
}

export interface MapUserLocation {
  lat: number;
  lng: number;
  label: string;
}

interface InteractiveMapProps {
  locations: LocationMarker[];
  onSelectLocation: (location: LocationMarker) => void;
  onJoinQueue: (location: LocationMarker, serviceId?: string) => void;
  userLocation?: MapUserLocation | null;
  onPickLocation?: (lat: number, lng: number) => void;
}

const STATUS_STYLE: Record<WaitStatus, { color: string; label: string; range: string }> = {
  LOW_WAIT: { color: '#10b981', label: 'Low wait', range: 'under 15 min' },
  MEDIUM_WAIT: { color: '#f59e0b', label: 'Medium wait', range: '15-35 min' },
  HIGH_WAIT: { color: '#f43f5e', label: 'High wait', range: 'over 35 min' }
};

const CATEGORY_LABEL: Record<string, string> = {
  ALL: 'All',
  ...CATEGORY_LABELS
};

const MAP_CSS = `
.qless-pin-wrap{background:transparent;border:0}
.qless-pin{display:flex;align-items:center;justify-content:center;border-radius:9999px;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.45);color:#fff;font-weight:800;font-size:13px;transition:transform .15s}
.qless-pin:hover{transform:scale(1.12)}
.qless-pin-sel{box-shadow:0 0 0 6px rgba(99,102,241,.35),0 6px 18px rgba(0,0,0,.5)}
.qless-map-dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.92) saturate(.8)}
.qless-map .leaflet-container{font-family:inherit;background:#0f172a}
.qless-map .leaflet-popup-content-wrapper{background:#0f172a;color:#e2e8f0;border-radius:14px;border:1px solid rgba(255,255,255,.12)}
.qless-map .leaflet-popup-tip{background:#0f172a}
.qless-map .leaflet-popup-content{margin:12px 14px;min-width:210px}
.qless-popup-photo{display:block;width:100%;height:110px;object-fit:cover;border-radius:10px;margin-bottom:8px;background:#1e293b}
.qless-popup-title{font-weight:800;font-size:14px;color:#fff;margin-bottom:2px}
.qless-popup-meta{font-size:11px;color:#94a3b8;margin-bottom:6px}
.qless-popup-wait{font-size:12px;font-weight:700;margin-bottom:8px}
.qless-popup-actions{display:flex;gap:8px}
.qless-popup-btn{flex:1;text-align:center;padding:7px 10px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;border:0;text-decoration:none}
.qless-popup-join{background:#6366f1;color:#fff}
.qless-popup-dir{background:rgba(255,255,255,.1);color:#e2e8f0}
.qless-map .leaflet-control-attribution{background:rgba(15,23,42,.75);color:#94a3b8;font-size:10px}
.qless-map .leaflet-control-attribution a{color:#a5b4fc}
.qless-pin-mode .leaflet-container,.qless-pin-mode .leaflet-grab,.qless-pin-mode .leaflet-interactive{cursor:crosshair !important}
.qless-map .leaflet-bar a{background:#0f172a;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,.12)}
`;

function makeIcon(loc: LocationMarker, selected: boolean): L.DivIcon {
  const st = STATUS_STYLE[loc.wait_status] || STATUS_STYLE.LOW_WAIT;
  const size = selected ? 46 : 36;
  const waiting = Number(loc.people_waiting) || 0;
  const html = `<div class="qless-pin${selected ? ' qless-pin-sel' : ''}" style="background:${st.color};width:${size}px;height:${size}px"><span>${waiting}</span></div>`;
  return L.divIcon({ html, className: 'qless-pin-wrap', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// Built with DOM nodes + textContent so place names from OpenStreetMap can never inject HTML.
function buildPopup(loc: LocationMarker, onJoin: () => void): HTMLElement {
  const st = STATUS_STYLE[loc.wait_status] || STATUS_STYLE.LOW_WAIT;
  const root = document.createElement('div');

  const photo = document.createElement('img');
  photo.className = 'qless-popup-photo';
  const art = venueArtDataUri(loc.category);
  photo.src = loc.banner_url || art;
  photo.alt = loc.name;
  photo.onerror = () => {
    photo.onerror = null;
    photo.src = art;
  };
  if (String(loc.id).startsWith('osm-') && !loc.banner_url) {
    fetchPlaceImage(loc.id).then((info) => {
      if (info) photo.src = info.url;
    });
  }
  root.appendChild(photo);

  const title = document.createElement('div');
  title.className = 'qless-popup-title';
  title.textContent = loc.name;

  const meta = document.createElement('div');
  meta.className = 'qless-popup-meta';
  meta.textContent = `${CATEGORY_LABEL[loc.category] || loc.category} - ${loc.distance_km} km away`;

  const wait = document.createElement('div');
  wait.className = 'qless-popup-wait';
  wait.style.color = st.color;
  wait.textContent = `${Number(loc.people_waiting) || 0} waiting - about ${Number(loc.estimated_wait_minutes) || 0} min`;

  const actions = document.createElement('div');
  actions.className = 'qless-popup-actions';

  const join = document.createElement('button');
  join.type = 'button';
  join.className = 'qless-popup-btn qless-popup-join';
  join.textContent = 'Join queue';
  join.onclick = onJoin;

  const dir = document.createElement('a');
  dir.className = 'qless-popup-btn qless-popup-dir';
  dir.href = `https://www.google.com/maps/dir/?api=1&destination=${Number(loc.latitude)},${Number(loc.longitude)}`;
  dir.target = '_blank';
  dir.rel = 'noopener noreferrer';
  dir.textContent = 'Directions';

  actions.appendChild(join);
  actions.appendChild(dir);
  root.appendChild(title);
  root.appendChild(meta);
  root.appendChild(wait);
  root.appendChild(actions);
  return root;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  locations,
  onSelectLocation,
  onJoinQueue,
  userLocation,
  onPickLocation
}) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | WaitStatus>('ALL');
  const [category, setCategory] = useState('ALL');
  const [dark, setDark] = useState(true);
  const [pinMode, setPinMode] = useState(false);

  // Keep the latest callbacks/selection available to long-lived Leaflet handlers.
  const joinRef = useRef(onJoinQueue);
  const selectRef = useRef(onSelectLocation);
  const selectedRef = useRef<string | null>(null);
  joinRef.current = onJoinQueue;
  selectRef.current = onSelectLocation;
  selectedRef.current = selectedId;
  const pinModeRef = useRef(false);
  const pickRef = useRef(onPickLocation);
  pinModeRef.current = pinMode;
  pickRef.current = onPickLocation;

  // Normalise coordinates (MySQL can return DECIMAL columns as strings) and apply filters.
  const normalised = useMemo(
    () =>
      locations
        .map((l) => ({ ...l, latitude: Number(l.latitude), longitude: Number(l.longitude) }))
        .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude)),
    [locations]
  );

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(normalised.map((l) => l.category)))],
    [normalised]
  );

  const visible = useMemo(
    () =>
      normalised.filter(
        (l) =>
          (statusFilter === 'ALL' || l.wait_status === statusFilter) &&
          (category === 'ALL' || l.category === category)
      ),
    [normalised, statusFilter, category]
  );

  const byId = useMemo(() => {
    const m = new Map<string, LocationMarker>();
    visible.forEach((l) => m.set(l.id, l));
    return m;
  }, [visible]);

  const focus = useMemo(
    () => [...visible].sort((a, b) => a.distance_km - b.distance_km).slice(0, 25),
    [visible]
  );

  const userKey = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
  const markerKey = visible.map((l) => `${l.id}:${l.wait_status}:${l.people_waiting}`).join('|');
  const fitKey = `${focus.map((l) => l.id).join(',')}@${userKey}`;

  const counts = useMemo(() => {
    const c = { ALL: normalised.length, LOW_WAIT: 0, MEDIUM_WAIT: 0, HIGH_WAIT: 0 };
    normalised.forEach((l) => {
      if (l.wait_status in c) c[l.wait_status] += 1;
    });
    return c;
  }, [normalised]);

  const fitToFocus = () => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    const pts: L.LatLngTuple[] = focus.map((l) => [l.latitude, l.longitude] as L.LatLngTuple);
    if (userLocation) pts.push([userLocation.lat, userLocation.lng]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    }
  };

  // 1) Create the map once.
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: false }).setView([19.076, 72.8777], 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!pinModeRef.current || !pickRef.current) return;
      pickRef.current(e.latlng.lat, e.latlng.lng);
      setPinMode(false);
    });
    const t = window.setTimeout(() => map.invalidateSize(), 250);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      userLayerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2) Draw venue pins whenever the visible set (or its live numbers) changes.
  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();
    markersRef.current.clear();
    visible.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: makeIcon(loc, loc.id === selectedRef.current),
        title: loc.name,
        riseOnHover: true
      });
      marker.bindPopup(() => buildPopup(loc, () => joinRef.current(loc)), {
        closeButton: false,
        offset: [0, -14]
      });
      marker.on('click', () => {
        setSelectedId(loc.id);
        selectRef.current(loc);
      });
      marker.addTo(group);
      markersRef.current.set(loc.id, marker);
    });
    const sel = selectedRef.current ? markersRef.current.get(selectedRef.current) : undefined;
    if (sel) sel.openPopup();
  }, [markerKey]);

  // 3) Draw the chosen location and its search radius.
  useEffect(() => {
    const g = userLayerRef.current;
    if (!g) return;
    g.clearLayers();
    if (!userLocation) return;
    const center: L.LatLngTuple = [userLocation.lat, userLocation.lng];
    L.circle(center, {
      radius: 2500,
      color: '#6366f1',
      weight: 1,
      fillColor: '#6366f1',
      fillOpacity: 0.08,
      interactive: false
    }).addTo(g);
    L.circleMarker(center, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 })
      .bindTooltip(userLocation.label || 'You are here', { direction: 'top' })
      .addTo(g);
  }, [userKey]);

  // 4) Fit the view to the nearest places when the set of places or the location changes.
  useEffect(() => {
    fitToFocus();
  }, [fitKey]);

  // 5) Highlight, fly to and open the selected place; keep its card in view.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const loc = byId.get(id);
      if (loc) marker.setIcon(makeIcon(loc, id === selectedId));
    });
    if (!selectedId) return;
    const loc = byId.get(selectedId);
    const marker = markersRef.current.get(selectedId);
    const map = mapRef.current;
    if (loc && marker && map) {
      map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
      marker.openPopup();
    }
    const card = document.getElementById(`map-card-${selectedId}`);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const select = (loc: LocationMarker) => {
    setSelectedId(loc.id);
    onSelectLocation(loc);
  };

  const statusFilters: Array<{ id: 'ALL' | WaitStatus; label: string; color?: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'LOW_WAIT', label: 'Low', color: STATUS_STYLE.LOW_WAIT.color },
    { id: 'MEDIUM_WAIT', label: 'Medium', color: STATUS_STYLE.MEDIUM_WAIT.color },
    { id: 'HIGH_WAIT', label: 'High', color: STATUS_STYLE.HIGH_WAIT.color }
  ];

  return (
    <div className={`space-y-4 qless-map ${dark ? 'qless-map-dark' : ''}${pinMode ? ' qless-pin-mode' : ''}`}>
      <style>{MAP_CSS}</style>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Navigation className="w-4 h-4 text-brand-400" />
          <span className="font-bold text-white">{visible.length} places on the map</span>
          {userLocation && <span className="text-slate-400">near {userLocation.label}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Wait time:</span>
          {statusFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === f.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'glass-card text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {f.color && <span className="w-2 h-2 rounded-full" style={{ background: f.color }} />}
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              category === c
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {CATEGORY_LABEL[c] || c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Venue list */}
        <div className="order-2 lg:order-1 rounded-2xl glass-panel border border-white/10 overflow-hidden flex flex-col max-h-[420px] lg:max-h-[560px]">
          <div className="overflow-y-auto divide-y divide-white/5">
            {visible.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No places match these filters. Try another wait time or category, or choose a different location above.
              </div>
            )}
            {visible.map((loc) => {
              const st = STATUS_STYLE[loc.wait_status] || STATUS_STYLE.LOW_WAIT;
              const active = loc.id === selectedId;
              return (
                <div
                  key={loc.id}
                  id={`map-card-${loc.id}`}
                  onClick={() => select(loc)}
                  className={`p-3 cursor-pointer transition-colors ${
                    active ? 'bg-brand-500/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-dark-800">
                      <PlaceImg
                        loc={loc}
                        src={loc.banner_url || venueArtDataUri(loc.category)}
                        alt={loc.name}
                        className="w-full h-full object-cover"
                        showCredit={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">{loc.name}</span>
                        {loc.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {CATEGORY_LABEL[loc.category] || loc.category} - {loc.distance_km} km
                      </p>
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `${st.color}26`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-brand-400" />
                        {loc.people_waiting}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-400" />~{loc.estimated_wait_minutes} min
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinQueue(loc);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold"
                    >
                      Join <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="order-1 lg:order-2 relative rounded-2xl overflow-hidden border border-white/10 h-[360px] lg:h-[560px]">
          <div ref={mapDivRef} className="absolute inset-0" />

          {pinMode && (
            <div
              className="absolute top-3 left-3 px-3 py-2 rounded-xl glass-panel border border-brand-500/50 text-xs font-semibold text-white"
              style={{ zIndex: 1000 }}
            >
              Click anywhere on the map to set your location
            </div>
          )}

          <div className="absolute top-3 right-3 flex gap-2" style={{ zIndex: 1000 }}>
            {onPickLocation && (
              <button
                type="button"
                onClick={() => setPinMode((p) => !p)}
                title="Click the map to set your location"
                className={`h-9 px-3 rounded-xl glass-panel border text-xs font-bold flex items-center gap-1.5 ${
                  pinMode ? 'border-brand-500 text-brand-300' : 'border-white/15 text-slate-200 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
                {pinMode ? 'Cancel pin' : 'Pin on map'}
              </button>
            )}
            <button
              type="button"
              onClick={fitToFocus}
              title="Recenter on nearby places"
              className="w-9 h-9 rounded-xl glass-panel border border-white/15 text-slate-200 hover:text-white flex items-center justify-center"
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              title={dark ? 'Switch to light map' : 'Switch to dark map'}
              className="w-9 h-9 rounded-xl glass-panel border border-white/15 text-slate-200 hover:text-white flex items-center justify-center"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div
            className="absolute bottom-3 left-3 px-3 py-2 rounded-xl glass-panel border border-white/15 text-[10px] text-slate-200 space-y-1"
            style={{ zIndex: 1000 }}
          >
            {(Object.keys(STATUS_STYLE) as WaitStatus[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_STYLE[k].color }} />
                {STATUS_STYLE[k].label} ({STATUS_STYLE[k].range})
              </div>
            ))}
            <div className="text-slate-400">Number on pin = people waiting</div>
          </div>
        </div>
      </div>
    </div>
  );
};