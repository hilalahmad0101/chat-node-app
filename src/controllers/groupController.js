const crypto = require("crypto");
const Group = require("../models/Group");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Helper: create a system message and emit it to the group room
const createSystemMessage = async (io, conversationId, groupId, text) => {
  const msg = await Message.create({
    conversationId,
    senderId: null, // system messages have no sender
    content: text,
    messageType: "system",
    status: "seen",
  });

  // Update conversation lastMessage
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: msg._id,
  });

  const populatedMsg = await msg.populate({
    path: "conversationId",
    populate: {
      path: "participants",
      select: "username avatar isOnline lastSeen",
    },
  });

  if (io) {
    io.to(`group_${groupId}`).emit("receive_group_message", {
      groupId,
      message: populatedMsg,
    });
  }
  return populatedMsg;
};

// Get all groups for the logged-in user
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: { $in: [req.user._id] } })
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline")
      .populate({
        path: "conversationId",
        populate: [
          { path: "participants", select: "username avatar isOnline lastSeen" },
          { path: "lastMessage" },
        ],
      })
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get public groups
exports.getPublicGroups = async (req, res) => {
  try {
    const groups = await Group.find({ groupType: "public" })
      .populate("admin", "username avatar")
      .select("name description avatar members groupType inviteCode")
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { name, members = [], description, avatar, groupType } = req.body;
    const groupMembers = [...new Set([...members, req.user._id.toString()])];
    const inviteCode = crypto.randomBytes(4).toString("hex");

    const conversation = await Conversation.create({
      participants: groupMembers,
      isGroup: true,
      groupData: { name, admin: req.user._id, description, avatar },
    });

    const group = await Group.create({
      name,
      admin: req.user._id,
      members: groupMembers,
      conversationId: conversation._id,
      description,
      avatar,
      groupType: groupType || "private",
      inviteCode: groupType === "public" ? inviteCode : undefined,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline")
      .populate({
        path: "conversationId",
        populate: [
          { path: "participants", select: "username avatar isOnline lastSeen" },
        ],
      });

    // Join the socket room for the creator and emit group to ALL members
    if (io) {
      groupMembers.forEach((memberId) => {
        // Notify each member's personal room so they get the group immediately
        io.to(memberId.toString()).emit("group_created", populatedGroup);
      });
    }

    // System message: group created
    await createSystemMessage(
      io,
      conversation._id,
      group._id,
      `${req.user.username} created the group "${name}"`,
    );

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId).populate(
      "members",
      "username avatar isOnline",
    );

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    if (!group.members.map((m) => m._id.toString()).includes(userId)) {
      group.members.push(userId);
      await group.save();
      await Conversation.findByIdAndUpdate(group.conversationId, {
        $addToSet: { participants: userId },
      });
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline");

    // Notify ALL group members of the group update
    if (io) {
      io.to(`group_${groupId}`).emit("group_updated", populatedGroup);
      // Also push the group to the newly added user's socket room
      io.to(userId).emit(
        "group_created",
        await Group.findById(group._id)
          .populate("admin", "username avatar")
          .populate("members", "username avatar isOnline")
          .populate({
            path: "conversationId",
            populate: [
              {
                path: "participants",
                select: "username avatar isOnline lastSeen",
              },
            ],
          }),
      );
    }

    // Find added user's username
    const addedUser = group.members.find((m) => m._id?.toString() === userId);
    const addedUsername = addedUser?.username || "A user";

    await createSystemMessage(
      io,
      group.conversationId,
      groupId,
      `${req.user.username} added ${addedUsername}`,
    );

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId).populate(
      "members",
      "username avatar isOnline",
    );

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }
    if (userId === group.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove the admin" });
    }

    const removedUser = group.members.find((m) => m._id?.toString() === userId);
    const removedUsername = removedUser?.username || "A user";

    group.members = group.members.filter((m) => m._id.toString() !== userId);
    await group.save();

    await Conversation.findByIdAndUpdate(group.conversationId, {
      $pull: { participants: userId },
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline");

    if (io) {
      io.to(`group_${groupId}`).emit("group_updated", populatedGroup);
      // Tell the removed user they've been removed
      io.to(userId).emit("group_member_removed", { groupId, userId });
    }

    await createSystemMessage(
      io,
      group.conversationId,
      groupId,
      `${req.user.username} removed ${removedUsername}`,
    );

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.renameGroup = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { groupId, name } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Name is required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only admin can rename the group" });
    }

    const oldName = group.name;
    group.name = name.trim();
    await group.save();

    // Also update conversation groupData
    await Conversation.findByIdAndUpdate(group.conversationId, {
      "groupData.name": name.trim(),
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline");

    if (io) {
      io.to(`group_${groupId}`).emit("group_updated", populatedGroup);
    }

    await createSystemMessage(
      io,
      group.conversationId,
      groupId,
      `${req.user.username} changed the group name from "${oldName}" to "${name.trim()}"`,
    );

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinByCode = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { inviteCode } = req.params;
    const group = await Group.findOne({ inviteCode });

    if (!group)
      return res
        .status(404)
        .json({ message: "Invalid or expired invite link" });

    if (
      !group.members.map((m) => m.toString()).includes(req.user._id.toString())
    ) {
      group.members.push(req.user._id);
      await group.save();
      await Conversation.findByIdAndUpdate(group.conversationId, {
        $addToSet: { participants: req.user._id },
      });

      const populatedGroup = await Group.findById(group._id)
        .populate("admin", "username avatar")
        .populate("members", "username avatar isOnline")
        .populate({
          path: "conversationId",
          populate: [
            {
              path: "participants",
              select: "username avatar isOnline lastSeen",
            },
          ],
        });

      if (io) {
        io.to(`group_${group._id}`).emit("group_updated", populatedGroup);
        io.to(req.user._id.toString()).emit("group_created", populatedGroup);
      }

      await createSystemMessage(
        io,
        group.conversationId,
        group._id,
        `${req.user.username} joined via invite link`,
      );

      return res.json({
        message: "Joined successfully",
        group: populatedGroup,
      });
    }

    res.json({ message: "Already a member", group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleAdminOnly = async (req, res) => {
  try {
    const io = req.app.get("socketio");
    const { groupId, status } = req.body;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only admin can change settings" });
    }

    group.settings.onlyAdminCanMessage = status;
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "username avatar")
      .populate("members", "username avatar isOnline");

    if (io) {
      io.to(`group_${groupId}`).emit("group_updated", populatedGroup);
    }

    const systemText = status
      ? `${req.user.username} turned on admin-only messaging`
      : `${req.user.username} turned off admin-only messaging. All members can send messages`;

    await createSystemMessage(io, group.conversationId, groupId, systemText);

    res.json({
      message: `Admin-only messaging ${status ? "enabled" : "disabled"}`,
      group: populatedGroup,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
