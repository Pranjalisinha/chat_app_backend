import express from 'express';
import {
    getUserConversations,
    getOrCreateConversation,
    getConversation,
    markConversationAsRead,
    deleteConversation,
    getConversationMessages
} from '../controllers/conversation.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/conversations - Get all conversations for current user
router.get('/', getUserConversations);

// POST /api/conversations/:userId - Get or create conversation with specific user
router.post('/:userId', getOrCreateConversation);

// GET /api/conversations/:conversationId - Get specific conversation
router.get('/:conversationId', getConversation);

// PUT /api/conversations/:conversationId/read - Mark conversation as read
router.put('/:conversationId/read', markConversationAsRead);

// DELETE /api/conversations/:conversationId - Delete conversation
router.delete('/:conversationId', deleteConversation);

// GET /api/conversations/:conversationId/messages - Get conversation messages
router.get('/:conversationId/messages', getConversationMessages);

export default router;
