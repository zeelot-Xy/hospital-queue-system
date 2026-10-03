const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME ||= "hospital_queue_test";
process.env.DB_USER ||= "postgres";
process.env.DB_PASSWORD ||= "test-password";
process.env.DB_HOST ||= "127.0.0.1";

const { getAttentionState, getDurationMinutes } = require("../utils/queueMetrics");

test("queue durations are deterministic and never negative", () => {
  assert.equal(
    getDurationMinutes("2026-08-10T10:00:00.000Z", "2026-08-10T10:12:30.000Z"),
    13,
  );
  assert.equal(
    getDurationMinutes("2026-08-10T10:12:00.000Z", "2026-08-10T10:00:00.000Z"),
    0,
  );
  assert.equal(getDurationMinutes(null), null);
});

test("queue attention state identifies overdue calls and long waits", () => {
  const now = Date.now();
  assert.equal(
    getAttentionState({ status: "called", called_at: new Date(now - 6 * 60000) }),
    "overdue_admit",
  );
  assert.equal(
    getAttentionState({ status: "waiting", joined_at: new Date(now - 21 * 60000) }),
    "long_wait",
  );
  assert.equal(
    getAttentionState({ status: "waiting", joined_at: new Date(now - 2 * 60000) }),
    "normal",
  );
});
