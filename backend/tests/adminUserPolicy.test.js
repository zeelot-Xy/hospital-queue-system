const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateStaffAccountInput,
  validateAccountStatus,
  validateReplacementPassword,
} = require("../utils/adminUserPolicy");

test("staff account validation normalizes safe input", () => {
  const result = validateStaffAccountInput({
    full_name: " Reception Lead ",
    email: " LEAD@CLINIC.TEST ",
    phone: " +2348000000100 ",
    password: "LongEnough1!",
  });
  assert.equal(result.value.email, "lead@clinic.test");
  assert.equal(result.value.full_name, "Reception Lead");
});

test("staff account validation rejects missing or weak credentials", () => {
  assert.match(validateStaffAccountInput({}).error, /required/);
  assert.match(validateStaffAccountInput({ full_name: "A", email: "bad", phone: "1", password: "short" }).error, /valid email/);
  assert.match(validateReplacementPassword("short").error, /10 characters/);
});

test("managed account status accepts only active and inactive", () => {
  assert.equal(validateAccountStatus(" ACTIVE ").value, "active");
  assert.match(validateAccountStatus("deleted").error, /active or inactive/);
});
