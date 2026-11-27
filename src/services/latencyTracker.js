// FILE: src/services/latencyTracker.js
// Đo thời gian từ lúc Simulator gửi (clientSentAtMs) đến lúc Portal nhận sự kiện WebSocket NEW_MESSAGE.
// Quy tắc: chạy 2 tab trên cùng 1 máy, ghi đúng 1 mẫu cho mỗi messageId duy nhất.

export class LatencyTracker {
  constructor() {
    this.recordedIds = new Set();
    this.samples = [];
  }

  record(message, receivedAtMs = Date.now()) {
    if (!message || !message.messageId) return null;
    const sentAtMs = Number(message.clientSentAtMs);
    if (!Number.isFinite(sentAtMs)) return null;
    if (this.recordedIds.has(message.messageId)) return null;

    this.recordedIds.add(message.messageId);
    const latencyMs = Math.max(0, receivedAtMs - sentAtMs);
    const sample = {
      messageId: message.messageId,
      conversationId: message.conversationId,
      channel: message.channel,
      sentAtMs,
      receivedAtMs,
      latencyMs,
    };
    this.samples.push(sample);
    console.log(
      `[LATENCY] Simulator -> WS Event: ${latencyMs} ms | conv=${message.conversationId} | msg=${message.messageId}`
    );
    return sample;
  }

  getStats() {
    if (this.samples.length === 0) return { count: 0, p50: null, p95: null, samples: [] };
    const sorted = this.samples.map((s) => s.latencyMs).sort((a, b) => a - b);
    const pct = (p) => {
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
    };
    return {
      count: sorted.length,
      p50: pct(50),
      p95: pct(95),
      samples: [...this.samples],
    };
  }

  toCsv() {
    const header = "messageId,conversationId,channel,sentAtMs,receivedAtMs,latencyMs";
    const rows = this.samples.map(
      (s) => `${s.messageId},${s.conversationId},${s.channel},${s.sentAtMs},${s.receivedAtMs},${s.latencyMs}`
    );
    return [header, ...rows].join("\n");
  }

  clear() {
    this.recordedIds.clear();
    this.samples = [];
  }
}

export const latencyTracker = new LatencyTracker();
