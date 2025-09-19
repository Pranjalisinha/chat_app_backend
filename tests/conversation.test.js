import request from 'supertest';
import { app } from '../src/server.js';
import {
    setupTestDB,
    teardownTestDB,
    clearDatabase,
    createTestUser,
    createTestConversation,
    createTestConversationWithMessage
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

describe('Conversation Routes', () => {
    describe('GET /api/conversations', () => {
        it('should get all conversations for authenticated user', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { user: user3 } = await createTestUser({ email: 'user3@example.com', username: 'user3' });

            // Create conversations using API endpoints
            await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);
            
            await request(app)
                .post(`/api/conversations/${user3._id}`)
                .set('Authorization', `Bearer ${token}`);

            const response = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.conversations).toHaveLength(2);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/conversations');

            expect(response.status).toBe(401);
        });

        it('should support pagination', async () => {
            const { user: user1, token } = await createTestUser();
            
            // Create multiple conversations using API endpoints
            for (let i = 0; i < 5; i++) {
                const { user } = await createTestUser({ 
                    email: `user${i}@example.com`, 
                    username: `user${i}` 
                });
                await request(app)
                    .post(`/api/conversations/${user._id}`)
                    .set('Authorization', `Bearer ${token}`);
            }

            const response = await request(app)
                .get('/api/conversations?page=1&limit=3')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.conversations).toHaveLength(3);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(3);
        });
    });

    describe('POST /api/conversations/:userId', () => {
        it('should create new conversation with another user', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });

            const response = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.conversation).toBeDefined();
            expect(response.body.data.conversation.participants).toHaveLength(2);
        });

        it('should return existing conversation if already exists', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });

            // Create conversation first time
            const response1 = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);

            // Try to create again
            const response2 = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body.data.conversation._id).toBe(response2.body.data.conversation._id);
        });

        it('should not create conversation with non-existent user', async () => {
            const { token } = await createTestUser();
            const fakeUserId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .post(`/api/conversations/${fakeUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.status).toBe('error');
        });

        it('should not create conversation with self', async () => {
            const { user, token } = await createTestUser();

            const response = await request(app)
                .post(`/api/conversations/${user._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });

        it('should require authentication', async () => {
            const { user } = await createTestUser();

            const response = await request(app)
                .post(`/api/conversations/${user._id}`);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/conversations/:conversationId', () => {
        it('should get specific conversation', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            
            // Create conversation using the API endpoint
            const createResponse = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(createResponse.status).toBe(200);
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .get(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.conversation._id).toBe(conversationId);
        });

        it('should not get conversation user is not participant of', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2, token: token2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { user: user3 } = await createTestUser({ email: 'user3@example.com', username: 'user3' });
            
            // Create conversation between user2 and user3
            const createResponse = await request(app)
                .post(`/api/conversations/${user3._id}`)
                .set('Authorization', `Bearer ${token2}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .get(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('error');
        });

        it('should return 404 for non-existent conversation', async () => {
            const { token } = await createTestUser();
            const fakeConversationId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/conversations/${fakeConversationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.status).toBe('error');
        });
    });

    describe('PUT /api/conversations/:conversationId/read', () => {
        it('should mark conversation as read', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            
            // Create conversation using API endpoint
            const createResponse = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .put(`/api/conversations/${conversationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should not mark conversation as read if user is not participant', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2, token: token2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { user: user3 } = await createTestUser({ email: 'user3@example.com', username: 'user3' });
            
            // Create conversation between user2 and user3
            const createResponse = await request(app)
                .post(`/api/conversations/${user3._id}`)
                .set('Authorization', `Bearer ${token2}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .put(`/api/conversations/${conversationId}/read`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('error');
        });
    });

    describe('DELETE /api/conversations/:conversationId', () => {
        it('should delete conversation (soft delete)', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            
            // Create conversation using API endpoint
            const createResponse = await request(app)
                .post(`/api/conversations/${user2._id}`)
                .set('Authorization', `Bearer ${token}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .delete(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should not delete conversation if user is not participant', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2, token: token2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { user: user3 } = await createTestUser({ email: 'user3@example.com', username: 'user3' });
            
            // Create conversation between user2 and user3
            const createResponse = await request(app)
                .post(`/api/conversations/${user3._id}`)
                .set('Authorization', `Bearer ${token2}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .delete(`/api/conversations/${conversationId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('error');
        });
    });

    describe('GET /api/conversations/:conversationId/messages', () => {
        it('should get conversation messages', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { conversation } = await createTestConversationWithMessage(user1, user2, 'Hello world');

            const response = await request(app)
                .get(`/api/conversations/${conversation._id}/messages`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.messages).toHaveLength(1);
        });

        it('should support pagination for messages', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { conversation } = await createTestConversationWithMessage(user1, user2, 'Hello world');

            const response = await request(app)
                .get(`/api/conversations/${conversation._id}/messages?page=1&limit=10`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.pagination.page).toBe(1);
            expect(response.body.data.pagination.limit).toBe(10);
        });

        it('should not get messages if user is not participant', async () => {
            const { user: user1, token } = await createTestUser();
            const { user: user2, token: token2 } = await createTestUser({ email: 'user2@example.com', username: 'user2' });
            const { user: user3 } = await createTestUser({ email: 'user3@example.com', username: 'user3' });
            
            // Create conversation between user2 and user3
            const createResponse = await request(app)
                .post(`/api/conversations/${user3._id}`)
                .set('Authorization', `Bearer ${token2}`);
            
            const conversationId = createResponse.body.data.conversation._id;

            const response = await request(app)
                .get(`/api/conversations/${conversationId}/messages`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('error');
        });
    });
});
