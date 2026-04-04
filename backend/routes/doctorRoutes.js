const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getAllDoctors,
  createDoctor,
} = require("../controllers/doctorController");

const router = express.Router();

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
