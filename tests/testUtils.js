import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../src/models/user.model.js';
import Group from '../src/models/group.model.js';
import Message from '../src/models/message.model.js';

let mongoServer;

export const setupTestDB = async () => {
    // Create an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
};

export const teardownTestDB = async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
};

export const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};

// Create a test user and get auth token
export const createTestUser = async (userData = {}) => {
    const defaultUser = {
        username: 'testuser',
        email: 'test@example.com',
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
    return await Message.create({
        sender: sender._id,
        recipient: recipient._id,
        messageType: 'private',
        content: {
            encryptedData: 'testEncryptedData',
            iv: 'testIv',
            authTag: 'testAuthTag'
        }
    });
};

// Create a test group message
export const createTestGroupMessage = async (sender, group, content = 'Test group message') => {
    return await Message.create({
        sender: sender._id,
        group: group._id,
        messageType: 'group',
        content: {
            encryptedData: 'testEncryptedData',
            iv: 'testIv',
            authTag: 'testAuthTag'
        }
    });
};
