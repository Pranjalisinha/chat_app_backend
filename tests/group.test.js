import request from 'supertest';
import { app } from '../src/server.js';
import {
    setupTestDB,
    teardownTestDB,
    clearDatabase,
    createTestUser,
    createTestGroup
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

describe('Group Routes', () => {
    describe('POST /api/groups', () => {
        it('should create a new group', async () => {
            const { user, token } = await createTestUser();
            const member = await createTestUser({
                email: 'member@example.com',
                username: 'member'
            });

            const groupData = {
                name: 'Test Group',
                description: 'Test Description',
                members: [member.user._id]
            };

            const response = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${token}`)
                .send(groupData);

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.group.name).toBe(groupData.name);
            expect(response.body.data.group.members).toHaveLength(2); // includes creator
        });
    });

    describe('GET /api/groups', () => {
        it('should get all groups user is member of', async () => {
            const { user, token } = await createTestUser();
            const group1 = await createTestGroup(user);
            const group2 = await createTestGroup(user);

            const response = await request(app)
                .get('/api/groups')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.groups).toHaveLength(2);
        });
    });

    describe('GET /api/groups/:groupId', () => {
        it('should get group details', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);

            const response = await request(app)
                .get(`/api/groups/${group._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.group._id).toBe(group._id.toString());
        });

        it('should not allow access to non-members', async () => {
            const groupCreator = await createTestUser({
                email: 'creator@example.com',
                username: 'creator'
            });
            const group = await createTestGroup(groupCreator.user);
            
            const { token } = await createTestUser();

            const response = await request(app)
                .get(`/api/groups/${group._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /api/groups/:groupId', () => {
        it('should update group details when admin', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);

            const updateData = {
                name: 'Updated Group Name',
                description: 'Updated Description'
            };

            const response = await request(app)
                .put(`/api/groups/${group._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.data.group.name).toBe(updateData.name);
        });

        it('should not allow non-admin to update group', async () => {
            const admin = await createTestUser({
                email: 'admin@example.com',
                username: 'admin'
            });
            const { user, token } = await createTestUser();
            const group = await createTestGroup(admin.user, [user._id]);

            const response = await request(app)
                .put(`/api/groups/${group._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'New Name' });

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/groups/:groupId/members', () => {
        it('should add new members to group', async () => {
            const { user, token } = await createTestUser();
            const group = await createTestGroup(user);
            const newMember = await createTestUser({
                email: 'newmember@example.com',
                username: 'newmember'
            });

            const response = await request(app)
                .post(`/api/groups/${group._id}/members`)
                .set('Authorization', `Bearer ${token}`)
                .send({ members: [newMember.user._id] });

            expect(response.status).toBe(200);
            expect(response.body.data.group.members).toHaveLength(2);
        });
    });

    describe('DELETE /api/groups/:groupId/members/:memberId', () => {
        it('should remove member from group', async () => {
            const { user, token } = await createTestUser();
            const member = await createTestUser({
                email: 'member@example.com',
                username: 'member'
            });
            const group = await createTestGroup(user, [member.user._id]);

            const response = await request(app)
                .delete(`/api/groups/${group._id}/members/${member.user._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.group.members).toHaveLength(1);
        });
    });

    describe('DELETE /api/groups/:groupId/leave', () => {
        it('should allow member to leave group', async () => {
            const admin = await createTestUser({
                email: 'admin@example.com',
                username: 'admin'
            });
            const { user, token } = await createTestUser();
            const group = await createTestGroup(admin.user, [user._id]);

            const response = await request(app)
                .delete(`/api/groups/${group._id}/leave`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.group.members).not.toContain(user._id.toString());
        });

        it('should assign new admin when admin leaves', async () => {
            const { user, token } = await createTestUser();
            const member = await createTestUser({
                email: 'member@example.com',
                username: 'member'
            });
            const group = await createTestGroup(user, [member.user._id]);

            const response = await request(app)
                .delete(`/api/groups/${group._id}/leave`)
                .set('Authorization', `Bearer ${token}`);
            console.log(response.body);

            expect(response.status).toBe(200);
            expect(response.body.data.group.admin).toBe(member.user._id.toString());
        });
    });
});
