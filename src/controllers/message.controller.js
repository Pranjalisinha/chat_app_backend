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
            
            if (!group.members.includes(req.user._id)) {
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
        let messages = await Message.find({
            messageType: 'private',
            $or: [
                { sender: req.user._id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user._id },
            ],
        })
            .populate('sender', 'username profilePic')
            .populate('recipient', 'username profilePic')
            .sort('createdAt');

        // Decrypt messages
        messages = messages.map(msg => {
            const message = msg.toObject();
            try {
                message.decryptedContent = decryptMessage(message.content);
            } catch (error) {
                console.error(`Failed to decrypt message ${message._id}:`, error);
                message.decryptedContent = 'Message decryption failed';
            }
            return message;
        });

        // Mark messages as delivered and read
        const unreadMessages = messages.filter(
            msg => msg.sender.toString() === req.params.userId && msg.status === 'sent'
        );

        for (const msg of unreadMessages) {
            msg.status = 'read';
            msg.deliveredAt = msg.deliveredAt || new Date();
            msg.readAt = new Date();
            await msg.save();
        }

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

        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({
                status: 'error',
                error: 'You are not a member of this group'
            });
        }

        let messages = await Message.find({
            messageType: 'group',
            group: groupId
        })
            .populate('sender', 'username profilePic')
            .populate('readBy.user', 'username profilePic')
            .sort('createdAt');

        // Decrypt messages
        messages = messages.map(msg => {
            const message = msg.toObject();
            try {
                message.decryptedContent = decryptMessage(message.content);
            } catch (error) {
                console.error(`Failed to decrypt message ${message._id}:`, error);
                message.decryptedContent = 'Message decryption failed';
            }
            return message;
        });

        // Mark messages as read by current user
        const unreadMessages = messages.filter(
            msg => !msg.readBy.some(read => read.user._id.toString() === req.user._id.toString())
        );

        for (const msg of unreadMessages) {
            msg.readBy.push({
                user: req.user._id,
                readAt: new Date()
            });
            await msg.save();
        }

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
