const { Server } = require("socket.io");
const { socketProtect } = require("../middleware/socketAuth");
const logger = require("../utils/logger");
const chatHandler = require("./chatHandler");
const User = require("../models/User");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Authenticate socket connections
  io.use(socketProtect);

  io.on("connection", async (socket) => {
    logger.info(`User Connected: ${socket.user.username} (${socket.id})`);

    // Join personal room based on userId for multi-device support
    socket.join(socket.user._id.toString());

    // Auto-join all group rooms the user belongs to
    const Group = require("../models/Group");
    const userGroups = await Group.find({
      members: { $in: [socket.user._id] },
    }).select("_id");
    userGroups.forEach((g) => socket.join(`group_${g._id}`));

    // Update online status
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: Date.now(),
    });

    // Broadcast presence
    socket.broadcast.emit("user_online", { userId: socket.user._id });

    // Load chat handlers
    chatHandler(io, socket);

    socket.on("disconnect", async () => {
      logger.info(`User Disconnected: ${socket.user.username}`);

      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: Date.now(),
      });

      socket.broadcast.emit("user_offline", { userId: socket.user._id });
    });
  });

  return io;
};

module.exports = setupSocket;
