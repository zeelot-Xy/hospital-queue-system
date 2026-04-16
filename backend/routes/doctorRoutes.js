const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getAllDoctors,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  createDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

router.get(
  "/me",
  authenticateToken,
  authorizeRole("doctor"),
  getMyDoctorProfile,
);
router.put(
  "/me",
  authenticateToken,
  authorizeRole("doctor"),
  updateMyDoctorProfile,
);
router.get(
  "/",
  authenticateToken,
  authorizeRole("staff", "admin"),
  getAllDoctors,
);
router.post(
  "/",
  authenticateToken,
  authorizeRole("staff", "admin"),
  createDoctor,
);

module.exports = router;
