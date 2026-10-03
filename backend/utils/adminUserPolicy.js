const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const validateStaffAccountInput = ({ full_name, email, phone, password }) => {
  const value = {
    full_name: String(full_name || "").trim(),
    email: normalizeEmail(email),
    phone: String(phone || "").trim(),
    password: String(password || ""),
  };

  if (!value.full_name || !value.email || !value.phone || !value.password) {
    return { error: "Name, email, phone, and password are required" };
  }
  if (!/^\S+@\S+\.\S+$/.test(value.email)) {
    return { error: "Enter a valid email address" };
  }
  if (value.password.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }
  return { value };
};

const validateAccountStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!['active', 'inactive'].includes(normalized)) {
    return { error: "Status must be active or inactive" };
  }
  return { value: normalized };
};

const validateReplacementPassword = (password) => {
  const normalized = String(password || "");
  if (normalized.length < 10) {
    return { error: "Password must be at least 10 characters" };
  }
  return { value: normalized };
};

module.exports = {
  normalizeEmail,
  validateStaffAccountInput,
  validateAccountStatus,
  validateReplacementPassword,
};
