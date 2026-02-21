const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Group = require("../models/Group");
const User = require("../models/User");
const logger = require("../utils/logger");

const chatHandler = (io, socket) => {
  // 1. Send Private Message (Supports Tagging & Forwarding)
  socket.on("send_message", async (data) => {
    try {
      const {
        conversationId,
        content,
        receiverId,
        messageType,
        fileUrl,
        parentMessageId,
        isForwarded,
        originalMessageId,
      } = data;

      // Check if blocked
      const receiver = await User.findById(receiverId);
      if (!receiver)
        return socket.emit("error", { message: "Receiver not found" });

      if (receiver.blockedUsers.includes(socket.user._id)) {
        return socket.emit("error", {
          message: "You are blocked by this user",
        });
      }

      if (socket.user.blockedUsers.includes(receiverId)) {
        return socket.emit("error", { message: "You have blocked this user" });
      }

      // Check if receiver is online to set initial status
      const receiverSockets = await io.in(receiverId).fetchSockets();
      const initialStatus = receiverSockets.length > 0 ? "delivered" : "sent";

      const newMessage = await Message.create({
        conversationId,
        senderId: socket.user._id,
        content,
        messageType: messageType || "text",
        fileUrl,
        parentMessageId,
        isForwarded,
        originalMessageId,
        status: initialStatus,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate("senderId", "username avatar")
        .populate({
          path: "conversationId",
          populate: {
            path: "participants",
            select: "username avatar isOnline lastSeen",
          },
        });

      io.to(receiverId).emit("receive_message", populatedMessage);
      socket.emit("message_sent", populatedMessage);

      // If was delivered, notify sender immediately if not already notified by default
      if (initialStatus === "delivered") {
        socket.emit("message_status_updated", {
          messageId: newMessage._id,
          status: "delivered",
        });
      }
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("mark_message_seen", async (data) => {
    try {
      const { messageId, senderId } = data;
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          status: "seen",
          seenAt: new Date(),
        },
        { new: true },
      );

      if (message) {
        io.to(senderId).emit("message_status_updated", {
          messageId,
          status: "seen",
        });
      }
    } catch (error) {
      logger.error(`Error marking message seen: ${error.message}`);
    }
  });

  // 2. Typing Indicator (Works for Private & Groups)
  socket.on("typing", (data) => {
    const { conversationId, receiverId, groupId } = data;
    const target = groupId ? `group_${groupId}` : receiverId;
    socket.to(target).emit("typing", {
      conversationId,
      groupId,
      userId: socket.user._id,
      username: socket.user.username,
    });
  });

  socket.on("stop_typing", (data) => {
    const { conversationId, receiverId, groupId } = data;
    const target = groupId ? `group_${groupId}` : receiverId;
    socket.to(target).emit("stop_typing", {
      conversationId,
      groupId,
      userId: socket.user._id,
      username: socket.user.username,
    });
  });

  // 3. Edit Message
  socket.on("edit_message", async (data) => {
    try {
      const { messageId, newContent, targetId, groupId } = data;
      const message = await Message.findOneAndUpdate(
        { _id: messageId, senderId: socket.user._id },
        { content: newContent, isEdited: true },
        { new: true },
      );

      if (message) {
        const target = groupId ? `group_${groupId}` : targetId;
        io.to(target).emit("message_edited", message);
      }
    } catch (error) {
      logger.error(`Error editing message: ${error.message}`);
    }
  });

  // 4. Delete Message (Soft Delete)
  socket.on("delete_message", async (data) => {
    try {
      const { messageId, targetId, groupId } = data;
      const message = await Message.findOneAndUpdate(
        { _id: messageId, senderId: socket.user._id },
        { content: "This message was deleted", isDeleted: true },
        { new: true },
      );

      if (message) {
        const target = groupId ? `group_${groupId}` : targetId;
        io.to(target).emit("message_deleted", { messageId });
      }
    } catch (error) {
      logger.error(`Error deleting message: ${error.message}`);
    }
  });

  // 5. Join Group Room
  socket.on("join_group", (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // 6. Send Group Message (with Admin-only check)
  socket.on("send_group_message", async (data) => {
    try {
      const {
        groupId,
        conversationId,
        content,
        messageType,
        fileUrl,
        parentMessageId,
      } = data;

      const group = await Group.findById(groupId);
      if (!group) return;

      // Check if only admin can message
      if (
        group.settings?.onlyAdminCanMessage &&
        group.admin.toString() !== socket.user._id.toString()
      ) {
        return socket.emit("error", {
          message: "Only admins can send messages in this group",
        });
      }

      const newMessage = await Message.create({
        conversationId,
        senderId: socket.user._id,
        content,
        messageType: messageType || "text",
        fileUrl,
        parentMessageId,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate("senderId", "username avatar")
        .populate({
          path: "conversationId",
          populate: {
            path: "participants",
            select: "username avatar isOnline lastSeen",
          },
        });

      io.to(`group_${groupId}`).emit("receive_group_message", {
        groupId,
        message: populatedMessage,
      });
    } catch (error) {
      logger.error(`Error sending group message: ${error.message}`);
    }
  });
};

module.exports = chatHandler;
