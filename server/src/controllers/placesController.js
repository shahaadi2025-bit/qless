import { mockStore } from '../db.js';

// Location-based place discovery from OpenStreetMap, free and keyless.
// Sources: Overpass (primary, nearest-first), Nominatim (automatic fallback + typed place search).
// Discovered places are added to the same in-memory store QLESS already uses, so they appear in
// /api/explore/locations and can run live queues like the seeded venues.

const OVERPASS_MIRRORS = (
  process.env.OVERPASS_URLS ||
  'https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const USER_AGENT =
  process.env.OSM_USER_AGENT ||
  'QLESS-student-project/1.0 (https://github.com/shahaadi2025-bit/qless)';

const MAX_RADIUS_M = 5000;
const DEFAULT_RADIUS_M = 2500;
const QUERY_RADIUS_CAP_M = 3000;
const MAX_RESULTS = 150;
const PER_TYPE_LIMIT = 25;    // keep the nearest N places of each type per search
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_TTL_MS = 15 * 60 * 1000;
const FALLBACK_TTL_MS = 60 * 60 * 1000;
const MAX_OSM_LOCATIONS = 900; // memory guard for the free tier
const NOMINATIM_SPACING_MS = Number(process.env.NOMINATIM_SPACING_MS) || 1100;

// Any named place of these kinds is discovered. Keys are the business_type values used across QLESS.
const TYPE_STYLE = {
  HEALTHCARE: { color: '#0284C7', service: { name: 'Walk-in Consultation', code: 'OPD', minutes: 12 } },
  PHARMACY: { color: '#10b981', service: { name: 'Pharmacy Counter', code: 'RX', minutes: 6 } },
  RESTAURANT: { color: '#EA580C', service: { name: 'Table for Walk-ins', code: 'TBL', minutes: 40 } },
  RELIGIOUS: { color: '#D97706', service: { name: 'General Darshan Line', code: 'DAR', minutes: 15 } },
  BANKING: { color: '#2563EB', service: { name: 'Counter Service', code: 'CSH', minutes: 10 } },
  SALON: { color: '#DB2777', service: { name: 'Walk-in Service', code: 'SVC', minutes: 30 } },
  EDUCATION: { color: '#8b5cf6', service: { name: 'Admissions / Help Desk', code: 'EDU', minutes: 15 } },
  GOVERNMENT: { color: '#64748b', service: { name: 'Service Counter', code: 'GOV', minutes: 20 } },
  SHOPPING: { color: '#f43f5e', service: { name: 'Billing Counter', code: 'BIL', minutes: 8 } },
  TRANSPORT: { color: '#06b6d4', service: { name: 'Ticket Counter', code: 'TKT', minutes: 10 } },
  ENTERTAINMENT: { color: '#a855f7', service: { name: 'Box Office', code: 'BOX', minutes: 8 } },
  FUEL: { color: '#eab308', service: { name: 'Fuel Pump Queue', code: 'FUL', minutes: 5 } },
  LODGING: { color: '#14b8a6', service: { name: 'Front Desk Check-in', code: 'HTL', minutes: 10 } },
  LEISURE: { color: '#22c55e', service: { name: 'Entry / Reception', code: 'ENT', minutes: 8 } },
  ATTRACTION: { color: '#f97316', service: { name: 'Entry Ticket Line', code: 'ATR', minutes: 15 } },
  SERVICES: { color: '#94a3b8', service: { name: 'Service Desk', code: 'SRV', minutes: 12 } }
};
const ALL_TYPES = Object.keys(TYPE_STYLE);

// Broad Overpass filters (every named place of these kinds, not a short list).
const AMENITIES =
  'hospital|clinic|doctors|dentist|veterinary|pharmacy|restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|' +
  'place_of_worship|bank|bureau_de_change|college|university|school|kindergarten|library|townhall|courthouse|' +
  'post_office|police|fire_station|community_centre|bus_station|ferry_terminal|cinema|theatre|nightclub|' +
  'arts_centre|events_venue|fuel|charging_station|car_wash|coworking_space|marketplace|laundry|car_rental|' +
  'car_repair|nursing_home|childcare';
const BROAD_FILTERS = [
  `["amenity"~"^(${AMENITIES})$"]`,
  '["shop"]',
  '["tourism"~"^(hotel|guest_house|hostel|motel|apartment|attraction|museum|gallery|zoo|theme_park|aquarium|viewpoint)$"]',
  '["leisure"~"^(park|garden|fitness_centre|sports_centre|swimming_pool|stadium|water_park|amusement_arcade|bowling_alley)$"]',
  '["office"]',
  '["healthcare"]',
  '["railway"="station"]',
  '["historic"~"^(monument|memorial|castle|fort|ruins|archaeological_site|temple|tomb)$"]'
];

// Search words for the Nominatim fallback.
const FALLBACK_TERMS = {
  HEALTHCARE: 'hospital',
  PHARMACY: 'pharmacy',
  RESTAURANT: 'restaurant',
  RELIGIOUS: 'temple',
  BANKING: 'bank',
  SALON: 'salon',
  EDUCATION: 'college',
  TRANSPORT: 'railway station',
  SHOPPING: 'supermarket',
  LODGING: 'hotel'
};
const FALLBACK_ORDER = Object.keys(FALLBACK_TERMS);

function businessTypeOf(t) {
  const a = t.amenity || '';
  const s = t.shop || '';
  const tr = t.tourism || '';
  const l = t.leisure || '';
  if (a === 'pharmacy' || t.healthcare === 'pharmacy') return 'PHARMACY';
  if (/^(hospital|clinic|doctors|dentist|veterinary)$/.test(a) || t.healthcare) return 'HEALTHCARE';
  if (/^(restaurant|cafe|fast_food|bar|pub|food_court|ice_cream)$/.test(a)) return 'RESTAURANT';
  if (a === 'place_of_worship') return 'RELIGIOUS';
  if (/^(bank|bureau_de_change)$/.test(a)) return 'BANKING';
  if (/^(hairdresser|beauty)$/.test(s)) return 'SALON';
  if (/^(college|university|school|kindergarten|library)$/.test(a)) return 'EDUCATION';
  if (/^(townhall|courthouse|post_office|police|fire_station|community_centre)$/.test(a) || t.office === 'government') return 'GOVERNMENT';
  if (t.railway === 'station' || /^(bus_station|ferry_terminal)$/.test(a)) return 'TRANSPORT';
  if (/^(cinema|theatre|nightclub|arts_centre|events_venue)$/.test(a) || /^(stadium|amusement_arcade|bowling_alley|water_park)$/.test(l)) return 'ENTERTAINMENT';
  if (/^(fuel|charging_station|car_wash)$/.test(a)) return 'FUEL';
  if (/^(hotel|guest_house|hostel|motel|apartment)$/.test(tr)) return 'LODGING';
  if (/^(attraction|museum|gallery|zoo|theme_park|aquarium|viewpoint)$/.test(tr) || t.historic) return 'ATTRACTION';
  if (/^(park|garden|fitness_centre|sports_centre|swimming_pool)$/.test(l)) return 'LEISURE';
  if (s) return 'SHOPPING';
  if (t.office || /^(coworking_space|marketplace|laundry|car_rental|car_repair|nursing_home|childcare)$/.test(a)) return 'SERVICES';
  return null;
}

// Classes in a Nominatim result that mean "a named place" (as opposed to a suburb, road or boundary).
const PLACE_CLASSES = ['amenity', 'shop', 'tourism', 'leisure', 'office', 'healthcare', 'historic', 'building', 'craft', 'man_made', 'aeroway', 'railway', 'public_transport'];

function typeFromNominatim(d) {
  const c = d.category || d.class;
  const ty = d.type || '';
  if (!c || !ty) return null;
  return businessTypeOf({ [c]: ty });
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

// ---------- Overpass ----------

// Three rings (250 m / 700 m / full radius), each with its own generous limit, so the places closest to the
// user are always included even in very dense areas. Only named places are requested.
function buildQuery(lat, lng, radius) {
  const ring = r => BROAD_FILTERS.map(f => `nwr${f}["name"](around:${r},${lat},${lng});`).join('\n');
  const r1 = Math.min(250, radius);
  const r2 = Math.min(700, radius);
  return `[out:json][timeout:35];
(
${ring(r1)}
)->.r1;
(
${ring(r2)}
)->.r2;
(
${ring(radius)}
)->.r3;
.r1 out center 400;
(.r2; - .r1;);
out center 500;
(.r3; - .r2;);
out center 700;`;
}

async function fetchOne(url, query) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: 'data=' + encodeURIComponent(query),
    signal: AbortSignal.timeout(38000)
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = await res.json();
  // Overpass answers HTTP 200 with a "remark" when a query times out or runs out of memory.
  // That is a failure, not an empty area, so it must never be cached as "no places".
  if (json.remark && /(timed out|out of memory|error)/i.test(String(json.remark))) {
    throw new Error(`Overpass remark: ${String(json.remark).slice(0, 80)}`);
  }
  return json.elements || [];
}

// Try mirrors one after another; start the next early if the current one is slow.
function fetchOverpass(query) {
  return new Promise((resolve, reject) => {
    let started = 0;
    let failed = 0;
    let settled = false;
    let lastErr;
    const startNext = () => {
      if (settled || started >= OVERPASS_MIRRORS.length) return;
      const url = OVERPASS_MIRRORS[started++];
      const timer = started < OVERPASS_MIRRORS.length ? setTimeout(startNext, 7000) : null;
      fetchOne(url, query)
        .then(elements => {
          if (timer) clearTimeout(timer);
          if (!settled) {
            settled = true;
            resolve(elements);
          }
        })
        .catch(err => {
          if (timer) clearTimeout(timer);
          lastErr = err;
          failed++;
          if (failed >= OVERPASS_MIRRORS.length) {
            if (!settled) reject(lastErr);
          } else {
            startNext();
          }
        });
    };
    if (OVERPASS_MIRRORS.length === 0) return reject(new Error('No Overpass server configured'));
    startNext();
  });
}

// Tags that can lead to a real photo of the place.
function mediaFrom(t) {
  const m = {};
  if (t.image) m.image = t.image;
  if (t.wikimedia_commons) m.wikimedia_commons = t.wikimedia_commons;
  if (t.wikidata) m.wikidata = t.wikidata;
  if (t.wikipedia) m.wikipedia = t.wikipedia;
  return m;
}

function rowFromElement(el) {
  const t = el.tags || {};
  const type = businessTypeOf(t);
  const lat = el.lat ?? (el.center && el.center.lat);
  const lng = el.lon ?? (el.center && el.center.lon);
  if (!t.name || !type || lat == null || lng == null) return null;
  return {
    id: `osm-${el.type}-${el.id}`,
    name: String(t.name),
    lat,
    lng,
    type,
    address: [t['addr:housenumber'], t['addr:street'], t['addr:suburb']].filter(Boolean).join(', '),
    city: t['addr:city'] || '',
    phone: t.phone || t['contact:phone'] || '',
    media: mediaFrom(t)
  };
}

function rowFromNominatim(d, forcedType) {
  const type = typeFromNominatim(d) || forcedType || null;
  const lat = Number(d.lat);
  const lng = Number(d.lon);
  const name = d.name || '';
  if (!type || !name || !Number.isFinite(lat) || !Number.isFinite(lng) || !d.osm_type || !d.osm_id) return null;
  const a = d.address || {};
  return {
    id: `osm-${d.osm_type}-${d.osm_id}`,
    name: String(name),
    lat,
    lng,
    type,
    address: [a.house_number, a.road, a.suburb].filter(Boolean).join(', '),
    city: a.city || a.town || a.village || '',
    phone: '',
    media: mediaFrom(d.extratags || {})
  };
}

// Turn one normalised place into a QLESS organization + location + default service + counter.
function addPlaceRecord(r) {
  if (mockStore.locations.some(l => l.id === r.id)) return r.id;
  const style = TYPE_STYLE[r.type];
  if (!style) return null;
  const orgId = `org-${r.id}`;

  mockStore.organizations.push({
    id: orgId,
    name: r.name.slice(0, 120),
    slug: slugify(`${r.name}-${r.id}`),
    business_type: r.type,
    is_verified: 0,
    platform_commission_rate: 0,
    contact_email: '',
    contact_phone: r.phone || '',
    brand_color: style.color
  });
  mockStore.locations.push({
    id: r.id,
    org_id: orgId,
    name: r.name.slice(0, 120),
    address: r.address || 'Address not listed on OpenStreetMap',
    city: r.city || '',
    state: '',
    latitude: r.lat,
    longitude: r.lng,
    google_place_id: null,
    travel_buffer_minutes: 15,
    banner_url: null,
    place_type: r.type,
    media: r.media || {},
    source: 'osm',
    added_at: Date.now()
  });
  mockStore.services.push({
    id: `srv-${r.id}`,
    location_id: r.id,
    name: style.service.name,
    service_code: style.service.code,
    description: 'Join the live walk-in queue',
    avg_duration_minutes: style.service.minutes,
    base_price: 0.0,
    is_paid: 0,
    is_paused: 0
  });
  mockStore.counters.push({
    id: `cnt-${r.id}-01`,
    location_id: r.id,
    counter_number: 'Desk 01',
    name: 'Main Counter',
    status: 'OPEN',
    current_staff_id: null,
    active_token_id: null
  });
  return r.id;
}

// Keep only the nearest PER_TYPE_LIMIT places of each type, so the places closest to the user always make it in.
function ingestRows(rows, lat, lng) {
  const byType = new Map();
  for (const r of rows) {
    r.dist = haversineM(lat, lng, r.lat, r.lng);
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type).push(r);
  }
  let count = 0;
  for (const list of byType.values()) {
    list.sort((a, b) => a.dist - b.dist);
    for (const r of list.slice(0, PER_TYPE_LIMIT)) {
      if (addPlaceRecord(r)) count++;
    }
  }
  return count;
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
  mockStore.counters = mockStore.counters.filter(c => !ids.has(c.location_id));
  mockStore.organizations = mockStore.organizations.filter(o => !orgIds.has(o.id));
}

