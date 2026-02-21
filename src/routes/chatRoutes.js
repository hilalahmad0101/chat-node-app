const express = require("express");
const router = express.Router();
const {
  getConversations,
  getMessages,
  createConversation,
  clearChat,
  uploadFile,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/conversations", getConversations);
router.post("/conversations", createConversation);
router.get("/messages/:conversationId", getMessages);
router.delete("/clear/:conversationId", clearChat);
router.post("/upload", upload.single("file"), uploadFile);

module.exports = router;
