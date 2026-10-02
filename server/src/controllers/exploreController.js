import { getDbPool, isDbConnected, mockStore } from '../db.js';

// Haversine distance calculator in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.4; // default approximate distance
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export async function getExploreLocations(req, res) {
  try {
    const { category, search, userLat, userLng } = req.query;

    const uLat = parseFloat(userLat) || 18.9220; // default Mumbai reference
    const uLng = parseFloat(userLng) || 72.8347;

    let locationsData = [];

    if (isDbConnected()) {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT 
          l.id, l.name, l.address, l.city, l.latitude, l.longitude, l.google_place_id,
          l.travel_buffer_minutes, l.banner_url,
          o.id as org_id, o.name as org_name, o.business_type, o.is_verified, o.brand_color
        FROM locations l
        JOIN organizations o ON l.org_id = o.id
        WHERE l.is_active = TRUE
      `);
      locationsData = rows;
    } else {
      // In-memory fallback
      locationsData = mockStore.locations.map(loc => {
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

    // Enrich with live queue counts and calculate wait times
    const enriched = locationsData.map(loc => {
      // Get services for this location
      const locServices = mockStore.services.filter(s => s.location_id === loc.id);
      
      // Calculate active tokens
      const activeTokens = mockStore.tokens.filter(
        t => t.location_id === loc.id && ['WAITING', 'CALLED', 'SERVING'].includes(t.status)
      );

      const waitingTokens = activeTokens.filter(t => t.status === 'WAITING');
      const servingTokens = activeTokens.filter(t => t.status === 'SERVING');

      // Calculate aggregated wait
      const totalWaitMinutes = waitingTokens.reduce((acc, t) => acc + (t.estimated_wait_minutes || 10), 0);
      const avgWaitMinutes = waitingTokens.length > 0 
        ? Math.round(totalWaitMinutes / Math.max(1, waitingTokens.length)) 
        : 8;

      const distanceKm = calculateDistance(uLat, uLng, loc.latitude, loc.longitude);
      const travelTimeMinutes = Math.round(distanceKm * 4) + 5; // average city speed

      // Status tier
      let waitStatus = 'LOW_WAIT';
      if (waitingTokens.length > 15 || avgWaitMinutes > 35) {
        waitStatus = 'HIGH_WAIT';
      } else if (waitingTokens.length > 6 || avgWaitMinutes > 15) {
        waitStatus = 'MEDIUM_WAIT';
      }

      return {
        id: loc.id,
        org_id: loc.org_id,
        name: loc.name,
        org_name: loc.org_name,
        category: loc.business_type,
        address: loc.address,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude,
        google_place_id: loc.google_place_id,
        distance_km: distanceKm,
        travel_time_minutes: travelTimeMinutes,
        travel_buffer_minutes: loc.travel_buffer_minutes || 15,
        people_waiting: waitingTokens.length,
        currently_serving: servingTokens.length > 0 ? servingTokens[0].token_display : 'None',
        estimated_wait_minutes: avgWaitMinutes,
        wait_status: waitStatus,
        is_verified: !!loc.is_verified,
        brand_color: loc.brand_color,
        banner_url: loc.banner_url,
        services_count: locServices.length,
        services: locServices
      };
    });

    // Apply filtering
    let filtered = enriched;
    if (category && category !== 'ALL') {
      filtered = filtered.filter(l => l.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.org_name.toLowerCase().includes(q) || 
        l.category.toLowerCase().includes(q)
      );
    }

    // Sort by distance ascending
    filtered.sort((a, b) => a.distance_km - b.distance_km);

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Explore fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch explore locations' });
  }
}

export async function getLocationDetails(req, res) {
  try {
    const { id } = req.params;
    const loc = mockStore.locations.find(l => l.id === id);

    if (!loc) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const org = mockStore.organizations.find(o => o.id === loc.org_id) || {};
    const services = mockStore.services.filter(s => s.location_id === id);
    const counters = mockStore.counters.filter(c => c.location_id === id);
    const tokens = mockStore.tokens.filter(t => t.location_id === id && ['WAITING', 'CALLED', 'SERVING'].includes(t.status));

    // Enrich services with live queue numbers
    const enrichedServices = services.map(s => {
      const srvTokens = tokens.filter(t => t.service_id === s.id);
      const waiting = srvTokens.filter(t => t.status === 'WAITING');
      const serving = srvTokens.filter(t => t.status === 'SERVING');

      return {
        ...s,
        waiting_count: waiting.length,
        serving_token: serving.length > 0 ? serving[0].token_display : null,
        estimated_wait: waiting.length * (s.avg_duration_minutes || 10)
      };
    });

    return res.json({
      success: true,
      data: {
        location: {
          ...loc,
          organization: org
        },
        services: enrichedServices,
        counters,
        active_tokens_count: tokens.length
      }
    });
  } catch (error) {
    console.error('Location details error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch location details' });
  }
}
