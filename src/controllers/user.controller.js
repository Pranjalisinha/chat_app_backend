import pool from '../config/database.js';

// Get all users except current user
export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, username, email, profile_pic, status, last_seen FROM users WHERE user_id != $1',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { username, status, profilePic } = req.body;
        const result = await pool.query(
            `UPDATE users 
             SET username = COALESCE($1, username),
                 status = COALESCE($2, status),
                 profile_pic = COALESCE($3, profile_pic)
             WHERE user_id = $4
             RETURNING user_id, username, email, profile_pic, status`,
            [username, status, profilePic, req.user.user_id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

