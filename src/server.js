require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const setupSocket = require('./sockets/socketMain');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = http.createServer(app);

// Setup WebSockets
const io = setupSocket(server);

// Make io accessible globally if needed (though services are preferred)
app.set('socketio', io);

server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
