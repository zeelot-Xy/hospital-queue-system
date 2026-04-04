import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">
              Patient Dashboard
            </h1>
            <p className="text-teal-600">Welcome, {user.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
            Logout
          </button>
        </div>

        <div className="medical-card p-8">
          <p className="text-lg text-gray-700">
            Patient booking flow will go here (Phase 3)
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Role: <span className="font-medium text-teal-700">{user.role}</span>
            <br />
            Email: {user.email}
          </div>
        </div>
      </div>
    </div>
  );
}
