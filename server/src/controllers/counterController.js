import { getDbPool, isDbConnected, mockStore } from '../db.js';
import { broadcastQueueUpdate } from '../socket.js';

export async function getCounterStationData(req, res) {
  try {
    const { counter_id, location_id } = req.query;

    const locId = location_id || 'loc-hosp-01';
    const location = mockStore.locations.find(l => l.id === locId);
    // Every venue gets a default counter so staff can call tokens at any place, including discovered ones.
    if (location && !mockStore.counters.some(c => c.location_id === locId)) {
      mockStore.counters.push({
        id: `cnt-${locId}-01`,
        location_id: locId,
        counter_number: 'Desk 01',
        name: 'Main Counter',
        status: 'OPEN',
        current_staff_id: null,
        active_token_id: null
      });
    }
    const counters = mockStore.counters.filter(c => c.location_id === locId);
    const services = mockStore.services.filter(s => s.location_id === locId);

    const activeCounter = counter_id 
      ? counters.find(c => c.id === counter_id) 
      : counters[0] || null;

    // Tokens waiting for this location
    const waitingTokens = mockStore.tokens
      .filter(t => t.location_id === locId && t.status === 'WAITING')
      .sort((a, b) => {
        // Priority first, then check-in time
        if (a.priority_level === 'EMERGENCY' && b.priority_level !== 'EMERGENCY') return -1;
        if (b.priority_level === 'EMERGENCY' && a.priority_level !== 'EMERGENCY') return 1;
        if (a.priority_level === 'PRIORITY' && b.priority_level === 'STANDARD') return -1;
        if (b.priority_level === 'PRIORITY' && a.priority_level === 'STANDARD') return 1;
        return new Date(a.check_in_time) - new Date(b.check_in_time);
      });

    // Currently active token on this counter
    let activeToken = null;
    if (activeCounter && activeCounter.active_token_id) {
      activeToken = mockStore.tokens.find(t => t.id === activeCounter.active_token_id);
    }

    // Recently completed tokens today
    const completedTokens = mockStore.tokens
      .filter(t => t.location_id === locId && t.status === 'COMPLETED')
      .slice(-10)
      .reverse();

    return res.json({
      success: true,
      data: {
        location,
        counters,
        activeCounter,
        activeToken,
        waitingTokens,
        completedTokens,
        services
      }
    });
  } catch (error) {
    console.error('Counter station data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch counter station data' });
  }
}

export async function callNextToken(req, res) {
  try {
    const { counter_id, service_id } = req.body;

    if (!counter_id) {
      return res.status(400).json({ success: false, message: 'Counter ID is required' });
    }

    const counter = mockStore.counters.find(c => c.id === counter_id);
    if (!counter) {
      return res.status(404).json({ success: false, message: 'Counter not found' });
    }

    // Find waiting tokens matching this location and optional service
    let candidateTokens = mockStore.tokens.filter(
      t => t.location_id === counter.location_id && t.status === 'WAITING'
    );

    if (service_id) {
      candidateTokens = candidateTokens.filter(t => t.service_id === service_id);
    }

    if (candidateTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No waiting tokens in queue' });
    }

    // Sort by priority and timestamp
    candidateTokens.sort((a, b) => {
      if (a.priority_level === 'EMERGENCY' && b.priority_level !== 'EMERGENCY') return -1;
      if (b.priority_level === 'EMERGENCY' && a.priority_level !== 'EMERGENCY') return 1;
      if (a.priority_level === 'PRIORITY' && b.priority_level === 'STANDARD') return -1;
      if (b.priority_level === 'PRIORITY' && a.priority_level === 'STANDARD') return 1;
      return new Date(a.check_in_time) - new Date(b.check_in_time);
    });

    const nextToken = candidateTokens[0];
    nextToken.status = 'CALLED';
    nextToken.counter_id = counter_id;
    nextToken.called_time = new Date().toISOString();

    counter.status = 'OPEN';
    counter.active_token_id = nextToken.id;

    const service = mockStore.services.find(s => s.id === nextToken.service_id);
    const location = mockStore.locations.find(l => l.id === counter.location_id);

    // Sync to MySQL if connected
    if (isDbConnected()) {
      try {
        const pool = getDbPool();
        await pool.query(
          'UPDATE tokens SET status = ?, counter_id = ?, called_time = NOW() WHERE id = ?',
          ['CALLED', counter_id, nextToken.id]
        );
        await pool.query(
          'UPDATE counters SET active_token_id = ?, status = ? WHERE id = ?',
          [nextToken.id, 'OPEN', counter_id]
        );
      } catch (err) {
        console.error('MySQL sync error on call next:', err.message);
      }
    }

    // Real-time broadcast with chime announcement payload
    const eventPayload = {
      token: nextToken,
      counter,
      service,
      location,
      announcement_text: `Attention: Token ${nextToken.token_display}, please proceed to ${counter.counter_number}.`
    };

    broadcastQueueUpdate('TOKEN_CALLED', eventPayload);

    return res.json({
      success: true,
      message: `Token ${nextToken.token_display} called to ${counter.counter_number}`,
      data: eventPayload
    });
  } catch (error) {
    console.error('Call next error:', error);
    return res.status(500).json({ success: false, message: 'Failed to call next token' });
  }
}

