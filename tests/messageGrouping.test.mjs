import test from "node:test";
import assert from "node:assert/strict";
import { formatDayLabel, groupMessages } from "../src/services/messageGrouping.js";

test("groupMessages chèn Date Divider và gom các tin cùng người gửi trong vòng 5 phút", () => {
  const now = Date.parse("2026-11-27T10:00:00.000Z");
  const msgs = [
    {
      messageId: "MSG#1",
      direction: "INBOUND",
      senderId: "c1",
      senderName: "Khách A",
      createdAt: "2026-11-26T09:00:00.000Z",
      content: "Hôm qua hỏi giá",
    },
    {
      messageId: "MSG#2",
      direction: "INBOUND",
      senderId: "c1",
      senderName: "Khách A",
      createdAt: "2026-11-27T08:00:00.000Z",
      content: "Hôm nay nhắn tin 1",
    },
    {
      messageId: "MSG#3",
      direction: "INBOUND",
      senderId: "c1",
      senderName: "Khách A",
      createdAt: "2026-11-27T08:02:00.000Z",
      content: "Hôm nay nhắn tin 2 (trong 5 phút)",
    },
    {
      messageId: "MSG#4",
      direction: "OUTBOUND",
      agentId: "agent.minh",
      createdAt: "2026-11-27T08:03:00.000Z",
      content: "Shop trả lời",
    },
  ];

  assert.equal(formatDayLabel("2026-11-27T08:00:00.000Z", now), "Hôm nay");
  assert.equal(formatDayLabel("2026-11-26T09:00:00.000Z", now), "Hôm qua");

  const out = groupMessages(msgs, now);
  // 2 date dividers + 4 messages = 6 items
  assert.equal(out.length, 6);
  assert.equal(out[0].type, "date");
  assert.equal(out[2].type, "date");

  // MSG#2 và MSG#3 cùng người gửi trong 5p -> MSG#2 isGroupStart=true, isGroupEnd=false; MSG#3 isGroupStart=false, isGroupEnd=true
  assert.equal(out[3].isGroupStart, true);
  assert.equal(out[3].isGroupEnd, false);
  assert.equal(out[4].isGroupStart, false);
  assert.equal(out[4].isGroupEnd, true);

  // MSG#4 khác chiều -> isGroupStart=true
  assert.equal(out[5].isGroupStart, true);
});
