const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const {
  getMyAvailability,
  replaceMyAvailability,
} = require("../controllers/availabilityController");

const router = express.Router();

router.get("/me", authenticateToken, authorizeRole("doctor"), getMyAvailability);
router.put("/me", authenticateToken, authorizeRole("doctor"), replaceMyAvailability);

module.exports = router;
