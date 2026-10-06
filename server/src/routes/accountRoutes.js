import express from 'express';
import { register, login, me, updateMe } from '../controllers/accountController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.patch('/me', updateMe);

export default router;