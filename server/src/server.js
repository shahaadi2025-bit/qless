import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDbPool, isDbConnected } from './db.js';
import { initSocket } from './socket.js';

import authRoutes from './routes/authRoutes.js';
import exploreRoutes from './routes/exploreRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import counterRoutes from './routes/counterRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import placesRoutes from './routes/placesRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// CLIENT_URL can be one origin or a comma-separated list, e.g.
// https://shahaadi2025-bit.github.io  (use * to allow every origin)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ORIGINS = [
  ...new Set(
    CLIENT_URL.split(',')
      .map(s => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)
      .concat('http://localhost:5173')
  )
];
const corsOrigin = ORIGINS.includes('*') ? '*' : ORIGINS;

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

initSocket(io);

// Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/counter', counterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/places', placesRoutes);

// Friendly root + health checks (Render and uptime monitors use these)
app.get('/', (req, res) => {
  res.json({ name: 'QLESS API', health: '/api/health' });
});

function healthHandler(req, res) {
  res.json({
    status: 'online',
    product: 'QLESS Universal Queue Platform',
    version: '1.0.0',
    database_connected: isDbConnected(),
    timestamp: new Date().toISOString()
  });
}
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Initialize database pool and start server
async function bootstrap() {
  await initDbPool();

  server.listen(PORT, () => {
    console.log('\n======================================================');
    console.log(`QLESS Backend Engine running on port ${PORT}`);
    console.log(`Allowed origins: ${Array.isArray(corsOrigin) ? corsOrigin.join(', ') : corsOrigin}`);
    console.log('Real-Time Socket.io Server ready for live connections');
    console.log('======================================================\n');
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
});