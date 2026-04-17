import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Phone, Stethoscope, Users } from "lucide-react";
import api from "../lib/api";
import PasswordField from "../components/PasswordField";

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "patient",
    specialization: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((current) => ({
      ...current,
      role,
      specialization: role === "doctor" ? current.specialization : "",
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = { ...formData };

      if (payload.role !== "doctor") {
        delete payload.specialization;
      }

      await api.post("/auth/register", payload);
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-teal-50">
      <div className="medical-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mb-4">
            <Stethoscope className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-teal-900">Create Account</h1>
          <p className="text-teal-600 mt-2">Join the Hospital Queue System</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am registering as
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["patient", "doctor", "staff"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRoleChange(item)}
                  className={`p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center gap-2 border-2 ${
                    formData.role === item
                      ? "border-teal-600 bg-teal-50 text-teal-700 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  {item === "doctor" ? (
                    <Stethoscope className="w-6 h-6" />
                  ) : (
                    <Users className="w-6 h-6" />
                  )}
                  <span className="capitalize">{item}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
                placeholder="+234 801 234 5678"
                required
              />
            </div>
          </div>

          <PasswordField
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            required
          />

          {formData.role === "doctor" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
                  placeholder="Cardiologist"
                  required
                />
              </div>
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-4 text-sm text-teal-900">
                Staff will assign your department after registration.
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-3.5 rounded-2xl transition-all text-lg">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account?{" "}
          <Link to="/login" className="text-teal-600 font-medium hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
