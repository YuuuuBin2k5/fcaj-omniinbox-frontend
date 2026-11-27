// FILE: src/services/mockBackend.js
// Giả lập đồng bộ 100% hợp đồng 7 endpoint + 3 event WS qua localStorage + BroadcastChannel.
import { ApiError } from "./errors.js";
import { getAgentName } from "./auth.js";

const KEY = "omni_mock_db";
const CHANNELS = ["telegram", "shopee", "zalo", "webchat"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const memStore = new Map();
function storage() {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return {
    getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: (k, v) => memStore.set(k, String(v)),
    removeItem: (k) => memStore.delete(k),
  };
}

const bus =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("omni_mock_bus")
    : null;
const listeners = new Set();

const fresh = () => ({ conversations: {}, messages: {}, idem: {} });

function load() {
  try {
    return JSON.parse(storage().getItem(KEY)) || fresh();
  } catch {
    return fresh();
  }
}

function save(db) {
  storage().setItem(KEY, JSON.stringify(db));
}

export function resetMock() {
  storage().removeItem(KEY);
}

const mid = (ms, channelMessageId) => `MSG#${String(ms).padStart(13, "0")}#${channelMessageId}`;

const publicConv = (c) => {
  if (!c) return c;
  const { gsi1pk, ...rest } = c;
  return rest;
};

function emit(evt) {
  listeners.forEach((fn) => fn(evt));
  if (bus) bus.postMessage(evt);
}

export function subscribe(onEvent, onStatus = () => {}) {
  listeners.add(onEvent);
  const handler = (e) => onEvent(e.data);
  if (bus) bus.addEventListener("message", handler);
  onStatus("mock");
  return {
    close() {
      listeners.delete(onEvent);
      if (bus) bus.removeEventListener("message", handler);
    },
  };
}

function extractTelegramContent(m = {}) {
  if (typeof m.text === "string" && m.text.trim()) {
    return { content: m.text, mediaType: undefined };
  }
  let media = null;
  if (Array.isArray(m.photo) && m.photo.length > 0) {
    media = { mediaType: "photo", label: "Hình ảnh" };
  } else if (m.document) {
    const fileName = String(m.document.file_name || "").trim();
    media = { mediaType: "document", label: fileName ? `Tệp: ${fileName}` : "Tệp đính kèm" };
  } else if (m.voice) {
    media = { mediaType: "voice", label: "Tin nhắn thoại" };
  } else if (m.audio) {
    media = { mediaType: "audio", label: "Âm thanh" };
  } else if (m.video || m.video_note) {
    media = { mediaType: "video", label: "Video" };
  } else if (m.sticker) {
    const emoji = m.sticker.emoji ? ` ${m.sticker.emoji}` : "";
    media = { mediaType: "sticker", label: `Sticker${emoji}` };
  } else if (m.location) {
    media = { mediaType: "location", label: "Vị trí" };
  } else if (m.contact) {
    media = { mediaType: "contact", label: "Danh bạ" };
  }
  const caption = typeof m.caption === "string" ? m.caption.trim() : "";
  if (media && caption) return { content: `[${media.label}] ${caption}`, mediaType: media.mediaType };
  if (media) {
    return {
      content: `[Khách gửi ${media.label} — chưa hỗ trợ hiển thị media]`,
      mediaType: media.mediaType,
    };
  }
  if (caption) return { content: caption, mediaType: undefined };
  return null;
}

// ---- 1. POST /webhook/{channel} ----
function ingest(channel, payload = {}) {
  const ch = String(channel || "").toLowerCase();
  if (!CHANNELS.includes(ch)) throw new ApiError(404, { error: "Unknown channel" });
  const db = load();
  const now = Date.now();
  let senderId, msgId, name, text, mediaType;
  let createdAtMs = now;
  let clientSentAtMs;

  if (ch === "telegram") {
    const m = payload.message;
    if (!m || m.chat?.id === undefined || m.message_id === undefined) {
      return { ok: true, status: "IGNORED" };
    }
    const extracted = extractTelegramContent(m);
    if (!extracted) return { ok: true, status: "IGNORED" };
    senderId = String(m.chat.id);
    msgId = String(m.message_id);
    name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") || m.from?.username || `Telegram #${senderId}`;
    text = extracted.content;
    mediaType = extracted.mediaType;
    const rawSec = m.date !== undefined ? Number(m.date) : NaN;
    if (Number.isFinite(rawSec)) {
      createdAtMs = Math.floor(now / 1000) === rawSec ? now : rawSec * 1000;
    }
  } else {
    if (payload.forceError === true) {
      return {
        ok: true,
        status: "QUEUED",
        channel: ch,
        note: "Mock không có SQS/DLQ – chỉ backend thật mới đẩy vào omni-inbound-dlq",
      };
    }
    senderId = String(payload.customerId || "guest_001").trim() || "guest_001";
    msgId = String(payload.externalMessageId || now);
    name = payload.customerName || `Khách ${ch.toUpperCase()}`;
    text = String(payload.text ?? payload.content ?? "");
    const sentAt = Number(payload.sentAtMs);
    if (Number.isFinite(sentAt)) clientSentAtMs = sentAt;
  }

  if (!text.trim()) return { ok: true, status: "IGNORED" };
  text = text.slice(0, 4000);

  // Khóa idempotency PHẢI gồm senderId (chat.id cho Telegram)
  const key = `${ch}#${senderId}#${msgId}`;
  if (db.idem[key]) {
    console.log(`[IDEMPOTENCY] Duplicate message skipped: ${key}`);
    return { ok: true, status: "QUEUED", channel: ch };
  }
  db.idem[key] = { state: "DONE", at: now };

  const conversationId = `CONV#${ch}#${senderId}`;
  const prev = db.conversations[conversationId];
  const createdAt = new Date(createdAtMs).toISOString();
  const status = !prev || prev.status === "RESOLVED" ? "OPEN" : prev.status;

  const message = {
    conversationId,
    messageId: mid(createdAtMs, msgId),
    channel: ch,
    channelMessageId: msgId,
    direction: "INBOUND",
    senderId,
    senderName: name,
    content: text,
    ...(mediaType ? { mediaType } : {}),
    status: "RECEIVED",
    createdAt,
    ...(clientSentAtMs !== undefined ? { clientSentAtMs } : {}),
  };

  const conv = {
    conversationId,
    gsi1pk: "CONV",
    channel: ch,
    customerId: senderId,
    customerName: name,
    lastMessage: text,
    lastMessageAt: createdAt,
    lastMessageDirection: "INBOUND",
    lastInboundAt: createdAt,
    status,
    assignedAgent: prev ? prev.assignedAgent : "unassigned",
    unreadCount: (prev ? prev.unreadCount : 0) + 1,
  };

  (db.messages[conversationId] = db.messages[conversationId] || []).push(message);
  db.conversations[conversationId] = conv;
  save(db);
  emit({ event: "NEW_MESSAGE", conversation: publicConv(conv), message: { ...message } });
  return { ok: true, status: "QUEUED", channel: ch };
}

// ---- 2. GET /conversations ----
function listConversations(q) {
  const db = load();
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 100);
  let list = Object.values(db.conversations).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  if (q.channel) list = list.filter((c) => c.channel === q.channel.toLowerCase());
  if (q.status) {
    if (!STATUSES.includes(q.status)) throw new ApiError(400, { error: "Invalid status filter" });
    list = list.filter((c) => c.status === q.status);
  }
  const offset = q.nextToken ? Number(atob(q.nextToken)) : 0;
  const page = list.slice(offset, offset + limit).map(publicConv);
  const next = offset + limit < list.length ? btoa(String(offset + limit)) : null;
  return { conversations: page, nextToken: next };
}

