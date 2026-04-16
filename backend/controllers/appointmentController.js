const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const {
  Appointment,
  Doctor,
  Department,
  PatientProfile,
  Queue,
  User,
} = require("../models/index");
const { doctorInclude } = require("../utils/doctorUtils");
const { getOpenSlotsForDoctor } = require("../utils/availabilityUtils");
const { emitQueueRefresh } = require("../utils/socketEvents");
const { logAudit } = require("../utils/auditLogger");
const { createNotifications } = require("../utils/notificationService");

const appointmentInclude = [
  {
    model: Doctor,
    include: [{ model: User, attributes: ["id", "full_name", "email", "phone"] }],
  },
  { model: Department, attributes: ["id", "name"] },
];

const staffAppointmentInclude = [
  ...appointmentInclude,
  {
    model: User,
    as: "Patient",
    attributes: ["id", "full_name", "email", "phone"],
  },
];

const getAvailableDoctors = async (req, res) => {
  try {
    const { department_id, date } = req.query;

    if (!department_id || !date) {
      return res.status(400).json({
        message: "Department and date are required",
      });
    }

    const doctors = await Doctor.findAll({
      where: { department_id, status: "active" },
      include: doctorInclude,
      order: [[User, "full_name", "ASC"]],
    });

    const doctorsWithSlots = await Promise.all(
      doctors.map(async (doctor) => ({
        ...doctor.toJSON(),
        available_slots: await getOpenSlotsForDoctor(doctor.id, date),
      })),
    );

    res.json(doctorsWithSlots.filter((doctor) => doctor.available_slots.length > 0));
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

    const requestedTime = String(appointment_time).slice(0, 5);
    const openSlots = await getOpenSlotsForDoctor(doctor.id, appointment_date);
    if (!openSlots.includes(requestedTime)) {
      return res.status(400).json({
        message: "This time is not available for booking",
      });
    }

    const appointment = await Appointment.create({
      patient_id: req.user.id,
      doctor_id,
      department_id,
      appointment_date,
      appointment_time: `${requestedTime}:00`,
      status: "booked",
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "appointment.booked",
      targetType: "appointment",
      targetId: appointment.id,
      metadata: {
        doctor_id,
        department_id,
      },
    });

    res
      .status(201)
      .json({ message: "Appointment booked successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

const getStaffAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: {
        status: {
          [Op.notIn]: ["completed"],
        },
      },
      include: staffAppointmentInclude,
      order: [
        ["appointment_date", "ASC"],
        ["appointment_time", "ASC"],
      ],
      limit: 100,
    });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createWalkIn = async (req, res) => {
  try {
    const {
      full_name,
      phone,
      email,
      doctor_id,
      department_id,
      blood_group,
      date_of_birth,
      allergies,
      chronic_conditions,
    } = req.body;

    if (!full_name?.trim() || !phone?.trim() || !doctor_id || !department_id) {
      return res.status(400).json({
        message: "Patient name, phone, doctor, and department are required",
      });
    }

    const doctor = await Doctor.findByPk(doctor_id);
    if (!doctor || doctor.status !== "active") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (doctor.department_id !== Number(department_id)) {
      return res
        .status(400)
        .json({ message: "Selected doctor does not belong to this department" });
    }

    const normalizedEmail =
      email?.trim().toLowerCase() ||
      `walkin.${Date.now()}@hospital-queue.local`;
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const temporaryPassword = `WalkIn${Date.now().toString().slice(-6)}!`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    const user = await User.create({
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role: "patient",
    });

    await PatientProfile.create({
      user_id: user.id,
      blood_group: blood_group?.trim() || "",
      date_of_birth: date_of_birth || null,
      allergies: allergies?.trim() || "",
      chronic_conditions: chronic_conditions?.trim() || "",
      last_visit_notes: "",
    });

    const now = new Date();
    const appointmentDate = now.toISOString().split("T")[0];
    const appointmentTime = now.toTimeString().slice(0, 8);

    const appointment = await Appointment.create({
      patient_id: user.id,
      doctor_id: Number(doctor_id),
      department_id: Number(department_id),
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      walk_in: true,
      status: "arrived",
      arrived_at: now,
    });

    const lastQueue = await Queue.findOne({
      where: { doctor_id: Number(doctor_id) },
      order: [["queue_number", "DESC"]],
    });

    const queue = await Queue.create({
      appointment_id: appointment.id,
      patient_id: user.id,
      doctor_id: Number(doctor_id),
      department_id: Number(department_id),
      queue_number: lastQueue ? lastQueue.queue_number + 1 : 1,
      status: "waiting",
      joined_at: now,
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "walk_in.created",
      targetType: "appointment",
      targetId: appointment.id,
      metadata: {
        patient_id: user.id,
        queue_id: queue.id,
      },
    });

    const hydratedQueue = await Queue.findByPk(queue.id, {
      include: staffAppointmentInclude,
    });
    emitQueueRefresh(req.app, hydratedQueue, "queue:arrived");

    res.status(201).json({
      message: "Walk-in patient registered successfully",
      patient: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
      temporary_credentials: {
        email: user.email,
        password: temporaryPassword,
      },
      appointment,
      queue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAppointmentMissed = async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const queue = await Queue.findOne({
      where: {
        appointment_id: appointment.id,
        status: {
          [Op.in]: ["waiting", "called", "admitted"],
        },
      },
    });

    if (queue) {
      await queue.update({
        status: "missed",
        completed_at: new Date(),
      });
      const hydratedQueue = await Queue.findByPk(queue.id, {
        include: staffAppointmentInclude,
      });
      emitQueueRefresh(req.app, hydratedQueue, "queue:missed");
    }

    await appointment.update({
      status: "missed",
      missed_at: new Date(),
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "appointment.missed",
      targetType: "appointment",
      targetId: appointment.id,
      metadata: {
        patient_id: appointment.patient_id,
      },
    });

    await createNotifications(req.app, [
      {
        recipientUserId: appointment.patient_id,
        type: "appointment_missed",
        title: "Appointment marked as missed",
        message: "Staff marked one of your appointments as missed.",
        payload: { appointmentId: appointment.id },
      },
    ]);

    res.json({ message: "Appointment marked as missed", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const { appointment_date, appointment_time } = req.body;
    const currentAppointment = await Appointment.findByPk(req.params.appointmentId);

    if (!currentAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        message: "New appointment date and time are required",
      });
    }

    const requestedTime = String(appointment_time).slice(0, 5);
    const openSlots = await getOpenSlotsForDoctor(
      currentAppointment.doctor_id,
      appointment_date,
    );

    if (!openSlots.includes(requestedTime)) {
      return res.status(400).json({
        message: "The selected reschedule slot is not available",
      });
    }

    const queue = await Queue.findOne({
      where: {
        appointment_id: currentAppointment.id,
        status: {
          [Op.in]: ["waiting", "called", "admitted"],
        },
      },
    });

    if (queue) {
      await queue.update({
        status: "missed",
        completed_at: new Date(),
      });
      const hydratedQueue = await Queue.findByPk(queue.id, {
        include: staffAppointmentInclude,
      });
      emitQueueRefresh(req.app, hydratedQueue, "queue:missed");
    }

    await currentAppointment.update({
      status: "missed",
      missed_at: new Date(),
    });

    const newAppointment = await Appointment.create({
      patient_id: currentAppointment.patient_id,
      doctor_id: currentAppointment.doctor_id,
      department_id: currentAppointment.department_id,
      appointment_date,
      appointment_time: `${requestedTime}:00`,
      status: "booked",
      walk_in: currentAppointment.walk_in,
      rescheduled_from_id: currentAppointment.id,
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "appointment.rescheduled",
      targetType: "appointment",
      targetId: newAppointment.id,
      metadata: {
        from_appointment_id: currentAppointment.id,
      },
    });

    await createNotifications(req.app, [
      {
        recipientUserId: currentAppointment.patient_id,
        type: "appointment_rescheduled",
        title: "Appointment rescheduled",
        message: `Your appointment has been moved to ${appointment_date} at ${requestedTime}.`,
        payload: {
          appointmentId: newAppointment.id,
          previousAppointmentId: currentAppointment.id,
        },
      },
    ]);

    res.json({
      message: "Appointment rescheduled successfully",
      appointment: newAppointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAvailableDoctors,
  bookAppointment,
  getMyAppointments,
  getStaffAppointments,
  createWalkIn,
  markAppointmentMissed,
  rescheduleAppointment,
};
