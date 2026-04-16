const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Doctor,
  Department,
  Appointment,
  Queue,
  PatientProfile,
} = require("../models/index");
const { emitQueueEvent } = require("../utils/socketEvents");

const register = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      role,
      specialization,
      department_id,
    } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      full_name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: role || "patient",
    });

    if (role === "doctor") {
      if (!department_id) {
        return res.status(400).json({
          message: "Department ID is required for doctor registration",
        });
      }

      const departmentExists = await Department.findByPk(department_id);
      if (!departmentExists) {
        return res.status(400).json({
          message: `Department with ID ${department_id} does not exist. Please create departments first.`,
        });
      }

      await Doctor.create({
        user_id: user.id,
        department_id: parseInt(department_id, 10),
        specialization: specialization || "General Medicine",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Login server error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (!["doctor", "patient"].includes(user.role)) {
      return res.status(403).json({
        message: "Only doctor and patient accounts can be deleted here",
      });
    }

    const affectedDoctorIds = new Set();
    const affectedPatientIds = new Set();

    await sequelize.transaction(async (transaction) => {
      if (user.role === "doctor") {
        const doctor = await Doctor.findOne({
          where: { user_id: user.id },
          transaction,
        });

        if (doctor) {
          affectedDoctorIds.add(doctor.id);

          const appointments = await Appointment.findAll({
            attributes: ["id"],
            where: { doctor_id: doctor.id },
            transaction,
          });
          const appointmentIds = appointments.map((appointment) => appointment.id);

          const queueWhere = appointmentIds.length
            ? {
                [Op.or]: [
                  { doctor_id: doctor.id },
                  { appointment_id: { [Op.in]: appointmentIds } },
                ],
              }
            : { doctor_id: doctor.id };

          const queueRecords = await Queue.findAll({
            attributes: ["doctor_id", "patient_id"],
            where: queueWhere,
            transaction,
          });

          queueRecords.forEach((queue) => {
            if (queue.doctor_id) {
              affectedDoctorIds.add(queue.doctor_id);
            }
            if (queue.patient_id) {
              affectedPatientIds.add(queue.patient_id);
            }
          });

          await Queue.destroy({ where: queueWhere, transaction });

          if (appointmentIds.length) {
            await Appointment.destroy({
              where: { id: { [Op.in]: appointmentIds } },
              transaction,
            });
          }

          await Doctor.destroy({ where: { id: doctor.id }, transaction });
        }

        await PatientProfile.destroy({
          where: { user_id: user.id },
          transaction,
        });
      }

      if (user.role === "patient") {
        affectedPatientIds.add(user.id);

        const appointments = await Appointment.findAll({
          attributes: ["id"],
          where: { patient_id: user.id },
          transaction,
        });
        const appointmentIds = appointments.map((appointment) => appointment.id);

        const queueWhere = appointmentIds.length
          ? {
              [Op.or]: [
                { patient_id: user.id },
                { appointment_id: { [Op.in]: appointmentIds } },
              ],
            }
          : { patient_id: user.id };

        const queueRecords = await Queue.findAll({
          attributes: ["doctor_id", "patient_id"],
          where: queueWhere,
          transaction,
        });

        queueRecords.forEach((queue) => {
          if (queue.doctor_id) {
            affectedDoctorIds.add(queue.doctor_id);
          }
          if (queue.patient_id) {
            affectedPatientIds.add(queue.patient_id);
          }
        });

        await Queue.destroy({ where: queueWhere, transaction });

        if (appointmentIds.length) {
          await Appointment.destroy({
            where: { id: { [Op.in]: appointmentIds } },
            transaction,
          });
        }

        await PatientProfile.destroy({
          where: { user_id: user.id },
          transaction,
        });
      }

      await User.destroy({ where: { id: user.id }, transaction });
    });

    const rooms = [
      "role:staff",
      "role:admin",
      ...Array.from(affectedDoctorIds).map((doctorId) => `doctor:${doctorId}`),
      ...Array.from(affectedPatientIds).map((patientId) => `patient:${patientId}`),
    ];

    emitQueueEvent(
      req.app,
      "queue:refresh",
      {
        deletedUserId: user.id,
        deletedRole: user.role,
      },
      { rooms },
    );

    res.json({
      message: `${
        user.role === "doctor" ? "Doctor" : "Patient"
      } account deleted successfully`,
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Server error while deleting account" });
  }
};

module.exports = { register, login, deleteMyAccount };
