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

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const user = await User.create({
      full_name,
      email,
      phone,
      password: hashedPassword,
      role: role || "patient",
    });

    let doctor = null;

    if (role === "doctor") {
      // For doctor, department_id is required
      if (!department_id) {
        return res.status(400).json({
          message: "Department ID is required for doctor registration",
        });
      }

      // Check if department exists
      const departmentExists = await Department.findByPk(department_id);
      if (!departmentExists) {
        return res.status(400).json({
          message: `Department with ID ${department_id} does not exist. Please create departments first.`,
        });
      }

      doctor = await Doctor.create({
        user_id: user.id,
        department_id: parseInt(department_id),
        specialization: specialization || "General Medicine",
      });
    }

    // Generate JWT
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
    const { email, password, role } = req.body;

    console.log("🔐 Login attempt:", { email, role }); // ← DEBUG LOG

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("✅ User found:", {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
    });

    // Check role if provided
    if (role && user.role !== role) {
      console.log("❌ Role mismatch. Expected:", role, "Actual:", user.role);
      return res.status(400).json({
        message: `This account is registered as ${user.role}, not ${role}`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for user:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    console.log("✅ Login successful for:", email);

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
    console.error("💥 Login server error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = { register, login };
