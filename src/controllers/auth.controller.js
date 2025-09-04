import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Register user
export const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email, profile_pic, status',
            [username, email, hashedPassword]
        );
        
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
};

// Generate access token
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }  // Access token expires in 1 day
    );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }  // Refresh token expires in 30 days
    );
};

// Login user
export const loginUser = async (req, res) => {
    try {
        // Input validation
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                error: 'Email and password are required'
            });
        }

        // Check if user exists
        const result = await pool.query(
            `SELECT user_id, username, email, password_hash, profile_pic, status, 
                    last_seen, failed_login_attempts, last_failed_login
            FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                status: 'error',
                error: 'Invalid credentials'
            });
        }

        const user = result.rows[0];

        // Check for too many failed login attempts
        if (user.failed_login_attempts >= 5) {
            const lockoutDuration = 15 * 60 * 1000; // 15 minutes
            const lockoutTime = new Date(user.last_failed_login).getTime() + lockoutDuration;
            
            if (Date.now() < lockoutTime) {
                return res.status(429).json({
                    status: 'error',
                    error: 'Account temporarily locked. Please try again later.',
                    timeRemaining: Math.ceil((lockoutTime - Date.now()) / 1000 / 60) // minutes remaining
                });
            }
            
            // Reset failed attempts if lockout period is over
            await pool.query(
                'UPDATE users SET failed_login_attempts = 0 WHERE user_id = $1',
                [user.user_id]
            );
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            // Increment failed login attempts
            await pool.query(
                `UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1,
                    last_failed_login = CURRENT_TIMESTAMP
                WHERE user_id = $1`,
                [user.user_id]
            );

            return res.status(401).json({
                status: 'error',
                error: 'Invalid credentials'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.user_id);
        const refreshToken = generateRefreshToken(user.user_id);

        // Reset failed login attempts and update last seen
        await pool.query(
            `UPDATE users 
            SET failed_login_attempts = 0,
                last_seen = CURRENT_TIMESTAMP,
                last_failed_login = NULL
            WHERE user_id = $1`,
            [user.user_id]
        );
        
        // Remove sensitive data from response
        delete user.password_hash;
        delete user.failed_login_attempts;
        delete user.last_failed_login;

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    id: user.user_id,
                    username: user.username,
                    email: user.email,
                    profilePic: user.profile_pic,
                    status: user.status,
                    lastSeen: user.last_seen
                },
                accessToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
};

