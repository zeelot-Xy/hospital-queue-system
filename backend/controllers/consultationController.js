const { Op } = require("sequelize");
const {
  Appointment,
  ConsultationRecord,
  Doctor,
  PatientProfile,
  Queue,
  User,
  Department,
} = require("../models");
const { getDoctorByUserId } = require("../utils/doctorUtils");
const { logAudit } = require("../utils/auditLogger");

const consultationInclude = [
  {
    model: Appointment,
    attributes: ["id", "appointment_date", "appointment_time", "status"],
    include: [
      {
        model: Doctor,
        include: [
          {
            model: User,
            attributes: ["id", "full_name"],
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
    ],
  },
];

const getDoctorContext = async (userId) => {
  const doctor = await getDoctorByUserId(userId);
  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.status = 404;
    throw error;
  }
  return doctor;
};

const ensureDoctorCanManageQueue = async (doctorUserId, queueId) => {
  const doctor = await getDoctorContext(doctorUserId);
  const queue = await Queue.findByPk(queueId, {
    include: [
      {
        model: Appointment,
        attributes: ["id", "patient_id", "appointment_date", "appointment_time"],
      },
    ],
  });

  if (!queue || queue.doctor_id !== doctor.id) {
    const error = new Error("Queue item not found");
    error.status = 404;
    throw error;
  }

  if (!["admitted", "in_consultation", "completed"].includes(queue.status)) {
    const error = new Error(
      "Consultation records can only be edited after admit or during consultation",
    );
    error.status = 400;
    throw error;
  }

  return { doctor, queue };
};

const upsertQueueConsultationRecord = async (req, res) => {
  try {
    const { queueId } = req.params;
    const {
      presenting_complaint,
      findings,
      diagnosis,
      treatment_plan,
      follow_up_advice,
      note_summary,
    } = req.body;
    const { doctor, queue } = await ensureDoctorCanManageQueue(req.user.id, queueId);

    const existingRecord = await ConsultationRecord.findOne({
      where: {
        queue_id: queue.id,
      },
    });

    const payload = {
      appointment_id: queue.appointment_id,
      queue_id: queue.id,
      patient_id: queue.patient_id,
      doctor_id: doctor.id,
      presenting_complaint: presenting_complaint?.trim() || "",
      findings: findings?.trim() || "",
      diagnosis: diagnosis?.trim() || "",
      treatment_plan: treatment_plan?.trim() || "",
      follow_up_advice: follow_up_advice?.trim() || "",
      note_summary: note_summary?.trim() || "",
    };

    const record = existingRecord
      ? await existingRecord.update(payload)
      : await ConsultationRecord.create(payload);

    const profile = await PatientProfile.findOrCreate({
      where: { user_id: queue.patient_id },
      defaults: {},
    });

    await profile[0].update({
      last_visit_notes: record.note_summary || profile[0].last_visit_notes || "",
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "consultation.record.saved",
      targetType: "consultation_record",
      targetId: record.id,
      metadata: {
        queueId: queue.id,
        appointmentId: queue.appointment_id,
      },
    });

    res.json(record);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getQueueConsultationRecord = async (req, res) => {
  try {
    const { queueId } = req.params;
    await ensureDoctorCanManageQueue(req.user.id, queueId);

    const record = await ConsultationRecord.findOne({
      where: { queue_id: queueId },
    });

    res.json({ record: record || null });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const getMyVisitHistory = async (req, res) => {
  try {
    const history = await ConsultationRecord.findAll({
      where: { patient_id: req.user.id },
      include: consultationInclude,
      order: [["createdAt", "DESC"]],
    });

    const safeHistory = history.map((record) => ({
      id: record.id,
      note_summary: record.note_summary,
      createdAt: record.createdAt,
      Appointment: record.Appointment,
    }));

    res.json({ history: safeHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPatientConsultationHistory = async (patientId, limit = 10) =>
  ConsultationRecord.findAll({
    where: { patient_id: patientId },
    include: consultationInclude,
    order: [["createdAt", "DESC"]],
    limit,
  });

module.exports = {
  getQueueConsultationRecord,
  getMyVisitHistory,
  getPatientConsultationHistory,
  upsertQueueConsultationRecord,
};
