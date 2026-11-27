import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePasswordRules, formatAgentShort, splitHighlight, tokenizeJson } from "../src/services/uiFormat.js";

test("formatAgentShort rút gọn phần tên trước @ nhưng giữ nguyên unassigned và tên không có @", () => {
  assert.equal(formatAgentShort("agent.minh@omniinbox.local"), "agent.minh");
  assert.equal(formatAgentShort("agent.lan"), "agent.lan");
  assert.equal(formatAgentShort("unassigned"), "unassigned");
  assert.equal(formatAgentShort(""), "unassigned");
});

test("tokenizeJson phân loại chuẩn key, string, number, boolean, null và ghép lại giữ nguyên văn bản", () => {
  const sample = JSON.stringify({ status: "QUEUED", code: 200, ok: true, nextToken: null }, null, 2);
  const tokens = tokenizeJson(sample);
  assert.equal(
    tokens.map((t) => t.value).join(""),
    sample,
    "Nối toàn bộ token phải tái tạo y nguyên chuỗi JSON đầu vào"
  );
  assert.ok(tokens.some((t) => t.type === "key" && t.value === '"status"'));
  assert.ok(tokens.some((t) => t.type === "string" && t.value === '"QUEUED"'));
  assert.ok(tokens.some((t) => t.type === "number" && t.value === "200"));
  assert.ok(tokens.some((t) => t.type === "boolean" && t.value === "true"));
  assert.ok(tokens.some((t) => t.type === "null" && t.value === "null"));
});

test("splitHighlight tách chính xác các đoạn trùng khớp không phân biệt hoa thường và bảo toàn chuỗi gốc", () => {
  const parts = splitHighlight("Nguyễn Văn A (shopee_a1)", "A1");
  assert.equal(parts.map((p) => p.text).join(""), "Nguyễn Văn A (shopee_a1)");
  assert.deepEqual(
    parts.filter((p) => p.match).map((p) => p.text),
    ["a1"]
  );
  assert.deepEqual(splitHighlight("Khách mới", ""), [{ text: "Khách mới", match: false }]);
});

test("evaluatePasswordRules kiểm tra đủ 4 tiêu chí mật khẩu Cognito", () => {
  assert.deepEqual(evaluatePasswordRules("abc"), {
    minLength: false,
    hasUpper: false,
    hasLower: true,
    hasNumber: false,
  });
  assert.deepEqual(evaluatePasswordRules("OmniPass2026"), {
    minLength: true,
    hasUpper: true,
    hasLower: true,
    hasNumber: true,
  });
});
