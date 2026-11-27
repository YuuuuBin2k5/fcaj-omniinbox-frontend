// FILE: src/features/landing/InteractivePipelineHero.jsx
// Playable Split-World AWS Event Topology Sandbox: 4-Channel Bezier Convergence + 4-Node SVG Conduit + Wire JSON + Auto Demo.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Code2, Play, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { ChannelBadge, ChannelIcon, StatusDot } from "../../components/ChannelBadge.jsx";
import JsonCodeBlock from "../../components/JsonCodeBlock.jsx";

const SCENARIOS = [
  {
    id: "telegram",
    button: "Gửi tin Telegram thật",
    tag: "Luồng 2 chiều thật",
    sourceChannel: "telegram",
    targetConvId: "CONV#telegram#678901234",
    badge: "NEW_MESSAGE",
    badgeCls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    hops: [
      {
        stage: "API Gateway",
        detail: "POST /webhook/telegram · secret_token hợp lệ (timingSafeEqual)",
        wireJson: `{
  "route": "POST /webhook/telegram",
  "header": "X-Telegram-Bot-Api-Secret-Token: <verified>",
  "chatId": 678901234,
  "messageId": 998877
}`,
      },
      {
        stage: "SQS Queue",
        detail: "omni-inbound-queue · HTTP 200 QUEUED (Visibility 30s)",
        wireJson: `{
  "queue": "omni-inbound-queue",
  "status": "QUEUED",
  "httpStatus": 200,
  "maxReceiveCount": 5
}`,
      },
      {
        stage: "Normalizer",
        detail: "Claim telegram#678901234#998877 → TransactWriteItems",
        wireJson: `{
  "idempotencyKey": "telegram#678901234#998877",
  "state": "PROCESSING -> DONE",
  "dynamoTx": "Put Message + Update Conversation"
}`,
      },
      {
        stage: "WebSocket",
        detail: "Broadcast NEW_MESSAGE → Agent Portal",
        wireJson: `{
  "event": "NEW_MESSAGE",
  "conversationId": "CONV#telegram#678901234",
  "unreadCount": 2
}`,
      },
    ],
  },
  {
    id: "idempotency",
    button: "Bắn lặp Shopee (Idempotency)",
    tag: "Chống trùng lặp",
    sourceChannel: "shopee",
    targetConvId: "CONV#shopee#shopee_a1",
    badge: "DUPLICATE SKIPPED",
    badgeCls: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    hops: [
      {
        stage: "API Gateway",
        detail: "POST /webhook/shopee × 2 (cùng externalMessageId: dup_01)",
        wireJson: `{
  "route": "POST /webhook/shopee",
  "customerId": "shopee_a1",
  "externalMessageId": "dup_01"
}`,
      },
      {
        stage: "SQS Queue",
        detail: "Cả 2 request đều nhận HTTP 200 QUEUED",
        wireJson: `{
  "delivery": "SQS at-least-once",
  "messagesInBatch": 2,
  "sameIdempotencyKey": "shopee#shopee_a1#dup_01"
}`,
      },
      {
        stage: "Normalizer",
        detail: "Tin #1 → DONE · Tin #2 → [IDEMPOTENCY] Duplicate skipped",
        wireJson: `{
  "conditionalWrite": "attribute_not_exists(messageKey)",
  "msg1": "DONE",
  "msg2": "ConditionalCheckFailedException -> SKIPPED"
}`,
      },
      {
        stage: "Mini Inbox",
        detail: "Giữ đúng 1 tin nhắn, unreadCount chỉ tăng 1",
        wireJson: `{
  "conversationId": "CONV#shopee#shopee_a1",
  "storedMessagesDelta": 1,
  "duplicateBlocked": true
}`,
      },
    ],
  },
  {
    id: "conflict409",
    button: "Tranh nhận đồng thời (409)",
    tag: "Optimistic Locking",
    sourceChannel: "telegram",
    targetConvId: "CONV#telegram#678901234",
    badge: "409 SYNCED",
    badgeCls: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hops: [
      {
        stage: "Agent Minh",
        detail: "PATCH expectedAssignedAgent=unassigned → DynamoDB",
        wireJson: `{
  "method": "PATCH /conversations/CONV%23telegram%23678901234",
  "assignedAgent": "agent.minh",
  "expectedAssignedAgent": "unassigned"
}`,
      },
      {
        stage: "Agent Lan",
        detail: "PATCH expectedAssignedAgent=unassigned (đến trễ 40ms)",
        wireJson: `{
  "actor": "agent.lan",
  "assignedAgent": "agent.lan",
  "expectedAssignedAgent": "unassigned"
}`,
      },
      {
        stage: "API Handler",
        detail: "Minh HTTP 200 · Lan nhận HTTP 409 kèm bản ghi mới nhất",
        wireJson: `{
  "httpStatus": 409,
  "error": "ASSIGNMENT_CONFLICT",
  "assignedAgent": "agent.minh"
}`,
      },
      {
        stage: "Mini Inbox",
        detail: "Cả 2 màn hình đồng bộ về agent.minh, không ghi đè",
        wireJson: `{
  "event": "CONVERSATION_UPDATED",
  "assignedAgent": "agent.minh",
  "overwritePrevented": true
}`,
      },
    ],
  },
];

