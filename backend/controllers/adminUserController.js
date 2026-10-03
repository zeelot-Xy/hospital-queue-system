const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User } = require("../models");
const { logAudit } = require("../utils/auditLogger");
const {
  validateStaffAccountInput,
  validateAccountStatus,
  validateReplacementPassword,
} = require("../utils/adminUserPolicy");

const publicFields = ["id", "full_name", "email", "phone", "role", "status", "createdAt"];

const listManagedAccounts = async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: publicFields,
      where: { role: { [Op.in]: ["staff", "admin"] } },
      order: [["full_name", "ASC"]],
    });
    res.json({ users });
  } catch (error) {
    console.error("List managed accounts error:", error);
    res.status(500).json({ message: "Could not load staff accounts" });
  }
};

const createStaffAccount = async (req, res) => {
  try {
    const validation = validateStaffAccountInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    const input = validation.value;
    if (await User.findOne({ where: { email: input.email } })) {
      return res.status(409).json({ message: "An account already uses this email" });
    }
    const user = await User.create({
      ...input,
      password: await bcrypt.hash(input.password, 12),
      role: "staff",
      status: "active",
    });
    await logAudit({
      actorUserId: req.user.id,
      actionType: "admin.staff_created",
      targetType: "user",
      targetId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    res.status(201).json({
      message: "Staff account created",
      user: publicFields.reduce((result, field) => ({ ...result, [field]: user[field] }), {}),
    });
  } catch (error) {
    console.error("Create staff account error:", error);
    res.status(500).json({ message: "Could not create the staff account" });
  }
};

const updateAccountStatus = async (req, res) => {
  try {
    const validation = validateAccountStatus(req.body.status);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    const user = await User.findByPk(req.params.id);
    if (!user || !["staff", "admin"].includes(user.role)) {
      return res.status(404).json({ message: "Managed account not found" });
    }
    if (user.id === req.user.id && validation.value === "inactive") {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }
    await user.update({ status: validation.value });
    await logAudit({
      actorUserId: req.user.id,
      actionType: "admin.account_status_changed",
      targetType: "user",
      targetId: user.id,
      metadata: { status: user.status, role: user.role },
    });
    res.json({ message: "Account status updated", user: { id: user.id, status: user.status } });
  } catch (error) {
    console.error("Update account status error:", error);
    res.status(500).json({ message: "Could not update the account status" });
  }
};

const resetAccountPassword = async (req, res) => {
  try {
    const validation = validateReplacementPassword(req.body.password);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    const user = await User.findByPk(req.params.id);
    if (!user || !["staff", "admin"].includes(user.role)) {
      return res.status(404).json({ message: "Managed account not found" });
    }
    await user.update({ password: await bcrypt.hash(validation.value, 12) });
    await logAudit({
      actorUserId: req.user.id,
      actionType: "admin.password_reset",
      targetType: "user",
      targetId: user.id,
      metadata: { role: user.role },
    });
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset account password error:", error);
    res.status(500).json({ message: "Could not reset the account password" });
  }
};

module.exports = {
  listManagedAccounts,
  createStaffAccount,
  updateAccountStatus,
  resetAccountPassword,
};
