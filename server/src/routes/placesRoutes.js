import express from 'express';
import { getNearbyPlaces, searchArea, reverseGeocode, getPlaceImage } from '../controllers/placesController.js';

const router = express.Router();

router.get('/nearby', getNearbyPlaces);
router.get('/search', searchArea);
router.get('/reverse', reverseGeocode);
router.get('/image', getPlaceImage);

export default router;