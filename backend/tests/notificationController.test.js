const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME = process.env.DB_NAME || "hospital_queue_test";
process.env.DB_USER = process.env.DB_USER || "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "test-password";
process.env.DB_HOST = process.env.DB_HOST || "127.0.0.1";

const models = require("../models");
const { getMyNotifications, markNotificationRead } = require("../controllers/notificationController");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("notification listing is scoped to the authenticated user", async () => {
  const originalFindAll = models.Notification.findAll;
  let capturedOptions;
  models.Notification.findAll = async (options) => {
    capturedOptions = options;
    return [];
  };

  const res = response();
  try {
    await getMyNotifications({ user: { id: 42, role: "staff" } }, res);
  } finally {
    models.Notification.findAll = originalFindAll;
  }

  assert.deepEqual(capturedOptions.where, { recipient_user_id: 42 });
  assert.equal(res.statusCode, 200);
});

test("a role match alone cannot mark another user's notification read", async () => {
  const originalFindByPk = models.Notification.findByPk;
  let updateCalled = false;
  models.Notification.findByPk = async () => ({
    id: 9,
    recipient_user_id: 99,
    recipient_role: "staff",
    async update() {
      updateCalled = true;
    },
  });

  const res = response();
  try {
    await markNotificationRead(
      { params: { id: "9" }, user: { id: 42, role: "staff" } },
      res,
    );
  } finally {
    models.Notification.findByPk = originalFindByPk;
  }

  assert.equal(res.statusCode, 403);
  assert.equal(updateCalled, false);
});
