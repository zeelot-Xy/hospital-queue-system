const packageInfo = require("../package.json");

const isProduction = process.env.NODE_ENV === "production";

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const validateRuntimeEnvironment = () => {
  const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }

  if (isProduction && splitOrigins(process.env.ALLOWED_ORIGINS).length === 0) {
    throw new Error("ALLOWED_ORIGINS must be configured in production");
  }
};

const getAllowedOrigins = () => {
  const configured = splitOrigins(
    process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL,
  );

  if (isProduction) {
    return configured;
  }

  return Array.from(
    new Set([
      ...configured,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]),
  );
};

module.exports = {
  appVersion: packageInfo.version,
  getAllowedOrigins,
  isProduction,
  validateRuntimeEnvironment,
};
