const assert = require("node:assert/strict");
const path = require("node:path");

const playwrightRoot = process.env.PLAYWRIGHT_PATH ||
  "C:\\Users\\d\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright";
const { chromium } = require(playwrightRoot);

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const evidenceDir = process.env.EVIDENCE_DIR || path.join(__dirname, "browser-evidence");
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

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

async function login(page, email, password, expectedPath, expectedHeading) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${expectedPath}`, { timeout: 15000 });
  await page.getByRole("heading", { name: expectedHeading }).waitFor({ timeout: 15000 });
  await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 15000 });
}

async function run() {
  assert.ok(adminEmail && adminPassword, "ADMIN_EMAIL and ADMIN_PASSWORD are required");
  const fs = require("node:fs");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const runId = Date.now();
  const password = "BrowserTest123!";
  const errors = [];
  const failedRequests = [];

  const admin = await api("/api/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  const patientEmail = `browser.patient.${runId}@example.test`;
  await api("/api/auth/register", {
    method: "POST",
    body: {
      full_name: "Browser Test Patient",
      email: patientEmail,
      phone: `+23470${String(runId).slice(-8)}`,
      password,
      role: "patient",
    },
  });
  const doctorEmail = `browser.doctor.${runId}@example.test`;
  const doctor = await api("/api/auth/register", {
    method: "POST",
    body: {
      full_name: "Browser Test Doctor",
      email: doctorEmail,
      phone: `+23471${String(runId).slice(-8)}`,
      password,
      role: "doctor",
      specialization: "General Medicine",
    },
  });
  const departments = await api("/api/departments");
  await api("/api/doctors", {
    token: admin.token,
    method: "POST",
    body: {
      user_id: doctor.user.id,
      department_id: departments[0].id,
      specialization: "General Medicine",
    },
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));

    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    assert.equal(await page.title(), "Smart Clinic Queue System");
    await page.getByRole("heading", { name: "Hospital Queue" }).waitFor();
    await page.screenshot({ path: path.join(evidenceDir, "01-login-desktop.png"), fullPage: true });

    await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Create Account" }).waitFor();
    await page.screenshot({ path: path.join(evidenceDir, "02-registration-desktop.png"), fullPage: true });

    await login(page, adminEmail, adminPassword, "/dashboard/staff", "Staff Operations");
    await page.screenshot({ path: path.join(evidenceDir, "03-staff-dashboard.png"), fullPage: true });
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await login(page, doctorEmail, password, "/dashboard/doctor", "Doctor Dashboard");
    await page.screenshot({ path: path.join(evidenceDir, "04-doctor-dashboard.png"), fullPage: true });
    await page.evaluate(() => localStorage.clear());

    await login(page, patientEmail, password, "/dashboard/patient", /Welcome, Browser Test Patient/i);
    await page.screenshot({ path: path.join(evidenceDir, "05-patient-dashboard-desktop.png"), fullPage: true });
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobile.newPage();
    mobilePage.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    mobilePage.on("pageerror", (error) => errors.push(error.message));
    mobilePage.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
    await login(mobilePage, patientEmail, password, "/dashboard/patient", /Welcome, Browser Test Patient/i);
    await mobilePage.screenshot({ path: path.join(evidenceDir, "06-patient-dashboard-mobile.png"), fullPage: true });
    await mobile.close();

    assert.deepEqual(errors, [], `Browser console/page errors: ${errors.join(" | ")}`);
    assert.deepEqual(failedRequests, [], `Failed browser requests: ${failedRequests.join(" | ")}`);
    console.log(JSON.stringify({
      status: "passed",
      browser: "Microsoft Edge (headless)",
      viewports: ["1440x900", "390x844"],
      roles: ["admin/staff", "doctor", "patient"],
      screenshots: 6,
      console_errors: 0,
      failed_requests: 0,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