// ---- 3. GET /conversations/{id}/messages ----
function listMessages(id, q) {
  const db = load();
  if (!db.conversations[id]) return { conversationId: id, messages: [], nextToken: null };
  const all = (db.messages[id] || []).slice().sort((a, b) => a.messageId.localeCompare(b.messageId, "en", { numeric: true }));
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 100);
  const end = q.nextToken ? Number(atob(q.nextToken)) : all.length;
  const start = Math.max(0, end - limit);
  return {
    conversationId: id,
    messages: all.slice(start, end),
    nextToken: start > 0 ? btoa(String(start)) : null,
  };
}

// ---- 4. PATCH /conversations/{id} ----
function patchConversation(id, body = {}) {
  const db = load();
  const conv = db.conversations[id];
  if (!conv) throw new ApiError(404, { error: "Conversation not found" });

  const { status, assignedAgent, expectedAssignedAgent, expectedLastMessageAt, unreadCount } = body;
  if (status === undefined && assignedAgent === undefined && unreadCount === undefined) {
    throw new ApiError(400, { error: "Nothing to update" });
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new ApiError(400, { error: "Invalid status" });
  }
  if (assignedAgent !== undefined) {
    const trimmed = typeof assignedAgent === "string" ? assignedAgent.trim() : "";
    if (!trimmed || trimmed.length > 50) {
      throw new ApiError(400, { error: "Invalid assignedAgent" });
    }
  }
  if (unreadCount !== undefined) {
    const n = Number(unreadCount);
    if (!Number.isInteger(n) || n < 0) throw new ApiError(400, { error: "Invalid unreadCount" });
  }
  if (expectedAssignedAgent !== undefined && conv.assignedAgent !== expectedAssignedAgent) {
    throw new ApiError(409, { error: "ASSIGNMENT_CONFLICT", conversation: publicConv(conv) });
  }
  if (expectedLastMessageAt !== undefined && conv.lastMessageAt !== expectedLastMessageAt) {
    throw new ApiError(409, { error: "STALE_CONVERSATION", conversation: publicConv(conv) });
  }

  if (status !== undefined) conv.status = status;
  if (assignedAgent !== undefined) conv.assignedAgent = assignedAgent.trim();
  if (unreadCount !== undefined) conv.unreadCount = Number(unreadCount);

  save(db);
  const pub = publicConv(conv);
  emit({ event: "CONVERSATION_UPDATED", conversation: pub });
  return { conversation: pub };
}

