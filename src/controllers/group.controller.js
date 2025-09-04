import pool from '../config/database.js';

// Create new group
export const createGroup = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { name, description, members } = req.body;

        // Create group
        const groupResult = await client.query(
            'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        const group = groupResult.rows[0];

        // Add creator as admin
        await client.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [group.group_id, req.user.user_id, 'admin']
        );

        // Add other members
        if (members && members.length > 0) {
            for (const memberId of members) {
                await client.query(
                    'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
                    [group.group_id, memberId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json(group);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// Get user's groups
export const getUserGroups = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT g.*, 
                    array_agg(json_build_object('user_id', u.user_id, 'username', u.username, 
                    'profile_pic', u.profile_pic, 'role', gm.role)) as members
            FROM groups g
            JOIN group_members gm ON g.group_id = gm.group_id
            JOIN users u ON gm.user_id = u.user_id
            WHERE g.group_id IN (
                SELECT group_id FROM group_members WHERE user_id = $1
            )
            GROUP BY g.group_id`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Add member to group
export const addGroupMember = async (req, res) => {
    const { groupId, userId } = req.body;
    try {
        // Check if user is admin
        const adminCheck = await pool.query(
            'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3',
            [groupId, req.user.user_id, 'admin']
        );

        if (adminCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Only admins can add members' });
        }

        await pool.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [groupId, userId]
        );

        res.status(201).json({ message: 'Member added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