// ---------- Nominatim (rate-limited to 1 request per second) ----------

let lastNominatimSlot = 0;

async function nominatimSlot() {
  const slot = Math.max(Date.now(), lastNominatimSlot + NOMINATIM_SPACING_MS);
  lastNominatimSlot = slot;
  const wait = slot - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

// Used automatically when Overpass is unavailable: one bounded search per place type.
async function nominatimFallback(lat, lng, radius, types) {
  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map(n => n.toFixed(6)).join(',');
  const order = types.length > 1 ? FALLBACK_ORDER.filter(t => types.includes(t)) : types;
  const rows = [];
  const started = Date.now();
  for (const type of order) {
    if (Date.now() - started > 25000) break;
    try {
      await nominatimSlot();
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=25&bounded=1' +
        `&viewbox=${viewbox}&q=${encodeURIComponent(FALLBACK_TERMS[type])}`;
      const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const data = await r.json();
      for (const d of data) {
        const forced = ['amenity', 'shop', 'healthcare', 'railway'].includes(d.category) ? type : null;
        const row = rowFromNominatim(d, forced);
        if (row) rows.push(row);
      }
    } catch {
      /* try the next place type */
    }
  }
  return ingestRows(rows, lat, lng);
}

// ---------- discovery ----------

const cache = new Map();    // cellKey -> { at, ttl, source }
const inflight = new Map(); // cellKey -> Promise (de-duplicates concurrent lookups)

// Find real places around a point and add them to the store. Never throws.
export async function discoverNearby(lat, lng, radius = DEFAULT_RADIUS_M, category = 'ALL') {
  const qRadius = Math.min(radius, QUERY_RADIUS_CAP_M);
  const cellLat = (Math.round(lat * 200) / 200).toFixed(3); // ~550 m cells; the query itself uses the exact point
  const cellLng = (Math.round(lng * 200) / 200).toFixed(3);
  const key = `ALL:${cellLat}:${cellLng}:${Math.ceil(qRadius / 500)}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return { fetched: false, stale: false, source: 'cache' };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      if (cache.size > 1000) cache.clear();
      let added = 0;
      let source = 'overpass';
      let ok = false;
      try {
        const elements = await fetchOverpass(buildQuery(lat, lng, qRadius));
        added = ingestRows(elements.map(rowFromElement).filter(Boolean), lat, lng);
        ok = true;
        cache.set(key, { at: Date.now(), ttl: added > 0 ? CACHE_TTL_MS : EMPTY_TTL_MS, source });
      } catch (err) {
        console.warn('[places] Overpass lookup failed, trying fallback:', err.message);
        added = await nominatimFallback(lat, lng, qRadius, ALL_TYPES);
        if (added > 0) {
          ok = true;
          source = 'nominatim';
          cache.set(key, { at: Date.now(), ttl: FALLBACK_TTL_MS, source });
        }
      }
      pruneOsm();
      return ok
        ? { fetched: true, stale: false, added, source }
        : { fetched: false, stale: true, added: 0, source: 'none' };
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

// GET /api/places/nearby?lat=19.07&lng=72.87&radius=2500&category=ALL|HEALTHCARE|PHARMACY|...
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
    if (category !== 'ALL' && !TYPE_STYLE[category]) {
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
      source: result.source,
      attribution: '\u00a9 OpenStreetMap contributors',
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Nearby places error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load nearby places' });
  }
}

// ---------- typed search + reverse geocoding ----------

// Bias typed searches to one country (default India). Set SEARCH_COUNTRY to another code, or leave it empty for worldwide.
const SEARCH_COUNTRY = (process.env.SEARCH_COUNTRY ?? 'in').trim();

// "Borivali West, Mumbai" style label from a Nominatim address object.
function shortAddress(a) {
  if (!a) return '';
  const area = a.suburb || a.neighbourhood || a.city_district || a.quarter || a.village || a.hamlet;
  const city = a.city || a.town || a.municipality || a.county || a.state_district;
  const parts = [area, city].filter(Boolean);
  if (parts.length === 2 && parts[0] === parts[1]) parts.pop();
  return parts.join(', ') || a.state || '';
}

// GET /api/places/search?q=Kokilaben%20Hospital
// Finds areas AND specific places. Any matching hospital, bank, cafe, etc. is added as a queue venue.
export async function searchArea(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.status(400).json({ success: false, message: 'q must be at least 3 characters' });
  try {
    await nominatimSlot();
    let url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=6&q=' + encodeURIComponent(q);
    if (SEARCH_COUNTRY) url += '&countrycodes=' + encodeURIComponent(SEARCH_COUNTRY);
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const data = await r.json();
    const hits = data.map(d => {
      const row = rowFromNominatim(d, PLACE_CLASSES.includes(d.category) ? 'SERVICES' : null);
      const venueId = row ? addPlaceRecord(row) : null;
      return {
        name: d.display_name,
        label: shortAddress(d.address) || String(d.display_name || '').split(',').slice(0, 2).join(',').trim(),
        latitude: Number(d.lat),
        longitude: Number(d.lon),
        kind: venueId ? 'place' : 'area',
        venue_id: venueId || undefined
      };
    });
    pruneOsm();
    return res.json({ success: true, data: hits });
  } catch (error) {
    console.warn('[places] Nominatim search failed:', error.message);
    return res.status(502).json({ success: false, message: 'Area search is temporarily unavailable' });
  }
}

const reverseCache = new Map();

// GET /api/places/reverse?lat=19.2&lng=72.85  -> readable area name for coordinates
export async function reverseGeocode(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ success: false, message: 'lat and lng are required numbers' });
  }
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (reverseCache.has(key)) return res.json({ success: true, data: reverseCache.get(key) });
  try {
    await nominatimSlot();
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lng}`;
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const d = await r.json();
    const data = { name: d.display_name || '', short: shortAddress(d.address) || 'Selected location' };
    if (reverseCache.size > 500) reverseCache.clear();
    reverseCache.set(key, data);
    return res.json({ success: true, data });
  } catch (error) {
    console.warn('[places] Nominatim reverse failed:', error.message);
    return res.status(502).json({ success: false, message: 'Could not look up the name of this location' });
  }
}

