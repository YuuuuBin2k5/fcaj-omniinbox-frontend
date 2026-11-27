// FILE: src/features/simulator/SimulatorView.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Code2,
  Copy,
  RefreshCw,
  Repeat,
  Send,
  Smartphone,
  Terminal,
  Trash2,
} from "lucide-react";
import { connectRealtime, listMessages, sendSimulatorMessage } from "../../services/apiClient.js";
import { mergeMessageList } from "../../services/inboxReducer.js";
import { formatAgentShort } from "../../services/uiFormat.js";
import { ChannelIcon } from "../../components/ChannelBadge.jsx";
import JsonCodeBlock from "../../components/JsonCodeBlock.jsx";

const CHANNELS = [
  {
    id: "shopee",
    name: "Shopee Chat",
    label: "Shopee Chat (Mô phỏng)",
    headerBg: "bg-[#EE4D2D]",
    activeCard: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    id: "zalo",
    name: "Zalo OA",
    label: "Zalo OA (Mô phỏng)",
    headerBg: "bg-[#0068FF]",
    activeCard: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "webchat",
    name: "WebChat",
    label: "Website LiveChat (Mô phỏng)",
    headerBg: "bg-[#7C3AED]",
    activeCard: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
];

const WS_STATUS_META = {
  connected: { label: "WS: Live", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  mock: { label: "WS: Local Mock", dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
  connecting: { label: "WS: Connecting", dot: "bg-amber-400 animate-pulse", text: "text-amber-700 dark:text-amber-300" },
  reconnecting: {
    label: "WS: Reconnecting",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-700 dark:text-amber-300",
  },
};

const QUICK_SCENARIO_CHIPS = [
  { label: "Hỏi size áo", text: "Áo khoác này còn size M màu đen không shop?" },
  { label: "Hỏi phí ship", text: "Ship về Quận 1 TP.HCM mất bao lâu và phí bao nhiêu ạ?" },
  { label: "Đặt đơn", text: "Cho mình đặt 1 cái size L, thanh toán COD nhé shop!" },
  { label: "Mở lại RESOLVED", text: "Shop ơi cho mình hỏi thêm về đơn vừa chốt lúc nãy ạ!" },
];

const FAULT_UI = ((typeof import.meta !== "undefined" && import.meta.env) || {}).VITE_ENABLE_FAULT_UI === "true";
const rid = () => `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const formatClock = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export default function SimulatorView({ onOpenInbox }) {
  const [channel, setChannel] = useState("shopee");
  const [customerId, setCustomerId] = useState("shopee_user_889");
  const [customerName, setCustomerName] = useState("Trần Thị Bích - Khách Shopee (Mô phỏng)");
  const [externalMessageId, setExternalMessageId] = useState(rid());
  const [text, setText] = useState("Áo này còn size M không shop?");
  const [log, setLog] = useState([]);
  const [sentByConv, setSentByConv] = useState({});
  const [repliesByConv, setRepliesByConv] = useState({});
  const [wsStatus, setWsStatus] = useState("connecting");
  const [busy, setBusy] = useState(false);
  const [milestoneStep, setMilestoneStep] = useState(0);
  const [milestone, setMilestone] = useState("Chưa gửi");
  const [consoleTab, setConsoleTab] = useState("log");
  const [copiedMsgId, setCopiedMsgId] = useState(false);
  const [clockTime, setClockTime] = useState(formatClock);
  const [roundTripByConv, setRoundTripByConv] = useState({});
  const lastSentAtRef = useRef({});

  useEffect(() => {
    const id = setInterval(() => setClockTime(formatClock()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cleanCustomerId = customerId.trim() || "guest_001";
  const currentConvId = `CONV#${channel}#${cleanCustomerId}`;
  const currentConvRef = useRef(currentConvId);
  currentConvRef.current = currentConvId;
  const phoneScrollRef = useRef(null);

  const activeChannelMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];
  const wsMeta = WS_STATUS_META[wsStatus] || {
    label: `WS: ${wsStatus}`,
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  };

  useEffect(() => {
    let active = true;
    function hydrateMessages(id, messages) {
      if (!active || !Array.isArray(messages) || !messages.length) return;
      const outgoing = messages.filter((message) => message.direction === "OUTBOUND");
      const inbound = messages.filter((message) => message.direction === "INBOUND");

      if (inbound.length) {
        setSentByConv((prev) => {
          const cur = prev[id] || [];
          const next = [...cur];
          for (const m of inbound) {
            const dedupId = `${m.senderId}#${m.channelMessageId}`;
            const mapped = {
              messageId: m.messageId || `SIM_SENT_${dedupId}`,
              dedupId,
              direction: "CUSTOMER",
              senderName: m.senderName,
              content: m.content,
              createdAt: m.createdAt,
            };
            const existingIdx = next.findIndex(
              (item) => item.messageId === mapped.messageId || (mapped.dedupId && item.dedupId === mapped.dedupId)
            );
            if (existingIdx >= 0) next[existingIdx] = mapped;
            else next.push(mapped);
          }
          return { ...prev, [id]: next };
        });
      }

      if (!outgoing.length) return;
      setRepliesByConv((prev) => ({ ...prev, [id]: mergeMessageList(prev[id], outgoing) }));
      if (id === currentConvRef.current && outgoing.some((message) => message.status === "SENT")) {
        setMilestoneStep(3);
        setMilestone("Mốc 3: Đã nhận phản hồi từ Agent Portal!");
      }
      if (outgoing.some((message) => message.status === "SENT")) {
        const sentMs = lastSentAtRef.current[id];
        if (sentMs) {
          const elapsed = Date.now() - sentMs;
          if (elapsed >= 0 && elapsed < 300_000) {
            setRoundTripByConv((prev) => ({
              ...prev,
              [id]: (elapsed / 1000).toFixed(1),
            }));
          }
          delete lastSentAtRef.current[id];
        }
      }
    }

    const rt = connectRealtime({
      clientType: "simulator",
      onStatus: setWsStatus,
      onEvent: (evt) => {
        if (evt.event === "OUTBOUND_MESSAGE" && evt.message?.conversationId) {
          hydrateMessages(evt.message.conversationId, [evt.message]);
        }
      },
      onResync: () => {
        const id = currentConvRef.current;
        listMessages(id, { limit: 50 })
          .then((result) => hydrateMessages(id, result.messages || []))
          .catch(() => {});
      },
    });
    return () => {
      active = false;
      rt.close();
    };
  }, []);

  // Tự nạp lịch sử hội thoại khi chuyển preset hoặc đổi customerId trên Simulator
  useEffect(() => {
    let active = true;
    listMessages(currentConvId, { limit: 50 })
      .then((result) => {
        if (!active || !Array.isArray(result?.messages) || !result.messages.length) return;
        const outgoing = result.messages.filter((m) => m.direction === "OUTBOUND");
        const inbound = result.messages.filter((m) => m.direction === "INBOUND");
        if (inbound.length) {
          setSentByConv((prev) => {
            const cur = prev[currentConvId] || [];
            const next = [...cur];
            for (const m of inbound) {
              const dedupId = `${m.senderId}#${m.channelMessageId}`;
              const mapped = {
                messageId: m.messageId || `SIM_SENT_${dedupId}`,
                dedupId,
                direction: "CUSTOMER",
                senderName: m.senderName,
                content: m.content,
                createdAt: m.createdAt,
              };
              const idx = next.findIndex(
                (item) => item.messageId === mapped.messageId || (mapped.dedupId && item.dedupId === mapped.dedupId)
              );
              if (idx >= 0) next[idx] = mapped;
              else next.push(mapped);
            }
            return { ...prev, [currentConvId]: next };
          });
        }
        if (outgoing.length) {
          setRepliesByConv((prev) => ({
            ...prev,
            [currentConvId]: mergeMessageList(prev[currentConvId], outgoing),
          }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentConvId]);

  const replies = repliesByConv[currentConvId] || [];
  const sentMsgs = sentByConv[currentConvId] || [];
  const timeline = [...sentMsgs, ...replies].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  useEffect(() => {
    const el = phoneScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [timeline.length, currentConvId]);

  const note = (tag, detail) =>
    setLog((l) =>
      [{ id: `${Date.now()}_${Math.random()}`, time: new Date().toLocaleTimeString("vi-VN"), tag, detail }, ...l].slice(
        0,
        24
      )
    );

  const buildPayload = (extra = {}) => ({
    externalMessageId: externalMessageId.trim() || rid(),
    customerId: cleanCustomerId,
    customerName: customerName.trim() || `Khách ${channel.toUpperCase()} (Mô phỏng)`,
    text,
    sentAtMs: Date.now(),
    ...extra,
  });

  function copyExternalId() {
    navigator.clipboard?.writeText(externalMessageId);
    setCopiedMsgId(true);
    setTimeout(() => setCopiedMsgId(false), 1200);
  }

  async function postOnce(payloadSnapshot, label, tag, recordInPhone = true) {
    setMilestoneStep(1);
    setMilestone("Mốc 1: Đã gửi request HTTP tới webhook…");
    try {
      const r = await sendSimulatorMessage(channel, payloadSnapshot);
      setMilestoneStep(2);
      setMilestone(`Mốc 2: Backend đã nhận vào hàng đợi (${r.status}). Chờ hoặc trả lời ở Hộp thư CSKH.`);
      note(tag, `${label} [${payloadSnapshot.customerId} / ${payloadSnapshot.externalMessageId}]: ${r.status}`);

      if (recordInPhone && !payloadSnapshot.forceError) {
        const targetConv = `CONV#${channel}#${payloadSnapshot.customerId}`;
        lastSentAtRef.current[targetConv] = payloadSnapshot.sentAtMs;
        setSentByConv((prev) => {
          const list = prev[targetConv] || [];
          const dedupId = `${payloadSnapshot.customerId}#${payloadSnapshot.externalMessageId}`;
          if (list.some((m) => m.dedupId === dedupId)) return prev;
          return {
            ...prev,
            [targetConv]: [
              ...list,
              {
                messageId: `SIM_SENT_${dedupId}`,
                dedupId,
                direction: "CUSTOMER",
                senderName: payloadSnapshot.customerName,
                content: payloadSnapshot.text,
                createdAt: new Date(payloadSnapshot.sentAtMs).toISOString(),
              },
            ],
          };
        });
      }
      return true;
    } catch (e) {
      setMilestoneStep(-1);
      if (e.status === 403) {
        setMilestone("Lỗi 403: Kênh mô phỏng đang bị tắt phía server (ALLOW_SIMULATOR=false)");
        note("ERR", `${label} LỖI 403: ALLOW_SIMULATOR=false`);
      } else {
        setMilestone(`Lỗi Mốc 1 (${e.status || "Mạng"}): ${e.message}`);
        note("ERR", `${label} LỖI ${e.status || ""}: ${e.message}`);
      }
      return false;
    }
  }

  async function sendNormal() {
    if (busy || !text.trim()) return;
    setBusy(true);
    const snap = buildPayload();
    await postOnce(snap, "Gửi", "QUEUED", true);
    setExternalMessageId(rid());
    setBusy(false);
  }

  async function sendDuplicate() {
    if (busy || !text.trim()) return;
    setBusy(true);
    const snap = buildPayload();
    const ok1 = await postOnce(snap, "Gửi #1", "QUEUED", true);
    const ok2 = await postOnce({ ...snap, sentAtMs: Date.now() }, "Gửi #2 (trùng ID)", "DUP", false);
    if (ok1 && ok2) {
      setMilestoneStep(2);
      setMilestone(
        `Đã bắn lặp 2 lần cùng ID (${snap.externalMessageId}) — Normalizer khử trùng, chỉ lưu 1 bản ghi trong Inbox.`
      );
    }
    setBusy(false);
  }

  async function sendFault() {
    if (busy) return;
    setBusy(true);
    const snap = buildPayload({ forceError: true });
    await postOnce(snap, "Payload lỗi (Test DLQ)", "ERR", false);
    setExternalMessageId(rid());
    setBusy(false);
  }

  const previewJson = JSON.stringify(
    {
      channel,
      externalMessageId: externalMessageId.trim() || "<auto>",
      customerId: cleanCustomerId,
      customerName: customerName.trim() || `Khách ${channel.toUpperCase()} (Mô phỏng)`,
      text,
      sentAtMs: "<Date.now()>",
    },
    null,
    2
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto bg-[#F6F7F9] p-3.5 md:grid-cols-12 md:p-4 dark:bg-[#09090B]">
      {/* Left: Compact Testing Workbench */}
      <section className="elevated-sheet flex flex-col justify-between space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 md:col-span-7 dark:border-white/[0.08] dark:bg-[#111114]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                Simulated Channel Workbench
              </span>
              <h2 className="mt-1 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                Giả lập khách hàng – MÔ PHỎNG (không phải kênh thật)
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 font-mono text-[11px] font-medium dark:border-white/15 ${wsMeta.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${wsMeta.dot}`} />
              {wsMeta.label}
            </span>
          </div>

          {/* Interactive Channel Selector Cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CHANNELS.map((c) => {
              const active = channel === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2 text-left text-xs transition ${
                    active
                      ? c.activeCard
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  }`}
                  onClick={() => setChannel(c.id)}
                >
                  {active && (
                    <motion.span
                      layoutId="simChannelActive"
                      transition={{ type: "spring", stiffness: 450, damping: 34 }}
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-current"
                    />
                  )}
                  <ChannelIcon channel={c.id} className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="font-mono text-[9px] uppercase opacity-75">Mô phỏng</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-zinc-500 dark:text-zinc-400">Mẫu nhanh:</span>
            {[
              { ch: "shopee", id: "shopee_a1", name: "Nguyễn Văn A", label: "Shopee A1" },
              { ch: "shopee", id: "shopee_a2", name: "Nguyễn Văn A", label: "Shopee A2" },
              { ch: "zalo", id: "zalo_minh_01", name: "Lê Minh (Zalo · Mô phỏng)", label: "Zalo OA" },
              { ch: "webchat", id: "web_guest_09", name: "Khách Web #09 (Mô phỏng)", label: "WebChat" },
            ].map((p) => {
              const isPresetActive = channel === p.ch && cleanCustomerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={isPresetActive}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition ${
                    isPresetActive
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-200"
                  }`}
                  onClick={() => {
                    setChannel(p.ch);
                    setCustomerId(p.id);
                    setCustomerName(p.name);
                    setExternalMessageId(rid());
                  }}
                >
                  <ChannelIcon channel={p.ch} className="h-3 w-3 shrink-0" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Tên khách</label>
              <input
                aria-label="Tên khách hàng"
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-900 dark:border-white/15 dark:bg-[#09090B] dark:text-white"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tên khách"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">customerId</label>
              <input
                aria-label="customerId"
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-900 dark:border-white/15 dark:bg-[#09090B] dark:text-white"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="customerId"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              externalMessageId (tự sinh hoặc sửa tay để test chống trùng)
            </label>
            <div className="relative flex items-center">
              <input
                aria-label="externalMessageId"
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-1.5 pl-3 pr-16 font-mono text-xs text-zinc-900 dark:border-white/15 dark:bg-[#09090B] dark:text-white"
                value={externalMessageId}
                onChange={(e) => setExternalMessageId(e.target.value)}
                placeholder="externalMessageId (sửa tay được)"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Sao chép externalMessageId"
                  title="Sao chép ID"
                  onClick={copyExternalId}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {copiedMsgId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Tạo externalMessageId mới"
                  title="Tạo ID mới"
                  onClick={() => setExternalMessageId(rid())}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                Nội dung tin nhắn giả lập <span className="font-mono font-normal opacity-70">(Enter gửi)</span>
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {QUICK_SCENARIO_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setText(chip.text)}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-300 dark:hover:text-white"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              aria-label="Nội dung tin giả lập"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-2 text-sm text-zinc-900 dark:border-white/15 dark:bg-[#09090B] dark:text-white"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendNormal();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={sendNormal}
            >
              <Send className="h-3.5 w-3.5" />
              Gửi
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 disabled:opacity-50 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={sendDuplicate}
            >
              <Repeat className="h-3.5 w-3.5" />
              Bắn lặp lại cùng Message ID (Test chống trùng)
            </motion.button>
            {FAULT_UI && (
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/45 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-300"
                onClick={sendFault}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Gửi Payload Lỗi (Test DLQ)
              </button>
            )}
          </div>
        </div>

        {/* Bottom Compact Stack: 3-Milestone Stepper + Tabbed Console (Log | JSON Payload) */}
        <div className="space-y-2.5">
          <div
            className={`rounded-xl border p-2.5 text-xs ${
              milestoneStep === -1
                ? "border-rose-500/35 bg-rose-500/10"
                : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#09090B]"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 font-semibold text-zinc-700 dark:text-zinc-200">
              <div className="flex min-w-0 items-center gap-2">
                {milestoneStep === -1 ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                ) : (
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 ${milestoneStep >= 2 ? "text-emerald-500" : "text-zinc-400"}`}
                  />
                )}
                <span className="truncate font-normal text-zinc-600 dark:text-zinc-300">{milestone}</span>
              </div>
              {milestoneStep >= 2 && onOpenInbox && (
                <button
                  type="button"
                  onClick={onOpenInbox}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100"
                >
                  <span>Mở Hộp thư CSKH</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
              <div
                className={`rounded-lg px-2 py-1 text-center ${
                  milestoneStep === -1
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                    : milestoneStep >= 1
                      ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                      : "bg-zinc-200/70 text-zinc-500 dark:bg-white/5"
                }`}
              >
                1. Client POST
              </div>
              <div
                className={`rounded-lg px-2 py-1 text-center ${
                  milestoneStep >= 2
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-zinc-200/70 text-zinc-500 dark:bg-white/5"
                }`}
              >
                2. HTTP 200 QUEUED
              </div>
              <div
                className={`rounded-lg px-2 py-1 text-center ${
                  milestoneStep >= 3
                    ? "bg-emerald-500/20 font-semibold text-emerald-700 dark:text-emerald-300"
                    : "bg-zinc-200/70 text-zinc-500 dark:bg-white/5"
                }`}
              >
                3. Phản hồi WS
              </div>
            </div>
          </div>

          {/* 2-Tab Console: Activity Log | Live Syntax-Highlighted Payload */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-[11px] dark:bg-[#09090B]">
                <button
                  type="button"
                  onClick={() => setConsoleTab("log")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                    consoleTab === "log"
                      ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  <span>Nhật ký hoạt động ({log.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConsoleTab("payload")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                    consoleTab === "payload"
                      ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  <Code2 className="h-3 w-3" />
                  <span>JSON Payload</span>
                </button>
              </div>

              {consoleTab === "log" && log.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLog([])}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                  Xóa log
                </button>
              )}
            </div>

            {consoleTab === "log" ? (
              <ul className="h-32 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-[#0B0C10] p-2.5 font-mono text-[11px] dark:border-white/10">
                {log.length === 0 ? (
                  <li className="text-zinc-500">// Nhật ký gửi webhook sẽ hiện tại đây…</li>
                ) : (
                  log.map((item) => {
                    const tagCls =
                      item.tag === "ERR"
                        ? "bg-rose-500/20 text-rose-300"
                        : item.tag === "DUP"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300";
                    return (
                      <li key={item.id} className="flex items-start gap-2 text-zinc-300">
                        <span className="shrink-0 text-zinc-500">{item.time}</span>
                        <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${tagCls}`}>{item.tag}</span>
                        <span className="break-all">{item.detail}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : (
              <JsonCodeBlock title={`POST /webhook/${channel}`} code={previewJson} className="max-h-40" />
            )}
          </div>
        </div>
      </section>

      {/* Right: Realistic Simulated Customer Phone Hardware Frame */}
      <section className="flex flex-col md:col-span-5">
        <div className="elevated-sheet mx-auto flex w-full max-w-[388px] flex-1 flex-col rounded-[40px] border border-zinc-300/90 bg-zinc-900 p-2 shadow-2xl dark:border-white/15 dark:bg-[#17171B]">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-black/15 bg-white dark:border-white/10 dark:bg-[#0D0D10]">
            {/* Device Status Bar + Dynamic Island */}
            <div className={`${activeChannelMeta.headerBg} px-4 pb-3 pt-2.5 text-white`}>
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-white/95">
                <span className="font-mono tabular-nums">{clockTime}</span>
                <span className="flex h-4 w-20 items-center justify-end rounded-full bg-black/55 px-1.5" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400/50 ring-1 ring-white/15" />
                </span>
                <div className="flex items-center gap-1.5 font-mono text-[9px]">
                  <span>5G</span>
                  <span className="inline-block h-2.5 w-4 rounded-xs border border-white/85 p-[1px]">
                    <span className="block h-full w-3/4 bg-white" />
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-xs font-bold">{activeChannelMeta.label}</span>
                </div>
                <span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] font-bold">MÔ PHỎNG</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-white/90">
                <span className="truncate">{currentConvId}</span>
                {busy && <span className="shrink-0 animate-pulse text-[10px]">Đang đẩy SQS…</span>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3.5 py-2 text-[11px] font-semibold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
              <span className="truncate">Phản hồi CSKH</span>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[10px]">
                {roundTripByConv[currentConvId] && (
                  <span className="rounded bg-sky-500/12 px-1.5 py-0.5 text-sky-700 dark:text-sky-300">
                    sau {roundTripByConv[currentConvId]}s
                  </span>
                )}
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                  sentAtMs ✓
                </span>
                <span className="tabular-nums text-zinc-400">{replies.length} reply</span>
                {timeline.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSentByConv((p) => ({ ...p, [currentConvId]: [] }));
                      setRepliesByConv((p) => ({ ...p, [currentConvId]: [] }));
                      setRoundTripByConv((p) => {
                        const copy = { ...p };
                        delete copy[currentConvId];
                        return copy;
                      });
                    }}
                    className="font-sans font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {/* Phone Chat Screen */}
            <div
              ref={phoneScrollRef}
              className="dot-canvas gutter-stable flex-1 space-y-2.5 overflow-y-auto bg-[#F6F7F9] p-4 dark:bg-[#09090B]"
            >
              {timeline.length === 0 ? (
                <p className="py-12 text-center text-xs text-zinc-400">Chưa có tin nhắn nào cho {currentConvId}</p>
              ) : (
                timeline.map((m) => {
                  const msgTime = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "";
                  return m.direction === "CUSTOMER" ? (
                    <motion.div
                      key={m.messageId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-zinc-900 px-3 py-2 text-xs text-white shadow-xs dark:bg-zinc-200 dark:text-zinc-950"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] opacity-70">
                        <span className="truncate">{m.senderName} (Khách · Mô phỏng)</span>
                        {msgTime && <span className="shrink-0 font-mono tabular-nums">{msgTime}</span>}
                      </div>
                      <div className="mt-0.5 leading-relaxed">{m.content}</div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={m.messageId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-[88%] rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <CheckCheck className="h-3 w-3 shrink-0" />
                          <span title={m.senderName} className="truncate">
                            {formatAgentShort(m.senderName)}
                          </span>
                          <span>· {m.status}</span>
                        </div>
                        {msgTime && <span className="shrink-0 tabular-nums opacity-75">{msgTime}</span>}
                      </div>
                      <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{m.content}</div>
                      {m.deliveredVia === "simulator" && (
                        <div className="mt-1 font-mono text-[9px] text-emerald-700/80 dark:text-emerald-300/80">
                          Đã nhận từ Portal · Mô phỏng (WS)
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              {milestoneStep === 2 && (
                <div className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                  <span>Đã đẩy vào SQS · Chờ phản hồi từ Agent Portal…</span>
                </div>
              )}
            </div>

            {/* Interactive Phone Quick-Send Bar + Home Indicator */}
            <div className="border-t border-zinc-200 bg-white px-3 pb-2 pt-2 dark:border-white/10 dark:bg-[#111114]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendNormal();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  aria-label="Gửi tin trực tiếp từ điện thoại mô phỏng"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhắn thử từ điện thoại (Mô phỏng)…"
                  className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-white/10 dark:bg-[#09090B] dark:text-white"
                />
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  aria-label="Gửi từ điện thoại mô phỏng"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-zinc-400">
                <span>{wsMeta.label}</span>
                <span className="h-1 w-24 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
                <span>simulator</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
