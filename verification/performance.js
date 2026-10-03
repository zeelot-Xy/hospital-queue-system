const { performance } = require("node:perf_hooks");

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const concurrency = Number(process.env.PERF_CONCURRENCY || 25);
const requestCount = Number(process.env.PERF_REQUESTS || 100);
const maximumP95 = Number(process.env.PERF_MAX_P95_MS || 2000);

const samples = [];
let failures = 0;
let cursor = 0;

const worker = async () => {
  while (cursor < requestCount) {
    cursor += 1;
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/departments`);
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch (_error) {
      failures += 1;
    } finally {
      samples.push(performance.now() - started);
    }
  }
};

Promise.all(Array.from({ length: concurrency }, worker)).then(() => {
  samples.sort((a, b) => a - b);
  const percentile = (value) => samples[Math.min(samples.length - 1, Math.ceil(samples.length * value) - 1)];
  const result = {
    concurrency,
    requests: samples.length,
    failures,
    min_ms: Number(samples[0].toFixed(1)),
    median_ms: Number(percentile(0.5).toFixed(1)),
    p95_ms: Number(percentile(0.95).toFixed(1)),
    max_ms: Number(samples.at(-1).toFixed(1)),
    threshold_ms: maximumP95,
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures > 0 || result.p95_ms > maximumP95) process.exit(1);
});
