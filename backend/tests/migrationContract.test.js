const test = require("node:test");
const assert = require("node:assert/strict");
const { DataTypes } = require("sequelize");

const migration = require("../migrations/20260810000100-create-initial-schema");

test("initial migration defines the complete schema and workflow indexes", async () => {
  const tables = [];
  const indexes = [];
  const queries = [];
  const queryInterface = {
    async createTable(name, definition) {
      tables.push({ name, definition });
    },
    async addIndex(table, options) {
      indexes.push({ table, options });
    },
    sequelize: {
      async query(sql) {
        queries.push(sql);
      },
    },
  };

  await migration.up(queryInterface, DataTypes);

  assert.deepEqual(
    tables.map(({ name }) => name),
    [
      "users",
      "departments",
      "doctors",
      "doctor_availabilities",
      "patient_profiles",
      "appointments",
      "queues",
      "consultation_records",
      "audit_logs",
      "notifications",
    ],
  );

  const queueTable = tables.find(({ name }) => name === "queues");
  assert.equal(queueTable.definition.queue_date.allowNull, false);
  assert.ok(indexes.some(({ options }) => options.name === "queues_doctor_date_number_unique"));
  assert.ok(queries.some((sql) => sql.includes("appointments_active_slot_unique")));
});
