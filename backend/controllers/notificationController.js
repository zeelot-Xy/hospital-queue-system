const { Notification } = require("../models");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { recipient_user_id: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const matchesUser = notification.recipient_user_id === req.user.id;

    if (!matchesUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    await notification.update({ read_at: new Date() });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
};
