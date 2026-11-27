import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Cài đặt localStorage giả lập cho Node trước khi import mockBackend
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { handle, resetMock, subscribe } = await import("../src/services/mockBackend.js");
const { convPath } = await import("../src/services/apiClient.js");
const { getAgentName } = await import("../src/services/auth.js");

const telegramFixture = JSON.parse(
  fs.readFileSync(path.resolve("src/fixtures/telegramUpdate.json"), "utf8")
);
const simulatorFixture = JSON.parse(
  fs.readFileSync(path.resolve("src/fixtures/simulatorPayload.json"), "utf8")
);

test("convPath luôn encodeURIComponent conversationId có dấu #", () => {
  assert.equal(convPath("CONV#telegram#678901234"), "/conversations/CONV%23telegram%23678901234");
});

test("getAgentName không fallback mock key khi USE_MOCK=false (môi trường Node/Cloud)", () => {
  globalThis.localStorage.setItem("omni_mock_agent", "hacked.mock");
  assert.equal(getAgentName(), null);
  globalThis.localStorage.clear();
});

test("Idempotency Telegram kèm chat.id, Simulator kèm customerId, Reopen RESOLVED -> OPEN giữ assignedAgent", async () => {
  resetMock();
  const events = [];
  const sub = subscribe((evt) => events.push(evt));

  // 1. Telegram fixture
  const r1 = await handle("POST", "/webhook/telegram", telegramFixture);
  assert.deepEqual(r1, { ok: true, status: "QUEUED", channel: "telegram" });

  // Gửi lặp lại cùng chat.id + message_id -> bị chặn trùng
  const r1Dup = await handle("POST", "/webhook/telegram", telegramFixture);
  assert.equal(r1Dup.status, "QUEUED");

  // Khách Telegram khác nhưng cùng message_id -> vẫn phải nhận
  const otherTg = structuredClone(telegramFixture);
  otherTg.message.chat.id = 999000111;
  otherTg.message.from.id = 999000111;
  await handle("POST", "/webhook/telegram", otherTg);

  // 2. Simulator fixture
  await handle("POST", "/webhook/shopee", simulatorFixture);
  await handle("POST", "/webhook/shopee", simulatorFixture); // trùng

  const convRes = await handle("GET", "/conversations?limit=50");
  assert.equal(convRes.nextToken, null);
  assert.equal(convRes.conversations.length, 3);

  const tgCid = "CONV#telegram#678901234";
  const msgRes = await handle("GET", `${convPath(tgCid)}/messages?limit=50`);
  assert.equal(msgRes.messages.length, 1);
  assert.equal(msgRes.nextToken, null);

  // 3. Phân công & xung đột 409
  const p1 = await handle("PATCH", convPath(tgCid), {
    assignedAgent: "agent.minh@omniinbox.local",
    expectedAssignedAgent: "unassigned",
  });
  assert.equal(p1.conversation.assignedAgent, "agent.minh@omniinbox.local");

  await assert.rejects(
    () =>
      handle("PATCH", convPath(tgCid), {
        assignedAgent: "agent.lan@omniinbox.local",
        expectedAssignedAgent: "unassigned",
      }),
    (err) => err.status === 409 && err.body?.conversation?.assignedAgent === "agent.minh@omniinbox.local"
  );

  // 4. Đổi RESOLVED rồi khách nhắn lại -> tự mở OPEN và giữ nguyên assignedAgent
  await handle("PATCH", convPath(tgCid), { status: "RESOLVED" });
  const followUp = structuredClone(telegramFixture);
  followUp.message.message_id = 998878;
  followUp.message.date = 1732264260;
  followUp.message.text = "Shop ơi còn hàng không?";
  await handle("POST", "/webhook/telegram", followUp);

  const afterReopen = (await handle("GET", "/conversations")).conversations.find((c) => c.conversationId === tgCid);
  assert.equal(afterReopen.status, "OPEN");
  assert.equal(afterReopen.assignedAgent, "agent.minh@omniinbox.local");

  assert.ok(events.some((e) => e.event === "NEW_MESSAGE"));
  assert.ok(events.some((e) => e.event === "CONVERSATION_UPDATED"));
  sub.close();
});