// ---------- real photos of places (all free sources) ----------
// Order: OSM "image" tag -> Wikimedia Commons tag -> Wikidata photo -> Wikipedia thumbnail ->
// geotagged Wikimedia Commons photo within 50 m -> Mapillary street-level photo (needs a free MAPILLARY_TOKEN).
// Photos are resolved on demand (when a card/pin is shown), one place at a time, and cached.

const imageCache = new Map();    // id -> { at, ttl, data }
const imageInflight = new Map(); // id -> Promise
const imageWaiting = [];
let imageActive = 0;
const IMAGE_CONCURRENCY = 3;
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
const NO_IMAGE_TTL_MS = 60 * 60 * 1000;
const COMMONS_CREDIT = 'Photo: Wikimedia Commons';

function limited(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      imageActive++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          imageActive--;
          const next = imageWaiting.shift();
          if (next) next();
        });
    };
    if (imageActive < IMAGE_CONCURRENCY) run();
    else imageWaiting.push(run);
  });
}

async function getJson(url, timeoutMs = 7000) {
  const r = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const commonsFile = (name, width = 800) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(String(name).replace(/^File:/i, '').replace(/ /g, '_'))}?width=${width}`;

// First usable photo (jpeg/png/webp) from a MediaWiki imageinfo result, closest first.
function firstImage(json) {
  const pages = Object.values((json && json.query && json.query.pages) || {});
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const info = p.imageinfo && p.imageinfo[0];
    if (info && /^image\/(jpeg|png|webp)$/.test(info.mime || '') && (info.thumburl || info.url)) {
      return info.thumburl || info.url;
    }
  }
  return null;
}

const NAME_STOP = new Set(['the', 'of', 'and', 'in', 'at', 'for', 'shri', 'sri']);
function nameTokens(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !NAME_STOP.has(w));
}
// Every word of the place's name must appear in the page/file title (plural forms count),
// so "Apollo Clinic" can never match "Apollo Hospitals".
function nameMatches(title, name) {
  const need = nameTokens(name);
  if (need.length === 0) return false;
  const have = nameTokens(title);
  return need.every(w => have.some(h => h === w || h.startsWith(w)));
}
// Name searches are only trusted for one-of-a-kind places, not chain outlets (restaurants, banks, pharmacies...).
const NAME_SEARCH_TYPES = new Set(['HEALTHCARE', 'RELIGIOUS', 'EDUCATION', 'GOVERNMENT', 'TRANSPORT', 'ATTRACTION', 'ENTERTAINMENT', 'LODGING', 'LEISURE']);
function worthNameSearch(loc) {
  return NAME_SEARCH_TYPES.has(loc.place_type) || (loc.place_type === 'SHOPPING' && /mall|market|plaza|centre|center|complex|bazaar|bazar/i.test(loc.name || ''));
}
function pagesByIndex(json) {
  return Object.values((json && json.query && json.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
}

async function resolveImage(loc) {
  const m = loc.media || {};

  // 1) a direct image URL stored in OpenStreetMap
  if (typeof m.image === 'string' && /^https:\/\//i.test(m.image) && (/\.(jpe?g|png|webp)(\?|$)/i.test(m.image) || /wikimedia\.org/i.test(m.image))) {
    return { url: m.image, source: 'osm', credit: 'Photo linked from OpenStreetMap' };
  }

  // 2) Wikimedia Commons file or category named in OpenStreetMap
  if (m.wikimedia_commons) {
    const v = String(m.wikimedia_commons).split(';')[0].trim();
    if (/^file:/i.test(v)) return { url: commonsFile(v), source: 'commons', credit: COMMONS_CREDIT };
    if (/^category:/i.test(v)) {
      try {
        const j = await getJson(
          'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtype=file&gcmlimit=3' +
            `&gcmtitle=${encodeURIComponent(v)}&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=800&format=json`
        );
        const u = firstImage(j);
        if (u) return { url: u, source: 'commons', credit: COMMONS_CREDIT };
      } catch {
        /* next source */
      }
    }
  }

  // 3) the main photo of the place's Wikidata entry
  if (/^Q\d+$/.test(m.wikidata || '')) {
    try {
      const j = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${m.wikidata}&property=P18&format=json`);
      const f = j && j.claims && j.claims.P18 && j.claims.P18[0] && j.claims.P18[0].mainsnak && j.claims.P18[0].mainsnak.datavalue && j.claims.P18[0].mainsnak.datavalue.value;
      if (f) return { url: commonsFile(f), source: 'wikidata', credit: COMMONS_CREDIT };
    } catch {
      /* next source */
    }
  }

  // 4) the Wikipedia article's lead image
  if (m.wikipedia) {
    const mm = /^([a-z-]{2,10}):(.+)$/i.exec(String(m.wikipedia));
    if (mm) {
      try {
        const j = await getJson(
          `https://${mm[1].toLowerCase()}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(mm[2].replace(/ /g, '_'))}`
        );
        const u = j && j.thumbnail && j.thumbnail.source;
        if (u) return { url: u, source: 'wikipedia', credit: 'Photo: Wikipedia' };
      } catch {
        /* next source */
      }
    }
  }

  // 4b) search Wikipedia and Wikimedia Commons by the place's name (well-known places with no tags)
  if (worthNameSearch(loc)) {
    const query = `${loc.name} ${loc.city || ''}`.trim();
    try {
      const j = await getJson(
        'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=5&prop=pageimages&piprop=thumbnail&pithumbsize=800&pilimit=5&format=json' +
          `&gsrsearch=${encodeURIComponent(query)}`
      );
      const hit = pagesByIndex(j).find(p => p.thumbnail && p.thumbnail.source && nameMatches(p.title, loc.name));
      if (hit) return { url: hit.thumbnail.source, source: 'wikipedia-search', credit: 'Photo: Wikipedia' };
    } catch {
      /* next source */
    }
    try {
      const j = await getJson(
        'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=800&format=json' +
          `&gsrsearch=${encodeURIComponent(query)}`
      );
      for (const p of pagesByIndex(j)) {
        const info = p.imageinfo && p.imageinfo[0];
        const title = String(p.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
        if (info && /^image\/(jpeg|png|webp)$/.test(info.mime || '') && nameMatches(title, loc.name)) {
          return { url: info.thumburl || info.url, source: 'commons-search', credit: COMMONS_CREDIT };
        }
      }
    } catch {
      /* next source */
    }
  }

  // 5) a geotagged Wikimedia Commons photo taken within 50 m
  try {
    const j = await getJson(
      'https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggsnamespace=6&ggsradius=50&ggslimit=5' +
        `&ggscoord=${loc.latitude}%7C${loc.longitude}&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=800&format=json`
    );
    const u = firstImage(j);
    if (u) return { url: u, source: 'commons-nearby', credit: COMMONS_CREDIT };
  } catch {
    /* next source */
  }

  // 5b) big venues (hospitals, colleges, stations, temples...): a geotagged photo within 150 m whose name matches
  if (NAME_SEARCH_TYPES.has(loc.place_type)) {
    try {
      const j = await getJson(
        'https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggsnamespace=6&ggsradius=150&ggslimit=10' +
          `&ggscoord=${loc.latitude}%7C${loc.longitude}&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=800&format=json`
      );
      for (const p of pagesByIndex(j)) {
        const info = p.imageinfo && p.imageinfo[0];
        const title = String(p.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '');
        if (info && /^image\/(jpeg|png|webp)$/.test(info.mime || '') && nameMatches(title, loc.name)) {
          return { url: info.thumburl || info.url, source: 'commons-nearby', credit: COMMONS_CREDIT };
        }
      }
    } catch {
      /* next source */
    }
  }

  // 6) a street-level photo from Mapillary (free token from mapillary.com/developer)
  const token = process.env.MAPILLARY_TOKEN;
  if (token) {
    try {
      const d = 0.0004; // about 45 m
      const bbox = [loc.longitude - d, loc.latitude - d, loc.longitude + d, loc.latitude + d].map(n => n.toFixed(6)).join(',');
      const j = await getJson(
        `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}&fields=id,thumb_1024_url,computed_geometry&limit=25&bbox=${bbox}`
      );
      const items = ((j && j.data) || []).filter(i => i.thumb_1024_url && i.computed_geometry && i.computed_geometry.coordinates);
      items.sort((x, y) => {
        const dx = haversineM(loc.latitude, loc.longitude, x.computed_geometry.coordinates[1], x.computed_geometry.coordinates[0]);
        const dy = haversineM(loc.latitude, loc.longitude, y.computed_geometry.coordinates[1], y.computed_geometry.coordinates[0]);
        return dx - dy;
      });
      if (items[0]) return { url: items[0].thumb_1024_url, source: 'mapillary', credit: 'Street photo: Mapillary (CC BY-SA)' };
    } catch {
      /* no photo */
    }
  }
  return null;
}

