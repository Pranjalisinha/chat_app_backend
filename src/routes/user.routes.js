import express from 'express';
import { registerUser, loginUser, updateProfile, getUsers } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile', protect, updateProfile);
router.get('/', protect, getUsers);

export default router;
