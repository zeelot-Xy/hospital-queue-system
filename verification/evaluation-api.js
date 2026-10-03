const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, "deploy", "evaluation", ".env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const baseUrl = "http://127.0.0.1:8081";

async function request(route, { token, method = "GET", body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${route}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function login(email, password = env.DEMO_ACCOUNT_PASSWORD, expected = 200) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
    expected,
  });
}

async function run() {
  const admin = await login(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
  const staff = await login("staff.demo@clinic.local");
  const doctor = await login("doctor.demo@clinic.local");
  const patient = await login("patient.demo@clinic.local");
  for (const session of [admin, staff, doctor, patient]) assert.ok(session.token);

  const managed = await request("/api/admin-users", { token: admin.token });
  assert.ok(managed.users.some((user) => user.email === "staff.demo@clinic.local"));
  await request("/api/admin-users", { token: staff.token, expected: 403 });

  const queue = await request("/api/queue/live", { token: staff.token });
  assert.ok(queue.queues.some((item) => item.Patient?.email === "patient.demo@clinic.local"));

  const checkEmail = `evaluation.check.${Date.now()}@clinic.local`;
  const temporaryPassword = "EvaluationCheck1!";
  const replacementPassword = "EvaluationCheck2!";
  const created = await request("/api/admin-users/staff", {
    token: admin.token,
    method: "POST",
    body: { full_name: "Evaluation Account Check", email: checkEmail, phone: "+2348000000199", password: temporaryPassword },
    expected: 201,
  });
  await login(checkEmail, temporaryPassword);
  await request(`/api/admin-users/${created.user.id}/status`, { token: admin.token, method: "PATCH", body: { status: "inactive" } });
  await login(checkEmail, temporaryPassword, 403);
  await request(`/api/admin-users/${created.user.id}/password`, { token: admin.token, method: "PATCH", body: { password: replacementPassword } });
  await request(`/api/admin-users/${created.user.id}/status`, { token: admin.token, method: "PATCH", body: { status: "active" } });
  await login(checkEmail, replacementPassword);

  console.log("PASS evaluation API: four roles, isolated demo queue, admin boundaries, staff lifecycle");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
