import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock3,
  LogOut,
  Stethoscope,
  User,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

const initialBookingState = {
  doctor_id: "",
  appointment_date: "",
  appointment_time: "",
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("book");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [currentQueue, setCurrentQueue] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookingForm, setBookingForm] = useState(initialBookingState);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    confirmText: "OK",
    cancelText: undefined,
    onConfirm: null,
  });

  const today = new Date().toISOString().split("T")[0];

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

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctors = async (deptId) => {
    setLoadingDoctors(true);
    try {
      const res = await api.get(`/appointments/available-doctors?department_id=${deptId}`);
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      openDialog({
        title: "Doctors Unavailable",
        message: "We could not load doctors for this department right now.",
        variant: "error",
      });
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const res = await api.get("/appointments/mine");
      setMyAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const res = await api.get("/queue/me");
      setCurrentQueue(res.data.queue);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchMyAppointments();
    fetchQueueStatus();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const refresh = () => {
      fetchMyAppointments();
      fetchQueueStatus();
    };

    socket.on("queue:refresh", refresh);

    return () => {
      socket.off("queue:refresh", refresh);
    };
  }, []);

  const handleDeptSelect = (dept) => {
    setSelectedDept(dept);
    setDoctors([]);
    setBookingForm(initialBookingState);
    fetchDoctors(dept.id);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    if (!selectedDept || !bookingForm.doctor_id) {
      openDialog({
        title: "Complete Your Selection",
        message: "Please choose both a department and a doctor before booking.",
        variant: "warning",
      });
      return;
    }

    setSubmittingBooking(true);
    try {
      await api.post("/appointments/book", {
        doctor_id: Number(bookingForm.doctor_id),
        department_id: selectedDept.id,
        appointment_date: bookingForm.appointment_date,
        appointment_time: `${bookingForm.appointment_time}:00`,
      });

      openDialog({
        title: "Appointment Booked",
        message: "Your appointment has been scheduled successfully.",
        variant: "success",
      });
      setBookingForm(initialBookingState);
      fetchMyAppointments();
      setActiveTab("appointments");
    } catch (err) {
      openDialog({
        title: "Booking Failed",
        message: err.response?.data?.message || "Booking failed. Please try again.",
        variant: "error",
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleMarkArrived = async (appointment) => {
    openDialog({
      title: "Confirm Arrival",
      message: `Mark yourself as arrived for ${appointment.appointment_date}? This will place you into the live queue.`,
      variant: "info",
      confirmText: "Yes, Join Queue",
      cancelText: "Not Yet",
      onConfirm: async () => {
        try {
          await api.post("/queue/arrived", {
            appointment_id: appointment.id,
          });
          fetchMyAppointments();
          fetchQueueStatus();
          setActiveTab("queue");
          openDialog({
            title: "Queue Joined",
            message: "You have successfully joined the queue.",
            variant: "success",
          });
        } catch (err) {
          openDialog({
            title: "Could Not Join Queue",
            message:
              err.response?.data?.message ||
              "Cannot mark as arrived at this time.",
            variant: "error",
          });
        }
      },
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-teal-900">
              Welcome, {user.full_name}
            </h1>
            <p className="text-teal-600 mt-1">
              Book appointments and follow your queue status in real time
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-medium">
            <LogOut size={20} /> Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-3 border-b mb-8">
          {[
            ["book", "Book Appointment"],
            ["appointments", "My Appointments"],
            ["queue", "Queue Status"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setActiveTab(value);
                if (value === "appointments") fetchMyAppointments();
                if (value === "queue") fetchQueueStatus();
              }}
              className={`px-6 py-4 font-semibold text-lg border-b-4 transition-all ${
                activeTab === value
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "book" && (
          <div className="space-y-8">
            <div className="medical-card p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Calendar className="text-teal-600" /> Select Department
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleDeptSelect(dept)}
                    className={`text-left border-2 rounded-3xl p-6 transition-all hover:shadow-md ${
                      selectedDept?.id === dept.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-teal-500"
                    }`}>
                    <h3 className="font-semibold text-xl text-teal-900">
                      {dept.name}
                    </h3>
                    <p className="text-gray-600 mt-3">
                      {dept.description || "No description available"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedDept && (
              <div className="medical-card p-8">
                <h2 className="text-2xl font-semibold mb-6">
                  Book in <span className="text-teal-600">{selectedDept.name}</span>
                </h2>

                {loadingDoctors ? (
                  <p className="text-center py-12 text-gray-500">Loading doctors...</p>
                ) : doctors.length === 0 ? (
                  <p className="text-center py-12 text-gray-500">
                    No doctors are available in this department yet.
                  </p>
                ) : (
                  <form onSubmit={handleBookAppointment} className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {doctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() =>
                            setBookingForm((current) => ({
                              ...current,
                              doctor_id: String(doctor.id),
                            }))
                          }
                          className={`border rounded-3xl p-6 text-left transition-all ${
                            bookingForm.doctor_id === String(doctor.id)
                              ? "border-teal-600 bg-teal-50 shadow"
                              : "border-gray-200 hover:border-teal-500"
                          }`}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center">
                              <User className="w-8 h-8 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">
                                Dr. {doctor.User.full_name}
                              </p>
                              <p className="text-teal-700">
                                {doctor.specialization || "General Practitioner"}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{doctor.User.email}</p>
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-4 w-5 h-5 text-teal-500" />
                        <input
                          type="date"
                          min={today}
                          value={bookingForm.appointment_date}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              appointment_date: e.target.value,
                            }))
                          }
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-300 bg-slate-50 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
                          required
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Choose your preferred consultation date from today onward.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Appointment Time
                      </label>
                      <div className="relative">
                        <Clock3 className="absolute left-4 top-4 w-5 h-5 text-teal-500" />
                        <input
                          type="time"
                          step="900"
                          value={bookingForm.appointment_time}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              appointment_time: e.target.value,
                            }))
                          }
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-300 bg-slate-50 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
                          required
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Time selections use 15-minute intervals for cleaner scheduling.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={submittingBooking}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-4 rounded-2xl font-semibold transition-all">
                        {submittingBooking ? "Booking..." : "Book Appointment"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="medical-card p-8">
            <h2 className="text-2xl font-semibold mb-6">My Appointments</h2>

            {myAppointments.length === 0 ? (
              <p className="text-center py-16 text-gray-500">
                You do not have any appointments yet.
              </p>
            ) : (
              <div className="space-y-6">
                {myAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border border-gray-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between gap-6">
                    <div>
                      <p className="font-semibold text-lg">
                        Dr. {appointment.Doctor?.User?.full_name}
                      </p>
                      <p className="text-gray-600">{appointment.Department?.name}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {appointment.appointment_date} at{" "}
                        {appointment.appointment_time?.slice(0, 5)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {appointment.status === "booked" && (
                        <button
                          onClick={() => handleMarkArrived(appointment)}
                          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-2xl font-medium text-sm">
                          <CheckCircle size={18} /> I Have Arrived
                        </button>
                      )}
                      <span
                        className={`px-6 py-2 rounded-full text-sm font-medium ${
                          queueStatusStyles[appointment.status] || "bg-gray-100 text-gray-700"
                        }`}>
                        {formatQueueStatus(appointment.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "queue" && (
          <div className="medical-card p-8">
            <h2 className="text-2xl font-semibold mb-6">My Queue Status</h2>

            {!currentQueue ? (
              <p className="text-center py-16 text-gray-500">
                You are not currently in an active queue.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl bg-teal-600 text-white p-8">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">
                    Queue Number
                  </p>
                  <p className="text-6xl font-bold mt-3">{currentQueue.queue_number}</p>
                  <span className="inline-flex mt-6 px-4 py-2 rounded-full bg-white/15 text-sm font-medium">
                    {formatQueueStatus(currentQueue.status)}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-3xl p-8 space-y-5">
                  <div className="flex items-start gap-3">
                    <Stethoscope className="text-teal-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Doctor</p>
                      <p className="font-semibold text-lg">
                        Dr. {currentQueue.Doctor?.User?.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="text-teal-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-semibold">{currentQueue.Department?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock3 className="text-teal-600 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Appointment Time</p>
                      <p className="font-semibold">
                        {currentQueue.Appointment?.appointment_date} at{" "}
                        {currentQueue.Appointment?.appointment_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm text-gray-700">
                    {currentQueue.status === "waiting" &&
                      "You are checked in and waiting for the doctor to call next."}
                    {currentQueue.status === "called" &&
                      "The doctor has called for the next patient. Please stay close to the staff desk."}
                    {currentQueue.status === "admitted" &&
                      "Staff has confirmed your turn. You may be ushered into the consultation room now."}
                    {currentQueue.status === "in_consultation" &&
                      "You are currently marked as in consultation."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
