const { Op } = require("sequelize");
const {
  Appointment,
  Queue,
  Department,
  User,
  Doctor,
  PatientProfile,
} = require("../models");
const { getDoctorByUserId } = require("../utils/doctorUtils");
const { emitQueueEvent, emitQueueRefresh } = require("../utils/socketEvents");

const activeDoctorStatuses = ["called", "admitted", "in_consultation"];
const queueInclude = [
  {
    model: User,
    as: "Patient",
    attributes: ["id", "full_name", "email", "phone"],
  },
  {
    model: Doctor,
    include: [
      {
        model: User,
        attributes: ["id", "full_name", "email", "phone"],
      },
      {
        model: Department,
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: Department,
    attributes: ["id", "name"],
  },
  {
    model: Appointment,
    attributes: [
      "id",
      "appointment_date",
      "appointment_time",
      "status",
      "arrived_at",
    ],
  },
];

const doctorQueueInclude = [
  {
    model: User,
    as: "Patient",
    attributes: ["id", "full_name", "email", "phone"],
    include: [
      {
        model: PatientProfile,
        as: "PatientProfile",
        attributes: [
          "blood_group",
          "allergies",
          "chronic_conditions",
          "last_visit_notes",
        ],
      },
    ],
  },
  {
    model: Doctor,
    include: [
      {
        model: User,
        attributes: ["id", "full_name", "email", "phone"],
      },
      {
        model: Department,
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: Department,
    attributes: ["id", "name"],
  },
  {
    model: Appointment,
    attributes: [
      "id",
      "appointment_date",
      "appointment_time",
      "status",
      "arrived_at",
    ],
  },
];

const getQueueById = (id) =>
  Queue.findByPk(id, {
    include: queueInclude,
  });

const syncAppointmentStatus = async (appointmentId, status, extraFields = {}) => {
  await Appointment.update(
    { status, ...extraFields },
    {
      where: { id: appointmentId },
    },
  );
};

const getDoctorContext = async (userId) => {
  const doctor = await getDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.status = 404;
    throw error;
  }

  return doctor;
};

const ensureDoctorHasNoActivePatient = async (doctorId, excludeQueueId = null) => {
  const where = {
    doctor_id: doctorId,
    status: { [Op.in]: activeDoctorStatuses },
  };

  if (excludeQueueId) {
    where.id = { [Op.ne]: excludeQueueId };
  }

  const activeQueue = await Queue.findOne({ where });

  if (activeQueue) {
    const error = new Error(
      "This doctor already has an active patient in progress",
    );
    error.status = 400;
    throw error;
  }
};

const markAsArrived = async (req, res) => {
  try {
    const { appointment_id } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ message: "Appointment is required" });
    }

    const appointment = await Appointment.findOne({
      where: {
        id: appointment_id,
        patient_id: req.user.id,
        status: "booked",
      },
    });

    if (!appointment) {
      return res
        .status(400)
        .json({ message: "Appointment not found or already processed" });
    }

    const existingQueue = await Queue.findOne({
      where: { appointment_id },
    });

    if (existingQueue) {
      return res.status(400).json({ message: "You have already joined the queue" });
    }

    const appointmentTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`,
    );
    const now = new Date();
    const diffMinutes = Math.abs((now - appointmentTime) / 60000);

    if (diffMinutes > 30) {
      return res.status(400).json({
        message:
          "You can only mark arrived within 30 minutes of your appointment time",
      });
    }

    const lastQueue = await Queue.findOne({
      where: { doctor_id: appointment.doctor_id },
      order: [["queue_number", "DESC"]],
    });

    const queue = await Queue.create({
      appointment_id,
      patient_id: req.user.id,
      doctor_id: appointment.doctor_id,
      department_id: appointment.department_id,
      queue_number: lastQueue ? lastQueue.queue_number + 1 : 1,
      status: "waiting",
      joined_at: now,
    });

    await syncAppointmentStatus(appointment.id, "arrived", { arrived_at: now });

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:arrived");

    res.json({
      message: "You have joined the queue",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getDoctorQueue = async (req, res) => {
  try {
    const doctor = await getDoctorContext(req.user.id);

    const queue = await Queue.findAll({
      where: {
        doctor_id: doctor.id,
        status: {
          [Op.in]: ["waiting", "called", "admitted", "in_consultation"],
        },
      },
      include: doctorQueueInclude,
      order: [["queue_number", "ASC"]],
    });

    const activeQueue = queue.find((item) =>
      activeDoctorStatuses.includes(item.status),
    );

    res.json({
      doctor,
      activeQueue: activeQueue || null,
      queue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getStaffLiveQueues = async (_req, res) => {
  try {
    const queues = await Queue.findAll({
      where: {
        status: {
          [Op.in]: ["waiting", "called", "admitted", "in_consultation"],
        },
      },
      include: queueInclude,
      order: [
        ["doctor_id", "ASC"],
        ["queue_number", "ASC"],
      ],
    });

    const alerts = queues.filter((queue) => queue.status === "called");

    res.json({ queues, alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyQueueStatus = async (req, res) => {
  try {
    const queue = await Queue.findOne({
      where: {
        patient_id: req.user.id,
        status: {
          [Op.in]: ["waiting", "called", "admitted", "in_consultation"],
        },
      },
      include: queueInclude,
      order: [["createdAt", "DESC"]],
    });

    res.json({ queue: queue || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const callNextPatient = async (req, res) => {
  try {
    const doctor = await getDoctorContext(req.user.id);
    await ensureDoctorHasNoActivePatient(doctor.id);

    const nextQueue = await Queue.findOne({
      where: {
        doctor_id: doctor.id,
        status: "waiting",
      },
      order: [["queue_number", "ASC"]],
    });

    if (!nextQueue) {
      return res.status(400).json({ message: "There is no waiting patient to call" });
    }

    await nextQueue.update({
      status: "called",
      called_at: new Date(),
    });
    await syncAppointmentStatus(nextQueue.appointment_id, "called");

    const hydratedQueue = await getQueueById(nextQueue.id);

    emitQueueRefresh(req.app, hydratedQueue, "queue:called");
    emitQueueEvent(
      req.app,
      "staff:alert",
      {
        type: "doctor_called_next",
        message: `Dr. ${doctor.User.full_name} is ready for the next patient`,
        queue: hydratedQueue,
      },
      { rooms: ["role:staff", "role:admin"] },
    );

    res.json({
      message: "Next patient has been called",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const confirmAdmit = async (req, res) => {
  try {
    const { queue_id } = req.body;

    if (!queue_id) {
      return res.status(400).json({ message: "Queue item is required" });
    }

    const queue = await Queue.findByPk(queue_id);

    if (!queue || queue.status !== "called") {
      return res
        .status(400)
        .json({ message: "Only called patients can be admitted" });
    }

    await queue.update({
      status: "admitted",
      admitted_at: new Date(),
    });
    await syncAppointmentStatus(queue.appointment_id, "admitted");

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:admitted");

    res.json({
      message: "Patient has been admitted",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const startConsultation = async (req, res) => {
  try {
    const { queue_id } = req.body;
    const doctor = await getDoctorContext(req.user.id);

    if (!queue_id) {
      return res.status(400).json({ message: "Queue item is required" });
    }

    const queue = await Queue.findByPk(queue_id);

    if (!queue || queue.doctor_id !== doctor.id) {
      return res.status(404).json({ message: "Queue item not found" });
    }

    if (!["called", "admitted"].includes(queue.status)) {
      return res.status(400).json({
        message: "Only called or admitted patients can start consultation",
      });
    }

    await ensureDoctorHasNoActivePatient(doctor.id, queue.id);

    await queue.update({
      status: "in_consultation",
      consultation_started_at: new Date(),
    });
    await syncAppointmentStatus(queue.appointment_id, "in_consultation");

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:consultation-started");

    res.json({
      message: "Consultation started",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const completeConsultation = async (req, res) => {
  try {
    const { queue_id } = req.body;

    if (!queue_id) {
      return res.status(400).json({ message: "Queue item is required" });
    }

    const queue = await Queue.findByPk(queue_id);

    if (!queue) {
      return res.status(404).json({ message: "Queue item not found" });
    }

    if (req.user.role === "doctor") {
      const doctor = await getDoctorContext(req.user.id);
      if (queue.doctor_id !== doctor.id) {
        return res.status(403).json({ message: "You cannot complete this queue item" });
      }
    }

    if (!["admitted", "in_consultation"].includes(queue.status)) {
      return res
        .status(400)
        .json({ message: "Only admitted or in-consultation patients can be completed" });
    }

    await queue.update({
      status: "completed",
      completed_at: new Date(),
    });
    await syncAppointmentStatus(queue.appointment_id, "completed");

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:completed");

    res.json({
      message: "Consultation completed",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = {
  markAsArrived,
  getDoctorQueue,
  getStaffLiveQueues,
  getMyQueueStatus,
  callNextPatient,
  confirmAdmit,
  startConsultation,
  completeConsultation,
};
