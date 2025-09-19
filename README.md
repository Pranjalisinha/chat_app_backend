# Chat Application Backend

A real-time chat application backend built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Private messaging between users
- Conversation management system
- Group chat functionality
- Real-time message delivery
- Message encryption
- Admin controls for group management
- Read status tracking
- Soft delete functionality
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
MESSAGE_ENCRYPTION_KEY=your_32_character_encryption_key
NODE_ENV=development
```

**Note**: The `MESSAGE_ENCRYPTION_KEY` should be a 32-character string for AES-256 encryption. You can generate one using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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
- POST `/api/users/register` - Register a new user
- POST `/api/users/login` - Login user
- PUT `/api/users/profile` - Update user profile
- GET `/api/users` - Get all users

### Conversations
- GET `/api/conversations` - Get all conversations for authenticated user
- POST `/api/conversations/:userId` - Create or get conversation with specific user
- GET `/api/conversations/:conversationId` - Get specific conversation
- PUT `/api/conversations/:conversationId/read` - Mark conversation as read
- DELETE `/api/conversations/:conversationId` - Delete conversation (soft delete)
- GET `/api/conversations/:conversationId/messages` - Get messages in conversation

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

## Conversation System

The application includes a comprehensive conversation management system that handles private conversations between users:

### Key Features
- **Automatic Conversation Creation**: Conversations are created automatically when users interact
- **Read Status Tracking**: Track which users have read messages in conversations
- **Soft Delete**: Users can delete conversations without affecting the other participant
- **Pagination Support**: Both conversations and messages support pagination for better performance
- **Access Control**: Users can only access conversations they're part of

### Conversation Model
- **Participants**: Array of exactly 2 users for private conversations
- **Last Message**: Reference to the most recent message in the conversation
- **Read Status**: Tracks when each participant last read the conversation
- **Active Status**: Tracks if the conversation is still active
- **Delete Tracking**: Tracks which users have deleted the conversation

### API Usage Examples

#### Get All Conversations
```bash
GET /api/conversations
Authorization: Bearer <token>
```

#### Create/Get Conversation with User
```bash
POST /api/conversations/:userId
Authorization: Bearer <token>
```

#### Get Conversation Messages
```bash
GET /api/conversations/:conversationId/messages?page=1&limit=50
Authorization: Bearer <token>
```

#### Mark Conversation as Read
```bash
PUT /api/conversations/:conversationId/read
Authorization: Bearer <token>
```

## Testing

The project uses Jest for testing. Test files are located in the `/tests` directory.

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/conversation.test.js

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **44 total tests** across all modules
- **18 conversation-specific tests**
- **User authentication and management**
- **Message handling and encryption**
- **Group management functionality**
- **Conversation management system**

## Project Structure

```
chat_app_backend/
├── src/
│   ├── config/         # Configuration files
│   │   └── db.js       # Database connection
│   ├── controllers/    # Route controllers
│   │   ├── user.controller.js
│   │   ├── message.controller.js
│   │   ├── group.controller.js
│   │   └── conversation.controller.js
│   ├── middleware/     # Custom middleware
│   │   └── auth.middleware.js
│   ├── models/        # Mongoose models
│   │   ├── user.model.js
│   │   ├── message.model.js
│   │   ├── group.model.js
│   │   └── conversation.model.js
│   ├── routes/        # API routes
│   │   ├── user.routes.js
│   │   ├── message.routes.js
│   │   ├── group.routes.js
│   │   └── conversation.routes.js
│   ├── utils/         # Utility functions
│   │   └── encryption.js
│   └── server.js      # Express app setup
├── tests/             # Test files
│   ├── user.test.js
│   ├── message.test.js
│   ├── group.test.js
│   ├── conversation.test.js
│   └── testUtils.js
├── .env              # Environment variables
├── jest.config.json  # Jest configuration
└── package.json
```

## Integration Features

### Conversation System Integration
- **Seamless User Experience**: Conversations are automatically created when users start messaging
- **Real-time Updates**: Socket.IO integration for instant conversation updates
- **Message History**: Complete message history within conversations
- **Cross-Platform Support**: Works with both private messages and group chats

### Data Flow
1. **User Registration/Login** → Authentication token generated
2. **Friend Addition** → Conversation automatically created
3. **Message Sending** → Message stored and conversation updated
4. **Real-time Delivery** → Socket.IO broadcasts to connected clients
5. **Read Status** → Automatically tracked and updated

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Message encryption with AES-256
- Input validation and sanitization
- Error handling middleware
- Access control for conversations
- Soft delete functionality for data privacy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.