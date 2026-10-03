require("./config/env");
const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { sequelize, Doctor, User } = require("./models");
const {
  appVersion,
  getAllowedOrigins,
  isProduction,
  validateRuntimeEnvironment,
} = require("./config/runtime");

const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const queueRoutes = require("./routes/queueRoutes");
const patientProfileRoutes = require("./routes/patientProfileRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportingRoutes = require("./routes/reportingRoutes");
const auditRoutes = require("./routes/auditRoutes");

const log = (level, message, details = {}) => {
  const record = { timestamp: new Date().toISOString(), level, message, ...details };
  const output = JSON.stringify(record);
  if (level === "error") console.error(output);
  else console.log(output);
};

const createApplication = () => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  };

  app.disable("x-powered-by");
  if (isProduction) app.set("trust proxy", 1);
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      log("info", "http.request", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt,
      });
    });
    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api/admin-users", adminUserRoutes);
  app.use("/api/doctors", doctorRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/queue", queueRoutes);
  app.use("/api/patient-profile", patientProfileRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/consultations", consultationRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reports", reportingRoutes);
  app.use("/api/audit-logs", auditRoutes);

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "hospital-queue-api", version: appVersion }),
  );
  app.get("/ready", async (_req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ status: "ready", database: "connected", version: appVersion });
    } catch (_error) {
      res.status(503).json({ status: "not_ready", database: "unavailable" });
    }
  });

  app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((error, _req, res, _next) => {
    log("error", "http.error", { error: error.message });
    res.status(500).json({ message: "Unexpected server error" });
  });

  return { app, corsOptions };
};

const createRuntime = () => {
  const { app, corsOptions } = createApplication();
  const server = http.createServer(app);
  const io = new Server(server, { cors: corsOptions });
  app.set("io", io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const tokenUser = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(tokenUser.id, {
        attributes: ["id", "role", "status"],
      });
      if (!user || user.status !== "active" || user.role !== tokenUser.role) {
        return next(new Error("Invalid or inactive account"));
      }
      socket.user = { id: user.id, role: user.role };
      if (user.role === "doctor") {
        const doctor = await Doctor.findOne({ where: { user_id: user.id } });
        if (doctor) socket.doctorId = doctor.id;
      }
      return next();
    } catch (_error) {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
    if (socket.user.role === "patient") socket.join(`patient:${socket.user.id}`);
    if (socket.doctorId) socket.join(`doctor:${socket.doctorId}`);
  });

  return { app, io, server };
};

const startServer = async () => {
  validateRuntimeEnvironment();
  await sequelize.authenticate();
  const { server } = createRuntime();
  const port = Number(process.env.PORT || 5000);
  server.listen(port, "0.0.0.0", () =>
    log("info", "server.started", { port, version: appVersion }),
  );

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", "server.stopping", { signal });
    server.close(async () => {
      await sequelize.close();
      log("info", "server.stopped");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    log("error", "server.startup_failed", { error: error.message });
    process.exit(1);
  });
}

module.exports = { createApplication, createRuntime, startServer };
