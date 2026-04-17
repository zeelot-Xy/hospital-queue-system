const { Op } = require("sequelize");
const { Doctor, User, Department } = require("../models/index");
const { doctorInclude, getDoctorByUserId } = require("../utils/doctorUtils");
const { logAudit } = require("../utils/auditLogger");

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: {
        department_id: {
          [Op.not]: null,
        },
      },
      include: doctorInclude,
      order: [["createdAt", "DESC"]],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEligibleDoctorAccounts = async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      attributes: ["user_id", "department_id", "specialization"],
    });
    const doctorMap = new Map(doctors.map((doctor) => [doctor.user_id, doctor]));

    const eligibleUsers = await User.findAll({
      where: {
        role: "doctor",
      },
      attributes: ["id", "full_name", "email", "phone"],
      order: [["full_name", "ASC"]],
    });

    res.json({
      users: eligibleUsers
        .filter((user) => {
          const doctor = doctorMap.get(user.id);
          return !doctor || !doctor.department_id;
        })
        .map((user) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          specialization:
            doctorMap.get(user.id)?.specialization || "General Medicine",
        })),
    });
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

const updateMyDoctorProfile = async (req, res) => {
  try {
    const { full_name, phone, department_id, specialization } = req.body;
    const doctor = await Doctor.findOne({ where: { user_id: req.user.id } });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    if (!full_name?.trim() || !phone?.trim() || !specialization?.trim() || !department_id) {
      return res.status(400).json({
        message: "Full name, phone, department, and specialization are required",
      });
    }

    const department = await Department.findByPk(department_id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    await Promise.all([
      User.update(
        {
          full_name: full_name.trim(),
          phone: phone.trim(),
        },
        { where: { id: req.user.id } },
      ),
      doctor.update({
        department_id: Number(department_id),
        specialization: specialization.trim(),
      }),
    ]);

    await logAudit({
      actorUserId: req.user.id,
      actionType: "doctor.profile.updated",
      targetType: "doctor",
      targetId: doctor.id,
      metadata: {
        department_id: Number(department_id),
      },
    });

    const updatedDoctor = await getDoctorByUserId(req.user.id);
    res.json(updatedDoctor);
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

    if (existingDoctor?.department_id) {
      return res
        .status(400)
        .json({ message: "This doctor account has already been assigned" });
    }

    let doctor = existingDoctor;

    if (doctor) {
      await doctor.update({
        department_id,
        specialization: specialization.trim(),
      });
    } else {
      doctor = await Doctor.create({
        user_id,
        department_id,
        specialization: specialization.trim(),
      });
    }

    const createdDoctor = await Doctor.findByPk(doctor.id, {
      include: doctorInclude,
    });

    await logAudit({
      actorUserId: req.user.id,
      actionType: "doctor.created",
      targetType: "doctor",
      targetId: doctor.id,
      metadata: {
        user_id,
        department_id,
      },
    });

    res.status(201).json(createdDoctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllDoctors,
  getEligibleDoctorAccounts,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  createDoctor,
};
