import express from 'express';
import { getAllUsers, updateProfile } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All user routes require authentication

router.get('/', getAllUsers);
router.put('/profile', updateProfile);

export default router;
