const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.DB_NAME ||= "hospital_queue_test";
process.env.DB_USER ||= "postgres";
process.env.DB_PASSWORD ||= "test-password";
process.env.DB_HOST ||= "127.0.0.1";
process.env.JWT_SECRET ||= "test-secret-that-is-longer-than-thirty-two-characters";

const models = require("../models");
const { authenticateToken, authorizeRole } = require("../middleware/authMiddleware");

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("authentication rejects missing bearer tokens", async () => {
  const res = response();
  await authenticateToken({ headers: {} }, res, () => assert.fail("next called"));
  assert.equal(res.statusCode, 401);
});

test("authentication rejects inactive accounts even with a valid token", async () => {
  const original = models.User.findByPk;
  models.User.findByPk = async () => ({ id: 9, role: "patient", status: "inactive" });
  const token = jwt.sign({ id: 9, role: "patient" }, process.env.JWT_SECRET);
  const res = response();
  try {
    await authenticateToken(
      { headers: { authorization: `Bearer ${token}` } },
      res,
      () => assert.fail("next called"),
    );
  } finally {
    models.User.findByPk = original;
  }
  assert.equal(res.statusCode, 403);
});

test("authentication uses the current database role instead of trusting a changed token", async () => {
  const original = models.User.findByPk;
  models.User.findByPk = async () => ({ id: 9, role: "patient", status: "active" });
  const token = jwt.sign({ id: 9, role: "admin" }, process.env.JWT_SECRET);
  const res = response();
  try {
    await authenticateToken(
      { headers: { authorization: `Bearer ${token}` } },
      res,
      () => assert.fail("next called"),
    );
  } finally {
    models.User.findByPk = original;
  }
  assert.equal(res.statusCode, 403);
});

test("role authorization allows only explicitly listed roles", () => {
  const denied = response();
  authorizeRole("staff", "admin")(
    { user: { id: 3, role: "patient" } },
    denied,
    () => assert.fail("next called"),
  );
  assert.equal(denied.statusCode, 403);

  let allowed = false;
  authorizeRole("staff", "admin")(
    { user: { id: 4, role: "staff" } },
    response(),
    () => { allowed = true; },
  );
  assert.equal(allowed, true);
});
