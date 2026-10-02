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

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

initSocket(io);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/counter', counterRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'QLESS Universal Queue Platform',
    version: '1.0.0',
    database_connected: isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

// Initialize database pool and start server
async function bootstrap() {
  await initDbPool();

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 QLESS Backend Engine running on http://localhost:${PORT}`);
    console.log(`⚡ Real-Time Socket.io Server ready for live connections`);
    console.log(`======================================================\n`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
});
