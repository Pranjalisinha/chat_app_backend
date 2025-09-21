import Conversation from '../models/conversation.model.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import FriendRequest from '../models/friendRequest.model.js';

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

// Send friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        const senderId = req.user._id;

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                error: 'User not found'
            });
        }

        // Prevent sending friend request to self
        if (userId === senderId.toString()) {
            return res.status(400).json({
                status: 'error',
                error: 'Cannot send friend request to yourself'
            });
        }

        // Check if friend request already exists
        const existingRequest = await FriendRequest.findOne({
            sender: senderId,
            recipient: userId,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                status: 'error',
                error: 'Friend request already exists'
            });
        }

        // Create new friend request
        const friendRequest = await FriendRequest.create({
            sender: senderId,
            recipient: userId,
            status: 'pending'
        });

        res.status(201).json({
            status: 'success',
            data: {
                friendRequest
            }
        });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const friendRequest = await FriendRequest.findOne({
            _id: requestId,
            recipient: userId,
            status: 'pending'
        });

        if (!friendRequest) {
            return res.status(404).json({
                status: 'error',
                error: 'Friend request not found'
            });
        }

        // Update request status
        friendRequest.status = 'accepted';
        await friendRequest.save();

        // Create or update conversation for the new friends
        await Conversation.findOrCreateConversation(
            friendRequest.sender,
            friendRequest.recipient
        );

        res.json({
            status: 'success',
            data: {
                friendRequest
            }
        });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const friendRequest = await FriendRequest.findOne({
            _id: requestId,
            recipient: userId,
            status: 'pending'
        });

        if (!friendRequest) {
            return res.status(404).json({
                status: 'error',
                error: 'Friend request not found'
            });
        }

        friendRequest.status = 'rejected';
        await friendRequest.save();

        res.json({
            status: 'success',
            data: {
                friendRequest
            }
        });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};

// Get friend requests
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = 'pending' } = req.query;

        const requests = await FriendRequest.find({
            recipient: userId,
            status
        })
        .populate('sender', 'username email profilePic')
        .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: {
                requests
            }
        });
    } catch (error) {
        console.error('Error getting friend requests:', error);
        res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
};
