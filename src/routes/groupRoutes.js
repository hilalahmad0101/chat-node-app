const express = require("express");
const router = express.Router();
const {
  createGroup,
  getGroups,
  getPublicGroups,
  addMember,
  removeMember,
  renameGroup,
  joinByCode,
  toggleAdminOnly,
} = require("../controllers/groupController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", getGroups);
router.get("/public", getPublicGroups);
router.post("/", createGroup);
router.post("/add-member", addMember);
router.post("/remove-member", removeMember);
router.post("/rename", renameGroup);
router.get("/join/:inviteCode", joinByCode);
router.post("/toggle-admin-only", toggleAdminOnly);

module.exports = router;
