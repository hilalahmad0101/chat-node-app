const User = require("../models/User");

exports.getOnlineUsers = async (req, res) => {
  try {
    const users = await User.find({ isOnline: true }).select(
      "username avatar lastSeen",
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query = "" } = req.query;
    const users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: req.user._id },
    }).select("username avatar isOnline");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    if (userIdToBlock === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userIdToBlock },
    });

    res.json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userIdToUnblock },
    });

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
