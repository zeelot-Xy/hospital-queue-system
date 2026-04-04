const { Sequelize } = require("sequelize");
const config = require("../config/config.js");

const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    port: config.development.port,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

// Import models AFTER sequelize is created
const User = require("./User")(sequelize);
const Department = require("./Department")(sequelize);
const Doctor = require("./Doctor")(sequelize);

// Define Associations
User.hasOne(Doctor, { foreignKey: "user_id" });
Doctor.belongsTo(User, { foreignKey: "user_id" });

Doctor.belongsTo(Department, { foreignKey: "department_id" });
Department.hasMany(Doctor, { foreignKey: "department_id" });

module.exports = {
  sequelize,
  User,
  Department,
  Doctor,
};
