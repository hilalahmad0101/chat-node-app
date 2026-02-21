const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const socketProtect = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        // Attach user info to socket
        socket.user = user;
        next();
    } catch (error) {
        logger.error(`Socket Auth Error: ${error.message}`);
        next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = { socketProtect };
