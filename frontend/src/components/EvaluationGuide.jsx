import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ClipboardCheck, X } from "lucide-react";

const guides = {
  guest: [
    "Open DEMO-CREDENTIALS.txt in the extracted package.",
    "Sign in with the administrator, staff, doctor, or patient email shown there.",
    "Use the same generated demonstration password for every demo role.",
  ],
  admin: [
    "Open Accounts to create or manage reception staff.",
    "Open Doctors to review the assigned Demo Doctor.",
    "Open Live Queue and watch the demonstration patient move through the clinic.",
  ],
  staff: [
    "Open Live Queue and confirm the patient after the doctor calls them.",
    "Use Appointments to review or reschedule bookings.",
    "Use Reports after the doctor completes the consultation.",
  ],
  doctor: [
    "Review the weekly availability prepared for the Demo Doctor.",
    "Select Call Next Patient to notify reception.",
    "After reception admits the patient, start and complete the consultation.",
  ],
  patient: [
    "Review Queue Status and the live queue number.",
    "Open Visit History to see a completed demonstration consultation.",
    "Use Book Appointment to explore departments, doctors, dates, and time slots.",
  ],
};

export default function EvaluationGuide() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const enabled = import.meta.env.VITE_DEMO_MODE === "true";
  const role = useMemo(() => {
    void location.pathname;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").role || "guest";
    } catch {
      return "guest";
    }
  }, [location.pathname]);

  if (!enabled) return null;
  const steps = guides[role] || guides.guest;

  return (
    <>
      <div className="sticky top-0 z-[60] flex flex-col gap-2 border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Evaluation mode - use demonstration data only</p>
          <p className="text-sm">Do not enter real patient or clinic information in this copy.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950">
          <ClipboardCheck size={17} /> Guided tour
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto mt-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">15-minute tour</p>
                <h2 className="mt-1 text-2xl font-bold text-teal-950">Explore the {role === "guest" ? "system" : `${role} view`}</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100" aria-label="Close guided tour">
                <X size={22} />
              </button>
            </div>
            <ol className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 font-bold text-white">{index + 1}</span>
                  <p className="pt-1 text-gray-700">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Reset the original demonstration scenario at any time by double-clicking RESET-DEMO.cmd in the deploy folder.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
