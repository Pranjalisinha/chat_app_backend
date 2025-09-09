import request from 'supertest';
import { app } from '../src/server.js';
import {
    setupTestDB,
    teardownTestDB,
    clearDatabase,
    createTestUser
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

describe('User Routes', () => {
    describe('POST /api/users/register', () => {
        it('should register a new user', async () => {
            const userData = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.user).toHaveProperty('username', userData.username);
            expect(response.body.data).toHaveProperty('token');
        });

        it('should not register a user with existing email', async () => {
            const { user } = await createTestUser();

            const response = await request(app)
                .post('/api/users/register')
                .send({
                    username: 'different',
                    email: user.email,
                    password: 'password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });
    });

    describe('POST /api/users/login', () => {
        it('should login user with correct credentials', async () => {
            const password = 'password123';
            const { user } = await createTestUser({ password });

            const response = await request(app)
                .post('/api/users/login')
                .send({
                    email: user.email,
                    password
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('token');
        });

        it('should not login with incorrect password', async () => {
            const { user } = await createTestUser();

            const response = await request(app)
                .post('/api/users/login')
                .send({
                    email: user.email,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('error');
        });
    });

    describe('PUT /api/users/profile', () => {
        it('should update user profile', async () => {
            const { user, token } = await createTestUser();
            const updateData = {
                username: 'updatedname',
                status: 'busy'
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.user).toHaveProperty('username', updateData.username);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .send({ username: 'test' });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/users', () => {
        it('should get all users except current user', async () => {
            const { token } = await createTestUser();
            await createTestUser({ email: 'user2@example.com', username: 'user2' });
            await createTestUser({ email: 'user3@example.com', username: 'user3' });

            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.users).toHaveLength(2);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/users');

            expect(response.status).toBe(401);
        });
    });
});
