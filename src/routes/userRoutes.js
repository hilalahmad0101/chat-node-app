const express = require('express');
const router = express.Router();
const { getOnlineUsers, searchUsers, blockUser, unblockUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/online', getOnlineUsers);
router.get('/search', searchUsers);
router.post('/block', blockUser);
router.post('/unblock', unblockUser);

module.exports = router;
