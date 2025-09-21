import express from 'express';
import { registerUser, loginUser, updateProfile, getUsers, getFriends, getUsersToaddFriend } from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile', protect, updateProfile);
router.get('/', protect, getUsers);
router.get('/friends', protect, getFriends); // Get user friends
router.get('/invites', protect, getUsersToaddFriend)

export default router;
