import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LogOut,
  PlayCircle,
  Stethoscope,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeQueue, setActiveQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState("");
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const showDialog = (title, message, variant = "info") => {
    setDialog({ isOpen: true, title, message, variant });
  };

  const fetchDashboard = async () => {
    try {
      const [doctorRes, queueRes] = await Promise.all([
        api.get("/doctors/me"),
        api.get("/queue/doctor/me"),
      ]);

      setDoctorProfile(doctorRes.data);
      setQueue(queueRes.data.queue);
      setActiveQueue(queueRes.data.activeQueue);
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

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
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
                      Dr. {user.full_name}
                    </h2>
                    <p className="text-gray-600 mt-2">
                      {doctorProfile?.specialization || "General Practice"}
                      {" - "}
                      {doctorProfile?.Department?.name || "No department assigned"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-teal-100 p-4">
                    <Stethoscope className="w-8 h-8 text-teal-700" />
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
        onClose={() => setDialog((current) => ({ ...current, isOpen: false }))}
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
      />
    </div>
  );
}
