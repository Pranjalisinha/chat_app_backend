# Chat Application Backend

A real-time chat application backend built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Private messaging between users
- Group chat functionality
- Real-time message delivery
- Message encryption
- Admin controls for group management
- REST API endpoints

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- Jest for testing
- Bcrypt for password hashing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat_app_backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat_app
TEST_MONGODB_URI=mongodb://localhost:27017/chat_app_test
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Run tests:
```bash
npm test
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Users
- GET `/api/users` - Get all users
- GET `/api/users/:userId` - Get user by ID
- PUT `/api/users/:userId` - Update user profile

### Messages
- POST `/api/messages` - Send a new message
- GET `/api/messages/:userId` - Get messages with a specific user
- DELETE `/api/messages/:messageId` - Delete a message

### Groups
- POST `/api/groups` - Create a new group
- GET `/api/groups` - Get all groups
- GET `/api/groups/:groupId` - Get group by ID
- PUT `/api/groups/:groupId` - Update group
- DELETE `/api/groups/:groupId` - Delete group
- POST `/api/groups/:groupId/join` - Join a group
- DELETE `/api/groups/:groupId/leave` - Leave a group
- POST `/api/groups/:groupId/messages` - Send message to group

## Testing

The project uses Jest for testing. Test files are located in the `/tests` directory.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
chat_app_backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── utils/         # Utility functions
│   └── app.js         # Express app setup
├── tests/             # Test files
├── .env              # Environment variables
└── package.json
```

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Message encryption
- Input validation and sanitization
- Error handling middleware

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.