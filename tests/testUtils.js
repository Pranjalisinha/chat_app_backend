import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../src/models/user.model.js';
import Group from '../src/models/group.model.js';
import Message from '../src/models/message.model.js';
import Conversation from '../src/models/conversation.model.js';
import { encryptMessage } from '../src/utils/encryption.js';

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/chat_app_test';

export const setupTestDB = async () => {
    try {
        // If there's an existing connection, close it first
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Create new connection
        await mongoose.connect(TEST_MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`Test Database Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
};

export const teardownTestDB = async () => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.dropDatabase();
            await mongoose.disconnect();
        }
    } catch (error) {
        console.error('Error tearing down test database:', error);
        // Attempt to disconnect even if dropping the database fails
        await mongoose.disconnect();
        throw error;
    }
};

export const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
    // Reset indexes to avoid duplicate key collisions across tests
    await mongoose.connection.db.command({ dropIndexes: 'users', index: '*' }).catch(() => {});
};

// Create a test user and get auth token
export const createTestUser = async (userData = {}) => {
    const suffix = new mongoose.Types.ObjectId().toString().slice(-6);
    const defaultUser = {
        username: `testuser_${suffix}`,
        email: `test_${suffix}@example.com`,
        password: 'password123'
    };

    const user = await User.create({ ...defaultUser, ...userData });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    return { user, token };
};

// Create a test group
export const createTestGroup = async (admin, members = []) => {
    return await Group.create({
        name: 'Test Group',
        description: 'Test Group Description',
        admin: admin._id,
        members: [admin._id, ...members]
    });
};

// Create a test message
export const createTestMessage = async (sender, recipient, content = 'Test message') => {
    const encrypted = encryptMessage(content);
    return await Message.create({
        sender: sender._id,
        recipient: recipient._id,
        messageType: 'private',
        content: encrypted
    });
};

// Create a test group message
export const createTestGroupMessage = async (sender, group, content = 'Test group message') => {
    const encrypted = encryptMessage(content);
    return await Message.create({
        sender: sender._id,
        group: group._id,
        messageType: 'group',
        content: encrypted
    });
};

// Create a test conversation
export const createTestConversation = async (user1, user2) => {
    return await Conversation.create({
        participants: [user1._id, user2._id]
    });
};

// Create a test conversation with message
export const createTestConversationWithMessage = async (sender, recipient, content = 'Test conversation message') => {
    const conversation = await Conversation.findOrCreateConversation(sender._id, recipient._id);
    const encrypted = encryptMessage(content);
    const message = await Message.create({
        sender: sender._id,
        recipient: recipient._id,
        messageType: 'private',
        content: encrypted
    });
    
    // Update conversation with last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();
    
    return { conversation, message };
};
