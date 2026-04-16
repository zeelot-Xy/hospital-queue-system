const { Op } = require("sequelize");
const {
  Appointment,
  Queue,
  Department,
  User,
  Doctor,
  PatientProfile,
  ConsultationRecord,
} = require("../models");
const { getDoctorByUserId } = require("../utils/doctorUtils");
const { emitQueueEvent, emitQueueRefresh } = require("../utils/socketEvents");
const { logAudit } = require("../utils/auditLogger");
const { createNotifications } = require("../utils/notificationService");
const {
  calculatePatientsAhead,
  getApproximateWaitMinutes,
  getAttentionState,
  getDurationMinutes,
} = require("../utils/queueMetrics");

const activeDoctorStatuses = ["called", "admitted", "in_consultation"];
const activeQueueStatuses = ["waiting", "called", "admitted", "in_consultation"];
const CALL_AGAIN_COOLDOWN_MS = 2 * 60 * 1000;

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
      "walk_in",
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
          "date_of_birth",
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
      "walk_in",
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

const getAgeFromProfile = (profile) => {
  if (!profile?.date_of_birth) {
    return null;
  }

  return Math.floor(
    (Date.now() - new Date(profile.date_of_birth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );
};

const withDoctorQueueMeta = (queue) => {
  const payload = queue.toJSON();
  const profile = payload.Patient?.PatientProfile;
  const now = Date.now();
  const lastCalledAt = payload.last_called_at ? new Date(payload.last_called_at).getTime() : 0;
  const callAgainAvailableAt = lastCalledAt
    ? new Date(lastCalledAt + CALL_AGAIN_COOLDOWN_MS).toISOString()
    : null;

  return {
    ...payload,
    quick_summary: {
      blood_group: profile?.blood_group || "Not provided",
      age: getAgeFromProfile(profile),
      allergies: profile?.allergies || "",
      chronic_conditions: profile?.chronic_conditions || "",
      last_visit_notes: profile?.last_visit_notes || "",
    },
    can_call_again:
      payload.status === "called" && now - lastCalledAt >= CALL_AGAIN_COOLDOWN_MS,
    call_again_available_at: callAgainAvailableAt,
  };
};

const enrichStaffQueue = (queue) => ({
  ...queue.toJSON(),
  waiting_duration_minutes: getDurationMinutes(queue.joined_at),
  called_duration_minutes: getDurationMinutes(queue.called_at),
  attention_state: getAttentionState(queue),
});

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

    if (!appointment.walk_in && diffMinutes > 30) {
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
    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.arrived",
      targetType: "queue",
      targetId: queue.id,
      metadata: {
        appointment_id: appointment.id,
      },
    });

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
          [Op.in]: activeQueueStatuses,
        },
      },
      include: doctorQueueInclude,
      order: [["queue_number", "ASC"]],
    });

    const hydratedQueue = queue.map(withDoctorQueueMeta);
    const activeQueue = hydratedQueue.find((item) =>
      activeDoctorStatuses.includes(item.status),
    );

    res.json({
      doctor,
      activeQueue: activeQueue || null,
      queue: hydratedQueue,
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
          [Op.in]: activeQueueStatuses,
        },
      },
      include: queueInclude,
      order: [
        ["doctor_id", "ASC"],
        ["queue_number", "ASC"],
      ],
    });

    const enrichedQueues = queues.map(enrichStaffQueue);
    const alerts = enrichedQueues.filter((queue) => queue.status === "called");
    const doctorGroups = Object.values(
      enrichedQueues.reduce((accumulator, queue) => {
        const key = queue.doctor_id;
        if (!accumulator[key]) {
          accumulator[key] = {
            doctor_id: queue.doctor_id,
            doctor_name: queue.Doctor?.User?.full_name,
            department_name: queue.Department?.name,
            queues: [],
          };
        }
        accumulator[key].queues.push(queue);
        return accumulator;
      }, {}),
    );

    res.json({ queues: enrichedQueues, alerts, doctorGroups });
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
          [Op.in]: activeQueueStatuses,
        },
      },
      include: queueInclude,
      order: [["createdAt", "DESC"]],
    });

    if (!queue) {
      return res.json({ queue: null });
    }

    const patientsAhead = await calculatePatientsAhead(queue);
    const estimatedWaitMinutes = await getApproximateWaitMinutes(
      queue.doctor_id,
      patientsAhead,
    );

    res.json({
      queue: {
        ...queue.toJSON(),
        patients_ahead: patientsAhead,
        estimated_wait_minutes: estimatedWaitMinutes,
      },
    });
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

    const now = new Date();
    await nextQueue.update({
      status: "called",
      called_at: now,
      last_called_at: now,
      call_count: 1,
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

    await createNotifications(req.app, [
      {
        recipientRole: "staff",
        type: "doctor_called_next",
        title: "Doctor called next patient",
        message: `Dr. ${doctor.User.full_name} is ready for the next patient.`,
        payload: { queueId: nextQueue.id },
      },
      {
        recipientRole: "admin",
        type: "doctor_called_next",
        title: "Doctor called next patient",
        message: `Dr. ${doctor.User.full_name} is ready for the next patient.`,
        payload: { queueId: nextQueue.id },
      },
      {
        recipientUserId: nextQueue.patient_id,
        type: "queue_called",
        title: "You have been called",
        message: "Your doctor has called for the next patient. Please stay close to the staff desk.",
        payload: { queueId: nextQueue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.called",
      targetType: "queue",
      targetId: nextQueue.id,
    });

    res.json({
      message: "Next patient has been called",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const callAgain = async (req, res) => {
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

    if (queue.status !== "called") {
      return res.status(400).json({ message: "Only called patients can be called again" });
    }

    if (
      queue.last_called_at &&
      Date.now() - new Date(queue.last_called_at).getTime() < CALL_AGAIN_COOLDOWN_MS
    ) {
      return res.status(400).json({
        message: "You can call this patient again after 2 minutes",
      });
    }

    await queue.update({
      last_called_at: new Date(),
      call_count: (queue.call_count || 1) + 1,
    });

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:called-again");
    emitQueueEvent(
      req.app,
      "staff:alert",
      {
        type: "doctor_called_again",
        message: `Dr. ${doctor.User.full_name} repeated a patient call`,
        queue: hydratedQueue,
      },
      { rooms: ["role:staff", "role:admin"] },
    );

    await createNotifications(req.app, [
      {
        recipientRole: "staff",
        type: "doctor_called_again",
        title: "Doctor called again",
        message: `Dr. ${doctor.User.full_name} repeated a patient call.`,
        payload: { queueId: queue.id },
      },
      {
        recipientRole: "admin",
        type: "doctor_called_again",
        title: "Doctor called again",
        message: `Dr. ${doctor.User.full_name} repeated a patient call.`,
        payload: { queueId: queue.id },
      },
      {
        recipientUserId: queue.patient_id,
        type: "queue_called_again",
        title: "Please proceed to staff",
        message: "Your doctor has repeated the call. Please check in with staff now.",
        payload: { queueId: queue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.called_again",
      targetType: "queue",
      targetId: queue.id,
      metadata: {
        call_count: queue.call_count + 1,
      },
    });

    res.json({
      message: "Patient called again successfully",
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

    await createNotifications(req.app, [
      {
        recipientUserId: queue.patient_id,
        type: "queue_admitted",
        title: "You may proceed in",
        message: "Staff has confirmed your turn. Please proceed into consultation.",
        payload: { queueId: queue.id },
      },
      {
        recipientRole: "doctor",
        recipientUserId: hydratedQueue.Doctor?.user_id,
        type: "queue_admitted",
        title: "Patient admitted",
        message: `${hydratedQueue.Patient?.full_name} has been admitted.`,
        payload: { queueId: queue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.admitted",
      targetType: "queue",
      targetId: queue.id,
    });

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

    await createNotifications(req.app, [
      {
        recipientUserId: queue.patient_id,
        type: "consultation_started",
        title: "Consultation started",
        message: "Your queue status is now in consultation.",
        payload: { queueId: queue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.consultation_started",
      targetType: "queue",
      targetId: queue.id,
    });

    res.json({
      message: "Consultation started",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const ensureConsultationRecordExists = async (queue) => {
  const existing = await ConsultationRecord.findOne({
    where: { queue_id: queue.id },
  });

  if (existing) {
    return existing;
  }

  return ConsultationRecord.create({
    appointment_id: queue.appointment_id,
    queue_id: queue.id,
    patient_id: queue.patient_id,
    doctor_id: queue.doctor_id,
    presenting_complaint: "",
    findings: "",
    diagnosis: "",
    treatment_plan: "",
    follow_up_advice: "",
    note_summary: "",
  });
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
    await ensureConsultationRecordExists(queue);

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:completed");

    await createNotifications(req.app, [
      {
        recipientUserId: queue.patient_id,
        type: "consultation_completed",
        title: "Consultation completed",
        message: "Your consultation has been completed.",
        payload: { queueId: queue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.completed",
      targetType: "queue",
      targetId: queue.id,
    });

    res.json({
      message: "Consultation completed",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const returnToWaiting = async (req, res) => {
  try {
    const { queue_id } = req.body;

    if (!queue_id) {
      return res.status(400).json({ message: "Queue item is required" });
    }

    const queue = await Queue.findByPk(queue_id);
    if (!queue || !["called", "admitted"].includes(queue.status)) {
      return res.status(400).json({
        message: "Only called or admitted queues can be returned to waiting",
      });
    }

    await queue.update({
      status: "waiting",
      called_at: null,
      last_called_at: null,
      admitted_at: null,
      consultation_started_at: null,
    });
    await syncAppointmentStatus(queue.appointment_id, "arrived");

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:return-to-waiting");

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.returned_to_waiting",
      targetType: "queue",
      targetId: queue.id,
    });

    res.json({
      message: "Patient returned to waiting",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const transferQueue = async (req, res) => {
  try {
    const { queue_id, doctor_id, department_id, transfer_reason } = req.body;

    if (!queue_id || !doctor_id || !department_id) {
      return res.status(400).json({
        message: "Queue item, target doctor, and department are required",
      });
    }

    const queue = await Queue.findByPk(queue_id);
    if (!queue || !["waiting", "called", "admitted"].includes(queue.status)) {
      return res.status(400).json({
        message: "Only waiting, called, or admitted queues can be transferred",
      });
    }

    const targetDoctor = await Doctor.findByPk(doctor_id, {
      include: [{ model: User, attributes: ["id", "full_name"] }],
    });
    if (!targetDoctor || targetDoctor.status !== "active") {
      return res.status(404).json({ message: "Target doctor not found" });
    }
    if (targetDoctor.department_id !== Number(department_id)) {
      return res.status(400).json({
        message: "Target doctor does not belong to the selected department",
      });
    }

    const lastQueue = await Queue.findOne({
      where: { doctor_id: Number(doctor_id) },
      order: [["queue_number", "DESC"]],
    });

    const previousDoctorId = queue.doctor_id;
    const previousDepartmentId = queue.department_id;

    await queue.update({
      doctor_id: Number(doctor_id),
      department_id: Number(department_id),
      queue_number: lastQueue ? lastQueue.queue_number + 1 : 1,
      status: "waiting",
      called_at: null,
      last_called_at: null,
      admitted_at: null,
      consultation_started_at: null,
      transfer_reason: transfer_reason?.trim() || "",
      transferred_from_doctor_id: previousDoctorId,
      transferred_from_department_id: previousDepartmentId,
    });

    await Appointment.update(
      {
        doctor_id: Number(doctor_id),
        department_id: Number(department_id),
        status: "arrived",
      },
      { where: { id: queue.appointment_id } },
    );

    const hydratedQueue = await getQueueById(queue.id);
    emitQueueRefresh(req.app, hydratedQueue, "queue:transferred");

    await createNotifications(req.app, [
      {
        recipientUserId: queue.patient_id,
        type: "queue_transferred",
        title: "Queue transferred",
        message: `Your visit has been reassigned to Dr. ${targetDoctor.User?.full_name}.`,
        payload: { queueId: queue.id },
      },
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "queue.transferred",
      targetType: "queue",
      targetId: queue.id,
      metadata: {
        from_doctor_id: previousDoctorId,
        to_doctor_id: Number(doctor_id),
      },
    });

    res.json({
      message: "Queue transferred successfully",
      queue: hydratedQueue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  markAsArrived,
  getDoctorQueue,
  getStaffLiveQueues,
  getMyQueueStatus,
  callNextPatient,
  callAgain,
  confirmAdmit,
  startConsultation,
  completeConsultation,
  returnToWaiting,
  transferQueue,
};
