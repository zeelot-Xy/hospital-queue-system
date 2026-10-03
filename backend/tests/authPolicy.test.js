const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME = process.env.DB_NAME || "hospital_queue_test";
process.env.DB_USER = process.env.DB_USER || "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "test-password";
process.env.DB_HOST = process.env.DB_HOST || "127.0.0.1";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-secret-that-is-longer-than-thirty-two-characters";

const {
  normalizePublicRegistrationRole,
  validateRegistrationInput,
} = require("../utils/authPolicy");
const { register } = require("../controllers/authController");

test("public registration accepts patient and doctor roles", () => {
  assert.equal(normalizePublicRegistrationRole("patient"), "patient");
  assert.equal(normalizePublicRegistrationRole("Doctor"), "doctor");
  assert.equal(normalizePublicRegistrationRole(undefined), "patient");
});

test("public registration rejects privileged and unknown roles", () => {
  assert.equal(normalizePublicRegistrationRole("staff"), null);
  assert.equal(normalizePublicRegistrationRole("admin"), null);
  assert.equal(normalizePublicRegistrationRole("superuser"), null);
});

test("registration requires complete identity data and a strong-enough password", () => {
  const missingName = validateRegistrationInput({
    email: "patient@example.com",
    phone: "08000000000",
    password: "Password123!",
    role: "patient",
  });
  assert.match(missingName.error, /required/i);

  const weakPassword = validateRegistrationInput({
    full_name: "Test Patient",
    email: "patient@example.com",
    phone: "08000000000",
    password: "short",
    role: "patient",
  });
  assert.match(weakPassword.error, /at least 8/i);
});

test("doctor registration requires specialization and normalizes fields", () => {
  const missingSpecialization = validateRegistrationInput({
    full_name: "Test Doctor",
    email: "doctor@example.com",
    phone: "08000000001",
    password: "Password123!",
    role: "doctor",
  });
  assert.match(missingSpecialization.error, /specialization/i);

  const valid = validateRegistrationInput({
    full_name: "  Test Doctor  ",
    email: "  DOCTOR@EXAMPLE.COM ",
    phone: " 08000000001 ",
    password: "Password123!",
    role: "doctor",
    specialization: " General Medicine ",
  });

  assert.deepEqual(valid.value, {
    full_name: "Test Doctor",
    email: "doctor@example.com",
    phone: "08000000001",
    password: "Password123!",
    role: "doctor",
    specialization: "General Medicine",
  });
});

test("the HTTP registration boundary rejects an admin role before database access", async () => {
  const models = require("../models");
  const originalFindOne = models.User.findOne;
  models.User.findOne = async () => {
    throw new Error("database access should not occur for a forbidden role");
  };

  const response = {
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
  };

  try {
    await register(
      {
        body: {
          full_name: "Attacker",
          email: "attacker@example.com",
          phone: "08000000002",
          password: "Password123!",
          role: "admin",
        },
      },
      response,
    );
  } finally {
    models.User.findOne = originalFindOne;
  }

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /patient and doctor/i);
});

test("the HTTP registration boundary preserves legitimate patient registration", async () => {
  const models = require("../models");
  const originals = {
    findOne: models.User.findOne,
    userCreate: models.User.create,
    profileCreate: models.PatientProfile.create,
    auditCreate: models.AuditLog.create,
    transaction: models.sequelize.transaction,
  };
  let createdProfile = false;

  models.User.findOne = async () => null;
  models.User.create = async (values) => ({ id: 77, ...values });
  models.PatientProfile.create = async ({ user_id }) => {
    createdProfile = user_id === 77;
    return { id: 12, user_id };
  };
  models.AuditLog.create = async (values) => ({ id: 5, ...values });
  models.sequelize.transaction = async (callback) => callback({ id: "test-transaction" });

  const response = {
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
  };

  try {
    await register(
      {
        body: {
          full_name: "Legitimate Patient",
          email: "patient@example.com",
          phone: "08000000003",
          password: "Password123!",
          role: "patient",
        },
      },
      response,
    );
  } finally {
    models.User.findOne = originals.findOne;
    models.User.create = originals.userCreate;
    models.PatientProfile.create = originals.profileCreate;
    models.AuditLog.create = originals.auditCreate;
    models.sequelize.transaction = originals.transaction;
  }

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.user.role, "patient");
  assert.ok(response.body.token);
  assert.equal(createdProfile, true);
});
