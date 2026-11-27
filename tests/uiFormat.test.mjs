import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePasswordRules,
  filterLocalMacros,
  formatAgentShort,
  formatRelativeTime,
  splitHighlight,
  tokenizeJson,
} from "../src/services/uiFormat.js";

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

test("formatRelativeTime định dạng Vừa xong, phút, trong ngày, Hôm qua và DD/MM", () => {
  const now = new Date(2026, 10, 27, 14, 30, 0).getTime();
  assert.equal(formatRelativeTime("", now), "");
  assert.equal(formatRelativeTime(now - 15_000, now), "Vừa xong");
  assert.equal(formatRelativeTime(now - 12 * 60_000, now), "12p");
  assert.match(formatRelativeTime(new Date(2026, 10, 27, 9, 5, 0).getTime(), now), /09:05/);
  assert.equal(formatRelativeTime(new Date(2026, 10, 26, 18, 0, 0).getTime(), now), "Hôm qua");
  assert.equal(formatRelativeTime(new Date(2026, 10, 20, 10, 0, 0).getTime(), now), "20/11");
});

test("filterLocalMacros lọc chính xác theo lệnh / và trả toàn bộ khi mới gõ /", () => {
  const macros = [
    { cmd: "/chao", text: "Chào bạn" },
    { cmd: "/ship", text: "Giao hàng nhanh" },
  ];
  assert.equal(filterLocalMacros(macros, "/").length, 2);
  assert.deepEqual(
    filterLocalMacros(macros, "/sh").map((m) => m.cmd),
    ["/ship"]
  );
  assert.deepEqual(
    filterLocalMacros(macros, "/ch").map((m) => m.cmd),
    ["/chao"]
  );
  assert.equal(filterLocalMacros(macros, "/khongco").length, 0);
});
