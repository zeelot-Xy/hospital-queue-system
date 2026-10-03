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
        unique: true,
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
      queue_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "waiting",
          "called",
          "admitted",
          "in_consultation",
          "completed",
          "missed",
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
      last_called_at: {
        type: DataTypes.DATE,
      },
      call_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
      transfer_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      transferred_from_doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      transferred_from_department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "queues",
      indexes: [
        {
          unique: true,
          fields: ["doctor_id", "queue_date", "queue_number"],
          name: "queues_doctor_date_number_unique",
        },
      ],
    },
  );

  return Queue;
};
