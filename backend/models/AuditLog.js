const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      actor_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      target_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      target_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "audit_logs",
    },
  );

  return AuditLog;
};
