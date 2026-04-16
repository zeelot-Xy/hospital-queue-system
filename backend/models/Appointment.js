const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      appointment_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "booked",
          "arrived",
          "called",
          "admitted",
          "in_consultation",
          "completed",
          "expired",
          "missed",
        ),
        defaultValue: "booked",
      },
      arrived_at: {
        type: DataTypes.DATE,
      },
      missed_at: {
        type: DataTypes.DATE,
      },
      walk_in: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      rescheduled_from_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "appointments",
    },
  );

  return Appointment;
};
