const { Op, fn, col, literal } = require("sequelize");
const { Appointment, AuditLog, Department, Doctor, Queue, User } = require("../models");

const getReports = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      seenCount,
      missedCount,
      rescheduledCount,
      walkInCount,
      busiestDoctors,
      busiestDepartments,
      queueTimingRows,
      recentAuditLogs,
    ] = await Promise.all([
      Appointment.count({
        where: {
          status: "completed",
          updatedAt: { [Op.gte]: since },
        },
      }),
      Appointment.count({
        where: {
          status: "missed",
          updatedAt: { [Op.gte]: since },
        },
      }),
      Appointment.count({
        where: {
          rescheduled_from_id: { [Op.ne]: null },
          createdAt: { [Op.gte]: since },
        },
      }),
      Appointment.count({
        where: {
          walk_in: true,
          createdAt: { [Op.gte]: since },
        },
      }),
      Appointment.findAll({
        attributes: [
          "doctor_id",
          [fn("COUNT", col("Appointment.id")), "completed_count"],
        ],
        where: {
          status: "completed",
          updatedAt: { [Op.gte]: since },
        },
        include: [
          {
            model: Doctor,
            include: [{ model: User, attributes: ["full_name"] }],
          },
        ],
        group: ["doctor_id", "Doctor.id", "Doctor->User.id"],
        order: [[literal("completed_count"), "DESC"]],
        limit: 5,
      }),
      Appointment.findAll({
        attributes: [
          "department_id",
          [fn("COUNT", col("Appointment.id")), "completed_count"],
        ],
        where: {
          status: "completed",
          updatedAt: { [Op.gte]: since },
        },
        include: [{ model: Department, attributes: ["name"] }],
        group: ["department_id", "Department.id"],
        order: [[literal("completed_count"), "DESC"]],
        limit: 5,
      }),
      Queue.findAll({
        attributes: [
          [
            literal('AVG(EXTRACT(EPOCH FROM ("admitted_at" - "joined_at")) / 60)'),
            "avg_wait_minutes",
          ],
          [
            literal(
              'AVG(EXTRACT(EPOCH FROM ("completed_at" - "consultation_started_at")) / 60)',
            ),
            "avg_consultation_minutes",
          ],
        ],
        where: {
          updatedAt: { [Op.gte]: since },
        },
        raw: true,
      }),
      AuditLog.findAll({
        order: [["createdAt", "DESC"]],
        limit: 15,
      }),
    ]);

    res.json({
      metrics: {
        patients_seen: seenCount,
        missed_appointments: missedCount,
        rescheduled_appointments: rescheduledCount,
        walk_in_volume: walkInCount,
        booked_volume: Math.max(0, seenCount - walkInCount),
        average_wait_minutes: Number(queueTimingRows?.[0]?.avg_wait_minutes || 0).toFixed(1),
        average_consultation_minutes: Number(
          queueTimingRows?.[0]?.avg_consultation_minutes || 0,
        ).toFixed(1),
      },
      busiestDoctors,
      busiestDepartments,
      recentAuditLogs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReports,
};
