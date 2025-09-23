import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

// Register new user
export const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({
                status: 'error',
                error: 'User already exists',
            });
        }

        const user = await User.create({
            username,
            email,
            password,
        });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        res.status(201).json({
            status: 'success',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profilePic: user.profilePic,
                    status: user.status,
                },
                token,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};

// Login user
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            });

            res.json({
                status: 'success',
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        profilePic: user.profilePic,
                        status: user.status,
                    },
                    token,
                },
            });
        } else {
            res.status(401).json({
                status: 'error',
                error: 'Invalid email or password',
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.profilePic = req.body.profilePic || user.profilePic;
            user.status = req.body.status || user.status;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                status: 'success',
                data: {
                    user: {
                        id: updatedUser._id,
                        username: updatedUser.username,
                        email: updatedUser.email,
                        profilePic: updatedUser.profilePic,
                        status: updatedUser.status,
                    },
                },
            });
        } else {
            res.status(404).json({
                status: 'error',
                error: 'User not found',
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};

// Get all users
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('-password')
            .sort('-lastSeen');

        res.json({
            status: 'success',
            data: { users },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: 'Server error',
        });
    }
};