const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ConsultationRecord = sequelize.define(
    "ConsultationRecord",
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
      queue_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      presenting_complaint: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      findings: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treatment_plan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      follow_up_advice: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      note_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "consultation_records",
    },
  );

  return ConsultationRecord;
};
