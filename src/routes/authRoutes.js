const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const {
  registerValidation,
  loginValidation,
} = require("../validations/authValidation");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");

router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.get("/me", protect, getMe);

module.exports = router;
