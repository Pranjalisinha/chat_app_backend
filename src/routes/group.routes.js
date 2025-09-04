import express from 'express';
import { createGroup, getUserGroups, addGroupMember } from '../controllers/group.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All group routes require authentication

router.post('/', createGroup);
router.get('/', getUserGroups);
router.post('/member', addGroupMember);

export default router;
