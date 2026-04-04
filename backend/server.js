require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models/index");
const authRoutes = require("./routes/authRoutes");
const {
  authenticateToken,
  authorizeRole,
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);

const departmentRoutes = require("./routes/departmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
// Protected dev route (keep for now)
app.get(
  "/api/dev/users",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (req, res) => {
    try {
      const { User, Department, Doctor } = require("./models/index");
      const users = await User.findAll({
        attributes: ["id", "full_name", "email", "phone", "role"],
        order: [["createdAt", "DESC"]],
      });
      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Health
app.get("/health", (req, res) =>
  res.json({ status: "Server running - Phase 1 Complete" }),
);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synced");

    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
