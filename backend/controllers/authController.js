const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Doctor, Department } = require("../models/index");

const register = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      role,
      specialization,
      department_id,
    } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      full_name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: role || "patient",
    });

    if (role === "doctor") {
      if (!department_id) {
        return res.status(400).json({
          message: "Department ID is required for doctor registration",
        });
      }

      const departmentExists = await Department.findByPk(department_id);
      if (!departmentExists) {
        return res.status(400).json({
          message: `Department with ID ${department_id} does not exist. Please create departments first.`,
        });
      }

      await Doctor.create({
        user_id: user.id,
        department_id: parseInt(department_id, 10),
        specialization: specialization || "General Medicine",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Login server error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = { register, login };
