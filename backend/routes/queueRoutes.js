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
  callAgain,
  confirmAdmit,
  startConsultation,
  completeConsultation,
  returnToWaiting,
  transferQueue,
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
  "/call-again",
  authenticateToken,
  authorizeRole("doctor"),
  callAgain,
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
router.post(
  "/return-to-waiting",
  authenticateToken,
  authorizeRole("staff", "admin"),
  returnToWaiting,
);
router.post(
  "/transfer",
  authenticateToken,
  authorizeRole("staff", "admin"),
  transferQueue,
);

module.exports = router;
