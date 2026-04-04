import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activeTab, setActiveTab] = useState("departments");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const [deptRes, docRes] = await Promise.all([
        axios.get("http://localhost:5000/api/departments", config),
        axios.get("http://localhost:5000/api/doctors", config),
      ]);
      setDepartments(deptRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">
              Staff Dashboard
            </h1>
            <p className="text-teal-600">Welcome, {user.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-6 py-3 font-medium rounded-t-xl transition ${activeTab === "departments" ? "bg-white shadow text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:text-gray-900"}`}>
            Departments
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`px-6 py-3 font-medium rounded-t-xl transition ${activeTab === "doctors" ? "bg-white shadow text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:text-gray-900"}`}>
            Doctors
          </button>
        </div>

        {activeTab === "departments" && (
          <div className="medical-card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Departments Management
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{dept.id}</td>
                      <td className="py-3 px-4 font-medium">{dept.name}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {dept.description}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`status-pill ${dept.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {dept.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">Edit / Delete (Phase 2.2)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "doctors" && (
          <div className="medical-card p-6">
            <h2 className="text-xl font-semibold mb-4">Doctors Management</h2>
            {/* Similar table for doctors */}
            <p className="text-gray-600">
              Doctor list with department assignment will be here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