const CONVERGENCE_CHANNELS = [
  { id: "telegram", label: "Telegram · Thật", color: "#38BDF8", y: 18 },
  { id: "shopee", label: "Shopee · Mô phỏng", color: "#FB923C", y: 42 },
  { id: "zalo", label: "Zalo · Mô phỏng", color: "#60A5FA", y: 66 },
  { id: "webchat", label: "WebChat · Mô phỏng", color: "#A78BFA", y: 90 },
];

const TOPOLOGY_NODES = [
  { id: 0, code: "01", name: "API Gateway", sub: "REST + Secret" },
  { id: 1, code: "02", name: "SQS Queue", sub: "Buffer + DLQ" },
  { id: 2, code: "03", name: "Normalizer", sub: "Idempotency" },
  { id: 3, code: "04", name: "DynamoDB / WS", sub: "TX + Broadcast" },
];

const INITIAL_CONVS = [
  {
    id: "CONV#telegram#678901234",
    name: "Nguyễn Văn A",
    customerId: "678901234",
    channel: "telegram",
    text: "Shop ơi mẫu áo khoác này còn size L không ạ?",
    status: "OPEN",
    agent: "unassigned",
    unread: 1,
    pk: "CONV#telegram#678901234",
  },
  {
    id: "CONV#shopee#shopee_a1",
    name: "Nguyễn Văn A",
    customerId: "shopee_a1",
    channel: "shopee",
    text: "Áo này còn size M không shop?",
    status: "OPEN",
    agent: "unassigned",
    unread: 1,
    pk: "CONV#shopee#shopee_a1",
  },
];

