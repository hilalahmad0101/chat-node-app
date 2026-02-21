const express = require('express');
const router = express.Router();
const { getConversations, getMessages, createConversation, clearChat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/messages/:conversationId', getMessages);
router.delete('/clear/:conversationId', clearChat);

module.exports = router;
