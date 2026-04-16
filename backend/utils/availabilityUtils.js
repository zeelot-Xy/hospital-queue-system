const { Op } = require("sequelize");
const { Appointment, DoctorAvailability } = require("../models");

const timeToMinutes = (timeString) => {
  const [hours = "0", minutes = "0"] = String(timeString).split(":");
  return Number(hours) * 60 + Number(minutes);
};

const minutesToTime = (minutes) => {
  const normalizedMinutes = Math.max(0, minutes);
  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (normalizedMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

const getDayOfWeek = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
};

const hasTimeOverlap = (rows) => {
  const sorted = [...rows].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  );

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (timeToMinutes(current.start_time) < timeToMinutes(previous.end_time)) {
      return true;
    }
  }

  return false;
};

const validateAvailabilityRows = (rows) => {
  const grouped = rows.reduce((accumulator, row) => {
    const groupKey = row.day_of_week;
    if (!accumulator[groupKey]) {
      accumulator[groupKey] = [];
    }
    accumulator[groupKey].push(row);
    return accumulator;
  }, {});

  Object.values(grouped).forEach((groupRows) => {
    groupRows.forEach((row) => {
      if (
        row.day_of_week < 0 ||
        row.day_of_week > 6 ||
        !row.start_time ||
        !row.end_time ||
        timeToMinutes(row.end_time) <= timeToMinutes(row.start_time) ||
        !row.slot_minutes ||
        Number(row.slot_minutes) < 5
      ) {
        throw new Error("Availability rows contain invalid values");
      }
    });

    if (hasTimeOverlap(groupRows)) {
      throw new Error("Availability windows cannot overlap on the same day");
    }
  });
};

const getAvailabilityForDoctorAndDate = async (doctorId, date) => {
  const dayOfWeek = getDayOfWeek(date);
  return DoctorAvailability.findAll({
    where: {
      doctor_id: doctorId,
      day_of_week: dayOfWeek,
      is_active: true,
    },
    order: [["start_time", "ASC"]],
  });
};

const generateSlotsFromAvailability = (availabilityRows) => {
  const slots = [];

  availabilityRows.forEach((row) => {
    const slotMinutes = Number(row.slot_minutes) || 30;
    let current = timeToMinutes(row.start_time);
    const end = timeToMinutes(row.end_time);

    while (current + slotMinutes <= end) {
      slots.push(minutesToTime(current));
      current += slotMinutes;
    }
  });

  return slots;
};

const getOpenSlotsForDoctor = async (doctorId, date) => {
  const availabilityRows = await getAvailabilityForDoctorAndDate(doctorId, date);
  const allSlots = generateSlotsFromAvailability(availabilityRows);

  if (allSlots.length === 0) {
    return [];
  }

  const bookedAppointments = await Appointment.findAll({
    attributes: ["appointment_time"],
    where: {
      doctor_id: doctorId,
      appointment_date: date,
      status: {
        [Op.notIn]: ["expired", "missed", "completed"],
      },
    },
  });

  const bookedTimes = new Set(
    bookedAppointments.map((appointment) =>
      String(appointment.appointment_time).slice(0, 5),
    ),
  );

  return allSlots.filter((slot) => !bookedTimes.has(slot));
};

module.exports = {
  getAvailabilityForDoctorAndDate,
  getOpenSlotsForDoctor,
  getDayOfWeek,
  timeToMinutes,
  validateAvailabilityRows,
};
