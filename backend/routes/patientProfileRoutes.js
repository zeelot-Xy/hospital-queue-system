const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getMyPatientProfile,
  updateMyPatientProfile,
  getDoctorPatientProfile,
  updateDoctorPatientNotes,
} = require("../controllers/patientProfileController");

const router = express.Router();

router.get("/me", authenticateToken, authorizeRole("patient"), getMyPatientProfile);
router.put("/me", authenticateToken, authorizeRole("patient"), updateMyPatientProfile);
router.get(
  "/patient/:patientId",
  authenticateToken,
  authorizeRole("doctor"),
  getDoctorPatientProfile,
);
router.put(
  "/patient/:patientId/notes",
  authenticateToken,
  authorizeRole("doctor"),
  updateDoctorPatientNotes,
);

module.exports = router;
