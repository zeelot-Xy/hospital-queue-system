const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Queue = sequelize.define(
    "Queue",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      queue_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "waiting",
          "called",
          "admitted",
          "in_consultation",
          "completed",
        ),
        defaultValue: "waiting",
      },
      joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      called_at: {
        type: DataTypes.DATE,
      },
      admitted_at: {
        type: DataTypes.DATE,
      },
      consultation_started_at: {
        type: DataTypes.DATE,
      },
      completed_at: {
        type: DataTypes.DATE,
      },
    },
    {
      timestamps: true,
      tableName: "queues",
    },
  );

  return Queue;
};
