require("../config/env");

const DEMO_EMAILS = {
  staff: "staff.demo@clinic.local",
  doctor: "doctor.demo@clinic.local",
  patient: "patient.demo@clinic.local",
};

const assertDemoMode = () => {
  if (String(process.env.DEMO_MODE).toLowerCase() !== "true") {
    throw new Error("Demo data commands are disabled unless DEMO_MODE=true");
  }
};

const assertDemoPassword = () => {
  const password = String(process.env.DEMO_ACCOUNT_PASSWORD || "");
  if (password.length < 10) {
    throw new Error("DEMO_ACCOUNT_PASSWORD must contain at least 10 characters");
  }
  return password;
};

module.exports = { DEMO_EMAILS, assertDemoMode, assertDemoPassword };