export async function startServingToken(req, res) {
  try {
    const { counter_id, token_id } = req.body;

    const counter = mockStore.counters.find(c => c.id === counter_id);
    const token = mockStore.tokens.find(t => t.id === token_id);

    if (!token || !counter) {
      return res.status(404).json({ success: false, message: 'Counter or token not found' });
    }

    token.status = 'SERVING';
    token.served_time = new Date().toISOString();
    counter.status = 'BUSY';

    broadcastQueueUpdate('TOKEN_SERVING', { token, counter });

    return res.json({
      success: true,
      message: `Token ${token.token_display} is now being served`,
      data: { token, counter }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to start serving' });
  }
}

export async function completeToken(req, res) {
  try {
    const { counter_id, token_id } = req.body;

    const counter = mockStore.counters.find(c => c.id === counter_id);
    const token = mockStore.tokens.find(t => t.id === token_id);

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    token.status = 'COMPLETED';
    token.completed_time = new Date().toISOString();

    if (counter) {
      counter.active_token_id = null;
      counter.status = 'OPEN';
    }

    // Sync to MySQL
    if (isDbConnected()) {
      try {
        const pool = getDbPool();
        await pool.query(
          'UPDATE tokens SET status = ?, completed_time = NOW() WHERE id = ?',
          ['COMPLETED', token.id]
        );
        if (counter) {
          await pool.query(
            'UPDATE counters SET active_token_id = NULL, status = ? WHERE id = ?',
            ['OPEN', counter.id]
          );
        }
      } catch (err) {
        console.error('MySQL sync complete error:', err.message);
      }
    }

    broadcastQueueUpdate('TOKEN_COMPLETED', { token, counter });

    return res.json({
      success: true,
      message: `Token ${token.token_display} marked as completed`,
      data: { token, counter }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to complete token' });
  }
}

export async function markNoShow(req, res) {
  try {
    const { counter_id, token_id } = req.body;

    const counter = mockStore.counters.find(c => c.id === counter_id);
    const token = mockStore.tokens.find(t => t.id === token_id);

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    token.status = 'NO_SHOW';

    if (counter) {
      counter.active_token_id = null;
      counter.status = 'OPEN';
    }

    broadcastQueueUpdate('TOKEN_NO_SHOW', { token, counter });

    return res.json({
      success: true,
      message: `Token ${token.token_display} marked as no-show`,
      data: { token, counter }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark no-show' });
  }
}

export async function updateCounterStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const counter = mockStore.counters.find(c => c.id === id);
    if (!counter) {
      return res.status(404).json({ success: false, message: 'Counter not found' });
    }

    counter.status = status;
    broadcastQueueUpdate('COUNTER_STATUS_CHANGED', counter);

    return res.json({
      success: true,
      data: counter
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update counter' });
  }
}
