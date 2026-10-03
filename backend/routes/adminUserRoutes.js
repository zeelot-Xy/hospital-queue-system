const express = require("express");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");
const {
  listManagedAccounts,
  createStaffAccount,
  updateAccountStatus,
  resetAccountPassword,
} = require("../controllers/adminUserController");

const router = express.Router();
router.use(authenticateToken, authorizeRole("admin"));
router.get("/", listManagedAccounts);
router.post("/staff", createStaffAccount);
router.patch("/:id/status", updateAccountStatus);
router.patch("/:id/password", resetAccountPassword);

module.exports = router;
