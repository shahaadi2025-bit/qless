import express from 'express';
import {
  getCounterStationData,
  callNextToken,
  startServingToken,
  completeToken,
  markNoShow,
  updateCounterStatus
} from '../controllers/counterController.js';

const router = express.Router();

router.get('/station', getCounterStationData);
router.post('/call-next', callNextToken);
router.post('/serve', startServingToken);
router.post('/complete', completeToken);
router.post('/no-show', markNoShow);
router.patch('/:id/status', updateCounterStatus);

export default router;
