import express from 'express';
import { getNearbyPlaces, searchArea } from '../controllers/placesController.js';

const router = express.Router();

router.get('/nearby', getNearbyPlaces);
router.get('/search', searchArea);

export default router;