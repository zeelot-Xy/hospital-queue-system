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
const Appointment = require("./Appointment")(sequelize);
const Queue = require("./Queue")(sequelize);

// Define Associations
User.hasOne(Doctor, { foreignKey: "user_id" });
Doctor.belongsTo(User, { foreignKey: "user_id" });

Doctor.belongsTo(Department, { foreignKey: "department_id" });
Department.hasMany(Doctor, { foreignKey: "department_id" });
Appointment.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
User.hasMany(Appointment, { foreignKey: "patient_id", as: "PatientAppointments" });
Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });
Doctor.hasMany(Appointment, { foreignKey: "doctor_id" });
Appointment.belongsTo(Department, { foreignKey: "department_id" });
Department.hasMany(Appointment, { foreignKey: "department_id" });
// Queue Associations
Queue.belongsTo(Appointment, { foreignKey: "appointment_id" });
Appointment.hasOne(Queue, { foreignKey: "appointment_id" });

Queue.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
Queue.belongsTo(Doctor, { foreignKey: "doctor_id" });
Queue.belongsTo(Department, { foreignKey: "department_id" });
Doctor.hasMany(Queue, { foreignKey: "doctor_id" });
Department.hasMany(Queue, { foreignKey: "department_id" });

module.exports = {
  sequelize,
  User,
  Department,
  Doctor,
  Appointment,
  Queue,
};
