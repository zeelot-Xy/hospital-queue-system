const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getAvailableDoctors,
  bookAppointment,
  getMyAppointments,
} = require("../controllers/appointmentController");

const router = express.Router();

router.get(
  "/available-doctors",
  authenticateToken,
  authorizeRole("patient"),
  getAvailableDoctors,
);
router.post(
  "/book",
  authenticateToken,
  authorizeRole("patient"),
  bookAppointment,
);
router.get("/mine", authenticateToken, authorizeRole("patient"), getMyAppointments);

module.exports = router;