test("HTTP 200 status=FAILED không xóa unreadCount & Retry cập nhật cùng messageId thành SENT", async () => {
  resetMock();
  await handle("POST", "/webhook/telegram", telegramFixture);
  const tgCid = "CONV#telegram#678901234";

  // Bật cờ giả lập gửi lỗi
  globalThis.localStorage.setItem("omni_mock_fail_next", "1");
  const failRes = await handle("POST", "/messages/reply", {
    conversationId: tgCid,
    content: "Dạ mẫu này còn size L ạ",
  });
  assert.equal(failRes.ok, false);
  assert.equal(failRes.message.status, "FAILED");
  assert.equal(failRes.message.deliveredVia, "telegram");

  // unreadCount KHÔNG bị xóa khi FAILED
  const convAfterFail = (await handle("GET", "/conversations")).conversations.find((c) => c.conversationId === tgCid);
  assert.equal(convAfterFail.unreadCount, 1);

  // Retry cùng retryOfMessageId -> cập nhật tại chỗ thành SENT
  const retryRes = await handle("POST", "/messages/reply", {
    conversationId: tgCid,
    content: "Dạ mẫu này còn size L ạ",
    retryOfMessageId: failRes.message.messageId,
  });
  assert.equal(retryRes.ok, true);
  assert.equal(retryRes.message.messageId, failRes.message.messageId);
  assert.equal(retryRes.message.status, "SENT");

  const msgs = (await handle("GET", `${convPath(tgCid)}/messages`)).messages;
  assert.equal(msgs.length, 2);
  assert.equal(msgs[1].status, "SENT");

  const convAfterSent = (await handle("GET", "/conversations")).conversations.find((c) => c.conversationId === tgCid);
  assert.equal(convAfterSent.unreadCount, 0);
});

test("ws-ticket và ai/suggest hoạt động đúng hợp đồng", async () => {
  resetMock();
  const ticket = await handle("POST", "/ws-ticket");
  assert.ok(ticket.ticket.startsWith("mock-"));
  assert.ok(ticket.expiresAt > Date.now());

  await handle("POST", "/webhook/shopee", simulatorFixture);
  const ai = await handle("POST", "/ai/suggest", { conversationId: "CONV#shopee#shopee_user_889" });
  assert.equal(ai.source, "fallback");
  assert.equal(ai.suggestions.length, 3);
});

test("mockBackend đồng bộ với backend mới: Telegram media, reply 409 ownership, FAILED giữ OPEN, requestId & expectedLastMessageAt", async () => {
  resetMock();
  globalThis.localStorage.setItem("omni_mock_agent", "agent.minh@omniinbox.local");

  // 1. Telegram photo + caption không bị nuốt tin
  await handle("POST", "/webhook/telegram", {
    message: {
      message_id: 777,
      date: 1732264300,
      chat: { id: 678901234 },
      from: { first_name: "Minh" },
      photo: [{ file_id: "p1" }],
      caption: "Bill chuyển khoản ạ",
    },
  });
  const cid = "CONV#telegram#678901234";
  const conv0 = (await handle("GET", "/conversations")).conversations.find((c) => c.conversationId === cid);
  assert.equal(conv0.lastMessageDirection, "INBOUND");
  assert.equal(conv0.lastMessage, "[Hình ảnh] Bill chuyển khoản ạ");

  // 2. PATCH expectedLastMessageAt sai -> 409 STALE_CONVERSATION
  await assert.rejects(
    () =>
      handle("PATCH", convPath(cid), {
        unreadCount: 0,
        expectedLastMessageAt: "2020-01-01T00:00:00.000Z",
      }),
    (err) => err.status === 409
  );

  // 3. Reply FAILED giữ nguyên status OPEN và unreadCount = 1
  globalThis.localStorage.setItem("omni_mock_fail_next", "1");
  const failReply = await handle("POST", "/messages/reply", { conversationId: cid, content: "Test lỗi" });
  assert.equal(failReply.ok, false);
  assert.equal(failReply.conversation.status, "OPEN");
  assert.equal(failReply.conversation.unreadCount, 1);

  // 4. Reply bằng requestId lặp lại không tạo tin trùng và trả conversation
  const reqId = "1732264305000-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const r1 = await handle("POST", "/messages/reply", { conversationId: cid, content: "Xin chào", requestId: reqId });
  const r2 = await handle("POST", "/messages/reply", { conversationId: cid, content: "Xin chào", requestId: reqId });
  assert.equal(r1.message.messageId, r2.message.messageId);
  assert.equal(r2.conversation.lastMessageDirection, "OUTBOUND");
  assert.equal(r2.conversation.status, "IN_PROGRESS");

  // 5. Hội thoại đã được gán cho Minh -> agent hiện tại gọi /messages/reply phải nhận 409 CONVERSATION_ASSIGNED_TO_OTHER
  await handle("PATCH", convPath(cid), { assignedAgent: "agent.minh@omniinbox.local" });
  await assert.rejects(
    () => handle("POST", "/messages/reply", { conversationId: cid, content: "Nhân viên khác gửi đè" }),
    (err) => err.status === 409 && err.body?.error === "CONVERSATION_ASSIGNED_TO_OTHER"
  );
  globalThis.localStorage.clear();
});
