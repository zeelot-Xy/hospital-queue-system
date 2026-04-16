const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getAvailableDoctors,
  bookAppointment,
  getMyAppointments,
  getStaffAppointments,
  createWalkIn,
  markAppointmentMissed,
  rescheduleAppointment,
} = require("../controllers/appointmentController");

const router = express.Router();

router.get(
  "/available-doctors",
  authenticateToken,
  authorizeRole("patient"),
  getAvailableDoctors,
);
router.get(
  "/staff",
  authenticateToken,
  authorizeRole("staff", "admin"),
  getStaffAppointments,
);
router.post(
  "/book",
  authenticateToken,
  authorizeRole("patient"),
  bookAppointment,
);
router.post(
  "/walk-in",
  authenticateToken,
  authorizeRole("staff", "admin"),
  createWalkIn,
);
router.post(
  "/:appointmentId/miss",
  authenticateToken,
  authorizeRole("staff", "admin"),
  markAppointmentMissed,
);
router.post(
  "/:appointmentId/reschedule",
  authenticateToken,
  authorizeRole("staff", "admin"),
  rescheduleAppointment,
);
router.get("/mine", authenticateToken, authorizeRole("patient"), getMyAppointments);

module.exports = router;
