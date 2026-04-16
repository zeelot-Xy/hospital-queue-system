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
const PatientProfile = require("./PatientProfile")(sequelize);
const DoctorAvailability = require("./DoctorAvailability")(sequelize);
const ConsultationRecord = require("./ConsultationRecord")(sequelize);
const AuditLog = require("./AuditLog")(sequelize);
const Notification = require("./Notification")(sequelize);

// Define Associations
User.hasOne(Doctor, { foreignKey: "user_id" });
Doctor.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(PatientProfile, { foreignKey: "user_id", as: "PatientProfile" });
PatientProfile.belongsTo(User, { foreignKey: "user_id", as: "User" });
User.hasMany(Notification, { foreignKey: "recipient_user_id", as: "Notifications" });
Notification.belongsTo(User, { foreignKey: "recipient_user_id", as: "Recipient" });

Doctor.belongsTo(Department, { foreignKey: "department_id" });
Department.hasMany(Doctor, { foreignKey: "department_id" });
Doctor.hasMany(DoctorAvailability, { foreignKey: "doctor_id", as: "Availabilities" });
DoctorAvailability.belongsTo(Doctor, { foreignKey: "doctor_id" });
Appointment.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
User.hasMany(Appointment, { foreignKey: "patient_id", as: "PatientAppointments" });
Appointment.belongsTo(Doctor, { foreignKey: "doctor_id" });
Doctor.hasMany(Appointment, { foreignKey: "doctor_id" });
Appointment.belongsTo(Department, { foreignKey: "department_id" });
Department.hasMany(Appointment, { foreignKey: "department_id" });
Appointment.hasMany(ConsultationRecord, {
  foreignKey: "appointment_id",
  as: "ConsultationRecords",
});
ConsultationRecord.belongsTo(Appointment, { foreignKey: "appointment_id" });
// Queue Associations
Queue.belongsTo(Appointment, { foreignKey: "appointment_id" });
Appointment.hasOne(Queue, { foreignKey: "appointment_id" });

Queue.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
Queue.belongsTo(Doctor, { foreignKey: "doctor_id" });
Queue.belongsTo(Department, { foreignKey: "department_id" });
Doctor.hasMany(Queue, { foreignKey: "doctor_id" });
Department.hasMany(Queue, { foreignKey: "department_id" });
Queue.hasMany(ConsultationRecord, { foreignKey: "queue_id", as: "ConsultationRecords" });
ConsultationRecord.belongsTo(Queue, { foreignKey: "queue_id" });
ConsultationRecord.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
User.hasMany(ConsultationRecord, {
  foreignKey: "patient_id",
  as: "PatientConsultationRecords",
});
ConsultationRecord.belongsTo(Doctor, { foreignKey: "doctor_id" });
Doctor.hasMany(ConsultationRecord, { foreignKey: "doctor_id" });
AuditLog.belongsTo(User, { foreignKey: "actor_user_id", as: "Actor" });
User.hasMany(AuditLog, { foreignKey: "actor_user_id", as: "AuditActions" });

module.exports = {
  sequelize,
  User,
  Department,
  Doctor,
  Appointment,
  Queue,
  PatientProfile,
  DoctorAvailability,
  ConsultationRecord,
  AuditLog,
  Notification,
};
