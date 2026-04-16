const { DoctorAvailability } = require("../models");
const { getDoctorByUserId } = require("../utils/doctorUtils");
const { validateAvailabilityRows } = require("../utils/availabilityUtils");
const { logAudit } = require("../utils/auditLogger");

const getMyAvailability = async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    const rows = await DoctorAvailability.findAll({
      where: { doctor_id: doctor.id },
      order: [
        ["day_of_week", "ASC"],
        ["start_time", "ASC"],
      ],
    });

    res.json({ rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const replaceMyAvailability = async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    validateAvailabilityRows(rows);

    await DoctorAvailability.destroy({ where: { doctor_id: doctor.id } });

    if (rows.length > 0) {
      await DoctorAvailability.bulkCreate(
        rows.map((row) => ({
          doctor_id: doctor.id,
          day_of_week: Number(row.day_of_week),
          start_time: row.start_time,
          end_time: row.end_time,
          slot_minutes: Number(row.slot_minutes) || 30,
          is_active: row.is_active !== false,
        })),
      );
    }

    const savedRows = await DoctorAvailability.findAll({
      where: { doctor_id: doctor.id },
      order: [
        ["day_of_week", "ASC"],
        ["start_time", "ASC"],
      ],
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "doctor.availability.updated",
      targetType: "doctor",
      targetId: doctor.id,
      metadata: { rowCount: savedRows.length },
    });

    res.json({ rows: savedRows });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMyAvailability,
  replaceMyAvailability,
};
