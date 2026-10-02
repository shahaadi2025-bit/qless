let ioInstance = null;

export function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Join room for a specific location (for digital display boards / kiosks)
    socket.on('join:location', (locationId) => {
      socket.join(`location:${locationId}`);
      console.log(`📍 [Socket.io] Client ${socket.id} joined location:${locationId}`);
    });

    // Join room for a specific service queue
    socket.on('join:service', (serviceId) => {
      socket.join(`service:${serviceId}`);
      console.log(`🎫 [Socket.io] Client ${socket.id} joined service:${serviceId}`);
    });

    // Join room for an individual customer's token (for live push updates to phone)
    socket.on('join:token', (tokenId) => {
      socket.join(`token:${tokenId}`);
      console.log(`📱 [Socket.io] Client ${socket.id} joined token:${tokenId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function broadcastQueueUpdate(eventType, data) {
  if (!ioInstance) return;

  // Broadcast to global feed
  ioInstance.emit('queue:event', { type: eventType, data, timestamp: new Date().toISOString() });

  // Broadcast to targeted rooms if IDs exist
  if (data.location_id) {
    ioInstance.to(`location:${data.location_id}`).emit('location:update', { type: eventType, data });
  }
  if (data.service_id) {
    ioInstance.to(`service:${data.service_id}`).emit('service:update', { type: eventType, data });
  }
  if (data.id || data.token_id) {
    const tid = data.id || data.token_id;
    ioInstance.to(`token:${tid}`).emit('token:update', { type: eventType, data });
  }
}
