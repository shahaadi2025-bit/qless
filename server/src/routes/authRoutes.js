import express from 'express';
import { login, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', getCurrentUser);

export default router;
