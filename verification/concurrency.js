const assert = require("node:assert/strict");

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const pad = (value) => String(value).padStart(2, "0");
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

async function api(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method || "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${text}`);
  return payload;
}

async function run() {
  assert.ok(adminEmail && adminPassword, "ADMIN_EMAIL and ADMIN_PASSWORD are required");
  const runId = Date.now();
  const password = "ConcurrencyTest123!";
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.floor(start.getMinutes() / 5) * 5);
  const end = new Date(start.getTime() + 20 * 60000);
  assert.equal(start.getDate(), end.getDate(), "Run outside the final 20 minutes of the day");

  const admin = await api("/api/auth/login", { method: "POST", body: { email: adminEmail, password: adminPassword } });
  const doctor = await api("/api/auth/register", {
    method: "POST",
    body: { full_name: "Concurrency Test Doctor", email: `concurrency.doctor.${runId}@example.test`, phone: `+23472${String(runId).slice(-8)}`, password, role: "doctor", specialization: "General Medicine" },
  });
  const patients = await Promise.all([0, 1].map((index) => api("/api/auth/register", {
    method: "POST",
    body: { full_name: `Concurrency Test Patient ${index + 1}`, email: `concurrency.patient.${index}.${runId}@example.test`, phone: `+2347${index + 3}${String(runId).slice(-8)}`, password, role: "patient" },
  })));
  const departments = await api("/api/departments");
  const assignedDoctor = await api("/api/doctors", {
    token: admin.token,
    method: "POST",
    body: { user_id: doctor.user.id, department_id: departments[0].id, specialization: "General Medicine" },
  });
  await api("/api/availability/me", {
    token: doctor.token,
    method: "PUT",
    body: { rows: [{ day_of_week: start.getDay(), start_time: localTime(start), end_time: localTime(end), slot_minutes: 5, is_active: true }] },
  });
  const bookings = await Promise.all(patients.map((patient, index) => api("/api/appointments/book", {
    token: patient.token,
    method: "POST",
    body: { doctor_id: assignedDoctor.id, department_id: departments[0].id, appointment_date: localDate(start), appointment_time: localTime(new Date(start.getTime() + index * 5 * 60000)) },
  })));
  const arrivals = await Promise.all(patients.map((patient, index) => api("/api/queue/arrived", {
    token: patient.token,
    method: "POST",
    body: { appointment_id: bookings[index].appointment.id },
  })));
  const numbers = arrivals.map((arrival) => arrival.queue.queue_number).sort((a, b) => a - b);
  assert.deepEqual(numbers, [1, 2], "Concurrent arrivals must receive unique sequential queue numbers");
  console.log(JSON.stringify({ status: "passed", simultaneous_arrivals: 2, queue_numbers: numbers, duplicates: 0 }, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
