const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME = process.env.DB_NAME || "hospital_queue_test";
process.env.DB_USER = process.env.DB_USER || "postgres";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "test-password";
process.env.DB_HOST = process.env.DB_HOST || "127.0.0.1";

const {
  getDayOfWeek,
  timeToMinutes,
  validateAvailabilityRows,
} = require("../utils/availabilityUtils");

test("availability helpers parse dates and times deterministically", () => {
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(getDayOfWeek("2026-08-10"), 1);
});

test("availability validation accepts separate windows", () => {
  assert.doesNotThrow(() =>
    validateAvailabilityRows([
      { day_of_week: 1, start_time: "08:00", end_time: "12:00", slot_minutes: 30 },
      { day_of_week: 1, start_time: "13:00", end_time: "16:00", slot_minutes: 30 },
    ]),
  );
});

test("availability validation rejects overlap and invalid ranges", () => {
  assert.throws(
    () =>
      validateAvailabilityRows([
        { day_of_week: 1, start_time: "08:00", end_time: "12:00", slot_minutes: 30 },
        { day_of_week: 1, start_time: "11:30", end_time: "14:00", slot_minutes: 30 },
      ]),
    /cannot overlap/i,
  );

  assert.throws(
    () =>
      validateAvailabilityRows([
        { day_of_week: 1, start_time: "12:00", end_time: "08:00", slot_minutes: 30 },
      ]),
    /invalid values/i,
  );
});
