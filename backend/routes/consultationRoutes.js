const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const {
  getQueueConsultationRecord,
  getMyVisitHistory,
  upsertQueueConsultationRecord,
} = require("../controllers/consultationController");

const router = express.Router();

router.get("/mine", authenticateToken, authorizeRole("patient"), getMyVisitHistory);
router.get(
  "/queue/:queueId",
  authenticateToken,
  authorizeRole("doctor"),
  getQueueConsultationRecord,
);
router.put(
  "/queue/:queueId",
  authenticateToken,
  authorizeRole("doctor"),
  upsertQueueConsultationRecord,
);

module.exports = router;
