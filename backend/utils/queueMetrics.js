const { Op, fn, col } = require("sequelize");
const { Queue } = require("../models");

const getDurationMinutes = (fromValue, toValue = new Date()) => {
  if (!fromValue) {
    return null;
  }

  const start = new Date(fromValue);
  const end = new Date(toValue);
  return Math.max(0, Math.round((end - start) / 60000));
};

const getAttentionState = (queue) => {
  if (queue.status === "called" && getDurationMinutes(queue.called_at) >= 5) {
    return "overdue_admit";
  }

  if (queue.status === "waiting" && getDurationMinutes(queue.joined_at) >= 20) {
    return "long_wait";
  }

  return "normal";
};

const calculatePatientsAhead = async (queue) => {
  if (!queue) {
    return 0;
  }

  return Queue.count({
    where: {
      doctor_id: queue.doctor_id,
      status: {
        [Op.in]: ["waiting", "called", "admitted", "in_consultation"],
      },
      queue_number: {
        [Op.lt]: queue.queue_number,
      },
    },
  });
};

const getApproximateWaitMinutes = async (doctorId, patientsAhead = 0) => {
  const rows = await Queue.findAll({
    attributes: [
      [fn("AVG", fn("EXTRACT", fn("EPOCH", col("completed_at")) - fn("EPOCH", col("consultation_started_at")))), "avg_seconds"],
    ],
    where: {
      doctor_id: doctorId,
      consultation_started_at: { [Op.ne]: null },
      completed_at: { [Op.ne]: null },
    },
    raw: true,
  });

  const avgSeconds = Number(rows?.[0]?.avg_seconds || 0);
  if (!avgSeconds) {
    return null;
  }

  return Math.max(1, Math.round((avgSeconds / 60) * patientsAhead));
};

module.exports = {
  calculatePatientsAhead,
  getApproximateWaitMinutes,
  getAttentionState,
  getDurationMinutes,
};
