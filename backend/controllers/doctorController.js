const { Doctor, User, Department } = require("../models/index");
const { doctorInclude, getDoctorByUserId } = require("../utils/doctorUtils");

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      include: doctorInclude,
      order: [["createdAt", "DESC"]],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDoctor = async (req, res) => {
  try {
    const { user_id, department_id, specialization } = req.body;

    if (!user_id || !department_id || !specialization?.trim()) {
      return res.status(400).json({
        message: "User, department, and specialization are required",
      });
    }

    const [user, department, existingDoctor] = await Promise.all([
      User.findByPk(user_id),
      Department.findByPk(department_id),
      Doctor.findOne({ where: { user_id } }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "Selected user does not exist" });
    }

    if (user.role !== "doctor") {
      return res.status(400).json({
        message: "Only users registered with the doctor role can be assigned",
      });
    }

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (existingDoctor) {
      return res
        .status(400)
        .json({ message: "This user already has a doctor profile" });
    }

    const doctor = await Doctor.create({
      user_id,
      department_id,
      specialization: specialization.trim(),
    });

    const createdDoctor = await Doctor.findByPk(doctor.id, {
      include: doctorInclude,
    });

    res.status(201).json(createdDoctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllDoctors, getMyDoctorProfile, createDoctor };
