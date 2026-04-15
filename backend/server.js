require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { sequelize, Doctor } = require("./models");
const authRoutes = require("./routes/authRoutes");
const {
  authenticateToken,
  authorizeRole,
} = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    credentials: true,
  },
});

app.set("io", io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = user;

    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({ where: { user_id: user.id } });
      if (doctor) {
        socket.doctorId = doctor.id;
      }
    }

    next();
  } catch (_error) {
    next(new Error("Invalid socket token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  socket.join(`role:${socket.user.role}`);

  if (socket.user.role === "patient") {
    socket.join(`patient:${socket.user.id}`);
  }

  if (socket.doctorId) {
    socket.join(`doctor:${socket.doctorId}`);
  }
});

// Public routes
app.use("/api/auth", authRoutes);

// Declare routes
const departmentRoutes = require("./routes/departmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const queueRoutes = require("./routes/queueRoutes");

// Use routes
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);

app.get(
  "/api/dev/users",
  authenticateToken,
  authorizeRole("admin", "staff"),
  async (_req, res) => {
    try {
      const { User } = require("./models");
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

app.get("/health", (_req, res) =>
  res.json({ status: "Server running - Queue workflow enabled" }),
);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");
    await sequelize.sync({ alter: true });
    console.log("Tables synced");

    server.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
