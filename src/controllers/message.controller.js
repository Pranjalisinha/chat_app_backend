import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import { encryptMessage, decryptMessage } from '../utils/encryption.js';

// Send message (handles both private and group messages)
export const sendMessage = async (req, res) => {
    try {
        const { recipientId, groupId, content } = req.body;

        if (!content) {
            return res.status(400).json({
                status: 'error',
                error: 'Message content is required'
            });
        }

        if (!recipientId && !groupId) {
            return res.status(400).json({
                status: 'error',
                error: 'Either recipientId or groupId is required'
            });
        }

        // Encrypt the message content
        const encryptedContent = encryptMessage(content);

        let messageData = {
            sender: req.user._id,
            content: encryptedContent,
            messageType: recipientId ? 'private' : 'group'
        };

        if (recipientId) {
            messageData.recipient = recipientId;
            messageData.status = 'sent';
        } else {
            // Verify group exists and user is a member
            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({
                    status: 'error',
                    error: 'Group not found'
                });
            }
            
            if (!group.members.some(member => member.toString() === req.user._id.toString())) {
                return res.status(403).json({
                    status: 'error',
                    error: 'You are not a member of this group'
                });
            }
            
            messageData.group = groupId;
            messageData.readBy = [{ user: req.user._id }]; // Sender has read the message
        }

        const message = await Message.create(messageData);

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePic')
            .populate(recipientId ? 'recipient' : 'group')
            .populate('readBy.user', 'username profilePic');

        // If it's a group message, update the group's lastMessage
        if (groupId) {
            await Group.findByIdAndUpdate(groupId, { lastMessage: message._id });
        }

        res.status(201).json({
            status: 'success',
            data: { message: populatedMessage },
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};

// Get private messages between users
export const getMessages = async (req, res) => {
    try {
        const docs = await Message.find({
            messageType: 'private',
            $or: [
                { sender: req.user._id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user._id },
            ],
        })
            .populate('sender', 'username profilePic')
            .populate('recipient', 'username profilePic')
            .sort('createdAt');

        // Mark messages as delivered and read
        const unreadDocs = docs.filter(doc => {
            const senderId = (doc.sender?._id || doc.sender).toString();
            return senderId === req.params.userId && doc.status === 'sent';
        });

        for (const doc of unreadDocs) {
            doc.status = 'read';
            doc.deliveredAt = doc.deliveredAt || new Date();
            doc.readAt = new Date();
            await doc.save();
        }

        // Prepare response with decrypted content
        const messages = docs.map(doc => {
            const obj = doc.toObject();
            try {
                obj.decryptedContent = decryptMessage(obj.content);
            } catch (error) {
                console.error(`Failed to decrypt message ${obj._id}:`, error);
                obj.decryptedContent = 'Message decryption failed';
            }
            return obj;
        });

        res.json({
            status: 'success',
            data: { messages },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Verify group exists and user is a member
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                status: 'error',
                error: 'Group not found'
            });
        }

        if (!group.members.some(member => member.toString() === req.user._id.toString())) {
            return res.status(403).json({
                status: 'error',
                error: 'You are not a member of this group'
            });
        }

        const docs = await Message.find({
            messageType: 'group',
            group: groupId
        })
            .populate('sender', 'username profilePic')
            .populate('readBy.user', 'username profilePic')
            .sort('createdAt');

        // Mark messages as read by current user
        const userIdStr = req.user._id.toString();
        const unreadDocs = docs.filter(doc => {
            const readBy = Array.isArray(doc.readBy) ? doc.readBy : [];
            return !readBy.some(r => (
                r.user?._id?.toString?.() === userIdStr ||
                r.user?.toString?.() === userIdStr
            ));
        });

        for (const doc of unreadDocs) {
            doc.readBy.push({
                user: req.user._id,
                readAt: new Date()
            });
            await doc.save();
        }

        // Re-populate to ensure readBy.user is populated after updates
        const populatedDocs = await Message.find({
            messageType: 'group',
            group: groupId
        })
            .populate('sender', 'username profilePic')
            .populate('readBy.user', 'username profilePic')
            .sort('createdAt');

        // Prepare response with decrypted content
        const messages = populatedDocs.map(doc => {
            const obj = doc.toObject();
            try {
                obj.decryptedContent = decryptMessage(obj.content);
            } catch (error) {
                console.error(`Failed to decrypt message ${obj._id}:`, error);
                obj.decryptedContent = 'Message decryption failed';
            }
            return obj;
        });

        res.json({
            status: 'success',
            data: { messages },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};
