const { AuditLog, User } = require("../models");

const getAuditLogs = async (_req, res) => {
  try {
    const logs = await AuditLog.findAll({
      include: [
        {
          model: User,
          as: "Actor",
          attributes: ["id", "full_name", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAuditLogs,
};
