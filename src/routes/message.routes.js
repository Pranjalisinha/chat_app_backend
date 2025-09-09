import express from 'express';
import { sendMessage, getMessages, getGroupMessages } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All message routes require authentication

router.post('/', sendMessage);
router.get('/private/:userId', getMessages);
router.get('/group/:groupId', getGroupMessages);

export default router;
