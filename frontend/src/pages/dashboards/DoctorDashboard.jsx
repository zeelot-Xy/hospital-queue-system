import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  LogOut,
  PlayCircle,
  Plus,
  Repeat,
  Save,
  Stethoscope,
  Trash2,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import DashboardSectionMenu from "../../components/DashboardSectionMenu";
import Modal from "../../components/Modal";
import NotificationPanel from "../../components/NotificationPanel";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyConsultationForm = {
  presenting_complaint: "",
  findings: "",
  diagnosis: "",
  treatment_plan: "",
  follow_up_advice: "",
  note_summary: "",
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeQueue, setActiveQueue] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [availabilityRows, setAvailabilityRows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeMobileSection, setActiveMobileSection] = useState("consultation");
  const [hasInitializedMobileSection, setHasInitializedMobileSection] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);
  const [savingConsultationRecord, setSavingConsultationRecord] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [patientProfileRecord, setPatientProfileRecord] = useState(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [consultationForm, setConsultationForm] = useState(emptyConsultationForm);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    specialization: "",
    department_id: "",
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

  const showDialog = (
    title,
    message,
    variant = "info",
    options = {},
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      variant,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText,
      onConfirm: options.onConfirm || null,
    });
  };

  const fetchDashboard = async () => {
    try {
      const [
        doctorRes,
        queueRes,
        departmentRes,
        availabilityRes,
        notificationsRes,
      ] = await Promise.all([
        api.get("/doctors/me"),
        api.get("/queue/doctor/me"),
        api.get("/departments"),
        api.get("/availability/me"),
        api.get("/notifications"),
      ]);

      setDoctorProfile(doctorRes.data);
      setQueue(queueRes.data.queue);
      setActiveQueue(queueRes.data.activeQueue);
      setDepartments(
        departmentRes.data.filter((department) => department.status !== "inactive"),
      );
      setAvailabilityRows(availabilityRes.data.rows || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (err) {
      console.error(err);
      showDialog(
        "Dashboard Unavailable",
        err.response?.data?.message || "Failed to load doctor dashboard",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const openProfileModal = () => {
    if (!doctorProfile) {
      return;
    }

    setProfileError("");
    setProfileForm({
      full_name: doctorProfile.User?.full_name || "",
      phone: doctorProfile.User?.phone || "",
      specialization: doctorProfile.specialization || "",
      department_id: doctorProfile.Department?.id
        ? String(doctorProfile.Department.id)
        : "",
    });
    setShowProfileModal(true);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (hasInitializedMobileSection) {
      return;
    }

    if (activeQueue) {
      setActiveMobileSection("consultation");
      setHasInitializedMobileSection(true);
      return;
    }

    if (queue.length > 0) {
      setActiveMobileSection("queue");
      setHasInitializedMobileSection(true);
      return;
    }

    if (availabilityRows.length > 0 || departments.length > 0) {
      setActiveMobileSection("availability");
      setHasInitializedMobileSection(true);
    }
  }, [
    activeQueue,
    queue.length,
    availabilityRows.length,
    departments.length,
    hasInitializedMobileSection,
  ]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const refresh = () => fetchDashboard();
    const onNotification = ({ notification }) => {
      if (notification) {
        setNotifications((current) => [notification, ...current].slice(0, 20));
      }
    };
    socket.on("queue:refresh", refresh);
    socket.on("notification:new", onNotification);

    return () => {
      socket.off("queue:refresh", refresh);
      socket.off("notification:new", onNotification);
    };
  }, []);

  const runQueueAction = async (path, body, successMessage) => {
    setWorkingAction(path);
    try {
      const res = await api.post(path, body);
      fetchDashboard();
      if (successMessage) {
        showDialog("Action Completed", successMessage, "success");
      }
      return res.data;
    } catch (err) {
      showDialog(
        "Action Failed",
        err.response?.data?.message || "Action failed",
        "error",
      );
      return null;
    } finally {
      setWorkingAction("");
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");

    try {
      const res = await api.put("/doctors/me", {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        specialization: profileForm.specialization,
        department_id: Number(profileForm.department_id),
      });

      setDoctorProfile(res.data);
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          full_name: res.data.User?.full_name || user.full_name,
          phone: res.data.User?.phone || user.phone,
        }),
      );
      setShowProfileModal(false);
      showDialog(
        "Profile Updated",
        "Your doctor profile has been updated successfully.",
        "success",
      );
    } catch (err) {
      setProfileError(
        err.response?.data?.message || "Could not update your profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const openPatientProfileModal = async (queueItem) => {
    setLoadingPatientProfile(true);
    setShowPatientProfileModal(true);
    setSelectedQueueItem(queueItem);

    try {
      const [profileRes, consultationRes] = await Promise.all([
        api.get(`/patient-profile/patient/${queueItem.Patient?.id}`),
        api.get(`/consultations/queue/${queueItem.id}`),
      ]);
      setPatientProfileRecord(profileRes.data);
      setConsultationForm(
        consultationRes.data.record
          ? {
              presenting_complaint:
                consultationRes.data.record.presenting_complaint || "",
              findings: consultationRes.data.record.findings || "",
              diagnosis: consultationRes.data.record.diagnosis || "",
              treatment_plan: consultationRes.data.record.treatment_plan || "",
              follow_up_advice:
                consultationRes.data.record.follow_up_advice || "",
              note_summary: consultationRes.data.record.note_summary || "",
            }
          : emptyConsultationForm,
      );
    } catch (err) {
      setShowPatientProfileModal(false);
      showDialog(
        "Patient Profile Unavailable",
        err.response?.data?.message || "Could not load this patient profile.",
        "error",
      );
    } finally {
      setLoadingPatientProfile(false);
    }
  };

  const handleSaveConsultationRecord = async () => {
    if (!selectedQueueItem) {
      return;
    }

    setSavingConsultationRecord(true);

    try {
      await api.put(`/consultations/queue/${selectedQueueItem.id}`, consultationForm);
      const refreshed = await api.get(
        `/patient-profile/patient/${selectedQueueItem.Patient?.id}`,
      );
      setPatientProfileRecord(refreshed.data);
      showDialog(
        "Consultation Record Saved",
        "The structured consultation record has been updated.",
        "success",
      );
    } catch (err) {
      showDialog(
        "Save Failed",
        err.response?.data?.message || "Could not save the consultation record.",
        "error",
      );
    } finally {
      setSavingConsultationRecord(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
  };

  const handleDeleteAccount = () => {
    showDialog(
      "Delete Doctor Account",
      "This will permanently remove your doctor account, profile, appointments, and queue records. This action cannot be undone.",
      "error",
      {
        confirmText: "Delete Account",
        cancelText: "Keep Account",
        onConfirm: async () => {
          setDeletingAccount(true);

          try {
            await api.delete("/auth/me");
            setShowProfileModal(false);
            localStorage.clear();
            disconnectSocket();
            navigate("/login");
          } catch (err) {
            setProfileError(
              err.response?.data?.message || "Could not delete your account.",
            );
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    );
  };

  const waitingPatients = queue.filter((item) => item.status === "waiting");

  const updateAvailabilityRow = (index, field, value) => {
    setAvailabilityRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addAvailabilityRow = () => {
    setAvailabilityRows((current) => [
      ...current,
      {
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        slot_minutes: 30,
        is_active: true,
      },
    ]);
  };

  const removeAvailabilityRow = (index) => {
    setAvailabilityRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const res = await api.put("/availability/me", {
        rows: availabilityRows.map((row) => ({
          day_of_week: Number(row.day_of_week),
          start_time: row.start_time,
          end_time: row.end_time,
          slot_minutes: Number(row.slot_minutes) || 30,
          is_active: row.is_active !== false,
        })),
      });
      setAvailabilityRows(res.data.rows || []);
      showDialog("Availability Updated", "Your weekly availability has been saved.", "success");
    } catch (err) {
      showDialog(
        "Availability Error",
        err.response?.data?.message || "Could not save availability.",
        "error",
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  const getCallAgainLabel = (queueItem) => {
    if (queueItem?.can_call_again) {
      return "Call Again";
    }

    if (!queueItem?.call_again_available_at) {
      return "Call Again";
    }

    return `Available ${new Date(queueItem.call_again_available_at).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
  };

  const doctorSections = [
    { value: "consultation", label: "Current Consultation" },
    { value: "queue", label: "Queue Overview" },
    { value: "availability", label: "Weekly Availability" },
    { value: "alerts", label: "Notifications" },
  ];

  return (
    <div className="min-h-screen bg-teal-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-900 sm:text-4xl">
              Doctor Dashboard
            </h1>
            <p className="mt-1 text-sm text-teal-600 sm:text-base">
              Manage your consultation queue and call the next patient
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl bg-red-600 px-6 py-3 text-white hover:bg-red-700 sm:w-auto">
            <span className="inline-flex items-center gap-2">
              <LogOut size={18} /> Logout
            </span>
          </button>
        </div>

        <DashboardSectionMenu
          title="Doctor Menu"
          sections={doctorSections}
          activeSection={activeMobileSection}
          onSelect={setActiveMobileSection}
        />

        {loading ? (
          <div className="medical-card p-10 text-center text-gray-500">
            Loading queue data...
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-6">
            <div
              className={`gap-6 lg:grid-cols-[1.1fr_0.9fr] ${
                activeMobileSection === "consultation"
                  ? "grid"
                  : "hidden md:grid"
              }`}>
              <div className="medical-card p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-teal-600">
                      Doctor Profile
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-teal-900 sm:text-3xl">
                      Dr. {doctorProfile?.User?.full_name || user.full_name}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      {doctorProfile?.specialization || "General Practice"}
                      {" - "}
                      {doctorProfile?.Department?.name || "No department assigned"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="hidden rounded-2xl bg-teal-100 p-4 sm:block">
                      <Stethoscope className="w-8 h-8 text-teal-700" />
                    </div>
                    <button
                      type="button"
                      onClick={openProfileModal}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-teal-700 transition-all hover:border-teal-400 hover:bg-teal-50 sm:w-auto sm:justify-start sm:py-2">
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-gray-500">Waiting Patients</p>
                    <p className="text-3xl font-bold mt-2">{waitingPatients.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-gray-500">Active Patient</p>
                    <p className="text-3xl font-bold mt-2">
                      {activeQueue ? activeQueue.queue_number : 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="medical-card p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-teal-600">
                      Current Consultation
                    </p>
                    <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                      {activeQueue
                        ? activeQueue.Patient?.full_name
                        : "No active patient"}
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      runQueueAction(
                        "/queue/call-next",
                        {},
                        "Next patient has been called",
                      )
                    }
                    disabled={workingAction === "/queue/call-next"}
                    className="w-full rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:bg-teal-400 sm:w-auto">
                    Call Next Patient
                  </button>
                </div>

                {activeQueue ? (
                  <div className="mt-8 space-y-5">
                    <div className="rounded-2xl border border-gray-200 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Queue Number</p>
                          <p className="text-4xl font-bold text-teal-900">
                            {activeQueue.queue_number}
                          </p>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            queueStatusStyles[activeQueue.status]
                          }`}>
                          {formatQueueStatus(activeQueue.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-3">
                        Appointment: {activeQueue.Appointment?.appointment_date} at{" "}
                        {activeQueue.Appointment?.appointment_time?.slice(0, 5)}
                      </p>
                      {activeQueue.quick_summary && (
                        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-gray-700">
                          <p className="font-semibold text-teal-900">Quick Patient Snapshot</p>
                          <p className="mt-2">
                            Blood Group: {activeQueue.quick_summary.blood_group || "Not provided"}
                          </p>
                          <p className="mt-1">
                            Age: {activeQueue.quick_summary.age
                              ? `${activeQueue.quick_summary.age} years`
                              : "Not provided"}
                          </p>
                          <p className="mt-1">
                            Allergies: {activeQueue.quick_summary.allergies || "Not provided"}
                          </p>
                          <p className="mt-1">
                            Chronic Conditions: {activeQueue.quick_summary.chronic_conditions || "Not provided"}
                          </p>
                          <p className="mt-1">
                            Latest Summary: {activeQueue.quick_summary.last_visit_notes || "No previous summary"}
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openPatientProfileModal(activeQueue)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 transition-all hover:border-teal-400 sm:w-auto sm:justify-start sm:py-2">
                        <FileText size={16} /> View Patient Profile
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {activeQueue.status === "called" && (
                        <button
                          onClick={() =>
                            runQueueAction(
                              "/queue/call-again",
                              { queue_id: activeQueue.id },
                              "The patient has been called again",
                            )
                          }
                          disabled={
                            workingAction === "/queue/call-again" ||
                            !activeQueue.can_call_again
                          }
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white py-3 font-semibold">
                          <Repeat size={18} /> {getCallAgainLabel(activeQueue)}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          runQueueAction(
                            "/queue/start-consultation",
                            { queue_id: activeQueue.id },
                            "Consultation started",
                          )
                        }
                        disabled={
                          workingAction === "/queue/start-consultation" ||
                          activeQueue.status === "in_consultation"
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white py-3 font-semibold">
                        <PlayCircle size={18} /> Start Consultation
                      </button>
                      <button
                        onClick={() =>
                          runQueueAction(
                            "/queue/complete",
                            { queue_id: activeQueue.id },
                            "Consultation completed",
                          )
                        }
                        disabled={workingAction === "/queue/complete"}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 font-semibold">
                        <CheckCircle2 size={18} /> Complete Consultation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-gray-600">
                    No active patient yet. Use "Call Next Patient" when you are ready
                    to see the next person in your queue.
                  </div>
                )}
              </div>
            </div>

            <div
              className={`medical-card p-5 sm:p-8 ${
                activeMobileSection === "availability"
                  ? "block"
                  : "hidden md:block"
              }`}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold sm:text-2xl">Weekly Availability</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Patients can only book within these windows
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAvailabilityRow}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 sm:w-auto sm:justify-start sm:py-2">
                  <Plus size={16} /> Add Window
                </button>
              </div>

              {availabilityRows.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-5 py-5 text-sm text-gray-500">
                  No weekly availability has been configured yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {availabilityRows.map((row, index) => (
                    <div
                      key={`${row.id || "new"}-${index}`}
                      className="grid gap-3 rounded-3xl border border-gray-200 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_auto]">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          Day
                        </label>
                        <select
                          value={row.day_of_week}
                          onChange={(e) =>
                            updateAvailabilityRow(index, "day_of_week", Number(e.target.value))
                          }
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3">
                          {daysOfWeek.map((day, dayIndex) => (
                            <option key={day} value={dayIndex}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          Start
                        </label>
                        <input
                          type="time"
                          value={String(row.start_time).slice(0, 5)}
                          onChange={(e) => updateAvailabilityRow(index, "start_time", e.target.value)}
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          End
                        </label>
                        <input
                          type="time"
                          value={String(row.end_time).slice(0, 5)}
                          onChange={(e) => updateAvailabilityRow(index, "end_time", e.target.value)}
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          Slot Minutes
                        </label>
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={row.slot_minutes}
                          onChange={(e) =>
                            updateAvailabilityRow(index, "slot_minutes", e.target.value)
                          }
                          className="w-full rounded-2xl border border-gray-300 px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          Status
                        </label>
                        <label className="flex h-full items-center gap-2 rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={row.is_active !== false}
                            onChange={(e) =>
                              updateAvailabilityRow(index, "is_active", e.target.checked)
                            }
                          />
                          Active
                        </label>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 xl:hidden">
                          Remove
                        </label>
                        <button
                          type="button"
                          onClick={() => removeAvailabilityRow(index)}
                          className="w-full rounded-2xl bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100">
                          <span className="inline-flex items-center gap-2 xl:hidden">
                            <Trash2 size={16} /> Remove Window
                          </span>
                          <span className="hidden xl:inline">
                            <Trash2 size={18} />
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:bg-teal-400 sm:w-auto sm:justify-start">
                <Save size={18} />
                {savingAvailability ? "Saving..." : "Save Availability"}
              </button>
            </div>

            <div
              className={`medical-card p-5 sm:p-8 ${
                activeMobileSection === "queue" ? "block" : "hidden md:block"
              }`}>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold sm:text-2xl">Queue Overview</h2>
                <p className="text-sm text-gray-500">
                  Ordered automatically by queue number
                </p>
              </div>

              {queue.length === 0 ? (
                <p className="text-center py-14 text-gray-500">
                  There are no patients in your active queue right now.
                </p>
              ) : (
                <div className="space-y-4">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-5 rounded-3xl border border-gray-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold">
                          {item.queue_number}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {item.Patient?.full_name}
                          </p>
                          <p className="text-gray-600">
                            {item.Appointment?.appointment_date} at{" "}
                            {item.Appointment?.appointment_time?.slice(0, 5)}
                          </p>
                          {item.quick_summary && (
                            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-gray-700">
                              <p>
                                Blood Group: {item.quick_summary.blood_group || "Not provided"}
                              </p>
                              <p className="mt-1">
                                Allergies: {item.quick_summary.allergies || "Not provided"}
                              </p>
                              <p className="mt-1">
                                Summary: {item.quick_summary.last_visit_notes || "No previous summary"}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <span
                          className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium ${
                            queueStatusStyles[item.status]
                          }`}>
                          {formatQueueStatus(item.status)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPatientProfileModal(item)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-teal-700 transition-all hover:bg-teal-50 sm:w-auto sm:justify-start sm:py-2">
                          <FileText size={16} /> View Patient Profile
                        </button>
                        {item.status === "waiting" && (
                          <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                            <Clock3 size={16} /> Awaiting your next call
                          </span>
                        )}
                        {item.status === "called" && (
                          <>
                            <span className="inline-flex items-center gap-2 text-sm text-amber-700">
                              <ArrowRight size={16} /> Staff has been alerted
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                runQueueAction(
                                  "/queue/call-again",
                                  { queue_id: item.id },
                                  "The patient has been called again",
                                )
                              }
                              disabled={
                                workingAction === "/queue/call-again" ||
                                !item.can_call_again
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400 sm:w-auto sm:justify-start sm:py-2">
                              <Repeat size={16} /> {getCallAgainLabel(item)}
                            </button>
                          </>
                        )}
                        {item.status === "in_consultation" && (
                          <span className="inline-flex items-center gap-2 text-sm text-teal-700">
                            <Activity size={16} /> Consultation in progress
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>

              <div
                className={`space-y-6 ${
                  activeMobileSection === "alerts" ? "block" : "hidden md:block"
                }`}>
                <NotificationPanel
                  notifications={notifications}
                  title="Doctor Notifications"
                  emptyMessage="No doctor notifications right now."
                />

                <div className="medical-card p-6">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-6 w-6 text-teal-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-teal-900">
                        Scheduling Reminder
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Keep your weekly availability current so patients only book
                        real open slots.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        isOpen={dialog.isOpen}
        onClose={() =>
          setDialog((current) => ({
            ...current,
            isOpen: false,
            onConfirm: null,
          }))
        }
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={
          dialog.onConfirm
            ? async () => {
                const action = dialog.onConfirm;
                setDialog((current) => ({
                  ...current,
                  isOpen: false,
                  onConfirm: null,
                }));
                await action();
              }
            : null
        }
      />

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Doctor Profile">
        <form onSubmit={handleProfileSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) =>
                setProfileForm((current) => ({
                  ...current,
                  full_name: e.target.value,
                }))
              }
              className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((current) => ({
                  ...current,
                  phone: e.target.value,
                }))
              }
              className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <input
              type="text"
              value={profileForm.specialization}
              onChange={(e) =>
                setProfileForm((current) => ({
                  ...current,
                  specialization: e.target.value,
                }))
              }
              className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={profileForm.department_id}
              onChange={(e) =>
                setProfileForm((current) => ({
                  ...current,
                  department_id: e.target.value,
                }))
              }
              className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
              required>
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          {profileError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <button
            type="submit"
            disabled={savingProfile || deletingAccount}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-3.5 rounded-2xl font-semibold transition-all">
            {savingProfile ? "Saving Changes..." : "Save Profile Changes"}
          </button>

          <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-5">
            <p className="text-sm font-semibold text-red-800">Danger Zone</p>
            <p className="mt-2 text-sm text-red-700">
              Deleting your account will permanently remove your doctor profile,
              appointments, and queue history.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || savingProfile}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:bg-red-400">
              <Trash2 size={16} />
              {deletingAccount ? "Deleting Account..." : "Delete Account"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPatientProfileModal}
        onClose={() => setShowPatientProfileModal(false)}
        title={
          patientProfileRecord?.patient?.full_name
            ? `${patientProfileRecord.patient.full_name} Profile`
            : "Patient Profile"
        }
        maxWidthClass="max-w-4xl">
        {loadingPatientProfile ? (
          <div className="py-10 text-center text-gray-500">Loading patient profile...</div>
        ) : patientProfileRecord ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-5 py-4">
                <p className="text-sm text-gray-500">Blood Group</p>
                <p className="font-semibold text-lg mt-1">
                  {patientProfileRecord.profile?.blood_group || "Not provided"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4">
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold text-lg mt-1">
                  {patientProfileRecord.patient?.phone || "Not provided"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-5 py-4">
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-semibold text-lg mt-1">
                  {patientProfileRecord.profile?.age
                    ? `${patientProfileRecord.profile.age} years`
                    : "Not provided"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Allergies</p>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 min-h-[96px] text-gray-700">
                  {patientProfileRecord.profile?.allergies || "No allergy information provided."}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Chronic Conditions</p>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 min-h-[96px] text-gray-700">
                  {patientProfileRecord.profile?.chronic_conditions || "No chronic conditions recorded."}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-teal-900">
                Structured Consultation Record
              </h3>
              {!patientProfileRecord.can_edit_notes && (
                <p className="mb-4 mt-2 text-sm text-amber-700">
                  Notes become editable once the patient has been admitted, is in consultation, or has completed consultation.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["presenting_complaint", "Presenting Complaint"],
                  ["findings", "Findings"],
                  ["diagnosis", "Diagnosis"],
                  ["treatment_plan", "Treatment Plan"],
                  ["follow_up_advice", "Follow-up Advice"],
                  ["note_summary", "Note Summary"],
                ].map(([field, label]) => (
                  <div key={field} className={field === "note_summary" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label}
                    </label>
                    <textarea
                      value={consultationForm[field]}
                      onChange={(e) =>
                        setConsultationForm((current) => ({
                          ...current,
                          [field]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 h-28 disabled:bg-slate-100"
                      disabled={!patientProfileRecord.can_edit_notes}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveConsultationRecord}
                disabled={savingConsultationRecord || !patientProfileRecord.can_edit_notes}
                className="mt-5 w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-3.5 rounded-2xl font-semibold transition-all">
                {savingConsultationRecord ? "Saving Record..." : "Save Consultation Record"}
              </button>
            </div>

            <div className="rounded-3xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-teal-900">Recent Visit History</h3>
              {patientProfileRecord.consultationHistory?.length ? (
                <div className="mt-4 space-y-4">
                  {patientProfileRecord.consultationHistory.map((record) => (
                    <div key={record.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="font-semibold text-gray-800">
                        {record.Appointment?.appointment_date} at{" "}
                        {record.Appointment?.appointment_time?.slice(0, 5)}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {record.note_summary || "No summary saved for that visit."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  No previous consultation history is available yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            Patient profile details are not available right now.
          </div>
        )}
      </Modal>
    </div>
  );
}