// ---- 5. POST /messages/reply ----
// Đồng bộ tuyệt đối với omni-outbound-sender:
// - Ownership guard 409 nếu đang thuộc nhân viên khác; pre-claim nếu đang unassigned.
// - Không chuyển OPEN -> IN_PROGRESS, không xóa unreadCount, không ghi đè lastMessage khi FAILED.
function reply(body = {}) {
  const st = storage();
  if (st.getItem("omni_mock_timeout_next") === "1") {
    st.removeItem("omni_mock_timeout_next");
    throw new TypeError("Mock network timeout while calling /messages/reply");
  }

  const db = load();
  const { conversationId, content, retryOfMessageId, requestId } = body;
  const conv = db.conversations[conversationId];
  if (!conv) throw new ApiError(404, { error: "Conversation not found" });

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!retryOfMessageId && !trimmed) throw new ApiError(400, { error: "Missing content" });
  if (trimmed.length > 4000) throw new ApiError(400, { error: "Invalid content" });

  const agent = getAgentName() || "agent";
  if (conv.assignedAgent && conv.assignedAgent !== "unassigned" && conv.assignedAgent !== agent) {
    throw new ApiError(409, {
      error: "CONVERSATION_ASSIGNED_TO_OTHER",
      message: `Conversation is assigned to ${conv.assignedAgent}`,
      conversation: publicConv(conv),
    });
  }
  if (!conv.assignedAgent || conv.assignedAgent === "unassigned") {
    conv.assignedAgent = agent;
  }

  const list = db.messages[conversationId] || (db.messages[conversationId] = []);
  if (!retryOfMessageId && requestId) {
    const reqMsgId = mid(String(requestId).slice(0, 13), `OUT-${requestId}`);
    const existingReq = list.find((m) => m.messageId === reqMsgId);
    if (existingReq && existingReq.agentId === agent && existingReq.content === trimmed) {
      save(db);
      return {
        ok: existingReq.status === "SENT",
        message: { ...existingReq },
        conversation: publicConv(conv),
      };
    }
  }

  const fail = st.getItem("omni_mock_fail_next") === "1";
  if (fail) st.removeItem("omni_mock_fail_next");

  const status = fail ? "FAILED" : "SENT";
  const errorDetail = fail ? "Mock: lỗi gửi giả lập (Telegram API timeout/error)" : undefined;
  const nowIso = new Date().toISOString();
  const deliveredVia = conv.channel === "telegram" ? "telegram" : "simulator";

  let msg;
  if (retryOfMessageId) {
    msg = list.find((m) => m.messageId === retryOfMessageId);
    if (!msg) throw new ApiError(404, { error: "Message to retry not found" });
    if (msg.direction !== "OUTBOUND" || msg.status !== "FAILED") {
      throw new ApiError(400, { error: "Only FAILED outbound messages can be retried" });
    }
    msg.status = status;
    msg.errorDetail = errorDetail;
    msg.deliveredVia = deliveredVia;
    msg.agentId = agent;
    msg.retriedAt = nowIso;
  } else {
    const ms = Date.now();
    const outId = requestId ? `OUT-${requestId}` : `OUT-${ms}-${Math.floor(Math.random() * 1000)}`;
    const msgId = requestId ? mid(String(requestId).slice(0, 13), outId) : mid(ms, outId);
    msg = {
      conversationId,
      messageId: msgId,
      channel: conv.channel,
      channelMessageId: outId,
      direction: "OUTBOUND",
      senderId: agent,
      senderName: agent,
      agentId: agent,
      content: trimmed,
      status,
      deliveredVia,
      errorDetail,
      createdAt: nowIso,
    };
    list.push(msg);
  }

  if (status === "SENT") {
    if (conv.status === "OPEN") conv.status = "IN_PROGRESS";
    conv.unreadCount = 0;
    if (!retryOfMessageId) {
      conv.lastMessage = `[NV] ${trimmed}`.slice(0, 200);
      conv.lastMessageAt = nowIso;
      conv.lastMessageDirection = "OUTBOUND";
    }
  }

  save(db);
  const pub = publicConv(conv);
  emit({ event: "OUTBOUND_MESSAGE", conversation: pub, message: { ...msg } });
  return { ok: status === "SENT", message: { ...msg }, conversation: pub };
}

