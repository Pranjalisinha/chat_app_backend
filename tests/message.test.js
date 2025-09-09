import request from 'supertest';
import { app } from '../src/server.js';
import {
    setupTestDB,
    teardownTestDB,
    clearDatabase,
    createTestUser,
    createTestGroup,
    createTestMessage,
    createTestGroupMessage
} from './testUtils.js';

beforeAll(async () => {
    await setupTestDB();
});

afterAll(async () => {
    await teardownTestDB();
});

beforeEach(async () => {
    await clearDatabase();
});

describe('Message Routes', () => {
    describe('POST /api/messages', () => {
        it('should send a private message', async () => {
            const { user: sender, token } = await createTestUser();
            const { user: recipient } = await createTestUser({
                email: 'recipient@example.com',
                username: 'recipient'
            });

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: 'Test message'
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.message).toHaveProperty('messageType', 'private');
            expect(response.body.data.message.content).toHaveProperty('encryptedData');
        });

        it('should send a group message', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    groupId: group._id,
                    content: 'Test group message'
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.message).toHaveProperty('messageType', 'group');
            expect(response.body.data.message.content).toHaveProperty('encryptedData');
        });

        it('should not allow sending message to non-existent group', async () => {
            const { token } = await createTestUser();

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    groupId: '507f1f77bcf86cd799439011', // Non-existent group ID
                    content: 'Test message'
                });

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/messages/private/:userId', () => {
        it('should get private messages between users', async () => {
            const { user: sender, token } = await createTestUser();
            const { user: recipient } = await createTestUser({
                email: 'recipient@example.com',
                username: 'recipient'
            });

            await createTestMessage(sender, recipient);
            await createTestMessage(recipient, sender);

            const response = await request(app)
                .get(`/api/messages/private/${recipient._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.messages).toHaveLength(2);
            expect(response.body.data.messages[0]).toHaveProperty('decryptedContent');
        });

        it('should mark messages as read', async () => {
            const { user: sender } = await createTestUser();
            const { user: recipient, token } = await createTestUser({
                email: 'recipient@example.com',
                username: 'recipient'
            });

            const message = await createTestMessage(sender, recipient);

            const response = await request(app)
                .get(`/api/messages/private/${sender._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.messages[0].status).toBe('read');
        });
    });

    describe('GET /api/messages/group/:groupId', () => {
        it('should get group messages', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);
            
            await createTestGroupMessage(user, group);

            const response = await request(app)
                .get(`/api/messages/group/${group._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.messages).toHaveLength(1);
            expect(response.body.data.messages[0]).toHaveProperty('decryptedContent');
        });

        it('should not allow non-members to access group messages', async () => {
            const groupCreator = await createTestUser({
                email: 'creator@example.com',
                username: 'creator'
            });
            const group = await createTestGroup(groupCreator.user);
            const { token } = await createTestUser();

            const response = await request(app)
                .get(`/api/messages/group/${group._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });

        it('should mark messages as read by current user', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);
            
            await createTestGroupMessage(user, group);

            const response = await request(app)
                .get(`/api/messages/group/${group._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.messages[0].readBy)
                .toEqual(expect.arrayContaining([
                    expect.objectContaining({ user: expect.objectContaining({ _id: user._id.toString() }) })
                ]));
        });
    });
});
