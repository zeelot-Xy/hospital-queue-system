"use strict";

require("../config/env");
const bcrypt = require("bcryptjs");

const departments = [
  ["General Medicine", "General outpatient consultation and primary care"],
  ["Cardiology", "Diagnosis and care of heart and circulatory conditions"],
  ["Paediatrics", "Medical care for infants, children, and adolescents"],
  ["Obstetrics and Gynaecology", "Women's reproductive and maternity care"],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword || adminPassword.length < 10) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD (minimum 10 characters) are required for seeding",
      );
    }

    for (const [name, description] of departments) {
      await queryInterface.sequelize.query(
        `INSERT INTO departments (name, description, status, "createdAt", "updatedAt")
         VALUES (:name, :description, 'active', :now, :now)
         ON CONFLICT (name) DO NOTHING`,
        { replacements: { name, description, now } },
      );
    }

    const password = await bcrypt.hash(adminPassword, 12);
    await queryInterface.sequelize.query(
      `INSERT INTO users (full_name, email, phone, password, role, status, "createdAt", "updatedAt")
       VALUES (:fullName, :email, :phone, :password, 'admin', 'active', :now, :now)
       ON CONFLICT (email) DO NOTHING`,
      {
        replacements: {
          fullName: process.env.ADMIN_NAME || "System Administrator",
          email: adminEmail,
          phone: process.env.ADMIN_PHONE || "+2348000000000",
          password,
          now,
        },
      },
    );
  },

  async down(queryInterface) {
    const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (adminEmail) {
      await queryInterface.bulkDelete("users", { email: adminEmail });
    }
    await queryInterface.bulkDelete("departments", {
      name: departments.map(([name]) => name),
    });
  },
};
