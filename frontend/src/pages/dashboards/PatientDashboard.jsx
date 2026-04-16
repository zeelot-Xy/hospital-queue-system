import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  Clock3,
  FileText,
  LogOut,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import AlertDialog from "../../components/AlertDialog";
import DashboardSectionMenu from "../../components/DashboardSectionMenu";
import NotificationPanel from "../../components/NotificationPanel";
import api from "../../lib/api";
import { formatQueueStatus, queueStatusStyles } from "../../lib/queue";
import { disconnectSocket, getSocket } from "../../lib/socket";

const initialBookingState = {
  doctor_id: "",
  appointment_date: "",
  appointment_time: "",
};

const bloodGroupOptions = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const initialPatientProfile = {
  blood_group: "",
  date_of_birth: "",
  allergies: "",
  chronic_conditions: "",
  last_visit_notes: "",
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [activeTab, setActiveTab] = useState("book");
  const [hasInitializedMobileTab, setHasInitializedMobileTab] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [currentQueue, setCurrentQueue] = useState(null);
  const [patientProfile, setPatientProfile] = useState(initialPatientProfile);
  const [visitHistory, setVisitHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookingForm, setBookingForm] = useState(initialBookingState);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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
  const profileIsIncomplete =
    !patientProfile.blood_group ||
    !patientProfile.date_of_birth ||
    !patientProfile.allergies ||
    !patientProfile.chronic_conditions;

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

  const fetchDoctors = async (deptId, selectedDate) => {
    setLoadingDoctors(true);
    try {
      const res = await api.get(
        `/appointments/available-doctors?department_id=${deptId}&date=${selectedDate}`,
      );
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

  const fetchPatientProfile = async () => {
    try {
      const res = await api.get("/patient-profile/me");
      setPatientProfile({
        blood_group: res.data.blood_group || "",
        date_of_birth: res.data.date_of_birth || "",
        allergies: res.data.allergies || "",
        chronic_conditions: res.data.chronic_conditions || "",
        last_visit_notes: res.data.last_visit_notes || "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVisitHistory = async () => {
    try {
      const res = await api.get("/consultations/mine");
      setVisitHistory(res.data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchMyAppointments();
    fetchQueueStatus();
    fetchPatientProfile();
    fetchVisitHistory();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (hasInitializedMobileTab) {
      return;
    }

    if (currentQueue) {
      setActiveTab("queue");
      setHasInitializedMobileTab(true);
      return;
    }

    if (myAppointments.length > 0) {
      setActiveTab("appointments");
      setHasInitializedMobileTab(true);
      return;
    }

    if (departments.length > 0) {
      setActiveTab("book");
      setHasInitializedMobileTab(true);
    }
  }, [currentQueue, myAppointments.length, departments.length, hasInitializedMobileTab]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const refresh = () => {
      fetchMyAppointments();
      fetchQueueStatus();
      fetchNotifications();
    };

    socket.on("queue:refresh", refresh);

    return () => {
      socket.off("queue:refresh", refresh);
    };
  }, []);

  const handleDeptSelect = (dept) => {
    setSelectedDept(dept);
    setDoctors([]);
    setBookingForm((current) => ({
      ...initialBookingState,
      appointment_date: current.appointment_date,
    }));
    if (bookingForm.appointment_date) {
      fetchDoctors(dept.id, bookingForm.appointment_date);
    }
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
      fetchNotifications();
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
          fetchNotifications();
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

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await api.put("/patient-profile/me", {
        blood_group: patientProfile.blood_group,
        date_of_birth: patientProfile.date_of_birth,
        allergies: patientProfile.allergies,
        chronic_conditions: patientProfile.chronic_conditions,
      });

      setPatientProfile((current) => ({
        ...current,
        blood_group: res.data.blood_group || "",
        date_of_birth: res.data.date_of_birth || "",
        allergies: res.data.allergies || "",
        chronic_conditions: res.data.chronic_conditions || "",
        last_visit_notes: res.data.last_visit_notes || current.last_visit_notes,
      }));
      openDialog({
        title: "Profile Saved",
        message: "Your patient profile has been updated successfully.",
        variant: "success",
      });
    } catch (err) {
      openDialog({
        title: "Profile Save Failed",
        message: err.response?.data?.message || "Could not save your profile.",
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    disconnectSocket();
    navigate("/login");
  };

  const handleDeleteAccount = () => {
    openDialog({
      title: "Delete Patient Account",
      message:
        "This will permanently remove your patient account, medical profile, appointments, and queue records. This action cannot be undone.",
      variant: "error",
      confirmText: deletingAccount ? "Deleting..." : "Delete Account",
      cancelText: "Keep Account",
      onConfirm: async () => {
        setDeletingAccount(true);

        try {
          await api.delete("/auth/me");
          localStorage.clear();
          disconnectSocket();
          navigate("/login");
        } catch (err) {
          openDialog({
            title: "Delete Failed",
            message:
              err.response?.data?.message || "Could not delete your account.",
            variant: "error",
          });
        } finally {
          setDeletingAccount(false);
        }
      },
    });
  };

  const patientSections = [
    ["queue", "Queue Status"],
    ["book", "Book Appointment"],
    ["appointments", "My Appointments"],
    ["profile", "My Profile"],
    ["history", "Visit History"],
  ];

  const renderDesktopTabs = () => (
    <div className="mb-8 hidden flex-wrap gap-3 border-b md:flex">
      {patientSections.map(([value, label]) => (
        <button
          key={value}
          onClick={() => {
            setActiveTab(value);
            if (value === "appointments") fetchMyAppointments();
            if (value === "queue") fetchQueueStatus();
            if (value === "history") fetchVisitHistory();
          }}
          className={`border-b-4 px-6 py-4 text-lg font-semibold transition-all ${
            activeTab === value
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-teal-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-900 sm:text-4xl">
              Welcome, {user.full_name}
            </h1>
            <p className="mt-1 text-sm text-teal-600 sm:text-base">
              Book appointments and follow your queue status in real time
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 sm:w-auto md:w-auto">
            <LogOut size={20} /> Logout
          </button>
        </div>

        <DashboardSectionMenu
          title="Patient Menu"
          sections={patientSections.map(([value, label]) => ({ value, label }))}
          activeSection={activeTab}
          onSelect={(value) => {
            setActiveTab(value);
            if (value === "appointments") fetchMyAppointments();
            if (value === "queue") fetchQueueStatus();
            if (value === "history") fetchVisitHistory();
          }}
        />
        {renderDesktopTabs()}

        {activeTab === "book" && (
          <div className="space-y-6 sm:space-y-8">
            <NotificationPanel
              notifications={notifications}
              title="Patient Notifications"
              emptyMessage="No patient notifications right now."
            />
            {profileIsIncomplete && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 sm:px-6 sm:py-5">
                <p className="font-semibold">Complete your patient profile</p>
                <p className="text-sm mt-1">
                  Adding your blood group, date of birth, allergies, and chronic conditions helps doctors prepare faster before your consultation.
                </p>
              </div>
            )}

            <div className="medical-card p-5 sm:p-8">
              <h2 className="mb-5 flex items-center gap-3 text-xl font-semibold sm:mb-6 sm:text-2xl">
                <Calendar className="text-teal-600" /> Select Department
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleDeptSelect(dept)}
                    className={`text-left border-2 rounded-3xl p-5 transition-all hover:shadow-md sm:p-6 ${
                      selectedDept?.id === dept.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-teal-500"
                    }`}>
                    <h3 className="text-lg font-semibold text-teal-900 sm:text-xl">
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
              <div className="medical-card p-5 sm:p-8">
                <h2 className="mb-5 text-xl font-semibold sm:mb-6 sm:text-2xl">
                  Book in <span className="text-teal-600">{selectedDept.name}</span>
                </h2>

                {loadingDoctors ? (
                  <p className="text-center py-12 text-gray-500">Loading doctors...</p>
                ) : doctors.length === 0 ? (
                  <p className="text-center py-12 text-gray-500">
                    Choose a date to see doctors with open slots in this department.
                  </p>
                ) : (
                  <form onSubmit={handleBookAppointment} className="grid gap-5 md:grid-cols-2 md:gap-6">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Appointment Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-4 w-5 h-5 text-teal-500" />
                        <input
                          type="date"
                          min={today}
                          value={bookingForm.appointment_date}
                          onChange={async (e) => {
                            const nextDate = e.target.value;
                            setBookingForm((current) => ({
                              ...current,
                              appointment_date: nextDate,
                              doctor_id: "",
                              appointment_time: "",
                            }));
                            if (selectedDept && nextDate) {
                              await fetchDoctors(selectedDept.id, nextDate);
                            } else {
                              setDoctors([]);
                            }
                          }}
                          className="w-full rounded-2xl border border-gray-300 bg-slate-50 py-3.5 pl-12 pr-4 transition-all focus:border-teal-600 focus:bg-white focus:outline-none"
                          required
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Choose a date first. Only doctors with open slots on that day will appear.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
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
                        className={`border rounded-3xl p-4 text-left transition-all sm:p-6 ${
                            bookingForm.doctor_id === String(doctor.id)
                              ? "border-teal-600 bg-teal-50 shadow"
                              : "border-gray-200 hover:border-teal-500"
                          }`}>
                          <div className="mb-3 flex items-center gap-3 sm:gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 sm:h-14 sm:w-14">
                              <User className="w-8 h-8 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-base font-semibold sm:text-lg">
                                Dr. {doctor.User.full_name}
                              </p>
                              <p className="text-teal-700">
                                {doctor.specialization || "General Practitioner"}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{doctor.User.email}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(doctor.available_slots || []).map((slot) => {
                              const isSelected =
                                bookingForm.doctor_id === String(doctor.id) &&
                                bookingForm.appointment_time === slot;
                              return (
                                <button
                                  key={`${doctor.id}-${slot}`}
                                  type="button"
                                  onClick={() =>
                                    setBookingForm((current) => ({
                                      ...current,
                                      doctor_id: String(doctor.id),
                                      appointment_time: slot,
                                    }))
                                  }
                                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                    isSelected
                                      ? "bg-teal-600 text-white"
                                      : "bg-white text-teal-700 border border-teal-200 hover:bg-teal-50"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Time
                      </label>
                      <div className="relative">
                        <Clock3 className="absolute left-4 top-4 w-5 h-5 text-teal-500" />
                        <input
                          type="text"
                          value={bookingForm.appointment_time}
                          readOnly
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-300 bg-slate-50 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
                          required
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Pick a slot from a doctor card above.
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
          <div className="medical-card p-5 sm:p-8">
            <h2 className="mb-5 text-xl font-semibold sm:mb-6 sm:text-2xl">My Appointments</h2>

            {myAppointments.length === 0 ? (
              <p className="text-center py-16 text-gray-500">
                You do not have any appointments yet.
              </p>
            ) : (
              <div className="space-y-6">
                {myAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-5 rounded-3xl border border-gray-200 p-5 sm:p-6 md:flex-row md:justify-between">
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

                    <div className="flex flex-col gap-3 md:items-end">
                      {appointment.status === "booked" && (
                        <button
                          onClick={() => handleMarkArrived(appointment)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-3 text-sm font-medium text-white hover:bg-teal-700 md:w-auto">
                          <CheckCircle size={18} /> I Have Arrived
                        </button>
                      )}
                      <span
                        className={`inline-flex w-fit rounded-full px-6 py-2 text-sm font-medium ${
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
          <div className="space-y-6">
            {profileIsIncomplete && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 sm:px-6 sm:py-5">
                <p className="font-semibold">Complete your medical profile</p>
                <p className="mt-1 text-sm">
                  Staff can coordinate your queue, but doctors prepare faster when your blood group, date of birth, allergies, and chronic conditions are complete.
                </p>
              </div>
            )}
          <div className="medical-card p-5 sm:p-8">
            <h2 className="mb-5 text-xl font-semibold sm:mb-6 sm:text-2xl">My Queue Status</h2>

            {!currentQueue ? (
              <p className="text-center py-16 text-gray-500">
                You are not currently in an active queue.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                <div className="rounded-3xl bg-teal-600 p-5 text-white sm:p-8">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-80">
                    Queue Number
                  </p>
                  <p className="mt-3 text-5xl font-bold sm:text-6xl">{currentQueue.queue_number}</p>
                  <span className="mt-5 inline-flex w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-medium sm:mt-6">
                    {formatQueueStatus(currentQueue.status)}
                  </span>
                </div>

                <div className="space-y-5 rounded-3xl border border-gray-200 p-5 sm:p-8">
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
                    <p>Patients ahead: {currentQueue.patients_ahead ?? 0}</p>
                    <p className="mt-1">
                      Approximate wait:{" "}
                      {currentQueue.estimated_wait_minutes
                        ? `${currentQueue.estimated_wait_minutes} mins`
                        : "Estimating..."}
                    </p>
                    <p className="mt-3">
                    {currentQueue.status === "waiting" &&
                      "You are checked in and waiting for the doctor to call next."}
                    {currentQueue.status === "called" &&
                      "The doctor has called for the next patient. Please stay close to the staff desk."}
                    {currentQueue.status === "admitted" &&
                      "Staff has confirmed your turn. You may be ushered into the consultation room now."}
                    {currentQueue.status === "in_consultation" &&
                      "You are currently marked as in consultation."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="medical-card p-5 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <FileText className="text-teal-600" />
              <div>
                <h2 className="text-2xl font-semibold">Visit History</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review previous consultations and patient-safe visit summaries
                </p>
              </div>
            </div>

            {visitHistory.length === 0 ? (
              <p className="py-16 text-center text-gray-500">
                You do not have any recorded visit history yet.
              </p>
            ) : (
              <div className="space-y-4">
                {visitHistory.map((record) => (
                  <div key={record.id} className="rounded-3xl border border-gray-200 p-5 sm:p-6">
                    <p className="font-semibold text-lg text-teal-900">
                      {record.Appointment?.Doctor?.User?.full_name
                        ? `Dr. ${record.Appointment.Doctor.User.full_name}`
                        : "Doctor"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {record.Appointment?.Department?.name || "Department"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {record.Appointment?.appointment_date} at{" "}
                      {record.Appointment?.appointment_time?.slice(0, 5)}
                    </p>
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-gray-700">
                      {record.note_summary || "No safe summary was added for that visit."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="medical-card space-y-6 p-5 sm:space-y-8 sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold">My Medical Profile</h2>
              <p className="text-gray-600 mt-2">
                Keep your essential health information up to date so doctors can review it quickly during queue and consultation.
              </p>
            </div>

            <form onSubmit={handleProfileSave} className="grid gap-5 md:grid-cols-2 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group
                </label>
                <select
                  value={patientProfile.blood_group}
                  onChange={(e) =>
                    setPatientProfile((current) => ({
                      ...current,
                      blood_group: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600">
                  <option value="">Select blood group</option>
                  {bloodGroupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-gray-700 md:col-span-2">
                Your doctor can view this profile while you are in their queue. Only doctors can see your consultation notes.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={patientProfile.date_of_birth}
                  onChange={(e) =>
                    setPatientProfile((current) => ({
                      ...current,
                      date_of_birth: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <textarea
                  value={patientProfile.allergies}
                  onChange={(e) =>
                    setPatientProfile((current) => ({
                      ...current,
                      allergies: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 h-28"
                  placeholder="List medicine, food, or environmental allergies"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chronic Conditions
                </label>
                <textarea
                  value={patientProfile.chronic_conditions}
                  onChange={(e) =>
                    setPatientProfile((current) => ({
                      ...current,
                      chronic_conditions: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-teal-600 h-28"
                  placeholder="Add long-term conditions such as hypertension, asthma, or diabetes"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Visit Notes
                </label>
                <div className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4 text-gray-700 min-h-[112px]">
                  {patientProfile.last_visit_notes || "Your doctor has not added notes from a previous visit yet."}
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile || deletingAccount}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-4 rounded-2xl font-semibold transition-all">
                  {savingProfile ? "Saving Profile..." : "Save Medical Profile"}
                </button>
              </div>

              <div className="md:col-span-2 rounded-3xl border border-red-200 bg-red-50 px-5 py-5 sm:px-6">
                <p className="text-sm font-semibold text-red-800">Danger Zone</p>
                <p className="mt-2 text-sm text-red-700">
                  Deleting your account will permanently remove your patient
                  profile, appointments, and queue history from the app.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || savingProfile}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:bg-red-400 sm:w-auto">
                  <Trash2 size={16} />
                  {deletingAccount ? "Deleting Account..." : "Delete Account"}
                </button>
              </div>
            </form>
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
