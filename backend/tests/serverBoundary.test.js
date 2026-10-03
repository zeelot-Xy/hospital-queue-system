const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME ||= "hospital_queue_test";
process.env.DB_USER ||= "postgres";
process.env.DB_PASSWORD ||= "test-password";
process.env.DB_HOST ||= "127.0.0.1";
process.env.JWT_SECRET ||= "test-secret-that-is-longer-than-thirty-two-characters";

const request = async (server, path, options = {}) => {
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}${path}`, options);
};

const listen = (app) =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });

test("health endpoint exposes a stable service identity without database access", async (t) => {
  const { createApplication } = require("../server");
  const { app } = createApplication();
  const server = await listen(app);
  t.after(() => server.close());

  const response = await request(server, "/health");
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "hospital-queue-api");
  assert.match(body.version, /^\d+\.\d+\.\d+$/);
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("development-only user inventory endpoint is not exposed", async (t) => {
  const { createApplication } = require("../server");
  const { app } = createApplication();
  const server = await listen(app);
  t.after(() => server.close());

  const response = await request(server, "/api/dev/users");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Route not found" });
});

test("unknown routes return a controlled JSON response", async (t) => {
  const { createApplication } = require("../server");
  const { app } = createApplication();
  const server = await listen(app);
  t.after(() => server.close());

  const response = await request(server, "/not-a-real-route");
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-type").includes("application/json"), true);
});
