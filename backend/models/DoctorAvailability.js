const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DoctorAvailability = sequelize.define(
    "DoctorAvailability",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 6,
        },
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      slot_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      timestamps: true,
      tableName: "doctor_availabilities",
    },
  );

  return DoctorAvailability;
};
