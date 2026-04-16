const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  markNotificationRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticateToken, getMyNotifications);
router.post("/:id/read", authenticateToken, markNotificationRead);

module.exports = router;
