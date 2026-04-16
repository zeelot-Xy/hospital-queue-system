import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  Building,
  CheckCircle2,
  Edit2,
  Loader,
  Plus,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("queue");
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [queues, setQueues] = useState([]);
  const [alerts, setAlerts] = useState([]);
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
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    confirmText: "OK",
    cancelText: undefined,
    onConfirm: null,
  });

  const openDialog = ({
    title,
    message,
    variant = "info",
    confirmText = "OK",
    cancelText,
    onConfirm = null,
  }) => {
    setDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  const closeDialog = () => {
    setDialog((current) => ({ ...current, isOpen: false, onConfirm: null }));
  };

  const fetchManagementData = async () => {
    const [deptRes, docRes] = await Promise.all([
      api.get("/departments"),
      api.get("/doctors"),
    ]);
    setDepartments(deptRes.data);
    setDoctors(docRes.data);
  };

  const fetchQueueBoard = async () => {
    const res = await api.get("/queue/live");
    setQueues(res.data.queues);
    setAlerts(res.data.alerts);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchManagementData(), fetchQueueBoard()]);
    } catch (err) {
      console.error(err);
      openDialog({
        title: "Dashboard Unavailable",
        message: err.response?.data?.message || "Failed to load dashboard data",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const refresh = () => fetchQueueBoard();
    const handleAlert = (payload) => {
      setAlerts((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.id !== payload.queue?.id,
        );
        return payload.queue ? [payload.queue, ...withoutDuplicate] : current;
      });
    };

    socket.on("queue:refresh", refresh);
    socket.on("staff:alert", handleAlert);

    return () => {
      socket.off("queue:refresh", refresh);
      socket.off("staff:alert", handleAlert);
    };
  }, []);

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
        await api.put(`/departments/${editingDept.id}`, deptForm);
      } else {
        await api.post("/departments", deptForm);
      }
      setShowDeptModal(false);
      await fetchManagementData();
      openDialog({
        title: "Department Saved",
        message: editingDept
          ? "Department updated successfully."
          : "Department created successfully.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Department Error",
        message: err.response?.data?.message || "Department operation failed",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    openDialog({
      title: "Delete Department",
      message: "Delete this department? This cannot be undone.",
      variant: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await api.delete(`/departments/${id}`);
          await fetchManagementData();
          openDialog({
            title: "Department Deleted",
            message: "The department has been removed.",
            variant: "success",
          });
        } catch (err) {
          openDialog({
            title: "Delete Failed",
            message:
              err.response?.data?.message || "Cannot delete this department",
            variant: "error",
          });
        }
      },
    });
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/doctors", {
        user_id: Number(doctorForm.user_id),
        department_id: Number(doctorForm.department_id),
        specialization: doctorForm.specialization,
      });
      setShowDoctorModal(false);
      setDoctorForm({ user_id: "", department_id: "", specialization: "" });
      await fetchManagementData();
      openDialog({
        title: "Doctor Added",
        message: "Doctor added successfully.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Doctor Could Not Be Added",
        message: err.response?.data?.message || "Failed to add doctor",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAdmit = async (queueId) => {
    try {
      await api.post("/queue/confirm-admit", { queue_id: queueId });
      await fetchQueueBoard();
      openDialog({
        title: "Patient Admitted",
        message: "The patient has been marked as admitted.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Admission Failed",
        message: err.response?.data?.message || "Could not confirm admission",
        variant: "error",
      });
    }
  };

  const handleComplete = async (queueId) => {
    try {
      await api.post("/queue/complete", { queue_id: queueId });
      await fetchQueueBoard();
      openDialog({
        title: "Queue Completed",
        message: "The queue item has been completed.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Completion Failed",
        message: err.response?.data?.message || "Could not complete queue item",
        variant: "error",
      });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-10">
          <div className="flex items-center gap-4">
            <Building className="w-12 h-12 text-teal-600" />
            <div>
              <h1 className="text-4xl font-bold text-teal-900">
                Staff Operations
              </h1>
              <p className="text-teal-600 mt-1">
                Manage the queue, departments, and doctor assignments
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-medium transition-all">
            Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-3 border-b mb-8">
          {[
            ["queue", "Live Queue"],
            ["departments", "Departments"],
            ["doctors", "Doctors"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`px-8 py-4 font-semibold text-lg transition-all border-b-4 ${
                activeTab === value
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="medical-card p-10 flex justify-center">
            <Loader className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {activeTab === "queue" && (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="medical-card p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold">Doctor Alerts</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Pending requests from doctors to send the next patient in
                        </p>
                      </div>
                      <BellRing className="w-7 h-7 text-amber-500" />
                    </div>

                    {alerts.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 px-5 py-6 text-gray-500">
                        No pending doctor calls right now.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {alerts.map((queue) => (
                          <div
                            key={queue.id}
                            className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                            <p className="font-semibold text-lg text-amber-900">
                              Dr. {queue.Doctor?.User?.full_name} called Queue #{queue.queue_number}
                            </p>
                            <p className="text-amber-800 mt-1">
                              Patient: {queue.Patient?.full_name}
                            </p>
                            <button
                              onClick={() => handleConfirmAdmit(queue.id)}
                              className="mt-4 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-medium">
                              <CheckCircle2 size={18} /> Confirm Patient Sent In
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="medical-card p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold">Live Queue Board</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Real-time view of all active patient flow
                        </p>
                      </div>
                    </div>

                    {queues.length === 0 ? (
                      <p className="text-center py-12 text-gray-500">
                        No active queues at the moment.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {queues.map((queue) => (
                          <div
                            key={queue.id}
                            className="rounded-3xl border border-gray-200 p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                            <div>
                              <p className="font-semibold text-lg">
                                Queue #{queue.queue_number}: {queue.Patient?.full_name}
                              </p>
                              <p className="text-gray-600">
                                Dr. {queue.Doctor?.User?.full_name} - {queue.Department?.name}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Appointment: {queue.Appointment?.appointment_date} at{" "}
                                {queue.Appointment?.appointment_time?.slice(0, 5)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              <span
                                className={`px-4 py-2 rounded-full text-sm font-medium ${
                                  queueStatusStyles[queue.status]
                                }`}>
                                {formatQueueStatus(queue.status)}
                              </span>
                              {queue.status === "called" && (
                                <button
                                  onClick={() => handleConfirmAdmit(queue.id)}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-2xl text-sm font-medium">
                                  Confirm Admit
                                </button>
                              )}
                              {["admitted", "in_consultation"].includes(queue.status) && (
                                <button
                                  onClick={() => handleComplete(queue.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-2xl text-sm font-medium">
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "departments" && (
              <div className="medical-card p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">
                    All Departments ({departments.length})
                  </h2>
                  <button
                    onClick={() => openDeptModal()}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-medium transition-all">
                    <Plus size={20} /> New Department
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-gray-600 font-medium">
                        <th className="pb-4 px-4">ID</th>
                        <th className="pb-4 px-4">Department Name</th>
                        <th className="pb-4 px-4">Description</th>
                        <th className="pb-4 px-4">Status</th>
                        <th className="pb-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.id} className="border-b hover:bg-teal-50">
                          <td className="py-6 px-4 font-medium">{dept.id}</td>
                          <td className="py-6 px-4 font-semibold text-teal-900">
                            {dept.name}
                          </td>
                          <td className="py-6 px-4 text-gray-600">
                            {dept.description || "No description"}
                          </td>
                          <td className="py-6 px-4">
                            <span className="px-5 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              {dept.status}
                            </span>
                          </td>
                          <td className="py-6 px-4 text-right space-x-4">
                            <button
                              onClick={() => openDeptModal(dept)}
                              className="text-teal-600 hover:text-teal-700 transition">
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept.id)}
                              className="text-red-600 hover:text-red-700 transition">
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "doctors" && (
              <div className="medical-card p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">
                    All Doctors ({doctors.length})
                  </h2>
                  <button
                    onClick={() => setShowDoctorModal(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-medium transition-all">
                    <UserRoundPlus size={20} /> Add New Doctor
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-gray-600 font-medium">
                        <th className="pb-4 px-4">Doctor Name</th>
                        <th className="pb-4 px-4">Department</th>
                        <th className="pb-4 px-4">Specialization</th>
                        <th className="pb-4 px-4">Email</th>
                        <th className="pb-4 px-4">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor.id} className="border-b hover:bg-teal-50">
                          <td className="py-6 px-4 font-semibold">
                            {doctor.User?.full_name}
                          </td>
                          <td className="py-6 px-4">{doctor.Department?.name}</td>
                          <td className="py-6 px-4 text-teal-700">
                            {doctor.specialization}
                          </td>
                          <td className="py-6 px-4 text-gray-600">
                            {doctor.User?.email}
                          </td>
                          <td className="py-6 px-4 text-gray-600">
                            {doctor.User?.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? "Edit Department" : "Create New Department"}>
        <form onSubmit={handleDeptSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Name
            </label>
            <input
              type="text"
              value={deptForm.name}
              onChange={(e) =>
                setDeptForm((current) => ({ ...current, name: e.target.value }))
              }
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              placeholder="Cardiology"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={deptForm.description}
              onChange={(e) =>
                setDeptForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 h-28"
              placeholder="Specialized care description"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-4 rounded-2xl font-semibold text-lg transition-all">
            {submitting ? "Saving..." : editingDept ? "Update Department" : "Create Department"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        title="Add New Doctor">
        <form onSubmit={handleCreateDoctor} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="number"
              value={doctorForm.user_id}
              onChange={(e) =>
                setDoctorForm((current) => ({ ...current, user_id: e.target.value }))
              }
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              placeholder="Enter registered doctor user ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={doctorForm.department_id}
              onChange={(e) =>
                setDoctorForm((current) => ({
                  ...current,
                  department_id: e.target.value,
                }))
              }
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              required>
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={doctorForm.specialization}
              onChange={(e) =>
                setDoctorForm((current) => ({
                  ...current,
                  specialization: e.target.value,
                }))
              }
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              placeholder="Cardiologist"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-4 rounded-2xl font-semibold text-lg transition-all">
            {submitting ? "Adding Doctor..." : "Add Doctor"}
          </button>
        </form>
      </Modal>

      <AlertDialog
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={dialog.onConfirm
          ? async () => {
              const action = dialog.onConfirm;
              closeDialog();
              await action();
            }
          : null}
      />
    </div>
  );
}
