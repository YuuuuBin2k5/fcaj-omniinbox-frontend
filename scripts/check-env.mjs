// FILE: scripts/check-env.mjs
// Dừng build nếu cấu hình production sai (đang để mock hoặc thiếu URL/Cognito).
import fs from "node:fs";
import path from "node:path";

export function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

export function validateProductionEnv(env) {
  const errors = [];
  const warnings = [];

  if (env.VITE_USE_MOCK !== "false") {
    errors.push('VITE_USE_MOCK phải là "false" khi build production');
  }

  const required = [
    "VITE_REST_API_URL",
    "VITE_WS_URL",
    "VITE_COGNITO_USER_POOL_ID",
    "VITE_COGNITO_CLIENT_ID",
  ];
  for (const k of required) {
    const val = (env[k] || "").trim();
    if (!val || /xxxx|yyyy|<[^>]+>/i.test(val)) {
      errors.push(`Thiếu hoặc còn là placeholder: ${k}`);
    }
  }

  if (env.VITE_REST_API_URL && !/^https:\/\/.+/i.test(env.VITE_REST_API_URL.trim())) {
    errors.push("VITE_REST_API_URL phải bắt đầu bằng https://");
  }
  if (env.VITE_WS_URL && !/^wss:\/\/.+/i.test(env.VITE_WS_URL.trim())) {
    errors.push("VITE_WS_URL phải bắt đầu bằng wss://");
  }

  if (env.VITE_ENABLE_FAULT_UI === "true") {
    warnings.push("⚠️  VITE_ENABLE_FAULT_UI=true: nút test DLQ sẽ hiện trên bản build này.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function loadMergedEnv(root = process.cwd(), processEnv = process.env) {
  const files = [".env", ".env.local", ".env.production", ".env.production.local"];
  const merged = Object.assign({}, ...files.map((f) => parseEnvFile(path.join(root, f))));
  for (const [k, v] of Object.entries(processEnv)) {
    if (k.startsWith("VITE_") && v !== undefined) merged[k] = v;
  }
  return merged;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

if (isMain) {
  const env = loadMergedEnv();
  const res = validateProductionEnv(env);
  res.warnings.forEach((w) => console.warn(w));
  if (!res.ok) {
    console.error("❌ check-env thất bại:\n - " + res.errors.join("\n - "));
    process.exit(1);
  }
  console.log("✅ check-env OK – bản build trỏ tới AWS thật.");
}
