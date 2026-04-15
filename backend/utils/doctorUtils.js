const { Doctor, User, Department } = require("../models");

const doctorInclude = [
  {
    model: User,
    attributes: ["id", "full_name", "email", "phone"],
  },
  {
    model: Department,
    attributes: ["id", "name"],
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
