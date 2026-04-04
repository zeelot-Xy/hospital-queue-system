import { useNavigate } from "react-router-dom";

export default function DoctorDashboard() {
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
          <h1 className="text-3xl font-bold text-teal-900">Doctor Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
            Logout
          </button>
        </div>
        <div className="medical-card p-8">
          <p>Welcome Dr. {user.full_name}</p>
          <p className="mt-4 text-gray-600">
            Your consultation queue and current patients will appear here (Phase
            5-6)
          </p>
        </div>
      </div>
    </div>
  );
}
