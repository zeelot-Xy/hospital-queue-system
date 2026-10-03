const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const playwrightRoot = process.env.PLAYWRIGHT_PATH ||
  "C:\\Users\\d\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright";
const { chromium } = require(playwrightRoot);
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

async function run() {
  const evidence = path.join(root, "evidence", "evaluation-verification");
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:8081/login", { waitUntil: "networkidle" });
    await page.getByText("Evaluation mode - use demonstration data only").waitFor();
    await page.getByRole("button", { name: "Guided tour" }).click();
    await page.getByRole("heading", { name: "Explore the system" }).waitFor();
    await page.getByRole("button", { name: "Close guided tour" }).click();
    await page.locator('input[type="email"]').fill(env.ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(env.ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/dashboard/staff");
    await page.getByRole("button", { name: "Accounts" }).click();
    await page.getByRole("heading", { name: "Staff and Administrator Accounts" }).waitFor();
    await page.getByText("staff.demo@clinic.local").waitFor();
    await page.screenshot({ path: path.join(evidence, "evaluation-admin-accounts.png"), fullPage: true });
    assert.deepEqual(errors, []);
    console.log("PASS evaluation browser: safety banner, guided tour, admin accounts UI");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
