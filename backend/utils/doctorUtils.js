const { Doctor, User, Department, DoctorAvailability } = require("../models");

const doctorInclude = [
  {
    model: User,
    attributes: ["id", "full_name", "email", "phone"],
  },
  {
    model: Department,
    attributes: ["id", "name"],
  },
  {
    model: DoctorAvailability,
    as: "Availabilities",
    attributes: [
      "id",
      "day_of_week",
      "start_time",
      "end_time",
      "slot_minutes",
      "is_active",
    ],
    required: false,
  },
];

const getDoctorByUserId = async (userId) =>
  Doctor.findOne({
    where: { user_id: userId },
    include: doctorInclude,
  });

module.exports = {
  doctorInclude,
  getDoctorByUserId,
};
