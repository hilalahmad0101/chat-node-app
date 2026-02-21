# Production-Ready Real-Time Chat API

This is a scalable, modular chat backend built with **Node.js**, **Express**, **Socket.IO**, **MongoDB**, and **Redis**.

## 🚀 Key Features

- **JWT Auth**: Secure REST and WebSocket connections.
- **Scaling**: Redis Adapter for horizontal scaling across multiple server instances.
- **1-on-1 Chat**: Private messaging with real-time delivery and seen status.
- **Group Chat**: Full group management with admin roles and broadcasting.
- **Presence**: Real-time online/offline status and last seen tracking.
- **Security**: Helmet, CORS, Rate limiting, and request validation.

## 🛠 Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Real-time**: Socket.IO with Redis Adapter
- **Database**: MongoDB (Mongoose)
- **Cache/Broker**: Redis (ioredis)
- **Logging**: Winston

## 📁 Folder Structure

```text
src/
  config/      # DB & Redis configs
  controllers/ # API controllers (MVC)
  middleware/  # Auth, File Upload, Security
  models/      # Mongoose Schemas
  routes/      # API Routes
  sockets/     # Socket.IO handlers
  utils/       # Logger and helpers
  validations/ # Request validation schemas
  app.js       # Express configuration
  server.js    # App entry point & Socket setup
```

## 🏃 How to Run

### Prerequisites

- Node.js installed
- MongoDB running locally or on Atlas
- Redis running locally or on a cloud provider

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   Update the `.env` file with your credentials (MongoDB URI, Redis host, etc.).
3. Start the server (Development):
   ```bash
   npm run dev
   ```
4. Start the server (Production):
   ```bash
   npm start
   ```

## 📖 Documentation

Check [DOCS.md](./DOCS.md) for full API reference, socket events, and architecture flow.
Check [frontend-example.js](./frontend-example.js) for sample client-side integration.