// ---- 6. POST /ws-ticket ----
function wsTicket(body = {}) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const clientType = body?.clientType === "simulator" ? "simulator" : "portal";
  return { ticket: `mock-${id}`, expiresAt: Date.now() + 60000, clientType };
}

// ---- 7. POST /ai/suggest (pha 2) ----
function suggest(body = {}) {
  const db = load();
  if (!db.conversations[body.conversationId]) throw new ApiError(404, { error: "Conversation not found" });
  const source = storage().getItem("omni_mock_ai") === "bedrock" ? "bedrock" : "fallback";
  return {
    source,
    suggestions: [
      "Dạ chào anh/chị, mẫu này bên em còn size, anh/chị cho em xin chiều cao cân nặng để tư vấn size nhé ạ!",
      "Dạ bên em hỗ trợ đổi size trong 7 ngày ạ.",
      "Dạ anh/chị cho em xin SĐT và địa chỉ để em lên đơn nhé ạ!",
    ],
  };
}

// Helper tạo dữ liệu mẫu kiểm thử nhanh trên Mock Mode (2 khách trùng tên hoặc 60 hội thoại phân trang)
export function seedSameNamePair() {
  const now = Date.now();
  ingest("shopee", {
    externalMessageId: `seed_a1_${now}`,
    customerId: "shopee_a1",
    customerName: "Nguyễn Văn A",
    text: "Shop ơi áo khoác mã A1 còn size M không?",
    sentAtMs: now - 5000,
  });
  ingest("shopee", {
    externalMessageId: `seed_a2_${now}`,
    customerId: "shopee_a2",
    customerName: "Nguyễn Văn A",
    text: "Mình hỏi đơn hàng của khách A2 ạ",
    sentAtMs: now - 2000,
  });
}

export function seedManyForPagination(count = 60) {
  const db = load();
  const base = Date.now() - count * 60000;
  for (let i = 1; i <= count; i++) {
    const cid = `CONV#zalo#pag_user_${String(i).padStart(3, "0")}`;
    const ms = base + i * 60000;
    const iso = new Date(ms).toISOString();
    const isOldResolved = i === 5;
    db.conversations[cid] = {
      conversationId: cid,
      gsi1pk: "CONV",
      channel: "zalo",
      customerId: `pag_user_${String(i).padStart(3, "0")}`,
      customerName: `Khách phân trang #${i} (Mô phỏng)`,
      lastMessage: isOldResolved ? "Đã chốt xong đơn ở trang 2" : `Tin nhắn mẫu #${i}`,
      lastMessageAt: iso,
      lastMessageDirection: "INBOUND",
      lastInboundAt: iso,
      status: isOldResolved ? "RESOLVED" : "OPEN",
      assignedAgent: "unassigned",
      unreadCount: isOldResolved ? 0 : 1,
    };
    db.messages[cid] = [
      {
        conversationId: cid,
        messageId: mid(ms, `pag_${i}`),
        channel: "zalo",
        channelMessageId: `pag_${i}`,
        direction: "INBOUND",
        senderId: `pag_user_${String(i).padStart(3, "0")}`,
        senderName: `Khách phân trang #${i}`,
        content: db.conversations[cid].lastMessage,
        status: "RECEIVED",
        createdAt: iso,
      },
    ];
  }
  save(db);
  emit({ event: "CONVERSATION_UPDATED", conversation: publicConv(Object.values(db.conversations)[0]) });
}

export async function handle(method, pathWithQuery, body = {}) {
  const delayMs = Number(storage().getItem("omni_mock_delay_ms")) || 40;
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

  const url = new URL(pathWithQuery, "http://mock.local");
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const q = Object.fromEntries(url.searchParams);

  if (method === "POST" && parts[0] === "webhook" && parts.length === 2) return ingest(parts[1], body);
  if (method === "GET" && parts[0] === "conversations" && parts.length === 1) return listConversations(q);
  if (method === "GET" && parts[0] === "conversations" && parts[2] === "messages") return listMessages(parts[1], q);
  if (method === "PATCH" && parts[0] === "conversations" && parts.length === 2) return patchConversation(parts[1], body);
  if (method === "POST" && parts[0] === "messages" && parts[1] === "reply") return reply(body);
  if (method === "POST" && parts[0] === "ws-ticket") return wsTicket(body);
  if (method === "POST" && parts[0] === "ai" && parts[1] === "suggest") return suggest(body);
  throw new ApiError(404, { error: "Route not found" });
}
