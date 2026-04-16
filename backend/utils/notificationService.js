const { Notification } = require("../models");
const { emitQueueEvent } = require("./socketEvents");

const createNotification = async (
  app,
  { recipientUserId = null, recipientRole = null, type, title, message, payload = null },
) => {
    if (!type || !title || !message) {
      return null;
    }

    const notification = await Notification.create({
      recipient_user_id: recipientUserId,
      recipient_role: recipientRole,
      type,
      title,
      message,
      payload,
    });

    const rooms = [];

    if (recipientUserId) {
      rooms.push(`user:${recipientUserId}`);
    }

    if (recipientRole) {
      rooms.push(`role:${recipientRole}`);
    }

    if (rooms.length > 0) {
      emitQueueEvent(
        app,
        "notification:new",
        {
          notification,
        },
        { rooms },
      );
    }

    return notification;
};

const createNotifications = async (app, notifications = []) =>
  Promise.all(
    notifications.map((notification) => createNotification(app, notification)),
  );

module.exports = {
  createNotification,
  createNotifications,
};
