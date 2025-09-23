import Conversation from '../models/conversation.model.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';

// Get all conversations for a user
export const getUserConversations = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user._id;

        const conversations = await Conversation.getUserConversations(
            userId, 
            parseInt(page), 
            parseInt(limit)
        );

        res.json({
            status: 'success',
            data: {
                conversations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: conversations.length
                }
            }
        });
    } catch (error) {
        console.error('Error getting user conversations:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get or create conversation with a specific user
export const getOrCreateConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }

        // Prevent creating conversation with self
        if (userId === currentUserId.toString()) {
            return res.status(400).json({
                status: 'error',
                error: 'Cannot create conversation with yourself'
            });
        }

        // Find or create conversation
        const conversation = await Conversation.findOrCreateConversation(
            currentUserId, 
            userId
        );

        res.json({
            status: 'success',
            data: {
                conversation
            }
        });
    } catch (error) {
        console.error('Error getting/creating conversation:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get specific conversation by ID
export const getConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId)
            .populate('participants', 'username email profilePic status lastSeen')
            .populate('lastMessage');

        if (!conversation) {
            return res.status(404).json({
                status: 'error',
                error: 'Conversation not found'
            });
        }

        // Check if user is participant
        if (!conversation.isParticipant(userId)) {
            return res.status(403).json({
                status: 'error',
                error: 'Access denied'
            });
        }

        res.json({
            status: 'success',
            data: {
                conversation
            }
        });
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Mark conversation as read
export const markConversationAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                status: 'error',
                error: 'Conversation not found'
            });
        }

        // Check if user is participant
        if (!conversation.isParticipant(userId)) {
            return res.status(403).json({
                status: 'error',
                error: 'Access denied'
            });
        }

        await conversation.markAsRead(userId);

        res.json({
            status: 'success',
            message: 'Conversation marked as read'
        });
    } catch (error) {
        console.error('Error marking conversation as read:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Delete conversation (soft delete)
export const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                status: 'error',
                error: 'Conversation not found'
            });
        }

        // Check if user is participant
        if (!conversation.isParticipant(userId)) {
            return res.status(403).json({
                status: 'error',
                error: 'Access denied'
            });
        }

        // Add user to deletedBy array
        if (!conversation.deletedBy.includes(userId)) {
            conversation.deletedBy.push(userId);
        }

        // If both users have deleted, mark as inactive
        if (conversation.deletedBy.length === 2) {
            conversation.isActive = false;
        }

        await conversation.save();

        res.json({
            status: 'success',
            message: 'Conversation deleted'
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get conversation messages
export const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user._id;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                status: 'error',
                error: 'Conversation not found'
            });
        }

        // Check if user is participant
        if (!conversation.isParticipant(userId)) {
            return res.status(403).json({
                status: 'error',
                error: 'Access denied'
            });
        }

        // Get messages for this conversation
        const messages = await Message.find({
            messageType: 'private',
            $or: [
                { sender: userId, recipient: conversation.getOtherParticipant(userId) },
                { sender: conversation.getOtherParticipant(userId), recipient: userId }
            ]
        })
        .populate('sender', 'username email profilePic')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        res.json({
            status: 'success',
            data: {
                messages: messages.reverse(), // Return in chronological order
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: messages.length
                }
            }
        });
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};