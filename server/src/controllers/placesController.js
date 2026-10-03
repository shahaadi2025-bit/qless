import { mockStore } from '../db.js';

// Location-based place discovery from OpenStreetMap (Overpass + Nominatim): free, no API key.
// Discovered places are added to the same in-memory store the rest of QLESS already uses,
// so they appear in /api/explore/locations and can run live queues like the seeded venues.

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT =
  process.env.OSM_USER_AGENT ||
  'QLESS-student-project/1.0 (https://github.com/shahaadi2025-bit/qless)';

const MAX_RADIUS_M = 5000;
const DEFAULT_RADIUS_M = 2500;
const MAX_RESULTS = 60;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_OSM_LOCATIONS = 400; // memory guard for the free tier

// Keys match the business_type values already used by QLESS.
const TYPE_FILTERS = {
  HEALTHCARE: ['["amenity"~"^(hospital|clinic|doctors)$"]', '["healthcare"="laboratory"]'],
  RESTAURANT: ['["amenity"~"^(restaurant|cafe)$"]'],
  RELIGIOUS: ['["amenity"="place_of_worship"]'],
  BANKING: ['["amenity"="bank"]'],
  SALON: ['["shop"~"^(hairdresser|beauty)$"]']
};
const ALL_TYPES = Object.keys(TYPE_FILTERS);

const TYPE_STYLE = {
  HEALTHCARE: { color: '#0284C7', service: { name: 'Walk-in Consultation', code: 'OPD', minutes: 12 } },
  RESTAURANT: { color: '#EA580C', service: { name: 'Table for Walk-ins', code: 'TBL', minutes: 40 } },
  RELIGIOUS: { color: '#D97706', service: { name: 'General Darshan Line', code: 'DAR', minutes: 15 } },
  BANKING: { color: '#2563EB', service: { name: 'Counter Service', code: 'CSH', minutes: 10 } },
  SALON: { color: '#DB2777', service: { name: 'Walk-in Service', code: 'SVC', minutes: 30 } }
};

