import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    // Track read status for each participant
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Track if conversation is active (not deleted by either user)
    isActive: {
        type: Boolean,
        default: true
    },
    // Track which users have deleted the conversation
    deletedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true,
});

// Ensure only 2 participants for private conversations
conversationSchema.pre('save', function(next) {
    if (this.participants.length !== 2) {
        next(new Error('Private conversations must have exactly 2 participants'));
    }
    next();
});

// Create compound index to ensure unique conversations between two users
// We'll use a custom validation instead of unique index due to array order issues

// Method to check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
    return this.participants.some(participant => {
        // Handle both populated and unpopulated participants
        const participantId = participant._id ? participant._id : participant;
        return participantId.toString() === userId.toString();
    });
};

// Method to get the other participant
conversationSchema.methods.getOtherParticipant = function(userId) {
    return this.participants.find(participant => {
        // Handle both populated and unpopulated participants
        const participantId = participant._id ? participant._id : participant;
        return participantId.toString() !== userId.toString();
    });
};

// Method to mark message as read by user
conversationSchema.methods.markAsRead = function(userId) {
    const existingRead = this.readBy.find(read => 
        read.user.toString() === userId.toString()
    );
    
    if (existingRead) {
        existingRead.readAt = new Date();
    } else {
        this.readBy.push({
            user: userId,
            readAt: new Date()
        });
    }
    
    return this.save();
};

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreateConversation = async function(user1Id, user2Id) {
    // Try to find existing conversation (check both orders)
    let conversation = await this.findOne({
        $or: [
            { participants: [user1Id, user2Id], isActive: true },
            { participants: [user2Id, user1Id], isActive: true }
        ]
    }).populate('participants', 'username email profilePic status lastSeen')
      .populate('lastMessage');

    if (!conversation) {
        // Create new conversation
        conversation = await this.create({
            participants: [user1Id, user2Id]
        });
        
        // Populate the created conversation
        conversation = await this.findById(conversation._id)
            .populate('participants', 'username email profilePic status lastSeen')
            .populate('lastMessage');
    }

    return conversation;
};

// Static method to get user's conversations
conversationSchema.statics.getUserConversations = async function(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    return await this.find({
        participants: { $in: [userId] },
        isActive: true,
        deletedBy: { $ne: userId }
    })
    .populate('participants', 'username email profilePic status lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit);
};

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
