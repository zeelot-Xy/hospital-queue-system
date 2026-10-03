const PUBLIC_REGISTRATION_ROLES = Object.freeze(["patient", "doctor"]);

const normalizePublicRegistrationRole = (role) => {
  const normalizedRole = String(role || "patient")
    .trim()
    .toLowerCase();

  return PUBLIC_REGISTRATION_ROLES.includes(normalizedRole)
    ? normalizedRole
    : null;
};

const validateRegistrationInput = ({
  full_name,
  email,
  phone,
  password,
  role,
  specialization,
}) => {
  const normalizedRole = normalizePublicRegistrationRole(role);

  if (!normalizedRole) {
    return {
      error: "Only patient and doctor accounts can be registered publicly",
    };
  }

  if (!full_name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return {
      error: "Full name, email, phone, and password are required",
    };
  }

  if (String(password).length < 8) {
    return { error: "Password must be at least 8 characters long" };
  }

  if (normalizedRole === "doctor" && !specialization?.trim()) {
    return { error: "Specialization is required for doctor registration" };
  }

  return {
    value: {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: normalizedRole,
      specialization: specialization?.trim() || null,
    },
  };
};

module.exports = {
  PUBLIC_REGISTRATION_ROLES,
  normalizePublicRegistrationRole,
  validateRegistrationInput,
};