function businessTypeOf(t) {
  if (/^(hospital|clinic|doctors)$/.test(t.amenity || '') || t.healthcare === 'laboratory') return 'HEALTHCARE';
  if (/^(restaurant|cafe)$/.test(t.amenity || '')) return 'RESTAURANT';
  if (t.amenity === 'place_of_worship') return 'RELIGIOUS';
  if (t.amenity === 'bank') return 'BANKING';
  if (/^(hairdresser|beauty)$/.test(t.shop || '')) return 'SALON';
  return null;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildQuery(lat, lng, radius, category) {
  const types = category === 'ALL' ? ALL_TYPES : [category];
  const body = types
    .flatMap(t => TYPE_FILTERS[t])
    .map(f => `nwr${f}(around:${radius},${lat},${lng});`)
    .join('\n');
  return `[out:json][timeout:25];\n(\n${body}\n);\nout center 150;`;
}

async function fetchOverpass(query) {
  let lastErr;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(28000)
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`); // 429/504: try the next mirror
      const json = await res.json();
      return json.elements || [];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Overpass unavailable');
}

// Turn one OSM element into a QLESS organization + location + default service.
function addOsmPlace(el) {
  const t = el.tags || {};
  const lat = el.lat ?? (el.center && el.center.lat);
  const lon = el.lon ?? (el.center && el.center.lon);
  const type = businessTypeOf(t);
  if (!t.name || !type || lat == null || lon == null) return null; // unnamed places are useless for queues

  const id = `osm-${el.type}-${el.id}`;
  if (mockStore.locations.some(l => l.id === id)) return id;

  const style = TYPE_STYLE[type];
  const orgId = `org-${id}`;
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb']].filter(Boolean).join(', ');

  mockStore.organizations.push({
    id: orgId,
    name: String(t.name).slice(0, 120),
    slug: slugify(`${t.name}-${el.id}`),
    business_type: type,
    is_verified: 0,
    platform_commission_rate: 0,
    contact_email: '',
    contact_phone: t.phone || t['contact:phone'] || '',
    brand_color: style.color
  });
  mockStore.locations.push({
    id,
    org_id: orgId,
    name: String(t.name).slice(0, 120),
    address: address || t.opening_hours || 'Address not listed on OpenStreetMap',
    city: t['addr:city'] || '',
    state: '',
    latitude: lat,
    longitude: lon,
    google_place_id: null,
    travel_buffer_minutes: 15,
    banner_url: null,
    source: 'osm',
    added_at: Date.now()
  });
  mockStore.services.push({
    id: `srv-${id}`,
    location_id: id,
    name: style.service.name,
    service_code: style.service.code,
    description: 'Join the live walk-in queue',
    avg_duration_minutes: style.service.minutes,
    base_price: 0.0,
    is_paid: 0,
    is_paused: 0
  });
  return id;
}

// Keep memory bounded: drop the oldest discovered places that have no queue activity.
function pruneOsm() {
  const osm = mockStore.locations.filter(l => l.source === 'osm');
  if (osm.length <= MAX_OSM_LOCATIONS) return;
  const busy = new Set(mockStore.tokens.map(t => t.location_id));
  const drop = osm
    .filter(l => !busy.has(l.id))
    .sort((a, b) => a.added_at - b.added_at)
    .slice(0, osm.length - MAX_OSM_LOCATIONS);
  if (!drop.length) return;
  const ids = new Set(drop.map(l => l.id));
  const orgIds = new Set(drop.map(l => l.org_id));
  mockStore.locations = mockStore.locations.filter(l => !ids.has(l.id));
  mockStore.services = mockStore.services.filter(s => !ids.has(s.location_id));
  mockStore.organizations = mockStore.organizations.filter(o => !orgIds.has(o.id));
}

const cache = new Map();    // cellKey -> time fetched
const inflight = new Map(); // cellKey -> Promise (de-duplicates concurrent lookups)

// Fetch real places around a point and add them to the store. Never throws.
export async function discoverNearby(lat, lng, radius = DEFAULT_RADIUS_M, category = 'ALL') {
  const cellLat = Math.round(lat * 100) / 100; // ~1 km cells so nearby users share one lookup
  const cellLng = Math.round(lng * 100) / 100;
  const key = `${category}:${cellLat}:${cellLng}:${Math.ceil(radius / 1000)}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit < CACHE_TTL_MS) return { fetched: false, stale: false };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const elements = await fetchOverpass(
        buildQuery(cellLat, cellLng, Math.min(radius, MAX_RADIUS_M) + 800, category)
      );
      let added = 0;
      for (const el of elements) if (addOsmPlace(el)) added++;
      pruneOsm();
      if (cache.size > 1000) cache.clear();
      cache.set(key, Date.now());
      return { fetched: true, stale: false, added };
    } catch (err) {
      console.warn('[places] Overpass lookup failed:', err.message);
      return { fetched: false, stale: true, error: err.message };
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

// Discovered places shaped like the rows the explore controller already expects.
export function osmLocationRows() {
  return mockStore.locations
    .filter(l => l.source === 'osm')
    .map(loc => {
      const org = mockStore.organizations.find(o => o.id === loc.org_id) || {};
      return {
        ...loc,
        org_name: org.name,
        business_type: org.business_type,
        is_verified: org.is_verified,
        brand_color: org.brand_color
      };
    });
}

// GET /api/places/nearby?lat=19.07&lng=72.87&radius=2500&category=ALL|HEALTHCARE|RESTAURANT|RELIGIOUS|BANKING|SALON
export async function getNearbyPlaces(req, res) {
  try {
    const rawLat = String(req.query.lat ?? '').trim();
    const rawLng = String(req.query.lng ?? '').trim();
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    const category = String(req.query.category || 'ALL').toUpperCase();
    const radius = Math.min(Math.max(Number(req.query.radius) || DEFAULT_RADIUS_M, 200), MAX_RADIUS_M);

    if (!rawLat || !rawLng || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, message: 'lat and lng are required numbers' });
    }
    if (category !== 'ALL' && !TYPE_FILTERS[category]) {
      return res.status(400).json({ success: false, message: `category must be ALL or one of ${ALL_TYPES.join(', ')}` });
    }

    const result = await discoverNearby(lat, lng, radius, category);

    const places = osmLocationRows()
      .filter(l => category === 'ALL' || l.business_type === category)
      .map(l => ({ ...l, distance_m: Math.round(haversineM(lat, lng, l.latitude, l.longitude)) }))
      .filter(l => l.distance_m <= radius)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, MAX_RESULTS)
      .map(l => ({
        id: l.id,
        name: l.name,
        category: l.business_type,
        address: l.address,
        latitude: l.latitude,
        longitude: l.longitude,
        distance_m: l.distance_m
      }));

    return res.json({
      success: true,
      stale: result.stale,
      attribution: '\u00a9 OpenStreetMap contributors',
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Nearby places error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load nearby places' });
  }
}

let lastNominatimCall = 0;

// GET /api/places/search?q=Andheri%20Mumbai  -> geocode a typed area (used when GPS is denied)
export async function searchArea(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.status(400).json({ success: false, message: 'q must be at least 3 characters' });
  try {
    const wait = lastNominatimCall + 1100 - Date.now(); // public Nominatim: max 1 request/second
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastNominatimCall = Date.now();
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const data = await r.json();
    return res.json({
      success: true,
      data: data.map(d => ({ name: d.display_name, latitude: Number(d.lat), longitude: Number(d.lon) }))
    });
  } catch (error) {
    console.warn('[places] Nominatim lookup failed:', error.message);
    return res.status(502).json({ success: false, message: 'Area search is temporarily unavailable' });
  }
}