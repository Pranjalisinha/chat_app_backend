// filepath: c:\Users\adars\OneDrive\Desktop\Pranjali_Sinha\ChatApplication\chat_app_backend\src\routes\conversation.routes.js

import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
    // ...existing imports...
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriendRequests
} from '../controllers/conversation.controller.js';

const router = express.Router();

// ...existing routes...

// Friend request routes
router.post('/friends/request/:userId', protect, sendFriendRequest);
router.put('/friends/request/:requestId/accept', protect, acceptFriendRequest);
router.put('/friends/request/:requestId/reject', protect, rejectFriendRequest);
router.get('/friends/requests', protect, getFriendRequests);

export default router;