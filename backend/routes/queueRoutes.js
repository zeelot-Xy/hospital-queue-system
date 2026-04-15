const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  markAsArrived,
  getDoctorQueue,
  getStaffLiveQueues,
  getMyQueueStatus,
  callNextPatient,
  confirmAdmit,
  startConsultation,
  completeConsultation,
} = require("../controllers/queueController");

const router = express.Router();

router.post(
  "/arrived",
  authenticateToken,
  authorizeRole("patient"),
  markAsArrived,
);
router.get("/me", authenticateToken, authorizeRole("patient"), getMyQueueStatus);
router.get("/doctor/me", authenticateToken, authorizeRole("doctor"), getDoctorQueue);
router.get(
  "/live",
  authenticateToken,
  authorizeRole("staff", "admin"),
  getStaffLiveQueues,
);
router.post(
  "/call-next",
  authenticateToken,
  authorizeRole("doctor"),
  callNextPatient,
);
router.post(
  "/confirm-admit",
  authenticateToken,
  authorizeRole("staff", "admin"),
  confirmAdmit,
);
router.post(
  "/start-consultation",
  authenticateToken,
  authorizeRole("doctor"),
  startConsultation,
);
router.post(
  "/complete",
  authenticateToken,
  authorizeRole("doctor", "staff", "admin"),
  completeConsultation,
);

module.exports = router;
