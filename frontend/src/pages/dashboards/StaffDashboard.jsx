import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellRing,
  Building,
  CalendarClock,
  CheckCircle2,
  Edit2,
  FileText,
  Loader,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import DashboardSectionMenu from "../../components/DashboardSectionMenu";
import Modal from "../../components/Modal";
import NotificationPanel from "../../components/NotificationPanel";
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
  const [doctorGroups, setDoctorGroups] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [doctorForm, setDoctorForm] = useState({
    user_id: "",
    department_id: "",
    specialization: "",
  });
  const [eligibleDoctorUsers, setEligibleDoctorUsers] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [walkInForm, setWalkInForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    doctor_id: "",
    department_id: "",
    blood_group: "",
    date_of_birth: "",
    allergies: "",
    chronic_conditions: "",
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    appointment_date: "",
    appointment_time: "",
  });
  const [transferForm, setTransferForm] = useState({
    doctor_id: "",
    department_id: "",
    transfer_reason: "",
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

  const staffSections = [
    ["queue", "Live Queue"],
    ["appointments", "Appointments"],
    ["reports", "Reports"],
    ["doctors", "Doctors"],
    ["departments", "Departments"],
  ];

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

  const fetchEligibleDoctorUsers = async () => {
    const res = await api.get("/doctors/eligible-users");
    setEligibleDoctorUsers(res.data.users || []);
  };

  const fetchQueueBoard = async () => {
    const res = await api.get("/queue/live");
    setQueues(res.data.queues);
    setAlerts(res.data.alerts);
    setDoctorGroups(res.data.doctorGroups || []);
  };

  const fetchAppointments = async () => {
    const res = await api.get("/appointments/staff");
    setAppointments(res.data.appointments || []);
  };

  const fetchReports = async () => {
    const [reportsRes, auditRes] = await Promise.all([
      api.get("/reports"),
      api.get("/audit-logs"),
    ]);
    setReports(reportsRes.data);
    setAuditLogs(auditRes.data.logs || []);
  };

  const fetchNotifications = async () => {
    const res = await api.get("/notifications");
    setNotifications(res.data.notifications || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchManagementData(),
        fetchQueueBoard(),
        fetchAppointments(),
        fetchReports(),
        fetchNotifications(),
      ]);
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
    const handleNotification = ({ notification }) => {
      if (notification) {
        setNotifications((current) => [notification, ...current].slice(0, 20));
      }
    };

    socket.on("queue:refresh", refresh);
    socket.on("staff:alert", handleAlert);
    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("queue:refresh", refresh);
      socket.off("staff:alert", handleAlert);
      socket.off("notification:new", handleNotification);
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

  const openDoctorModal = async () => {
    setDoctorForm({
      user_id: "",
      department_id: "",
      specialization: "",
    });
    setDoctorSearch("");

    try {
      await fetchEligibleDoctorUsers();
      setShowDoctorModal(true);
    } catch (err) {
      openDialog({
        title: "Doctor Accounts Unavailable",
        message:
          err.response?.data?.message ||
          "Could not load registered doctor accounts right now.",
        variant: "error",
      });
    }
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
      setDoctorSearch("");
      setEligibleDoctorUsers([]);
      await fetchManagementData();
      openDialog({
        title: "Doctor Added",
        message: "Doctor account assigned successfully.",
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
      await Promise.all([fetchQueueBoard(), fetchNotifications()]);
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
      await Promise.all([fetchQueueBoard(), fetchReports(), fetchNotifications()]);
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

  const handleReturnToWaiting = async (queueId) => {
    try {
      await api.post("/queue/return-to-waiting", { queue_id: queueId });
      await fetchQueueBoard();
      openDialog({
        title: "Returned To Waiting",
        message: "The patient has been returned to the waiting queue.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Return Failed",
        message: err.response?.data?.message || "Could not return this patient to waiting.",
        variant: "error",
      });
    }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/appointments/walk-in", {
        ...walkInForm,
        doctor_id: Number(walkInForm.doctor_id),
        department_id: Number(walkInForm.department_id),
      });
      setShowWalkInModal(false);
      setWalkInForm({
        full_name: "",
        phone: "",
        email: "",
        doctor_id: "",
        department_id: "",
        blood_group: "",
        date_of_birth: "",
        allergies: "",
        chronic_conditions: "",
      });
      await Promise.all([fetchQueueBoard(), fetchAppointments(), fetchReports()]);
      openDialog({
        title: "Walk-in Added",
        message: `Walk-in registered successfully. Temporary login email: ${res.data.temporary_credentials.email}`,
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Walk-in Failed",
        message: err.response?.data?.message || "Could not register walk-in patient.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openRescheduleModal = (appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleForm({
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time?.slice(0, 5) || "",
    });
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setSubmitting(true);
    try {
      await api.post(`/appointments/${selectedAppointment.id}/reschedule`, rescheduleForm);
      setShowRescheduleModal(false);
      await Promise.all([fetchAppointments(), fetchQueueBoard(), fetchReports()]);
      openDialog({
        title: "Appointment Rescheduled",
        message: "The appointment has been rescheduled successfully.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Reschedule Failed",
        message: err.response?.data?.message || "Could not reschedule the appointment.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkMissed = async (appointmentId) => {
    try {
      await api.post(`/appointments/${appointmentId}/miss`);
      await Promise.all([fetchAppointments(), fetchQueueBoard(), fetchReports()]);
      openDialog({
        title: "Appointment Marked Missed",
        message: "The appointment has been marked as missed.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Missed Action Failed",
        message: err.response?.data?.message || "Could not mark appointment as missed.",
        variant: "error",
      });
    }
  };

  const openTransferModal = (queue) => {
    setSelectedQueue(queue);
    setTransferForm({
      doctor_id: "",
      department_id: "",
      transfer_reason: "",
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQueue) return;
    setSubmitting(true);
    try {
      await api.post("/queue/transfer", {
        queue_id: selectedQueue.id,
        doctor_id: Number(transferForm.doctor_id),
        department_id: Number(transferForm.department_id),
        transfer_reason: transferForm.transfer_reason,
      });
      setShowTransferModal(false);
      await Promise.all([fetchQueueBoard(), fetchAppointments(), fetchReports()]);
      openDialog({
        title: "Queue Transferred",
        message: "The patient was reassigned successfully.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Transfer Failed",
        message: err.response?.data?.message || "Could not transfer the queue item.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
  };

  const filteredEligibleDoctorUsers = eligibleDoctorUsers.filter((account) => {
    const searchTerm = doctorSearch.trim().toLowerCase();

    if (!searchTerm) {
      return true;
    }

    const haystack = [
      account.full_name,
      account.email,
      account.phone,
      String(account.id),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm);
  });

  return (
    <div className="min-h-screen bg-teal-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Building className="h-10 w-10 text-teal-600 sm:h-12 sm:w-12" />
            <div>
              <h1 className="text-2xl font-bold text-teal-900 sm:text-4xl">
                Staff Operations
              </h1>
              <p className="mt-1 text-sm text-teal-600 sm:text-base">
                Manage the queue, departments, and doctor assignments
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-red-600 px-6 py-3 font-medium text-white transition-all hover:bg-red-700 sm:w-auto">
            Logout
          </button>
        </div>

        <DashboardSectionMenu
          title="Staff Menu"
          sections={staffSections.map(([value, label]) => ({ value, label }))}
          activeSection={activeTab}
          onSelect={setActiveTab}
        />

        <div className="mb-8 hidden flex-wrap gap-3 border-b md:flex">
          {staffSections.map(([value, label]) => (
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
              <div className="space-y-6 sm:space-y-8">
                <NotificationPanel
                  notifications={notifications}
                  title="Staff Notifications"
                  emptyMessage="No staff notifications right now."
                />

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="medical-card p-5 sm:p-8">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold sm:text-2xl">Doctor Alerts</h2>
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
                            <p className="text-base font-semibold text-amber-900 sm:text-lg">
                              Dr. {queue.Doctor?.User?.full_name} called Queue #{queue.queue_number}
                            </p>
                            <p className="text-amber-800 mt-1">
                              Patient: {queue.Patient?.full_name}
                            </p>
                            <button
                              onClick={() => handleConfirmAdmit(queue.id)}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 font-medium text-white hover:bg-teal-700 sm:w-auto sm:justify-start">
                              <CheckCircle2 size={18} /> Confirm Patient Sent In
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="medical-card p-5 sm:p-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold sm:text-2xl">Live Queue Board</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Real-time view of all active patient flow
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowWalkInModal(true)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto sm:justify-start sm:py-2">
                          <Plus size={16} /> Add Walk-in
                        </button>
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
                            className="flex flex-col gap-5 rounded-3xl border border-gray-200 p-5 xl:flex-row xl:items-center xl:justify-between">
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
                              <p className="mt-2 text-xs text-gray-500">
                                Waiting: {queue.waiting_duration_minutes || 0} mins
                                {queue.status === "called"
                                  ? ` | Called for ${queue.called_duration_minutes || 0} mins`
                                  : ""}
                              </p>
                              {queue.attention_state !== "normal" && (
                                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                  <TriangleAlert size={14} />
                                  {queue.attention_state === "long_wait"
                                    ? "Longest waiting attention"
                                    : "Overdue to admit"}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                              <span
                                className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${
                                  queueStatusStyles[queue.status]
                                }`}>
                                {formatQueueStatus(queue.status)}
                              </span>
                              {queue.status === "called" && (
                                <>
                                  <button
                                    onClick={() => handleConfirmAdmit(queue.id)}
                                    className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto sm:py-2">
                                    Confirm Admit
                                  </button>
                                  <button
                                    onClick={() => handleReturnToWaiting(queue.id)}
                                    className="w-full rounded-2xl bg-slate-600 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 sm:w-auto sm:py-2">
                                    Return To Waiting
                                  </button>
                                </>
                              )}
                              {["waiting", "called", "admitted"].includes(queue.status) && (
                                <button
                                  onClick={() => openTransferModal(queue)}
                                  className="w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-50 sm:w-auto sm:py-2">
                                  Transfer
                                </button>
                              )}
                              {["admitted", "in_consultation"].includes(queue.status) && (
                                <button
                                  onClick={() => handleComplete(queue.id)}
                                  className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 sm:w-auto sm:py-2">
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

                {doctorGroups.length > 0 && (
                  <div className="medical-card p-5 sm:p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <BellRing className="text-teal-600" />
                      <div>
                        <h2 className="text-xl font-semibold sm:text-2xl">Waiting Room by Doctor</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Queue grouping to help reception coordinate flow faster
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {doctorGroups.map((group) => (
                        <div key={group.doctor_id} className="rounded-3xl border border-gray-200 p-5">
                          <p className="font-semibold text-teal-900">
                            Dr. {group.doctor_name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {group.department_name}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {group.queues.map((item) => (
                              <span
                                key={item.id}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium ${queueStatusStyles[item.status]}`}
                              >
                                #{item.queue_number} {item.Patient?.full_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="medical-card p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold sm:text-2xl">Appointments</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage walk-ins, reschedules, and missed appointments
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWalkInModal(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 font-medium text-white hover:bg-teal-700 sm:w-auto sm:justify-start">
                    <Plus size={18} /> New Walk-in
                  </button>
                </div>

                {appointments.length === 0 ? (
                  <p className="py-12 text-center text-gray-500">
                    No active appointments to manage right now.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-3xl border border-gray-200 p-5 sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-lg font-semibold">
                              {appointment.Patient?.full_name}
                            </p>
                            <p className="mt-1 text-gray-600">
                              Dr. {appointment.Doctor?.User?.full_name} - {appointment.Department?.name}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              {appointment.appointment_date} at{" "}
                              {appointment.appointment_time?.slice(0, 5)}
                              {appointment.walk_in ? " | Walk-in" : ""}
                            </p>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <span
                              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${
                                queueStatusStyles[appointment.status] || "bg-slate-100 text-slate-700"
                              }`}>
                              {formatQueueStatus(appointment.status)}
                            </span>
                            <button
                              onClick={() => openRescheduleModal(appointment)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-50 sm:w-auto sm:justify-start sm:py-2">
                              <CalendarClock size={16} /> Reschedule
                            </button>
                            <button
                              onClick={() => handleMarkMissed(appointment.id)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 sm:w-auto sm:justify-start sm:py-2">
                              <TriangleAlert size={16} /> Mark Missed
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "departments" && (
              <div className="medical-card p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold sm:text-2xl">
                    All Departments ({departments.length})
                  </h2>
                  <button
                    onClick={() => openDeptModal()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 font-medium text-white transition-all hover:bg-teal-700 sm:w-auto">
                    <Plus size={20} /> New Department
                  </button>
                </div>

                <div className="space-y-4 md:hidden">
                  {departments.map((dept) => (
                    <div key={dept.id} className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Department #{dept.id}</p>
                          <p className="mt-1 text-lg font-semibold text-teal-900">{dept.name}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700">
                          {dept.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-gray-600">
                        {dept.description || "No description"}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => openDeptModal(dept)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-50">
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700">
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
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
              <div className="medical-card p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold sm:text-2xl">
                    All Doctors ({doctors.length})
                  </h2>
                  <button
                    onClick={openDoctorModal}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 font-medium text-white transition-all hover:bg-teal-700 sm:w-auto">
                    <UserRoundPlus size={20} /> Add New Doctor
                  </button>
                </div>

                <div className="space-y-4 md:hidden">
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="rounded-3xl border border-gray-200 p-5">
                      <p className="text-lg font-semibold text-teal-900">
                        {doctor.User?.full_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {doctor.Department?.name}
                      </p>
                      <p className="mt-3 text-sm text-teal-700">
                        {doctor.specialization}
                      </p>
                      <p className="mt-3 text-sm text-gray-600">
                        {doctor.User?.email || "No email"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {doctor.User?.phone || "No phone"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
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

            {activeTab === "reports" && (
              <div className="space-y-8">
                <div className="medical-card p-5 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <FileText className="text-teal-600" />
                    <div>
                      <h2 className="text-xl font-semibold sm:text-2xl">Operational Reports</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Daily operations metrics for staff and admin review
                      </p>
                    </div>
                  </div>

                  {reports && (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["Patients Seen", reports.metrics?.patients_seen],
                        ["Missed", reports.metrics?.missed_appointments],
                        ["Rescheduled", reports.metrics?.rescheduled_appointments],
                        ["Walk-ins", reports.metrics?.walk_in_volume],
                        ["Booked", reports.metrics?.booked_volume],
                        ["Avg Wait", `${reports.metrics?.average_wait_minutes || 0} mins`],
                        [
                          "Avg Consultation",
                          `${reports.metrics?.average_consultation_minutes || 0} mins`,
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-3xl bg-slate-50 p-5">
                          <p className="text-sm text-gray-500">{label}</p>
                          <p className="mt-2 text-2xl font-bold text-teal-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="medical-card p-5 sm:p-8">
                    <h3 className="text-xl font-semibold">Busiest Doctors</h3>
                    <div className="mt-4 space-y-3">
                      {(reports?.busiestDoctors || []).map((item) => (
                        <div key={item.doctor_id} className="rounded-2xl bg-slate-50 px-4 py-4">
                          <p className="font-semibold text-teal-900">
                            Dr. {item.Doctor?.User?.full_name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Completed: {item.dataValues?.completed_count || item.completed_count}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="medical-card p-5 sm:p-8">
                    <h3 className="text-xl font-semibold">Busiest Departments</h3>
                    <div className="mt-4 space-y-3">
                      {(reports?.busiestDepartments || []).map((item) => (
                        <div key={item.department_id} className="rounded-2xl bg-slate-50 px-4 py-4">
                          <p className="font-semibold text-teal-900">
                            {item.Department?.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Completed: {item.dataValues?.completed_count || item.completed_count}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="medical-card p-5 sm:p-8">
                  <h3 className="text-xl font-semibold">Recent Audit Activity</h3>
                  <div className="mt-4 space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-gray-200 px-4 py-4">
                        <p className="font-semibold text-teal-900">{log.action_type}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Actor: {log.Actor?.full_name || "System"} | Target: {log.target_type}
                          {log.target_id ? ` #${log.target_id}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
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
        onClose={() => {
          setShowDoctorModal(false);
          setDoctorSearch("");
        }}
        title="Assign Registered Doctor">
        <form onSubmit={handleCreateDoctor} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Doctor Account
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-teal-500" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 py-4 pl-12 pr-5 focus:border-teal-600 focus:outline-none"
                placeholder="Search by name, email, phone, or ID"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select a registered doctor account. The doctor must register first.
            </p>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-3xl border border-gray-200 bg-slate-50 p-3">
              {eligibleDoctorUsers.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-600">
                  No eligible doctor accounts are available yet. Ask the doctor to register first.
                </div>
              ) : filteredEligibleDoctorUsers.length === 0 ? (
                <div className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-600">
                  No registered doctor account matches your search.
                </div>
              ) : (
                filteredEligibleDoctorUsers.map((account) => {
                  const isSelected = doctorForm.user_id === String(account.id);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() =>
                        setDoctorForm((current) => ({
                          ...current,
                          user_id: String(account.id),
                        }))
                      }
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                        isSelected
                          ? "border-teal-600 bg-teal-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-teal-400 hover:bg-teal-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-teal-900">
                            {account.full_name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">{account.email}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {account.phone || "No phone added"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          ID {account.id}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
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
            disabled={submitting || !doctorForm.user_id}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-4 rounded-2xl font-semibold text-lg transition-all">
            {submitting ? "Assigning Doctor..." : "Assign Doctor"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        title="Register Walk-in Patient"
        maxWidthClass="max-w-3xl">
        <form onSubmit={handleWalkInSubmit} className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={walkInForm.full_name}
              onChange={(e) =>
                setWalkInForm((current) => ({ ...current, full_name: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={walkInForm.phone}
              onChange={(e) =>
                setWalkInForm((current) => ({ ...current, phone: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email (Optional)</label>
            <input
              type="email"
              value={walkInForm.email}
              onChange={(e) =>
                setWalkInForm((current) => ({ ...current, email: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              value={walkInForm.date_of_birth}
              onChange={(e) =>
                setWalkInForm((current) => ({
                  ...current,
                  date_of_birth: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Department</label>
            <select
              value={walkInForm.department_id}
              onChange={(e) =>
                setWalkInForm((current) => ({
                  ...current,
                  department_id: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Doctor</label>
            <select
              value={walkInForm.doctor_id}
              onChange={(e) =>
                setWalkInForm((current) => ({ ...current, doctor_id: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required>
              <option value="">Select Doctor</option>
              {doctors
                .filter((doctor) =>
                  walkInForm.department_id
                    ? String(doctor.Department?.id) === String(walkInForm.department_id)
                    : true,
                )
                .map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.User?.full_name} - {doctor.specialization}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Blood Group</label>
            <input
              type="text"
              value={walkInForm.blood_group}
              onChange={(e) =>
                setWalkInForm((current) => ({
                  ...current,
                  blood_group: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">Allergies</label>
            <textarea
              value={walkInForm.allergies}
              onChange={(e) =>
                setWalkInForm((current) => ({ ...current, allergies: e.target.value }))
              }
              className="h-24 w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Chronic Conditions
            </label>
            <textarea
              value={walkInForm.chronic_conditions}
              onChange={(e) =>
                setWalkInForm((current) => ({
                  ...current,
                  chronic_conditions: e.target.value,
                }))
              }
              className="h-24 w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-teal-600 py-4 text-lg font-semibold text-white hover:bg-teal-700 disabled:bg-teal-400">
              {submitting ? "Registering Walk-in..." : "Register Walk-in"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment">
        <form onSubmit={handleRescheduleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Appointment Date
            </label>
            <input
              type="date"
              value={rescheduleForm.appointment_date}
              onChange={(e) =>
                setRescheduleForm((current) => ({
                  ...current,
                  appointment_date: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Appointment Time
            </label>
            <input
              type="time"
              step="900"
              value={rescheduleForm.appointment_time}
              onChange={(e) =>
                setRescheduleForm((current) => ({
                  ...current,
                  appointment_time: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-teal-600 py-4 text-lg font-semibold text-white hover:bg-teal-700 disabled:bg-teal-400">
            {submitting ? "Rescheduling..." : "Save New Appointment Time"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Queue Patient">
        <form onSubmit={handleTransferSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Department</label>
            <select
              value={transferForm.department_id}
              onChange={(e) =>
                setTransferForm((current) => ({
                  ...current,
                  department_id: e.target.value,
                  doctor_id: "",
                }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
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
            <label className="mb-2 block text-sm font-medium text-gray-700">Doctor</label>
            <select
              value={transferForm.doctor_id}
              onChange={(e) =>
                setTransferForm((current) => ({ ...current, doctor_id: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
              required>
              <option value="">Select Doctor</option>
              {doctors
                .filter((doctor) =>
                  transferForm.department_id
                    ? String(doctor.Department?.id) === String(transferForm.department_id)
                    : true,
                )
                .map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.User?.full_name} - {doctor.specialization}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Transfer Reason
            </label>
            <textarea
              value={transferForm.transfer_reason}
              onChange={(e) =>
                setTransferForm((current) => ({
                  ...current,
                  transfer_reason: e.target.value,
                }))
              }
              className="h-24 w-full rounded-2xl border border-gray-300 px-5 py-4 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-teal-600 py-4 text-lg font-semibold text-white hover:bg-teal-700 disabled:bg-teal-400">
            {submitting ? "Transferring..." : "Transfer Patient"}
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
