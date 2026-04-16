const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PatientProfile = sequelize.define(
    "PatientProfile",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      blood_group: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      allergies: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      chronic_conditions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      last_visit_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "patient_profiles",
    },
  );

  return PatientProfile;
};
