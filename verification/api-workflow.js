const assert = require("node:assert/strict");

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const api = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}: ${text}`);
  }
  return payload;
};

const pad = (value) => String(value).padStart(2, "0");
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const run = async () => {
  assert.ok(adminEmail && adminPassword, "ADMIN_EMAIL and ADMIN_PASSWORD are required");
  const runId = Date.now();
  const password = "ReleaseTest123!";
  const appointmentAt = new Date();
  appointmentAt.setSeconds(0, 0);
  appointmentAt.setMinutes(Math.floor(appointmentAt.getMinutes() / 5) * 5);
  const availabilityEnd = new Date(appointmentAt.getTime() + 15 * 60000);
  assert.equal(
    appointmentAt.getDate(),
    availabilityEnd.getDate(),
    "Run the workflow outside the final 15 minutes of the day",
  );
  const appointmentDate = localDate(appointmentAt);
  const appointmentTime = localTime(appointmentAt);

  const health = await api("/health");
  assert.equal(health.status, "ok");

  const admin = await api("/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  const doctor = await api("/api/auth/register", {
    method: "POST",
    body: {
      full_name: "Release Test Doctor",
      email: `release.doctor.${runId}@example.test`,
      phone: `+23481${String(runId).slice(-8)}`,
      password,
      role: "doctor",
      specialization: "General Medicine",
    },
  });
  const patient = await api("/api/auth/register", {
    method: "POST",
    body: {
      full_name: "Release Test Patient",
      email: `release.patient.${runId}@example.test`,
      phone: `+23480${String(runId).slice(-8)}`,
      password,
      role: "patient",
    },
  });

  const departments = await api("/api/departments");
  assert.ok(departments.length > 0, "At least one seeded department is required");
  const department = departments[0];
  const assignedDoctor = await api("/api/doctors", {
    token: admin.token,
    method: "POST",
    body: {
      user_id: doctor.user.id,
      department_id: department.id,
      specialization: "General Medicine",
    },
  });

  await api("/api/availability/me", {
    token: doctor.token,
    method: "PUT",
    body: {
      rows: [{
        day_of_week: appointmentAt.getDay(),
        start_time: appointmentTime,
        end_time: localTime(availabilityEnd),
        slot_minutes: 5,
        is_active: true,
      }],
    },
  });

  const available = await api(
    `/api/appointments/available-doctors?department_id=${department.id}&date=${appointmentDate}`,
    { token: patient.token },
  );
  assert.ok(available.some((item) => item.id === assignedDoctor.id));

  const booking = await api("/api/appointments/book", {
    token: patient.token,
    method: "POST",
    body: {
      doctor_id: assignedDoctor.id,
      department_id: department.id,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
    },
  });
  const arrived = await api("/api/queue/arrived", {
    token: patient.token,
    method: "POST",
    body: { appointment_id: booking.appointment.id },
  });
  const queueId = arrived.queue.id;
  assert.equal(arrived.queue.queue_number, 1);

  await api("/api/queue/call-next", { token: doctor.token, method: "POST", body: {} });
  await api("/api/queue/confirm-admit", {
    token: admin.token,
    method: "POST",
    body: { queue_id: queueId },
  });
  await api("/api/queue/start-consultation", {
    token: doctor.token,
    method: "POST",
    body: { queue_id: queueId },
  });
  await api(`/api/consultations/queue/${queueId}`, {
    token: doctor.token,
    method: "PUT",
    body: {
      presenting_complaint: "Release verification",
      findings: "Stable",
      diagnosis: "Test encounter",
      treatment_plan: "No treatment required",
      follow_up_advice: "None",
      note_summary: "Automated end-to-end verification completed.",
    },
  });
  await api("/api/queue/complete", {
    token: doctor.token,
    method: "POST",
    body: { queue_id: queueId },
  });

  const history = await api("/api/consultations/mine", { token: patient.token });
  assert.ok(
    history.history.some((record) =>
      String(record.note_summary || "").includes("Automated end-to-end verification"),
    ),
    "The completed consultation must be visible in the patient's safe visit history",
  );
  const report = await api("/api/reports?days=1", { token: admin.token });
  assert.ok(Number(report.metrics.patients_seen) >= 1);

  console.log(JSON.stringify({
    status: "passed",
    workflow: "patient-booking-to-completed-consultation",
    appointment_id: booking.appointment.id,
    queue_id: queueId,
    doctor_id: assignedDoctor.id,
  }, null, 2));
};

run().catch((error) => {
  console.error(JSON.stringify({ status: "failed", error: error.message }, null, 2));
  process.exit(1);
});
