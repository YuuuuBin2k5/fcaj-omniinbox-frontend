// FILE: src/services/uiFormat.js
// Pure UI formatting, search highlight & validation utilities (không phụ thuộc DOM, dễ unit test).

/**
 * Rút gọn email nhân viên hiển thị gọn trên bong bóng & header (giữ full email ở tooltip).
 * Ví dụ: "agent.minh@omniinbox.local" -> "agent.minh"
 */
export function formatAgentShort(agent) {
  const raw = String(agent || "").trim();
  if (!raw || raw === "unassigned") return raw || "unassigned";
  const atIdx = raw.indexOf("@");
  return atIdx > 0 ? raw.slice(0, atIdx) : raw;
}

/**
 * Tách chuỗi JSON thành mảng token màu cú pháp an toàn (không dùng dangerouslySetInnerHTML).
 */
export function tokenizeJson(input) {
  const src = String(input ?? "");
  const tokens = [];
  const re =
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\]:,])|(\s+|[^\s{}[\]:,"]+)/g;

  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[1]) tokens.push({ type: "key", value: m[1] });
    else if (m[2]) tokens.push({ type: "string", value: m[2] });
    else if (m[3]) tokens.push({ type: "boolean", value: m[3] });
    else if (m[4]) tokens.push({ type: "null", value: m[4] });
    else if (m[5]) tokens.push({ type: "number", value: m[5] });
    else if (m[6]) tokens.push({ type: "punct", value: m[6] });
    else tokens.push({ type: "text", value: m[0] });
  }
  return tokens;
}

/**
 * Tách đoạn văn thành các phần khớp/không khớp với từ khóa tìm kiếm (an toàn XSS, không phân biệt hoa thường).
 */
export function splitHighlight(text, query) {
  const source = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q || !source) return [{ text: source, match: false }];

  const lowerSrc = source.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts = [];
  let start = 0;

  while (start < source.length) {
    const idx = lowerSrc.indexOf(lowerQ, start);
    if (idx === -1) {
      parts.push({ text: source.slice(start), match: false });
      break;
    }
    if (idx > start) {
      parts.push({ text: source.slice(start, idx), match: false });
    }
    parts.push({ text: source.slice(idx, idx + q.length), match: true });
    start = idx + q.length;
  }

  return parts.length ? parts : [{ text: source, match: false }];
}

/**
 * Đánh giá nhanh các tiêu chí mật khẩu chuẩn Cognito cho bước NEW_PASSWORD_REQUIRED.
 */
export function evaluatePasswordRules(password) {
  const pwd = String(password ?? "");
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /\d/.test(pwd),
  };
}
