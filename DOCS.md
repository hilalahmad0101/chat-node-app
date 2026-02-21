# Chat API Documentation

## Logic & Architecture

### 1. Authentication & Socket Flow

- **JWT Auth**: Users login via REST API `/api/auth/login` and receive a token.
- **Socket Protection**: The token is passed in the `auth` object during the Socket.IO handshake. A middleware validates this token before allowing the connection.
- **Personal Rooms**: Every user automatically joins a room named after their `userId`. This allows the server to send messages to all devices a user might be logged into by targeting `io.to(userId)`.

### 2. Scaling with Redis

- We use the `@socket.io/redis-adapter` with `ioredis`.
- When an event is emitted on one instance of the server, Redis broadcasts it to all other instances.
- This ensures that if User A is on Server 1 and User B is on Server 2, they can still communicate seamlessly.

### 3. Folder Structure

- `src/config`: Connection logic for DB and Redis.
- `src/controllers`: REST API logic.
- `src/models`: Mongoose schemas.
- `src/routes`: API endpoints.
- `src/sockets`: Web socket event handlers.
- `src/services`: (Optional) Business logic extraction.
- `src/middleware`: Auth, Uploads, and Error handling.

## API Endpoints (Postman Collection)

### Auth

- `POST /api/auth/register`: { username, email, password }
- `POST /api/auth/login`: { email, password }

### Chat

- `GET /api/chat/conversations`: Fetches list of chats.
- `GET /api/chat/messages/:conversationId?page=1&limit=20`: Paginated messages.
- `POST /api/chat/conversations`: { receiverId } - Create/Get 1-on-1 chat.
- `DELETE /api/chat/clear/:conversationId`: Deletes all messages in a conversation.

### Groups

- `POST /api/groups`: { name, members: [], description, groupType: 'public'|'private' }
- `POST /api/groups/add-member`: { groupId, userId }
- `POST /api/groups/remove-member`: { groupId, userId }
- `GET /api/groups/join/:inviteCode`: Join via link.
- `POST /api/groups/toggle-admin-only`: { groupId, status: true/false }

### Users

- `GET /api/users/online`: List online users.
- `GET /api/users/search?query=name`: Search users.
- `POST /api/users/block`: { userIdToBlock }
- `POST /api/users/unblock`: { userIdToUnblock }

## Socket Events Reference

### Client -> Server

- `send_message`: { conversationId, receiverId, content, messageType, parentMessageId, isForwarded, originalMessageId }
- `typing`: { conversationId, receiverId, groupId }
- `stop_typing`: { conversationId, receiverId, groupId }
- `message_seen`: { messageId, senderId }
- `edit_message`: { messageId, newContent, targetId, groupId }
- `delete_message`: { messageId, targetId, groupId }
- `join_group`: (groupId)
- `send_group_message`: { groupId, conversationId, content, parentMessageId }

### Server -> Client

- `receive_message`: (message object)
- `display_typing`: { conversationId, userId, username, groupId }
- `hide_typing`: { conversationId, userId, groupId }
- `message_status_update`: { messageId, status: 'seen' }
- `message_edited`: (updated message object)
- `message_deleted`: { messageId }
- `user_online`: { userId }
- `user_offline`: { userId }
- `receive_group_message`: { groupId, message }
- `error`: { message: '...' }
