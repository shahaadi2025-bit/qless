import express from 'express';
import { joinQueue, getTokenStatus, verifyQrCode, cancelToken } from '../controllers/queueController.js';

const router = express.Router();

router.post('/join', joinQueue);
router.get('/token/:id', getTokenStatus);
router.post('/verify-qr', verifyQrCode);
router.post('/token/:id/cancel', cancelToken);

export default router;
