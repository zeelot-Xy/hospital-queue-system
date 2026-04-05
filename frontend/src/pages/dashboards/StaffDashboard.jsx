import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from "../../components/Modal";
import { Plus, Edit2, Trash2, Building, Loader2 } from "lucide-react";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("departments");
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [doctorForm, setDoctorForm] = useState({
    user_id: "",
    department_id: "",
    specialization: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, docRes] = await Promise.all([
        axios.get("http://localhost:5000/api/departments", config),
        axios.get("http://localhost:5000/api/doctors", config),
      ]);
      setDepartments(deptRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Department Modal
  const openDeptModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({ name: dept.name, description: dept.description || "" });
    } else {
      setEditingDept(null);
      setDeptForm({ name: "", description: "" });
    }
    setShowDeptModal(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDept) {
        await axios.put(
          `http://localhost:5000/api/departments/${editingDept.id}`,
          deptForm,
          config,
        );
        alert("✅ Department updated successfully!");
      } else {
        await axios.post(
          "http://localhost:5000/api/departments",
          deptForm,
          config,
        );
        alert("✅ Department created successfully!");
      }
      setShowDeptModal(false);
      fetchData();
    } catch (err) {
      alert(
        "❌ " + (err.response?.data?.message || "Failed to save department"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;
    try {
      await axios.delete(`http://localhost:5000/api/departments/${id}`, config);
      alert("✅ Department deleted");
      fetchData();
    } catch (err) {
      alert("❌ Cannot delete: Department has doctors assigned");
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post("http://localhost:5000/api/doctors", doctorForm, config);
      alert("✅ Doctor added successfully!");
      setShowDoctorModal(false);
      setDoctorForm({ user_id: "", department_id: "", specialization: "" });
      fetchData();
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Failed to add doctor"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <Building className="w-12 h-12 text-teal-600" />
            <div>
              <h1 className="text-4xl font-bold text-teal-900">
                Staff Management
              </h1>
              <p className="text-teal-600">Departments & Doctors</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl">
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-8">
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-10 py-4 font-semibold text-lg border-b-4 transition-all ${activeTab === "departments" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Departments
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`px-10 py-4 font-semibold text-lg border-b-4 transition-all ${activeTab === "doctors" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            Doctors
          </button>
        </div>

        {/* DEPARTMENTS TAB */}
        {activeTab === "departments" && (
          <div className="medical-card p-8">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                Departments ({departments.length})
              </h2>
              <button
                onClick={() => openDeptModal()}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-medium">
                <Plus size={20} /> New Department
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="pb-4 px-4 text-left">ID</th>
                    <th className="pb-4 px-4 text-left">Name</th>
                    <th className="pb-4 px-4 text-left">Description</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-teal-50">
                      <td className="py-5 px-4 font-medium">{dept.id}</td>
                      <td className="py-5 px-4 font-semibold">{dept.name}</td>
                      <td className="py-5 px-4 text-gray-600">
                        {dept.description || "—"}
                      </td>
                      <td className="py-5 px-4">
                        <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          Active
                        </span>
                      </td>
                      <td className="py-5 px-4 text-right flex gap-4 justify-end">
                        <button
                          onClick={() => openDeptModal(dept)}
                          className="text-teal-600 hover:text-teal-800 p-2">
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          className="text-red-600 hover:text-red-800 p-2">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* DOCTORS TAB */}
        {activeTab === "doctors" && (
          <div className="medical-card p-8">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                Doctors ({doctors.length})
              </h2>
              <button
                onClick={() => setShowDoctorModal(true)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-medium">
                <Plus size={20} /> Add Doctor
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-4 px-4 text-left">Doctor Name</th>
                  <th className="pb-4 px-4 text-left">Department</th>
                  <th className="pb-4 px-4 text-left">Specialization</th>
                  <th className="pb-4 px-4 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b hover:bg-teal-50">
                    <td className="py-5 px-4 font-semibold">
                      {doctor.User?.full_name}
                    </td>
                    <td className="py-5 px-4">{doctor.Department?.name}</td>
                    <td className="py-5 px-4 text-teal-700">
                      {doctor.specialization}
                    </td>
                    <td className="py-5 px-4 text-gray-600">
                      {doctor.User?.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? "Edit Department" : "New Department"}>
        <form onSubmit={handleDeptSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Department Name
            </label>
            <input
              type="text"
              value={deptForm.name}
              onChange={(e) =>
                setDeptForm({ ...deptForm, name: e.target.value })
              }
              className="w-full px-5 py-4 border rounded-2xl focus:border-teal-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={deptForm.description}
              onChange={(e) =>
                setDeptForm({ ...deptForm, description: e.target.value })
              }
              className="w-full px-5 py-4 border rounded-2xl h-28 focus:border-teal-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white py-4 rounded-2xl font-semibold">
            {submitting
              ? "Saving..."
              : editingDept
                ? "Update Department"
                : "Create Department"}
          </button>
        </form>
      </Modal>

      {/* Doctor Modal */}
      <Modal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        title="Add New Doctor">
        <form onSubmit={handleCreateDoctor} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <input
              type="number"
              value={doctorForm.user_id}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, user_id: e.target.value })
              }
              className="w-full px-5 py-4 border rounded-2xl focus:border-teal-600"
              placeholder="Enter User ID from registered doctor"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <select
              value={doctorForm.department_id}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, department_id: e.target.value })
              }
              className="w-full px-5 py-4 border rounded-2xl focus:border-teal-600"
              required>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={doctorForm.specialization}
              onChange={(e) =>
                setDoctorForm({ ...doctorForm, specialization: e.target.value })
              }
              className="w-full px-5 py-4 border rounded-2xl focus:border-teal-600"
              placeholder="e.g. Cardiologist"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white py-4 rounded-2xl font-semibold">
            {submitting ? "Adding..." : "Add Doctor"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
