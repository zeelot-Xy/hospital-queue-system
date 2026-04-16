const express = require("express");
const { register, login, deleteMyAccount } = require("../controllers/authController");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.delete(
  "/me",
  authenticateToken,
  authorizeRole("doctor", "patient"),
  deleteMyAccount,
);

module.exports = router;
