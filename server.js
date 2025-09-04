import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import groupRoutes from './src/routes/group.routes.js';
import messageRoutes from './src/routes/message.routes.js';

// Initialize dotenv
dotenv.config();

// Get dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const Node_ENV = process.env.NODE_ENV;

// Create HTTP server
import { createServer } from 'http';
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('setup', (userData) => {
        socket.join(`user:${userData.user_id}`);
        socket.emit('connected');
    });

    socket.on('join_chat', (room) => {
        socket.join(room);
        console.log('User joined room:', room);
    });

    socket.on('join_group', (groupId) => {
        socket.join(`group:${groupId}`);
        console.log('User joined group:', groupId);
    });

    socket.on('typing', (data) => {
        if (data.groupId) {
            socket.to(`group:${data.groupId}`).emit('typing', data);
        } else {
            socket.to(`user:${data.recipientId}`).emit('typing', data);
        }
    });

    socket.on('stop_typing', (data) => {
        if (data.groupId) {
            socket.to(`group:${data.groupId}`).emit('stop_typing');
        } else {
            socket.to(`user:${data.recipientId}`).emit('stop_typing');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${Node_ENV}`)
});
