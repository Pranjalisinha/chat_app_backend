import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    messageType: {
        type: String,
        enum: ['private', 'group'],
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    content: {
        encryptedData: {
            type: String,
            required: true
        },
        iv: {
            type: String,
            required: true
        },
        authTag: {
            type: String,
            required: true
        }
    },
    // For private messages
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    deliveredAt: {
        type: Date
    },
    readAt: {
        type: Date
    },
    // For group messages
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
}, {
    timestamps: true,
});

// Middleware to validate message type and required fields
messageSchema.pre('save', function(next) {
    if (this.messageType === 'private' && !this.recipient) {
        next(new Error('Private messages must have a recipient'));
    }
    if (this.messageType === 'group' && !this.group) {
        next(new Error('Group messages must have a group'));
    }
    if (this.messageType === 'private' && this.group) {
        next(new Error('Private messages cannot have a group'));
    }
    if (this.messageType === 'group' && this.recipient) {
        next(new Error('Group messages cannot have a recipient'));
    }
    next();
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
