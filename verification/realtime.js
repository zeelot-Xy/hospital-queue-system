const assert = require("node:assert/strict");
const { io } = require("../frontend/node_modules/socket.io-client");

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

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
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const pad = (value) => String(value).padStart(2, "0");
const date = new Date();
const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const waitFor = (socket, event, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const run = async () => {
  const rejected = io(baseUrl, { path: "/socket.io", transports: ["websocket"], timeout: 5000 });
  const rejection = await waitFor(rejected, "connect_error");
  assert.match(rejection.message, /authentication required/i);
  rejected.disconnect();

  const runId = Date.now();
  const registration = await api("/api/auth/register", {
    method: "POST",
    body: {
      full_name: "Realtime Test Patient",
      email: `realtime.patient.${runId}@example.test`,
      phone: `+23482${String(runId).slice(-8)}`,
      password: "ReleaseTest123!",
      role: "patient",
    },
  });
  const departments = await api("/api/departments");
  let selected;
  for (const department of departments) {
    const doctors = await api(
      `/api/appointments/available-doctors?department_id=${department.id}&date=${dateString}`,
      { token: registration.token },
    );
    const doctor = doctors.find((item) => item.available_slots?.length);
    if (doctor) {
      selected = { department, doctor, slot: doctor.available_slots[0] };
      break;
    }
  }
  assert.ok(selected, "An available seeded test doctor is required");
  const booking = await api("/api/appointments/book", {
    token: registration.token,
    method: "POST",
    body: {
      doctor_id: selected.doctor.id,
      department_id: selected.department.id,
      appointment_date: dateString,
      appointment_time: selected.slot,
    },
  });

  const patientSocket = io(baseUrl, {
    path: "/socket.io",
    transports: ["websocket"],
    auth: { token: registration.token },
    timeout: 5000,
  });
  await waitFor(patientSocket, "connect");
  const refreshPromise = waitFor(patientSocket, "queue:refresh");
  const arrival = await api("/api/queue/arrived", {
    token: registration.token,
    method: "POST",
    body: { appointment_id: booking.appointment.id },
  });
  const refresh = await refreshPromise;
  patientSocket.disconnect();
  assert.equal(refresh.queueId, arrival.queue.id);

  console.log(JSON.stringify({
    status: "passed",
    unauthenticated_socket: "rejected",
    authenticated_socket: "connected",
    event: "queue:refresh",
    queue_id: arrival.queue.id,
  }, null, 2));
};

run().catch((error) => {
  console.error(JSON.stringify({ status: "failed", error: error.message }, null, 2));
  process.exit(1);
});
