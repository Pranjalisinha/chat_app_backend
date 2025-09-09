import express from 'express';
import { 
    createGroup,
    getGroups,
    getGroupById,
    updateGroup,
    addMembers,
    removeMember,
    leaveGroup
} from '../controllers/group.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All group routes require authentication

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:groupId', getGroupById);
router.put('/:groupId', updateGroup);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:memberId', removeMember);
router.delete('/:groupId/leave', leaveGroup);

export default router;
