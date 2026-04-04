const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");
const {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRole("staff", "admin"),
  getAllDepartments,
);
router.post(
  "/",
  authenticateToken,
  authorizeRole("staff", "admin"),
  createDepartment,
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("staff", "admin"),
  updateDepartment,
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("staff", "admin"),
  deleteDepartment,
);

module.exports = router;
