// FILE: src/services/inboxReducer.js
// Pure reducer: không I/O, không mất tin WS mới khi REST trả chậm, không để sự kiện cũ đè mới.

export function sortConversations(list) {
  return [...list].sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
}

export function upsertConversation(list, conv) {
  if (!conv || !conv.conversationId) return list;
  const idx = list.findIndex((c) => c.conversationId === conv.conversationId);
  if (idx < 0) return sortConversations([conv, ...list]);

  const prev = list[idx];
  const incomingIsOlder =
    prev.lastMessageAt && conv.lastMessageAt && conv.lastMessageAt < prev.lastMessageAt;

  // Bảo vệ phần xem trước tin cuối không bị sự kiện cũ hơn ghi đè,
  // nhưng vẫn nhận status / assignedAgent / unreadCount mới nhất (PATCH không đổi lastMessageAt).
  const merged = incomingIsOlder
    ? {
        ...prev,
        ...conv,
        lastMessage: prev.lastMessage,
        lastMessageAt: prev.lastMessageAt,
      }
    : { ...prev, ...conv };

  const next = list.map((c, k) => (k === idx ? merged : c));
  return sortConversations(next);
}

export function mergeConversationList(existing, incoming) {
  let next = [...existing];
  for (const conv of incoming || []) {
    next = upsertConversation(next, conv);
  }
  return next;
}

// Chống trùng theo messageId; cập nhật tại chỗ (ví dụ FAILED -> SENT khi retry)
// Không cho FAILED ghi đè ngược SENT nếu gói cũ về trễ.
export function mergeMessage(list, msg) {
  if (!msg || !msg.messageId) return list;
  const idx = list.findIndex((m) => m.messageId === msg.messageId);
  if (idx >= 0) {
    const prev = list[idx];
    if ((prev.status === "SENT" && msg.status !== "SENT") ||
        (prev.status === "UNKNOWN" && msg.status === "SENDING")) {
      return list;
    }
    const next = [...list];
    next[idx] = { ...prev, ...msg };
    return next;
  }
  return [...list, msg].sort((a, b) => a.messageId.localeCompare(b.messageId));
}

// Hợp nhất mảng tin REST với các tin hiện có (bao gồm tin WS mới đến trong lúc REST đang bay)
export function mergeMessageList(existing = [], incoming = []) {
  let next = [...existing];
  for (const msg of incoming || []) {
    next = mergeMessage(next, msg);
  }
  return next;
}

export function applyEvent(state, evt) {
  if (!evt) return state;
  const convId = evt.conversation?.conversationId || evt.message?.conversationId;
  let next = evt.conversation
    ? { ...state, conversations: upsertConversation(state.conversations, evt.conversation) }
    : state;

  if ((evt.event === "NEW_MESSAGE" || evt.event === "OUTBOUND_MESSAGE") && evt.message && convId) {
    const cur = next.messages[convId];
    // Chỉ merge khi lịch sử của hội thoại này đã được nạp (hoặc khởi tạo nếu đang mở)
    if (cur) {
      next = {
        ...next,
        messages: { ...next.messages, [convId]: mergeMessage(cur, evt.message) },
      };
    }
  }
  return next;
}

export function reducer(state, action) {
  switch (action.type) {
    case "conversations":
      return { ...state, conversations: mergeConversationList(state.conversations, action.list) };
    case "replaceConversations":
      return { ...state, conversations: sortConversations(action.list || []) };
    case "moreConversations":
      return { ...state, conversations: mergeConversationList(state.conversations, action.list) };
    case "messages":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.id]: mergeMessageList(state.messages[action.id] || [], action.list),
        },
      };
    case "olderMessages":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.id]: mergeMessageList(state.messages[action.id] || [], action.list),
        },
      };
    case "conversation":
      return { ...state, conversations: upsertConversation(state.conversations, action.conversation) };
    case "event":
      return applyEvent(state, action.evt);
    case "reset":
      return { conversations: [], messages: {} };
    default:
      return state;
  }
}
