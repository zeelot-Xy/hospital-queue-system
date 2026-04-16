const { Op } = require("sequelize");
const { ConsultationRecord, PatientProfile, Queue, User } = require("../models");
const { getDoctorByUserId } = require("../utils/doctorUtils");
const { logAudit } = require("../utils/auditLogger");
const { getPatientConsultationHistory } = require("./consultationController");

const profileAttributes = [
  "id",
  "user_id",
  "blood_group",
  "date_of_birth",
  "allergies",
  "chronic_conditions",
  "last_visit_notes",
  "createdAt",
  "updatedAt",
];

const getOrCreatePatientProfile = async (userId) => {
  const [profile] = await PatientProfile.findOrCreate({
    where: { user_id: userId },
    defaults: {
      blood_group: "",
      date_of_birth: null,
      allergies: "",
      chronic_conditions: "",
      last_visit_notes: "",
    },
  });

  return profile;
};

const getDoctorWithAccess = async (userId) => {
  const doctor = await getDoctorByUserId(userId);

  if (!doctor) {
    const error = new Error("Doctor profile not found");
    error.status = 404;
    throw error;
  }

  return doctor;
};

const ensureDoctorPatientAccess = async (doctorUserId, patientId, allowedStatuses) => {
  const doctor = await getDoctorWithAccess(doctorUserId);

  const queue = await Queue.findOne({
    where: {
      doctor_id: doctor.id,
      patient_id: Number(patientId),
      status: { [Op.in]: allowedStatuses },
    },
    order: [["updatedAt", "DESC"]],
  });

  if (!queue) {
    const error = new Error("You do not have access to this patient profile");
    error.status = 403;
    throw error;
  }

  return { doctor, queue };
};

const getMyPatientProfile = async (req, res) => {
  try {
    const profile = await getOrCreatePatientProfile(req.user.id);
    const age = profile.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(profile.date_of_birth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : null;
    res.json({ ...profile.toJSON(), age });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMyPatientProfile = async (req, res) => {
  try {
    const { blood_group, date_of_birth, allergies, chronic_conditions } = req.body;
    const profile = await getOrCreatePatientProfile(req.user.id);

    await profile.update({
      blood_group: blood_group?.trim() || "",
      date_of_birth: date_of_birth || null,
      allergies: allergies?.trim() || "",
      chronic_conditions: chronic_conditions?.trim() || "",
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "patient.profile.updated",
      targetType: "patient_profile",
      targetId: profile.id,
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDoctorPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { queue } = await ensureDoctorPatientAccess(req.user.id, patientId, [
      "waiting",
      "called",
      "admitted",
      "in_consultation",
      "completed",
    ]);

    const [profile, patient, consultationHistory] = await Promise.all([
      getOrCreatePatientProfile(patientId),
      User.findByPk(patientId, {
        attributes: ["id", "full_name", "email", "phone"],
      }),
      getPatientConsultationHistory(patientId),
    ]);

    if (!patient || patient.role !== "patient") {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json({
      patient,
      profile: {
        ...profile.toJSON(),
        age: profile.date_of_birth
          ? Math.floor(
              (Date.now() - new Date(profile.date_of_birth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )
          : null,
      },
      consultationHistory,
      queue_status: queue.status,
      can_edit_notes: ["admitted", "in_consultation", "completed"].includes(
        queue.status,
      ),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const updateDoctorPatientNotes = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { last_visit_notes } = req.body;

    await ensureDoctorPatientAccess(req.user.id, patientId, [
      "admitted",
      "in_consultation",
      "completed",
    ]);

    const profile = await getOrCreatePatientProfile(patientId);
    await profile.update({
      last_visit_notes: last_visit_notes?.trim() || "",
    });

    const latestRecord = await ConsultationRecord.findOne({
      where: { patient_id: Number(patientId) },
      order: [["createdAt", "DESC"]],
    });

    if (latestRecord) {
      await latestRecord.update({
        note_summary: last_visit_notes?.trim() || "",
      });
    }

    await logAudit({
      actorUserId: req.user.id,
      actionType: "doctor.patient_notes.updated",
      targetType: "patient_profile",
      targetId: profile.id,
      metadata: {
        patientId: Number(patientId),
      },
    });

    res.json(profile);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = {
  profileAttributes,
  getMyPatientProfile,
  updateMyPatientProfile,
  getDoctorPatientProfile,
  updateDoctorPatientNotes,
};
