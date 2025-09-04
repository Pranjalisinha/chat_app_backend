import express from 'express';
import { sendMessage, getMessages } from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All message routes require authentication

router.post('/', sendMessage);
router.get('/:chatId/:chatType', getMessages);

export default router;
