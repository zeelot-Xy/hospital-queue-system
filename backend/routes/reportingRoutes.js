const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { getReports } = require("../controllers/reportingController");

const router = express.Router();

router.get("/", authenticateToken, authorizeRole("staff", "admin"), getReports);

module.exports = router;
