// Gom nhóm tin nhắn liên tiếp cùng người gửi trong vòng 5 phút và chèn Date Divider.

const FIVE_MIN_MS = 5 * 60 * 1000;

function dayKey(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDayLabel(iso, nowMs = Date.now()) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date(nowMs);
  const todayStr = dayKey(now.toISOString());
  const yest = new Date(nowMs - 86_400_000);
  const yestStr = dayKey(yest.toISOString());
  const curStr = dayKey(iso);
  if (curStr === todayStr) return "Hôm nay";
  if (curStr === yestStr) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function senderSignature(msg) {
  if (!msg) return "";
  return `${msg.direction || ""}#${msg.agentId || msg.senderId || msg.senderName || ""}`;
}

export function groupMessages(messages = [], nowMs = Date.now()) {
  const items = [];
  let prevDay = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const curDay = dayKey(msg.createdAt);
    if (curDay !== prevDay && curDay !== "unknown") {
      items.push({
        type: "date",
        id: `date-${curDay}-${i}`,
        label: formatDayLabel(msg.createdAt, nowMs),
      });
      prevDay = curDay;
    }

    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const samePrevSender =
      prev &&
      dayKey(prev.createdAt) === curDay &&
      senderSignature(prev) === senderSignature(msg) &&
      Math.abs(Date.parse(msg.createdAt || 0) - Date.parse(prev.createdAt || 0)) <= FIVE_MIN_MS;

    const sameNextSender =
      next &&
      dayKey(next.createdAt) === curDay &&
      senderSignature(next) === senderSignature(msg) &&
      Math.abs(Date.parse(next.createdAt || 0) - Date.parse(msg.createdAt || 0)) <= FIVE_MIN_MS;

    items.push({
      type: "message",
      id: msg.messageId || `msg-${i}`,
      msg,
      isGroupStart: !samePrevSender,
      isGroupEnd: !sameNextSender,
    });
  }

  return items;
}
