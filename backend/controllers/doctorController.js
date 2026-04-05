const { Doctor, User, Department } = require("../models/index");

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
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
      order: [["createdAt", "DESC"]],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDoctor = async (req, res) => {
  try {
    const { user_id, department_id, specialization } = req.body;
    const doctor = await Doctor.create({
      user_id,
      department_id,
      specialization,
    });
    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllDoctors, createDoctor };
