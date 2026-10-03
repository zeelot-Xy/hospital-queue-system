"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    };

    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      full_name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      phone: { type: Sequelize.STRING, allowNull: false },
      password: { type: Sequelize.STRING, allowNull: false },
      role: {
        type: Sequelize.ENUM("patient", "doctor", "staff", "admin"),
        allowNull: false,
        defaultValue: "patient",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      ...timestamps,
    });

    await queryInterface.createTable("departments", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      description: { type: Sequelize.TEXT },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      ...timestamps,
    });

    await queryInterface.createTable("doctors", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      department_id: {
        type: Sequelize.INTEGER,
        references: { model: "departments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      specialization: { type: Sequelize.STRING },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      ...timestamps,
    });

    await queryInterface.createTable("doctor_availabilities", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "doctors", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      day_of_week: { type: Sequelize.INTEGER, allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      slot_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable("patient_profiles", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      blood_group: { type: Sequelize.STRING },
      date_of_birth: { type: Sequelize.DATEONLY },
      allergies: { type: Sequelize.TEXT },
      chronic_conditions: { type: Sequelize.TEXT },
      last_visit_notes: { type: Sequelize.TEXT },
      ...timestamps,
    });

    await queryInterface.createTable("appointments", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "doctors", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      appointment_date: { type: Sequelize.DATEONLY, allowNull: false },
      appointment_time: { type: Sequelize.TIME, allowNull: false },
      status: {
        type: Sequelize.ENUM(
          "booked",
          "arrived",
          "called",
          "admitted",
          "in_consultation",
          "completed",
          "expired",
          "missed",
        ),
        allowNull: false,
        defaultValue: "booked",
      },
      arrived_at: { type: Sequelize.DATE },
      missed_at: { type: Sequelize.DATE },
      walk_in: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      rescheduled_from_id: {
        type: Sequelize.INTEGER,
        references: { model: "appointments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...timestamps,
    });

    await queryInterface.createTable("queues", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "appointments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "doctors", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      queue_number: { type: Sequelize.INTEGER, allowNull: false },
      queue_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM(
          "waiting",
          "called",
          "admitted",
          "in_consultation",
          "completed",
          "missed",
        ),
        allowNull: false,
        defaultValue: "waiting",
      },
      joined_at: { type: Sequelize.DATE, allowNull: false },
      called_at: { type: Sequelize.DATE },
      last_called_at: { type: Sequelize.DATE },
      call_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      admitted_at: { type: Sequelize.DATE },
      consultation_started_at: { type: Sequelize.DATE },
      completed_at: { type: Sequelize.DATE },
      transfer_reason: { type: Sequelize.TEXT },
      transferred_from_doctor_id: { type: Sequelize.INTEGER },
      transferred_from_department_id: { type: Sequelize.INTEGER },
      ...timestamps,
    });

    await queryInterface.createTable("consultation_records", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "appointments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      queue_id: {
        type: Sequelize.INTEGER,
        unique: true,
        references: { model: "queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "doctors", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      presenting_complaint: { type: Sequelize.TEXT },
      findings: { type: Sequelize.TEXT },
      diagnosis: { type: Sequelize.TEXT },
      treatment_plan: { type: Sequelize.TEXT },
      follow_up_advice: { type: Sequelize.TEXT },
      note_summary: { type: Sequelize.TEXT },
      ...timestamps,
    });

    await queryInterface.createTable("audit_logs", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      actor_user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action_type: { type: Sequelize.STRING, allowNull: false },
      target_type: { type: Sequelize.STRING, allowNull: false },
      target_id: { type: Sequelize.INTEGER },
      metadata: { type: Sequelize.JSONB },
      ...timestamps,
    });

    await queryInterface.createTable("notifications", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      recipient_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recipient_role: { type: Sequelize.STRING },
      type: { type: Sequelize.STRING, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      payload: { type: Sequelize.JSONB },
      read_at: { type: Sequelize.DATE },
      ...timestamps,
    });

    await queryInterface.addIndex("doctor_availabilities", {
      fields: ["doctor_id", "day_of_week", "start_time", "end_time"],
      unique: true,
      name: "doctor_availability_window_unique",
    });
    await queryInterface.addIndex("queues", {
      fields: ["doctor_id", "queue_date", "queue_number"],
      unique: true,
      name: "queues_doctor_date_number_unique",
    });
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX appointments_active_slot_unique
      ON appointments (doctor_id, appointment_date, appointment_time)
      WHERE status NOT IN ('expired', 'missed', 'completed')
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
    await queryInterface.dropTable("audit_logs");
    await queryInterface.dropTable("consultation_records");
    await queryInterface.dropTable("queues");
    await queryInterface.dropTable("appointments");
    await queryInterface.dropTable("patient_profiles");
    await queryInterface.dropTable("doctor_availabilities");
    await queryInterface.dropTable("doctors");
    await queryInterface.dropTable("departments");
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_queues_status;
      DROP TYPE IF EXISTS enum_appointments_status;
      DROP TYPE IF EXISTS enum_doctors_status;
      DROP TYPE IF EXISTS enum_departments_status;
      DROP TYPE IF EXISTS enum_users_status;
      DROP TYPE IF EXISTS enum_users_role;
    `);
  },
};
