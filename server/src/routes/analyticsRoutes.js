import express from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/summary', getDashboardAnalytics);

export default router;
