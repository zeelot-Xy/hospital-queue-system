const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const { getAuditLogs } = require("../controllers/auditController");

const router = express.Router();

router.get("/", authenticateToken, authorizeRole("staff", "admin"), getAuditLogs);

module.exports = router;