export default function InteractivePipelineHero() {
  const [activeScenario, setActiveScenario] = useState("telegram");
  const [running, setRunning] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [convs, setConvs] = useState(INITIAL_CONVS);
  const [selectedConvId, setSelectedConvId] = useState("CONV#telegram#678901234");
  const [affectedId, setAffectedId] = useState(null);
  const [showWire, setShowWire] = useState(true);
  const [eventLog, setEventLog] = useState("Chọn kịch bản bên trên hoặc bấm Auto Demo để xem gói tin đi qua AWS.");
  const timersRef = useRef([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  function resetSandbox() {
    clearTimers();
    setRunning(false);
    setAutoRunning(false);
    setStepIdx(-1);
    setAffectedId(null);
    setConvs(INITIAL_CONVS);
    setSelectedConvId("CONV#telegram#678901234");
    setEventLog("Đã đặt lại trạng thái ban đầu. Sẵn sàng chạy kịch bản mới.");
  }

  function scheduleScenario(id, onComplete) {
    const sc = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    setActiveScenario(id);
    setRunning(true);
    setStepIdx(0);
    setAffectedId(null);
    setSelectedConvId(sc.targetConvId);
    setEventLog(`[${sc.hops[0].stage}] ${sc.hops[0].detail}`);

    sc.hops.forEach((hop, idx) => {
      if (idx === 0) return;
      const t = setTimeout(() => {
        setStepIdx(idx);
        setEventLog(`[${hop.stage}] ${hop.detail}`);

        if (idx === sc.hops.length - 1) {
          setRunning(false);
          setAffectedId(sc.targetConvId);
          if (id === "telegram") {
            setConvs((prev) =>
              prev.map((c) =>
                c.id === "CONV#telegram#678901234"
                  ? { ...c, text: "Cho mình đặt 1 áo size L giao Hà Nội nhé!", unread: c.unread + 1 }
                  : c
              )
            );
          } else if (id === "idempotency") {
            setConvs((prev) =>
              prev.map((c) =>
                c.id === "CONV#shopee#shopee_a1"
                  ? { ...c, text: "Tin dup_01 (đã khử trùng, chỉ lưu 1 bản)", unread: 1 }
                  : c
              )
            );
          } else if (id === "conflict409") {
            setConvs((prev) =>
              prev.map((c) =>
                c.id === "CONV#telegram#678901234"
                  ? { ...c, status: "IN_PROGRESS", agent: "agent.minh" }
                  : c
              )
            );
          }
          onComplete?.();
        }
      }, idx * 320);
      timersRef.current.push(t);
    });
  }

  function runScenario(id) {
    clearTimers();
    setAutoRunning(false);
    scheduleScenario(id);
  }

  function runAutoDemo() {
    clearTimers();
    setConvs(INITIAL_CONVS);
    setAutoRunning(true);
    scheduleScenario("telegram", () => {
      const t1 = setTimeout(() => {
        scheduleScenario("idempotency", () => {
          const t2 = setTimeout(() => {
            scheduleScenario("conflict409", () => {
              setAutoRunning(false);
            });
          }, 700);
          timersRef.current.push(t2);
        });
      }, 700);
      timersRef.current.push(t1);
    });
  }

  const sc = SCENARIOS.find((s) => s.id === activeScenario) || SCENARIOS[0];
  const currentHop = stepIdx >= 0 ? sc.hops[stepIdx] : sc.hops[0];
  const inspectedConv = convs.find((c) => c.id === selectedConvId) || convs[0];
  const activeChannel = stepIdx >= 0 ? sc.sourceChannel : null;

  return (
    <div className="sandbox-rim elevated-sheet relative rounded-2xl border border-zinc-200/90 bg-white/95 p-3.5 glass-panel sm:p-5 dark:border-white/[0.1] dark:bg-[#111114]/95">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-1.5 -top-1.5 font-mono text-[10px] text-zinc-400/70 dark:text-zinc-600"
      >
        +
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1.5 -top-1.5 font-mono text-[10px] text-zinc-400/70 dark:text-zinc-600"
      >
        +
      </span>

      {/* Top Window Bar + Playable Trigger Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 pb-3.5 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="ml-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
            Interactive AWS Event Sandbox · Không gọi API trước đăng nhập
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SCENARIOS.map((s) => {
            const active = activeScenario === s.id && stepIdx >= 0;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => runScenario(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-white/25"
                }`}
              >
                <Play className="h-3 w-3" />
                <span>{s.button}</span>
              </motion.button>
            );
          })}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={runAutoDemo}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              autoRunning
                ? "border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-300"
                : "border-sky-500/35 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>{autoRunning ? "Đang chạy Auto…" : "Auto Demo"}</span>
          </motion.button>

          <button
            type="button"
            aria-label="Ẩn/hiện Wire JSON"
            title="Ẩn/hiện Wire JSON"
            onClick={() => setShowWire((v) => !v)}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 font-mono text-[11px] transition ${
              showWire
                ? "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-white/25 dark:bg-white/10 dark:text-white"
                : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            type="button"
            aria-label="Đặt lại Sandbox"
            title="Đặt lại trạng thái ban đầu"
            onClick={resetSandbox}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Bézier 4-Channel Convergence Strip */}
      <div className="mt-4 hidden items-center gap-3 rounded-xl border border-zinc-200/80 bg-[#F8F8FA] px-3 py-2 md:grid md:grid-cols-12 dark:border-white/[0.07] dark:bg-[#09090B]">
        <div className="col-span-5 grid grid-cols-2 gap-1.5">
          {CONVERGENCE_CHANNELS.map((ch) => {
            const isActive = activeChannel === ch.id;
            return (
              <div
                key={ch.id}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
                  isActive
                    ? "border-zinc-900 bg-white text-zinc-950 shadow-xs dark:border-white/40 dark:bg-white/10 dark:text-white"
                    : "border-zinc-200/80 bg-white/70 text-zinc-600 dark:border-white/[0.06] dark:bg-[#111114] dark:text-zinc-400"
                }`}
              >
                <ChannelIcon channel={ch.id} className="h-3 w-3 shrink-0" />
                <span className="truncate">{ch.label}</span>
              </div>
            );
          })}
        </div>

        <div className="col-span-4 flex items-center" aria-hidden="true">
          <svg viewBox="0 0 240 108" className="h-16 w-full">
            {CONVERGENCE_CHANNELS.map((ch) => {
              const isActive = activeChannel === ch.id;
              return (
                <path
                  key={ch.id}
                  d={`M 4 ${ch.y} C 95 ${ch.y}, 135 54, 232 54`}
                  fill="none"
                  stroke={isActive ? ch.color : "rgba(161,161,170,0.28)"}
                  strokeWidth={isActive ? "2.4" : "1.25"}
                  className={isActive ? "pipeline-dash" : ""}
                />
              );
            })}
            <circle
              cx="232"
              cy="54"
              r="4.5"
              fill={activeChannel ? "#38BDF8" : "rgba(161,161,170,0.45)"}
            />
          </svg>
        </div>

        <div className="col-span-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left dark:border-white/10 dark:bg-[#111114]">
          <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-400">Hội tụ tại</div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-zinc-900 dark:text-white">
            API GW → SQS → Portal
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-500">Chuẩn hóa chung 1 schema DynamoDB</div>
        </div>
      </div>

      {/* Horizontal Topology Conduit Graph (4 Nodes connected by live SVG rails) */}
      <div className="mt-3 grid grid-cols-2 items-center gap-2 sm:grid-cols-7">
        {TOPOLOGY_NODES.map((node, idx) => {
          const done = stepIdx > idx || (stepIdx === idx && !running);
          const current = stepIdx === idx && running;
          const linkActive = stepIdx > idx;
          return (
            <div key={node.id} className="contents">
              <div
                className={`relative overflow-hidden rounded-xl border px-3 py-2 transition ${
                  current
                    ? "border-sky-500/60 bg-sky-500/10"
                    : done
                      ? "border-emerald-500/35 bg-emerald-500/10"
                      : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#09090B]"
                }`}
              >
                {current && (
                  <span className="signal-beam pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />
                )}
                <div className="flex items-center justify-between font-mono text-[9px] text-zinc-400">
                  <span>NODE {node.code}</span>
                  {done ? (
                    <span className="font-semibold text-emerald-500">OK</span>
                  ) : current ? (
                    <span className="font-semibold text-sky-500">RUN</span>
                  ) : (
                    <span>IDLE</span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {node.name}
                </div>
                <div className="truncate font-mono text-[10px] text-zinc-500">{node.sub}</div>
              </div>

              {idx < TOPOLOGY_NODES.length - 1 && (
                <div className="hidden items-center justify-center sm:flex" aria-hidden="true">
                  <svg viewBox="0 0 64 16" className="h-4 w-full">
                    <line
                      x1="2"
                      y1="8"
                      x2="58"
                      y2="8"
                      stroke={linkActive ? "#10B981" : "rgba(161,161,170,0.3)"}
                      strokeWidth="1.75"
                      className={current || linkActive ? "pipeline-dash" : ""}
                    />
                    <path
                      d="M54 4.5 60 8l-6 3.5"
                      fill="none"
                      stroke={linkActive ? "#10B981" : "rgba(161,161,170,0.45)"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Split World: Left Pipeline Trace + Wire Payload | Right Live Mini Inbox */}
      <div className="mt-3.5 grid gap-4 lg:grid-cols-12">
        {/* Left: AWS Pipeline Stepper */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-[#F8F8FA] p-4 lg:col-span-6 dark:border-white/[0.08] dark:bg-[#09090B]">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pipeline Trace · {sc.tag}
              </span>
              {running && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-sky-600 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-sky-400" />
                  Đang truyền qua AWS…
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {sc.hops.map((hop, idx) => {
                const done = stepIdx > idx || (stepIdx === idx && !running);
                const current = stepIdx === idx && running;
                return (
                  <div
                    key={hop.stage}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition ${
                      current
                        ? "border-sky-500/60 bg-sky-500/10"
                        : done
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-zinc-200 bg-white dark:border-white/10 dark:bg-[#111114]"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : current ? (
                        <span className="block h-3.5 w-3.5 animate-pulse rounded-full bg-sky-400" />
                      ) : (
                        <span className="block h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                        0{idx + 1}. {hop.stage}
                      </div>
                      <div className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">{hop.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {showWire && currentHop?.wireJson && (
              <JsonCodeBlock
                title={`Wire Contract · ${currentHop.stage}`}
                code={currentHop.wireJson}
                className="mt-3"
              />
            )}
          </div>

          <div className="mt-3 rounded-lg border border-zinc-200 bg-[#0B0C10] px-3 py-2 font-mono text-[11px] text-emerald-400 dark:border-white/10">
            &gt; {eventLog}
          </div>
        </div>

        {/* Right: Mini Live Inbox */}
        <div className="dot-canvas flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 lg:col-span-6 dark:border-white/[0.08] dark:bg-[#0D0D10]">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-200/90 pb-2.5 dark:border-white/[0.08]">
              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                Mini Agent Inbox (Tách theo conversationId)
              </div>
              <span className="font-mono text-[10px] text-zinc-400">Bấm thẻ xem khóa DynamoDB</span>
            </div>

            <div className="mt-3 space-y-2.5">
              <AnimatePresence>
                {convs.map((c) => {
                  const isAffected = affectedId === c.id;
                  const isSelected = selectedConvId === c.id;
                  return (
                    <motion.button
                      type="button"
                      layout
                      key={c.id}
                      onClick={() => setSelectedConvId(c.id)}
                      className={`elevated-sheet block w-full rounded-xl border p-3 text-left transition ${
                        isAffected
                          ? "border-sky-500/60 bg-sky-500/[0.07] ring-2 ring-sky-500/20"
                          : isSelected
                            ? "border-zinc-400 bg-white dark:border-white/25 dark:bg-[#16161A]"
                            : "border-zinc-200 bg-white/95 hover:border-zinc-300 dark:border-white/10 dark:bg-[#131317]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{c.name}</span>
                          <ChannelBadge channel={c.channel} />
                          {isAffected && (
                            <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${sc.badgeCls}`}>
                              {sc.badge}
                            </span>
                          )}
                        </div>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-400">customerId: {c.customerId}</div>
                      <div className="mt-1.5 text-xs text-zinc-700 dark:text-zinc-200">{c.text}</div>
                      <div className="mt-2 flex items-center justify-between border-t border-zinc-200/80 pt-2 dark:border-white/10">
                        <StatusDot status={c.status} showCode />
                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                          agent: <b className="text-zinc-800 dark:text-zinc-200">{c.agent}</b>
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/95 px-3 py-2 font-mono text-[10px] text-zinc-600 dark:border-white/10 dark:bg-[#09090B]/95 dark:text-zinc-400">
              <div>
                <span className="text-zinc-400">conversationId (PK):</span>{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{inspectedConv.pk}</span>
              </div>
              <div className="mt-0.5">
                <span className="text-zinc-400">Context Isolation:</span> tách riêng từng khách trùng tên{" "}
                <b className="text-zinc-800 dark:text-zinc-200">Nguyễn Văn A</b>
              </div>
            </div>

            {activeScenario === "conflict409" && stepIdx >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  Lan nhận HTTP <b className="font-mono">409</b> và tự cập nhật về{" "}
                  <b className="font-mono">agent.minh</b> — không ghi đè phân công.
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
