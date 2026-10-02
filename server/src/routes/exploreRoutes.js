import express from 'express';
import { getExploreLocations, getLocationDetails } from '../controllers/exploreController.js';

const router = express.Router();

router.get('/locations', getExploreLocations);
router.get('/locations/:id', getLocationDetails);

export default router;
