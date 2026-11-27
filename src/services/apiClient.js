// FILE: src/services/apiClient.js
import { getIdToken, USE_MOCK } from "./auth.js";
import { ApiError } from "./errors.js";
import * as mock from "./mockBackend.js";

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};
const REST = (ENV.VITE_REST_API_URL || "").replace(/\/$/, "");
const WS_URL = ENV.VITE_WS_URL || "";
const AUTH_SCHEME = (ENV.VITE_AUTH_HEADER_PREFIX || "").trim();
const PING_MS = 5 * 60 * 1000;

export const AI_ENABLED = ENV.VITE_ENABLE_AI === "true";
export const EVENTS = new Set(["NEW_MESSAGE", "OUTBOUND_MESSAGE", "CONVERSATION_UPDATED"]);

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// conversationId có ký tự '#': BẮT BUỘC encodeURIComponent
export const convPath = (id) => `/conversations/${encodeURIComponent(id)}`;

async function request(method, path, body) {
  if (USE_MOCK) return mock.handle(method, path, body);

  let token;
  try {
    token = await getIdToken();
  } catch {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(401, { error: "Not authenticated" });
  }

  const res = await fetch(`${REST}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH_SCHEME ? `${AUTH_SCHEME} ${token}` : token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(401, data);
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// ---------- REST (Cognito bắt buộc) ----------
export const listConversations = (params) => request("GET", `/conversations${qs(params)}`);
export const listMessages = (conversationId, params) =>
  request("GET", `${convPath(conversationId)}/messages${qs(params)}`);
export const patchConversation = (conversationId, patch) =>
  request("PATCH", convPath(conversationId), patch);
export const sendReply = ({ conversationId, content, retryOfMessageId, requestId }) =>
  request("POST", "/messages/reply", { conversationId, content, retryOfMessageId, requestId });
export const requestWsTicket = () => request("POST", "/ws-ticket");
export const suggestReplies = (conversationId) => request("POST", "/ai/suggest", { conversationId });

// ---------- Simulator Webhook (cô lập để dễ đổi route có Cognito nếu nhóm chọn ở Amendment #4) ----------
export async function sendSimulatorMessage(channel, payload) {
  if (USE_MOCK) return mock.handle("POST", `/webhook/${encodeURIComponent(channel)}`, payload);
  const res = await fetch(`${REST}/webhook/${encodeURIComponent(channel)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// ---------- WebSocket (one-time ticket + ping 5p + backoff + resync + dừng khi 401) ----------
export function connectRealtime({ onEvent, onStatus = () => {}, onResync = () => {} }) {
  if (USE_MOCK) return mock.subscribe(onEvent, onStatus);

  let ws = null;
  let closed = false;
  let attempt = 0;
  let pingTimer = null;
  let retryTimer = null;
  const seen = new Set();

  function scheduleReconnect() {
    if (closed) return;
    onStatus("reconnecting");
    const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
    attempt += 1;
    retryTimer = setTimeout(open, delay);
  }

  async function open() {
    if (closed) return;
    onStatus("connecting");
    let ticket;
    try {
      ({ ticket } = await requestWsTicket());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        closed = true;
        return;
      }
      return scheduleReconnect();
    }
    if (closed) return;

    ws = new WebSocket(`${WS_URL}?ticket=${encodeURIComponent(ticket)}`);

    ws.onopen = () => {
      attempt = 0;
      onStatus("connected");
      onResync();
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "ping" }));
      }, PING_MS);
    };

    ws.onmessage = (ev) => {
      let evt;
      try {
        evt = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!evt || !EVENTS.has(evt.event)) return;
      if (evt.message) {
        const k = JSON.stringify([evt.event, evt.message.conversationId, evt.message.messageId, evt.message.status]);
        if (seen.has(k)) return;
        if (seen.size > 500) seen.clear();
        seen.add(k);
      }
      onEvent(evt);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  open();
  return {
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      if (ws) ws.close();
    },
  };
}
