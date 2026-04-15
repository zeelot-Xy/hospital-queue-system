require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const { sequelize } = require("../models");

async function getCounts(transaction) {
  const [rows] = await sequelize.query(
    `
      SELECT 'appointments' AS table_name, COUNT(*)::int AS count FROM appointments
      UNION ALL
      SELECT 'doctors', COUNT(*)::int FROM doctors
      UNION ALL
      SELECT 'queues', COUNT(*)::int FROM queues
      UNION ALL
      SELECT 'users', COUNT(*)::int FROM users
      ORDER BY table_name;
    `,
    { transaction },
  );

  return rows;
}

async function resetAuthData() {
  await sequelize.authenticate();

  const transaction = await sequelize.transaction();

  try {
    const before = await getCounts(transaction);
    console.log("Current auth-related records:");
    console.table(before);

    await sequelize.query("DELETE FROM queues;", { transaction });
    await sequelize.query("DELETE FROM appointments;", { transaction });
    await sequelize.query("DELETE FROM doctors;", { transaction });
    await sequelize.query("DELETE FROM users;", { transaction });

    const after = await getCounts(transaction);
    await transaction.commit();

    console.log("Auth-related data reset complete.");
    console.table(after);
  } catch (error) {
    await transaction.rollback();
    console.error("Failed to reset auth-related data:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

resetAuthData();
