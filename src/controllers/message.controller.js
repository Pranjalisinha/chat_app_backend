import pool from '../config/database.js';

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { content, recipientId, groupId, messageType = 'text', fileUrl } = req.body;
        
        const result = await pool.query(
            `INSERT INTO messages 
            (sender_id, content, recipient_id, group_id, message_type, file_url) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING message_id, content, message_type, file_url, created_at`,
            [req.user.user_id, content, recipientId, groupId, messageType, fileUrl]
        );

        const message = result.rows[0];
        const populatedMessage = {
            ...message,
            sender: {
                user_id: req.user.user_id,
                username: req.user.username,
                profile_pic: req.user.profile_pic
            }
        };

        // Socket.io emission will be handled in the route
        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get messages for a chat
export const getMessages = async (req, res) => {
    try {
        const { chatId, chatType } = req.params;
        let query;
        let params;

        if (chatType === 'private') {
            query = `
                SELECT m.*, 
                    json_build_object(
                        'user_id', u.user_id,
                        'username', u.username,
                        'profile_pic', u.profile_pic
                    ) as sender
                FROM messages m
                JOIN users u ON m.sender_id = u.user_id
                WHERE (sender_id = $1 AND recipient_id = $2)
                    OR (sender_id = $2 AND recipient_id = $1)
                ORDER BY created_at DESC
                LIMIT 50
            `;
            params = [req.user.user_id, chatId];
        } else {
            query = `
                SELECT m.*, 
                    json_build_object(
                        'user_id', u.user_id,
                        'username', u.username,
                        'profile_pic', u.profile_pic
                    ) as sender
                FROM messages m
                JOIN users u ON m.sender_id = u.user_id
                WHERE group_id = $1
                ORDER BY created_at DESC
                LIMIT 50
            `;
            params = [chatId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows.reverse());
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
