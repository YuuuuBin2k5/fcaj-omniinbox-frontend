import test from "node:test";
import assert from "node:assert/strict";
import {
  applyEvent,
  mergeMessage,
  mergeMessageList,
  reducer,
  upsertConversation,
} from "../src/services/inboxReducer.js";

test("Phép thử #1: hai khách cùng tên hiển thị khác conversationId tách biệt hoàn toàn", () => {
  const convA = {
    conversationId: "CONV#shopee#shopee_a1",
    channel: "shopee",
    customerId: "shopee_a1",
    customerName: "Nguyễn Văn A",
    lastMessage: "Chào shop A1",
    lastMessageAt: "2026-11-27T01:00:00.000Z",
    status: "OPEN",
    assignedAgent: "unassigned",
    unreadCount: 1,
  };
  const convB = {
    conversationId: "CONV#shopee#shopee_a2",
    channel: "shopee",
    customerId: "shopee_a2",
    customerName: "Nguyễn Văn A",
    lastMessage: "Chào shop A2",
    lastMessageAt: "2026-11-27T01:01:00.000Z",
    status: "OPEN",
    assignedAgent: "unassigned",
    unreadCount: 1,
  };

  let state = { conversations: [], messages: {} };
  state = reducer(state, { type: "conversations", list: [convA, convB] });
  assert.equal(state.conversations.length, 2);
  assert.equal(state.conversations[0].conversationId, "CONV#shopee#shopee_a2");

  state = reducer(state, {
    type: "messages",
    id: convA.conversationId,
    list: [{ messageId: "MSG#1#1", conversationId: convA.conversationId, content: "Tin A1" }],
  });
  state = reducer(state, {
    type: "messages",
    id: convB.conversationId,
    list: [{ messageId: "MSG#2#1", conversationId: convB.conversationId, content: "Tin A2" }],
  });

  assert.deepEqual(
    state.messages[convA.conversationId].map((m) => m.content),
    ["Tin A1"]
  );
  assert.deepEqual(
    state.messages[convB.conversationId].map((m) => m.content),
    ["Tin A2"]
  );
});

test("Phép thử #2: REST trả lịch sử cũ về SAU WebSocket NEW_MESSAGE không xóa mất tin mới và không tạo trùng", () => {
  const cid = "CONV#shopee#shopee_a1";
  const oldMsg1 = {
    conversationId: cid,
    messageId: "MSG#1732200001000#m1",
    content: "Tin cũ 1",
    status: "RECEIVED",
  };
  const wsNewMsg = {
    conversationId: cid,
    messageId: "MSG#1732200009000#m2",
    content: "Tin mới qua WS",
    status: "RECEIVED",
  };

  // Mở hội thoại A, khởi tạo mảng trống trước hoặc đã có 1 tin
  let state = {
    conversations: [
      {
        conversationId: cid,
        lastMessage: "Tin cũ 1",
        lastMessageAt: "2026-11-27T01:00:00.000Z",
        status: "OPEN",
        assignedAgent: "unassigned",
      },
    ],
    messages: { [cid]: [oldMsg1] },
  };

  // WebSocket đẩy tin mới tới trước khi REST listMessages trả về
  state = reducer(state, {
    type: "event",
    evt: {
      event: "NEW_MESSAGE",
      conversation: {
        conversationId: cid,
        lastMessage: "Tin mới qua WS",
        lastMessageAt: "2026-11-27T01:05:00.000Z",
        status: "OPEN",
        assignedAgent: "unassigned",
      },
      message: wsNewMsg,
    },
  });

  // REST listMessages cũ về muộn hơn (chỉ chứa oldMsg1)
  state = reducer(state, { type: "messages", id: cid, list: [oldMsg1] });

  assert.equal(state.messages[cid].length, 2);
  assert.deepEqual(
    state.messages[cid].map((m) => m.messageId),
    ["MSG#1732200001000#m1", "MSG#1732200009000#m2"]
  );
});

test("Phép thử #3: HTTP 200 status=FAILED rồi Retry -> SENT cập nhật tại chỗ, không cho FAILED cũ đè ngược SENT", () => {
  const cid = "CONV#telegram#678901234";
  const failedMsg = {
    conversationId: cid,
    messageId: "MSG#1732200010000#OUT-1",
    direction: "OUTBOUND",
    content: "Dạ còn size L ạ",
    status: "FAILED",
    errorDetail: "Telegram timeout",
  };

  let list = mergeMessage([], failedMsg);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "FAILED");

  // Retry thành công -> cập nhật cùng messageId thành SENT
  const sentMsg = { ...failedMsg, status: "SENT", errorDetail: undefined };
  list = mergeMessage(list, sentMsg);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "SENT");

  // Sự kiện FAILED cũ đến trễ không được đè ngược SENT
  list = mergeMessage(list, failedMsg);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "SENT");
});

test("upsertConversation bảo vệ lastMessageAt cũ nhưng vẫn nhận cập nhật assignedAgent/status từ PATCH", () => {
  const cid = "CONV#telegram#123";
  const newer = {
    conversationId: cid,
    lastMessage: "Tin mới nhất",
    lastMessageAt: "2026-11-27T02:00:00.000Z",
    status: "IN_PROGRESS",
    assignedAgent: "agent.minh@omniinbox.local",
  };
  const staleEventWithHandover = {
    conversationId: cid,
    lastMessage: "Tin cũ hơn",
    lastMessageAt: "2026-11-27T01:00:00.000Z",
    status: "RESOLVED",
    assignedAgent: "agent.lan@omniinbox.local",
  };

  const out = upsertConversation([newer], staleEventWithHandover);
  assert.equal(out.length, 1);
  assert.equal(out[0].lastMessage, "Tin mới nhất");
  assert.equal(out[0].lastMessageAt, "2026-11-27T02:00:00.000Z");
  assert.equal(out[0].status, "RESOLVED");
  assert.equal(out[0].assignedAgent, "agent.lan@omniinbox.local");
});

test("mergeMessageList & moreConversations khử trùng khi nạp nhiều trang", () => {
  const m1 = { messageId: "MSG#1#a", content: "1" };
  const m2 = { messageId: "MSG#2#b", content: "2" };
  const merged = mergeMessageList([m2], [m1, m2]);
  assert.deepEqual(
    merged.map((m) => m.messageId),
    ["MSG#1#a", "MSG#2#b"]
  );

  const s1 = reducer(
    { conversations: [{ conversationId: "C1", lastMessageAt: "2026-11-27T02:00:00.000Z" }], messages: {} },
    {
      type: "moreConversations",
      list: [
        { conversationId: "C1", lastMessageAt: "2026-11-27T02:00:00.000Z" },
        { conversationId: "C2", lastMessageAt: "2026-11-27T01:00:00.000Z" },
      ],
    }
  );
  assert.equal(s1.conversations.length, 2);
});

test("applyEvent cập nhật conversation khi tin nhắn lịch sử chưa mở", () => {
  const next = applyEvent(
    { conversations: [], messages: {} },
    {
      event: "NEW_MESSAGE",
      conversation: { conversationId: "C1", lastMessage: "Hi", lastMessageAt: "2026-11-27T01:00:00.000Z" },
      message: { conversationId: "C1", messageId: "MSG#1#1", content: "Hi" },
    }
  );
  assert.equal(next.conversations.length, 1);
  assert.equal(next.messages.C1, undefined);
});
