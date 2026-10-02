import { nanoid } from 'nanoid';
import { getDbPool, isDbConnected, mockStore } from '../db.js';
import { broadcastQueueUpdate } from '../socket.js';

export async function joinQueue(req, res) {
  try {
    const { service_id, customer_name, customer_phone, party_size, source, priority_level, user_id } = req.body;

    if (!service_id || !customer_name) {
      return res.status(400).json({ success: false, message: 'Service ID and customer name are required' });
    }

    const service = mockStore.services.find(s => s.id === service_id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const location = mockStore.locations.find(l => l.id === service.location_id);

    // Calculate sequential token number for this service
    const existingServiceTokens = mockStore.tokens.filter(t => t.service_id === service_id);
    const nextNum = existingServiceTokens.length + 1;
    const tokenDisplay = `${service.service_code}-${String(nextNum).padStart(3, '0')}`;

    // Count people currently ahead
    const currentWaiters = mockStore.tokens.filter(
      t => t.service_id === service_id && t.status === 'WAITING'
    );
    const peopleAhead = currentWaiters.length;

    // Estimated wait = people ahead * avg service duration / active counters
    const activeCounters = mockStore.counters.filter(c => c.location_id === service.location_id && c.status !== 'CLOSED');
    const counterDivisor = Math.max(1, activeCounters.length);
    const estimatedWaitMinutes = Math.max(5, Math.round((peopleAhead * (service.avg_duration_minutes || 12)) / counterDivisor));

    const qrHash = `QL-${nanoid(10).toUpperCase()}`;

    const newToken = {
      id: `tok-${Date.now()}-${nanoid(4)}`,
      service_id,
      location_id: service.location_id,
      counter_id: null,
      user_id: user_id || null,
      token_number: nextNum,
      token_display: tokenDisplay,
      customer_name,
      customer_phone: customer_phone || '+91 98000 00000',
      party_size: parseInt(party_size) || 1,
      source: source || 'APP',
      priority_level: priority_level || 'STANDARD',
      status: 'WAITING',
      estimated_wait_minutes: estimatedWaitMinutes,
      qr_code_hash: qrHash,
      check_in_time: new Date().toISOString(),
      called_time: null,
      served_time: null,
      completed_time: null
    };

    mockStore.tokens.push(newToken);

    // If connected to real MySQL, insert asynchronously as well
    if (isDbConnected()) {
      try {
        const pool = getDbPool();
        await pool.query(`
          INSERT INTO tokens 
            (id, service_id, location_id, user_id, token_number, token_display, customer_name, customer_phone, party_size, source, priority_level, status, estimated_wait_minutes, qr_code_hash, check_in_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          newToken.id, newToken.service_id, newToken.location_id, newToken.user_id,
          newToken.token_number, newToken.token_display, newToken.customer_name,
          newToken.customer_phone, newToken.party_size, newToken.source,
          newToken.priority_level, newToken.status, newToken.estimated_wait_minutes,
          newToken.qr_code_hash
        ]);
      } catch (err) {
        console.error('MySQL token insert sync error:', err.message);
      }
    }

    // Broadcast live update across all sockets
    broadcastQueueUpdate('TOKEN_CREATED', {
      ...newToken,
      service_name: service.name,
      location_name: location ? location.name : 'Location',
      people_ahead: peopleAhead
    });

    return res.status(201).json({
      success: true,
      message: 'Token issued successfully',
      data: {
        token: newToken,
        service,
        location,
        people_ahead: peopleAhead
      }
    });
  } catch (error) {
    console.error('Join queue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to join queue' });
  }
}

export async function getTokenStatus(req, res) {
  try {
    const { id } = req.params;
    const token = mockStore.tokens.find(t => t.id === id || t.qr_code_hash === id || t.token_display === id);

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const service = mockStore.services.find(s => s.id === token.service_id) || {};
    const location = mockStore.locations.find(l => l.id === token.location_id) || {};
    const counter = token.counter_id ? mockStore.counters.find(c => c.id === token.counter_id) : null;

    // Calculate people ahead
    let peopleAhead = 0;
    if (token.status === 'WAITING') {
      const earlierWaiting = mockStore.tokens.filter(
        t => t.service_id === token.service_id && 
             t.status === 'WAITING' && 
             new Date(t.check_in_time) < new Date(token.check_in_time)
      );
      peopleAhead = earlierWaiting.length;
    }

    // Departure Advisory
    let departureAdvisory = 'Safe to explore nearby';
    let urgencyLevel = 'RELAX';

    if (token.status === 'CALLED') {
      departureAdvisory = `🚨 IT'S YOUR TURN! Proceed immediately to ${counter ? counter.counter_number : 'the counter'}.`;
      urgencyLevel = 'URGENT_NOW';
    } else if (token.status === 'SERVING') {
      departureAdvisory = `Currently being served at ${counter ? counter.counter_number : 'counter'}.`;
      urgencyLevel = 'SERVING';
    } else if (peopleAhead <= 1) {
      departureAdvisory = '⚠️ You are next! Return to the waiting zone now.';
      urgencyLevel = 'RETURN_SOON';
    } else if (token.estimated_wait_minutes <= (location.travel_buffer_minutes || 15)) {
      departureAdvisory = 'Start heading towards the location.';
      urgencyLevel = 'PREPARE_TRAVEL';
    }

    return res.json({
      success: true,
      data: {
        token,
        service,
        location,
        counter,
        people_ahead: peopleAhead,
        departure_advisory: departureAdvisory,
        urgency_level: urgencyLevel
      }
    });
  } catch (error) {
    console.error('Get token status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch token status' });
  }
}

export async function verifyQrCode(req, res) {
  try {
    const { qr_hash } = req.body;
    if (!qr_hash) {
      return res.status(400).json({ success: false, message: 'QR Hash is required' });
    }

    const token = mockStore.tokens.find(t => t.qr_code_hash === qr_hash);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Invalid or expired QR token' });
    }

    const service = mockStore.services.find(s => s.id === token.service_id);
    const location = mockStore.locations.find(l => l.id === token.location_id);

    return res.json({
      success: true,
      message: 'Token verified successfully',
      data: {
        token,
        service,
        location
      }
    });
  } catch (error) {
    console.error('QR verification error:', error);
    return res.status(500).json({ success: false, message: 'QR verification failed' });
  }
}

export async function cancelToken(req, res) {
  try {
    const { id } = req.params;
    const token = mockStore.tokens.find(t => t.id === id);

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    token.status = 'CANCELLED';

    broadcastQueueUpdate('TOKEN_CANCELLED', token);

    return res.json({
      success: true,
      message: 'Token cancelled successfully',
      data: token
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to cancel token' });
  }
}
