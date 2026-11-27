import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LatencyTracker } from "../src/services/latencyTracker.js";
import { validateProductionEnv } from "../scripts/check-env.mjs";

test("LatencyTracker khử trùng theo messageId, tính đúng p50/p95 và CSV", () => {
  const tracker = new LatencyTracker();
  const m1 = { conversationId: "C1", messageId: "MSG#1", channel: "shopee", clientSentAtMs: 1000 };
  const m2 = { conversationId: "C1", messageId: "MSG#2", channel: "shopee", clientSentAtMs: 2000 };
  const m3 = { conversationId: "C1", messageId: "MSG#3", channel: "zalo", clientSentAtMs: 3000 };

  assert.equal(tracker.record(m1, 1120).latencyMs, 120);
  // Gói trùng messageId phải bị bỏ qua
  assert.equal(tracker.record(m1, 1999), null);
  assert.equal(tracker.record(m2, 2250).latencyMs, 250);
  assert.equal(tracker.record(m3, 3900).latencyMs, 900);

  const stats = tracker.getStats();
  assert.equal(stats.count, 3);
  assert.equal(stats.p50, 250);
  assert.equal(stats.p95, 900);

  const csv = tracker.toCsv();
  assert.ok(csv.includes("MSG#1,C1,shopee,1000,1120,120"));
});

test("check-env.mjs chặn cấu hình Mock/placeholder và cho qua cấu hình Cloud hợp lệ", () => {
  const bad = validateProductionEnv({
    VITE_USE_MOCK: "true",
    VITE_REST_API_URL: "https://xxxxxx.execute-api.ap-southeast-1.amazonaws.com/prod",
    VITE_WS_URL: "wss://yyyyyy.execute-api.ap-southeast-1.amazonaws.com/prod",
    VITE_COGNITO_USER_POOL_ID: "ap-southeast-1_xxxxxxxx",
    VITE_COGNITO_CLIENT_ID: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.length >= 4);

  const good = validateProductionEnv({
    VITE_USE_MOCK: "false",
    VITE_REST_API_URL: "https://abc123def4.execute-api.ap-southeast-1.amazonaws.com/prod",
    VITE_WS_URL: "wss://ghi567jkl8.execute-api.ap-southeast-1.amazonaws.com/prod",
    VITE_COGNITO_USER_POOL_ID: "ap-southeast-1_TestPool1",
    VITE_COGNITO_CLIENT_ID: "1a2b3c4d5e6f7g8h9i0j",
  });
  assert.equal(good.ok, true);
  assert.equal(good.errors.length, 0);

  // Chạy trực tiếp CLI check-env.mjs với .env.local hiện tại (VITE_USE_MOCK=true) -> phải exit code 1
  const failRun = spawnSync(process.execPath, ["scripts/check-env.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(failRun.status, 1);

  // Chạy CLI với biến production hợp lệ qua env -> phải exit code 0
  const passRun = spawnSync(process.execPath, ["scripts/check-env.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      VITE_USE_MOCK: "false",
      VITE_REST_API_URL: "https://abc123def4.execute-api.ap-southeast-1.amazonaws.com/prod",
      VITE_WS_URL: "wss://ghi567jkl8.execute-api.ap-southeast-1.amazonaws.com/prod",
      VITE_COGNITO_USER_POOL_ID: "ap-southeast-1_TestPool1",
      VITE_COGNITO_CLIENT_ID: "1a2b3c4d5e6f7g8h9i0j",
    },
  });
  assert.equal(passRun.status, 0);
});

test("production guard rejects mock mode when its path contains spaces", () => {
  const directory = mkdtempSync(join(tmpdir(), "Omni Inbox "));
  const script = join(directory, "check-env.mjs");
  try {
    copyFileSync(new URL("../scripts/check-env.mjs", import.meta.url), script);
    const result = spawnSync(process.execPath, [script], {
      cwd: directory,
      env: { ...process.env, VITE_USE_MOCK: "true" },
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /VITE_USE_MOCK/);
  } finally {
    rmSync(script, { force: true });
    rmdirSync(directory);
  }
});
