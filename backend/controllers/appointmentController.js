const { Appointment, Doctor, Department, User } = require("../models/index");
const { Op } = require("sequelize");
const { doctorInclude } = require("../utils/doctorUtils");

const getAvailableDoctors = async (req, res) => {
  try {
    const { department_id } = req.query;

    if (!department_id) {
      return res.status(400).json({ message: "Department is required" });
    }

    const doctors = await Doctor.findAll({
      where: { department_id, status: "active" },
      include: doctorInclude,
      order: [[User, "full_name", "ASC"]],
    });

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const {
      doctor_id,
      department_id,
      appointment_date,
      appointment_time,
    } = req.body;

    if (!doctor_id || !department_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        message: "Doctor, department, appointment date, and time are required",
      });
    }

    const doctor = await Doctor.findByPk(doctor_id);
    if (!doctor || doctor.status !== "active") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (doctor.department_id !== Number(department_id)) {
      return res.status(400).json({
        message: "Doctor does not belong to the selected department",
      });
    }

    // Check for conflict
    const existing = await Appointment.findOne({
      where: {
        doctor_id,
        appointment_date,
        appointment_time,
        status: { [Op.notIn]: ["expired", "missed", "completed"] },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "This slot is already booked" });
    }

    const appointment = await Appointment.create({
      patient_id: req.user.id,
      doctor_id,
      department_id,
      appointment_date,
      appointment_time,
      status: "booked",
    });

    res
      .status(201)
      .json({ message: "Appointment booked successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const appointmentInclude = [
  {
    model: Doctor,
    include: [{ model: User, attributes: ["id", "full_name", "email", "phone"] }],
  },
  { model: Department, attributes: ["id", "name"] },
];

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { patient_id: req.user.id },
      include: appointmentInclude,
      order: [
        ["appointment_date", "ASC"],
        ["appointment_time", "ASC"],
      ],
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableDoctors,
  bookAppointment,
  getMyAppointments,
};
