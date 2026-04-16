import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  LogOut,
  PlayCircle,
  Stethoscope,
  Trash2,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import Modal from "../../components/Modal";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeQueue, setActiveQueue] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showPatientProfileModal, setShowPatientProfileModal] = useState(false);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);
  const [savingPatientNotes, setSavingPatientNotes] = useState(false);
  const [patientProfileRecord, setPatientProfileRecord] = useState(null);
  const [patientNotesDraft, setPatientNotesDraft] = useState("");
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
      const [doctorRes, queueRes, departmentRes] = await Promise.all([
        api.get("/doctors/me"),
        api.get("/queue/doctor/me"),
        api.get("/departments"),
      ]);

      setDoctorProfile(doctorRes.data);
      setQueue(queueRes.data.queue);
      setActiveQueue(queueRes.data.activeQueue);
      setDepartments(
        departmentRes.data.filter((department) => department.status !== "inactive"),
      );
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
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const refresh = () => fetchDashboard();
    socket.on("queue:refresh", refresh);

    return () => {
      socket.off("queue:refresh", refresh);
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

  const openPatientProfileModal = async (patientId) => {
    setLoadingPatientProfile(true);
    setShowPatientProfileModal(true);

    try {
      const res = await api.get(`/patient-profile/patient/${patientId}`);
      setPatientProfileRecord(res.data);
      setPatientNotesDraft(res.data.profile?.last_visit_notes || "");
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

  const handleSavePatientNotes = async (patientId) => {
    setSavingPatientNotes(true);

    try {
      const res = await api.put(`/patient-profile/patient/${patientId}/notes`, {
        last_visit_notes: patientNotesDraft,
      });

      setPatientProfileRecord((current) => ({
        ...current,
        profile: {
          ...current.profile,
          last_visit_notes: res.data.last_visit_notes || "",
        },
      }));
      showDialog(
        "Visit Notes Saved",
        "The patient's latest consultation notes have been updated.",
        "success",
      );
    } catch (err) {
      showDialog(
        "Notes Save Failed",
        err.response?.data?.message || "Could not save visit notes.",
        "error",
      );
    } finally {
      setSavingPatientNotes(false);
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

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-teal-900">
              Doctor Dashboard
            </h1>
            <p className="text-teal-600 mt-1">
              Manage your consultation queue and call the next patient
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700">
            <span className="inline-flex items-center gap-2">
              <LogOut size={18} /> Logout
            </span>
          </button>
        </div>

        {loading ? (
          <div className="medical-card p-10 text-center text-gray-500">
            Loading queue data...
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="medical-card p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-teal-600">
                      Doctor Profile
                    </p>
                    <h2 className="text-3xl font-bold text-teal-900 mt-2">
                      Dr. {doctorProfile?.User?.full_name || user.full_name}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      {doctorProfile?.specialization || "General Practice"}
                      {" - "}
                      {doctorProfile?.Department?.name || "No department assigned"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="rounded-2xl bg-teal-100 p-4">
                      <Stethoscope className="w-8 h-8 text-teal-700" />
                    </div>
                    <button
                      type="button"
                      onClick={openProfileModal}
                      className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:border-teal-400 hover:bg-teal-50 transition-all">
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
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

              <div className="medical-card p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-teal-600">
                      Current Consultation
                    </p>
                    <h2 className="text-2xl font-semibold mt-2">
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
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-5 py-3 rounded-2xl font-semibold">
                    Call Next Patient
                  </button>
                </div>

                {activeQueue ? (
                  <div className="mt-8 space-y-5">
                    <div className="rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between gap-4">
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
                      <button
                        type="button"
                        onClick={() => openPatientProfileModal(activeQueue.Patient?.id)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:border-teal-400 transition-all">
                        <FileText size={16} /> View Patient Profile
                      </button>
                    </div>

                    <div className="grid gap-3">
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

            <div className="medical-card p-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-semibold">Queue Overview</h2>
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
                      className="rounded-3xl border border-gray-200 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
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
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            queueStatusStyles[item.status]
                          }`}>
                          {formatQueueStatus(item.status)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPatientProfileModal(item.Patient?.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-all">
                          <FileText size={16} /> View Patient Profile
                        </button>
                        {item.status === "waiting" && (
                          <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                            <Clock3 size={16} /> Awaiting your next call
                          </span>
                        )}
                        {item.status === "called" && (
                          <span className="inline-flex items-center gap-2 text-sm text-amber-700">
                            <ArrowRight size={16} /> Staff has been alerted
                          </span>
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
        maxWidthClass="max-w-2xl">
        {loadingPatientProfile ? (
          <div className="py-10 text-center text-gray-500">Loading patient profile...</div>
        ) : patientProfileRecord ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Visit Notes
              </label>
              {!patientProfileRecord.can_edit_notes && (
                <p className="mb-2 text-sm text-amber-700">
                  Notes become editable once the patient has been admitted, is in consultation, or has completed consultation.
                </p>
              )}
              <textarea
                value={patientNotesDraft}
                onChange={(e) => setPatientNotesDraft(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 h-32"
                placeholder="Add the latest consultation summary for this patient"
                disabled={!patientProfileRecord.can_edit_notes}
              />
            </div>

            <button
              type="button"
              onClick={() => handleSavePatientNotes(patientProfileRecord.patient?.id)}
              disabled={savingPatientNotes || !patientProfileRecord.can_edit_notes}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-3.5 rounded-2xl font-semibold transition-all">
              {savingPatientNotes ? "Saving Notes..." : "Save Last Visit Notes"}
            </button>
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