// GET /api/places/image?id=osm-node-123  -> { url, source, credit } or data: null
export async function getPlaceImage(req, res) {
  const id = String(req.query.id || '');
  const loc = mockStore.locations.find(l => l.id === id);
  if (!loc) return res.status(404).json({ success: false, message: 'Place not found' });
  if (loc.banner_url) {
    return res.json({ success: true, data: { url: loc.banner_url, source: 'venue', credit: loc.image_credit || undefined } });
  }
  const hit = imageCache.get(id);
  if (hit && Date.now() - hit.at < hit.ttl) return res.json({ success: true, data: hit.data });
  try {
    let p = imageInflight.get(id);
    if (!p) {
      p = limited(() => resolveImage(loc));
      imageInflight.set(id, p);
      p.then(() => imageInflight.delete(id), () => imageInflight.delete(id));
    }
    const data = await p;
    if (imageCache.size > 2000) imageCache.clear();
    imageCache.set(id, { at: Date.now(), ttl: data ? IMAGE_TTL_MS : NO_IMAGE_TTL_MS, data });
    if (data) {
      loc.banner_url = data.url;
      loc.image_credit = data.credit;
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.warn('[places] image lookup failed:', error.message);
    return res.status(502).json({ success: false, message: 'Photo lookup is busy right now' });
  }
}