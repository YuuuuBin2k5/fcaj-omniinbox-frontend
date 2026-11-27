// FILE: src/features/inbox/InboxView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FlaskConical,
  Inbox,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useInbox } from "../../hooks/useInbox.js";
import { getAgentName, USE_MOCK } from "../../services/auth.js";
import { latencyTracker } from "../../services/latencyTracker.js";
import { clampSidebarWidth, countMessageMatches, isAwaitingReply } from "../../services/uiFormat.js";
import { resetMock, seedManyForPagination, seedSameNamePair } from "../../services/mockBackend.js";
import { ChannelBadge, ChannelIcon, StatusIcon } from "../../components/ChannelBadge.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import JsonCodeBlock from "../../components/JsonCodeBlock.jsx";
import ConversationList from "./ConversationList.jsx";
import ChatThread from "./ChatThread.jsx";
import AssignSelect from "./AssignSelect.jsx";
import Composer from "./Composer.jsx";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Chưa xử lý", sub: "OPEN", icon: <StatusIcon status="OPEN" className="h-3.5 w-3.5 shrink-0" /> },
  {
    value: "IN_PROGRESS",
    label: "Đang tư vấn",
    sub: "IN_PROGRESS",
    icon: <StatusIcon status="IN_PROGRESS" className="h-3.5 w-3.5 shrink-0" />,
  },
  {
    value: "RESOLVED",
    label: "Đã hoàn tất",
    sub: "RESOLVED",
    icon: <StatusIcon status="RESOLVED" className="h-3.5 w-3.5 shrink-0" />,
  },
];

const SIMULATED_CHANNELS = new Set(["shopee", "zalo", "webchat"]);

function customerInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function InboxView({
  active = true,
  onOpenSimulator,
  onConversationsChange,
  externalSelectConv,
  onClearExternalSelect,
}) {
  const inbox = useInbox();
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [queueScope, setQueueScope] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clampSidebarWidth(typeof localStorage !== "undefined" ? localStorage.getItem("omni_sidebar_w") : 392)
  );
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [draftsByConv, setDraftsByConv] = useState({});
  const [showQaTools, setShowQaTools] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("overview");
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [failNextArmed, setFailNextArmed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem("omni_mock_fail_next") === "1"
  );
  const [copiedId, setCopiedId] = useState(false);
  const [copiedConvId, setCopiedConvId] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const composerRef = useRef(null);
  const searchInputRef = useRef(null);
  const threadSearchInputRef = useRef(null);

  const currentAgent = getAgentName();

  const list = useMemo(
    () =>
      inbox.conversations.filter((c) => {
        if (channel !== "all" && c.channel !== channel) return false;
        if (status !== "all" && c.status !== status) return false;
        if (unreadOnly && !(Number(c.unreadCount) > 0)) return false;
        if (awaitingOnly && !isAwaitingReply(c)) return false;
        if (queueScope === "mine" && c.assignedAgent !== currentAgent) return false;
        if (queueScope === "unassigned" && c.assignedAgent && c.assignedAgent !== "unassigned") return false;
        return true;
      }),
    [inbox.conversations, channel, status, unreadOnly, awaitingOnly, queueScope, currentAgent]
  );

  useEffect(() => {
    try {
      localStorage.setItem("omni_sidebar_w", String(sidebarWidth));
    } catch {
      // ignore storage errors
    }
  }, [sidebarWidth]);

  useEffect(() => {
    setThreadSearch("");
    setThreadSearchOpen(false);
  }, [inbox.selectedId]);

  useEffect(() => {
    if (!resizingSidebar) return undefined;
    function onMove(e) {
      // Trừ 56px Left Micro Rail trên desktop
      setSidebarWidth(clampSidebarWidth(e.clientX - 56));
    }
    function onUp() {
      setResizingSidebar(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizingSidebar]);

  useEffect(() => {
    onConversationsChange?.(inbox.conversations);
  }, [inbox.conversations, onConversationsChange]);

  useEffect(() => {
    if (externalSelectConv) {
      inbox.select(externalSelectConv);
      onClearExternalSelect?.();
    }
  }, [externalSelectConv, inbox.select, onClearExternalSelect]);

  const conv = inbox.conversations.find((c) => c.conversationId === inbox.selectedId) || null;
  const msgs = (conv && inbox.messages[conv.conversationId]) || [];

  // Phím tắt chuẩn Linear: J/K di chuyển, R focus Composer, / tìm kiếm, E hoàn tất/mở lại, C nhận xử lý, I bật Inspector
  useEffect(() => {
    if (!active) return undefined;
    function onKey(e) {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const k = e.key.toLowerCase();
      if ((k === "j" || k === "k") && list.length > 0) {
        e.preventDefault();
        const curIdx = list.findIndex((c) => c.conversationId === inbox.selectedId);
        const nextIdx =
          k === "j"
            ? curIdx < 0
              ? 0
              : Math.min(list.length - 1, curIdx + 1)
            : curIdx <= 0
              ? 0
              : curIdx - 1;
        inbox.select(list[nextIdx]);
      } else if (k === "r" && conv) {
        e.preventDefault();
        composerRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (k === "e" && conv) {
        e.preventDefault();
        inbox.setStatus(conv, conv.status === "RESOLVED" ? "OPEN" : "RESOLVED");
      } else if (k === "c" && conv && (!conv.assignedAgent || conv.assignedAgent === "unassigned") && currentAgent) {
        e.preventDefault();
        inbox.assign(conv, currentAgent);
      } else if (k === "i" && conv) {
        e.preventDefault();
        setShowInspector((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, list, conv, currentAgent, inbox.selectedId, inbox.select, inbox.setStatus, inbox.assign]);

  const queueSummary = useMemo(() => {
    const all = inbox.conversations;
    return {
      open: all.filter((c) => c.status === "OPEN").length,
      inProgress: all.filter((c) => c.status === "IN_PROGRESS").length,
      unread: all.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0),
    };
  }, [inbox.conversations]);

  const setDraft = (convId, value) => {
    setDraftsByConv((p) => ({ ...p, [convId]: value }));
  };

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await inbox.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  function toggleFailNext() {
    const next = !failNextArmed;
    if (next) localStorage.setItem("omni_mock_fail_next", "1");
    else localStorage.removeItem("omni_mock_fail_next");
    setFailNextArmed(next);
  }

  async function handleSend(targetConv, content, retryOfMessageId) {
    const res = await inbox.send(targetConv, content, retryOfMessageId);
    if (typeof localStorage !== "undefined") {
      setFailNextArmed(localStorage.getItem("omni_mock_fail_next") === "1");
    }
    return res;
  }

  function copyCustomerId(val) {
    navigator.clipboard?.writeText(val);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  }

  function copyConversationId(val) {
    navigator.clipboard?.writeText(val);
    setCopiedConvId(true);
    setTimeout(() => setCopiedConvId(false), 1500);
  }

  function copyLatencyCsv() {
    navigator.clipboard?.writeText(latencyTracker.toCsv());
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 1500);
  }

  const isConflictNotice = inbox.notice && inbox.notice.includes("409");

  const sanitizedConvJson = conv
    ? JSON.stringify(
        {
          conversationId: conv.conversationId,
          channel: conv.channel,
          customerId: conv.customerId,
          customerName: conv.customerName,
          status: conv.status,
          assignedAgent: conv.assignedAgent,
          unreadCount: conv.unreadCount ?? 0,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          deliveredVia: SIMULATED_CHANNELS.has(conv.channel) ? "simulator" : "telegram",
        },
        null,
        2
      )
    : "";

  const renderInspectorContent = () =>
    conv && (
      <div className="space-y-3 p-3.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Contract Inspector
          </span>
          <button
            type="button"
            aria-label="Đóng Inspector"
            onClick={() => setShowInspector(false)}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 2-Tab Switcher: Tổng quan | Raw JSON */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-0.5 text-[11px] dark:bg-[#09090B]">
          <button
            type="button"
            onClick={() => setInspectorTab("overview")}
            className={`rounded-md py-1 font-medium transition ${
              inspectorTab === "overview"
                ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab("json")}
            className={`inline-flex items-center justify-center gap-1 rounded-md py-1 font-medium transition ${
              inspectorTab === "json"
                ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            }`}
          >
            <Code2 className="h-3 w-3" />
            <span>Raw JSON</span>
          </button>
        </div>

        {inspectorTab === "json" ? (
          <JsonCodeBlock title="OmniConversations · Record" code={sanitizedConvJson} />
        ) : (
          <>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-white/10 dark:bg-[#09090B]">
              <div className="text-[10px] text-zinc-400">conversationId (PK)</div>
              <div className="mt-1 flex items-center justify-between gap-1.5 font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="truncate">{conv.conversationId}</span>
                <button
                  type="button"
                  aria-label="Sao chép conversationId"
                  onClick={() => copyConversationId(conv.conversationId)}
                  className="shrink-0 rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-white/10"
                >
                  {copiedConvId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <dl className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-white/10 dark:bg-[#09090B]">
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">Kênh</dt>
                <dd>
                  <ChannelBadge channel={conv.channel} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">customerId</dt>
                <dd className="truncate font-mono text-[11px]">{conv.customerId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">status</dt>
                <dd className="font-mono text-[11px]">{conv.status}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">assignedAgent</dt>
                <dd title={conv.assignedAgent} className="min-w-0 truncate text-right font-mono text-[11px]">
                  {conv.assignedAgent}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">unreadCount</dt>
                <dd className="font-mono text-[11px] tabular-nums">{conv.unreadCount ?? 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">Tin đã tải</dt>
                <dd className="font-mono text-[11px] tabular-nums">{msgs.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">Realtime</dt>
                <dd className="font-mono text-[11px]">{inbox.realtime}</dd>
              </div>
            </dl>

            {/* DynamoDB Key & Delivery Scope (100% honest technical metadata) */}
            <div className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-[10px] text-zinc-500 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-400">
              <div className="flex items-center justify-between gap-2">
                <span>GSI</span>
                <span className="text-zinc-800 dark:text-zinc-200">gsi-all-by-time</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>deliveredVia</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {SIMULATED_CHANNELS.has(conv.channel) ? "simulator (Mô phỏng)" : "telegram (Thật)"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>lastMessageDirection</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {conv.lastMessageDirection || (String(conv.lastMessage || "").startsWith("[NV] ") ? "OUTBOUND" : "INBOUND")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => inbox.toggleUnread(conv)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-white/12 dark:bg-[#18181C] dark:text-zinc-200 dark:hover:bg-white/10"
            >
              {Number(conv.unreadCount) > 0 ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
            </button>
          </>
        )}

        {SIMULATED_CHANNELS.has(conv.channel) && (
          <button
            type="button"
            onClick={onOpenSimulator}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-200"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Mở Simulator (Mô phỏng)
          </button>
        )}
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Collapsible QA / Latency Drawer */}
      <AnimatePresence>
        {showQaTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-zinc-200 bg-zinc-100/80 dark:border-white/10 dark:bg-[#111114]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold">[LATENCY] Simulator → WS NEW_MESSAGE:</span>
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] tabular-nums dark:border-white/10 dark:bg-[#09090B]">
                  n={inbox.latencyStats.count}
                </span>
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] tabular-nums dark:border-white/10 dark:bg-[#09090B]">
                  p50={inbox.latencyStats.p50 ?? "-"}ms
                </span>
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] tabular-nums dark:border-white/10 dark:bg-[#09090B]">
                  p95={inbox.latencyStats.p95 ?? "-"}ms
                </span>
                {inbox.latencyStats.count > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-0.5 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5"
                    onClick={copyLatencyCsv}
                  >
                    {copiedCsv ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedCsv ? "Đã chép CSV" : "Copy CSV"}
                  </button>
                )}
              </div>

              {USE_MOCK && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-white/15 dark:bg-[#1C1C22] dark:text-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      seedSameNamePair();
                      inbox.refresh();
                    }}
                  >
                    Seed 2 khách trùng tên
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-white/15 dark:bg-[#1C1C22] dark:text-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      seedManyForPagination(60);
                      inbox.refresh();
                    }}
                  >
                    Seed 60 hội thoại
                  </button>
                  <button
                    type="button"
                    aria-pressed={failNextArmed}
                    className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                      failNextArmed
                        ? "border-amber-500 bg-amber-500 font-semibold text-zinc-950"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
                    }`}
                    onClick={toggleFailNext}
                  >
                    {failNextArmed ? "Đã bật lỗi kế tiếp (bấm tắt)" : "Giả lập lỗi tin gửi kế tiếp"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                    onClick={() => {
                      resetMock();
                      window.location.reload();
                    }}
                  >
                    Reset Mock DB
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Split Workspace */}
      <div className="flex min-h-0 flex-1" style={{ "--sidebar-w": `${sidebarWidth}px` }}>
        <aside
          className={`${
            conv ? "hidden md:block" : "block w-full"
          } shrink-0 border-r border-zinc-200/90 md:w-[344px] lg:w-[var(--sidebar-w)] dark:border-white/[0.08]`}
        >
          <ConversationList
            allConversations={inbox.conversations}
            filteredList={list}
            selectedId={inbox.selectedId}
            channel={channel}
            status={status}
            queueScope={queueScope}
            unreadOnly={unreadOnly}
            awaitingOnly={awaitingOnly}
            currentAgent={currentAgent}
            realtime={inbox.realtime}
            nextToken={inbox.nextToken}
            loading={inbox.loadingConversations}
            showQaTools={showQaTools}
            refreshing={refreshing}
            draftsByConv={draftsByConv}
            searchInputRef={searchInputRef}
            onToggleQaTools={() => setShowQaTools((v) => !v)}
            onToggleUnreadOnly={() => setUnreadOnly((v) => !v)}
            onToggleAwaitingOnly={() => setAwaitingOnly((v) => !v)}
            onRefresh={handleRefresh}
            onChannelChange={setChannel}
            onStatusChange={setStatus}
            onQueueScopeChange={setQueueScope}
            onResetFilters={() => {
              setChannel("all");
              setStatus("all");
              setQueueScope("all");
              setUnreadOnly(false);
              setAwaitingOnly(false);
            }}
            onQuickAssign={(c, ag) => inbox.assign(c, ag)}
            onQuickResolve={(c) => inbox.setStatus(c, "RESOLVED")}
            onQuickReopen={(c) => inbox.setStatus(c, "OPEN")}
            onSelect={inbox.select}
            onLoadMore={inbox.loadMore}
          />
        </aside>

        {/* Desktop Sidebar Resize Handle (lg+) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo thay đổi độ rộng danh sách hội thoại"
          title="Kéo để chỉnh độ rộng · Double-click để đặt lại"
          onPointerDown={() => setResizingSidebar(true)}
          onDoubleClick={() => setSidebarWidth(392)}
          className="group hidden w-1 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition hover:bg-sky-500/20 lg:flex"
        >
          <span className="h-8 w-[1.5px] rounded-full bg-zinc-300 opacity-0 transition group-hover:bg-sky-500 group-hover:opacity-100 dark:bg-zinc-700" />
        </div>

        <main
          className={`${
            conv ? "flex" : "hidden md:flex"
          } relative min-w-0 flex-1 flex-col bg-[#F6F7F9] dark:bg-[#09090B]`}
        >
          {!conv ? (
            <div className="dot-canvas relative flex flex-1 items-center justify-center overflow-hidden p-6">
              <div className="pointer-events-none absolute top-1/3 left-1/2 h-56 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/[0.08] blur-3xl" />

              <div className="relative w-full max-w-md text-center">
                <div className="elevated-sheet mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200/90 bg-white dark:border-white/12 dark:bg-[#111114]">
                  <Inbox className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <h3 className="mt-4 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                  {inbox.conversations.length === 0
                    ? "Hộp thư đang chờ tin nhắn đầu tiên"
                    : "Chọn một hội thoại để bắt đầu chăm sóc"}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Mọi hội thoại đa kênh được tách riêng theo <code className="font-mono">conversationId</code>.
                </p>

                {inbox.conversations.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="elevated-sheet rounded-xl border border-zinc-200/90 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#111114]">
                      <div className="font-mono text-[10px] text-zinc-400">OPEN</div>
                      <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-amber-600 dark:text-amber-300">
                        {queueSummary.open}
                      </div>
                    </div>
                    <div className="elevated-sheet rounded-xl border border-zinc-200/90 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#111114]">
                      <div className="font-mono text-[10px] text-zinc-400">IN_PROGRESS</div>
                      <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-blue-600 dark:text-blue-400">
                        {queueSummary.inProgress}
                      </div>
                    </div>
                    <div className="elevated-sheet rounded-xl border border-zinc-200/90 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#111114]">
                      <div className="font-mono text-[10px] text-zinc-400">CHƯA ĐỌC</div>
                      <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {queueSummary.unread}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-left font-mono text-[10px]">
                  {[
                    ["J / K", "Chuyển hội thoại"],
                    ["/", "Tìm khách hàng"],
                    ["E / C", "Hoàn tất / Nhận nhanh"],
                    ["Ctrl+K", "Command Palette"],
                  ].map(([keyName, label]) => (
                    <div
                      key={keyName}
                      className="elevated-sheet flex items-center justify-between rounded-xl border border-zinc-200/90 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-[#111114]"
                    >
                      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                      <kbd className="kbd-cap rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-semibold text-zinc-900 dark:border-white/15 dark:bg-zinc-900 dark:text-white">
                        {keyName}
                      </kbd>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {list.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => inbox.select(list[0])}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      <span>Mở hội thoại đầu tiên</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    USE_MOCK && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            seedSameNamePair();
                            inbox.refresh();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Seed 2 khách trùng tên
                        </button>
                        <button
                          type="button"
                          onClick={onOpenSimulator}
                          className="elevated-sheet inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-200"
                        >
                          <FlaskConical className="h-3.5 w-3.5" />
                          Mở Simulator gửi tin
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Responsive Single/Multi-Row Thread Header (never collides or clips on mobile/tablet) */}
              <header className="relative z-20 flex flex-wrap items-center gap-2 border-b border-zinc-200/90 bg-white px-3 py-2.5 xl:flex-nowrap dark:border-white/[0.08] dark:bg-[#111114]">
                <button
                  type="button"
                  onClick={() => inbox.select(null)}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 md:hidden dark:border-white/15 dark:text-zinc-200"
                >
                  ← Danh sách
                </button>

                <div className="relative hidden shrink-0 sm:block">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11px] font-bold text-zinc-700 dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-200">
                    {customerInitials(conv.customerName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white dark:border-[#111114] dark:bg-[#18181C]">
                    <ChannelIcon channel={conv.channel} className="h-2.5 w-2.5" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b className="truncate text-sm text-zinc-950 dark:text-white">{conv.customerName}</b>
                    <ChannelBadge channel={conv.channel} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="truncate">customerId: {conv.customerId}</span>
                    <button
                      type="button"
                      aria-label="Sao chép customerId"
                      onClick={() => copyCustomerId(conv.customerId)}
                      className="inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-white/10"
                    >
                      {copiedId ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-1.5 xl:ml-auto xl:w-auto xl:shrink-0 xl:flex-nowrap">
                  {conv.assignedAgent === "unassigned" && currentAgent && (
                    <button
                      type="button"
                      disabled={Boolean(inbox.assigningByConv[conv.conversationId])}
                      onClick={() => inbox.assign(conv, currentAgent)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Nhận xử lý</span>
                    </button>
                  )}

                  <CustomSelect
                    ariaLabel="Trạng thái hội thoại"
                    value={conv.status}
                    options={STATUS_OPTIONS}
                    disabled={Boolean(inbox.statusUpdatingByConv[conv.conversationId])}
                    onChange={(val) => inbox.setStatus(conv, val)}
                  />

                  <AssignSelect
                    conv={conv}
                    disabled={Boolean(inbox.assigningByConv[conv.conversationId])}
                    onAssign={inbox.assign}
                  />

                  <button
                    type="button"
                    aria-label="Tìm trong hội thoại"
                    title="Tìm nội dung tin nhắn trong hội thoại"
                    onClick={() => {
                      setThreadSearchOpen((v) => {
                        const next = !v;
                        if (next) setTimeout(() => threadSearchInputRef.current?.focus(), 20);
                        else setThreadSearch("");
                        return next;
                      });
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                      threadSearchOpen
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label="Chi tiết hội thoại"
                    title="Chi tiết kỹ thuật hội thoại (I)"
                    onClick={() => setShowInspector((v) => !v)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                      showInspector
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/12 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </header>

              {/* Collapsible In-Thread Message Search Bar */}
              <AnimatePresence>
                {threadSearchOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-zinc-200/80 bg-zinc-50 px-3 py-2 dark:border-white/[0.08] dark:bg-[#0D0D10]"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <input
                        ref={threadSearchInputRef}
                        aria-label="Tìm nội dung trong luồng tin nhắn"
                        value={threadSearch}
                        onChange={(e) => setThreadSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setThreadSearch("");
                            setThreadSearchOpen(false);
                          }
                        }}
                        placeholder="Tìm từ khóa trong hội thoại này…"
                        className="min-w-0 flex-1 bg-transparent text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-white"
                      />
                      {threadSearch.trim() && (
                        <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                          {countMessageMatches(msgs, threadSearch)} tin khớp
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Đóng tìm trong hội thoại"
                        onClick={() => {
                          setThreadSearch("");
                          setThreadSearchOpen(false);
                        }}
                        className="rounded p-0.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative flex min-h-0 flex-1">
                {/* Floating Sonner-Style Alert Pill (zero layout shift on ChatThread) */}
                <AnimatePresence>
                  {inbox.notice && (
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 460, damping: 32 }}
                      className={`glass-panel absolute left-1/2 top-3 z-30 flex w-[92%] max-w-lg -translate-x-1/2 items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-xs shadow-xl ${
                        isConflictNotice
                          ? "border-amber-500/40 bg-amber-50/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200"
                          : "border-rose-500/40 bg-rose-50/95 text-rose-900 dark:bg-rose-950/90 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {isConflictNotice ? (
                          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                        )}
                        <span className="leading-snug">{inbox.notice}</span>
                      </div>
                      <button
                        type="button"
                        aria-label="Đóng thông báo"
                        className="shrink-0 rounded-md p-1 opacity-75 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                        onClick={inbox.clearNotice}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex min-w-0 flex-1 flex-col">
                  <ChatThread
                    conv={conv}
                    convId={conv.conversationId}
                    messages={msgs}
                    loading={Boolean(inbox.loadingMessagesByConv[conv.conversationId])}
                    pendingOutgoing={inbox.pendingOutgoingByConv[conv.conversationId]}
                    searchQuery={threadSearchOpen ? threadSearch : ""}
                    hasOlder={inbox.hasOlder}
                    retryingMessageId={inbox.retryingMessageId}
                    onLoadOlder={inbox.loadOlder}
                    onRetry={(msg) => handleSend(conv, msg.content, msg.messageId)}
                    onSyncStatus={handleRefresh}
                  />

                  <Composer
                    key={conv.conversationId}
                    conv={conv}
                    textareaRef={composerRef}
                    draft={draftsByConv[conv.conversationId] ?? ""}
                    onDraftChange={(val) => setDraft(conv.conversationId, val)}
                    sending={Boolean(inbox.sendingByConv[conv.conversationId])}
                    unconfirmedNotice={inbox.unconfirmedByConv[conv.conversationId]}
                    onClearUnconfirmed={() => inbox.clearUnconfirmed(conv.conversationId)}
                    onReopen={() => inbox.setStatus(conv, "OPEN")}
                    onTakeOver={currentAgent ? () => inbox.assign(conv, currentAgent) : undefined}
                    onSend={handleSend}
                  />
                </div>

                {/* Desktop Inline Contract Inspector (lg+) */}
                <AnimatePresence>
                  {showInspector && (
                    <motion.aside
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 260, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="hidden shrink-0 overflow-hidden border-l border-zinc-200/90 bg-white lg:block dark:border-white/[0.08] dark:bg-[#111114]"
                    >
                      <div className="w-[260px]">{renderInspectorContent()}</div>
                    </motion.aside>
                  )}
                </AnimatePresence>

                {/* Tablet / Mobile Slide-Over Contract Inspector (< lg) */}
                <AnimatePresence>
                  {showInspector && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowInspector(false)}
                      className="fixed inset-0 z-40 flex justify-end bg-zinc-950/50 glass-panel lg:hidden"
                    >
                      <motion.aside
                        initial={{ x: 280 }}
                        animate={{ x: 0 }}
                        exit={{ x: 280 }}
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-full w-[280px] overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111114]"
                      >
                        {renderInspectorContent()}
                      </motion.aside>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </main>
      </div>
      {/* Ephemeral Action Confirmation Toast + Undo (top-center floating pill, never occludes Send or Header) */}
      <AnimatePresence>
        {inbox.toast && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            className="surface-specular glass-panel fixed top-[62px] right-4 z-50 flex max-w-[92vw] items-center gap-2.5 rounded-xl border border-zinc-200 bg-white/95 px-3.5 py-2 text-xs text-zinc-900 shadow-2xl dark:border-white/20 dark:bg-[#16161B]/95 dark:text-zinc-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="font-medium">{inbox.toast.text}</span>
            {inbox.toast.undoLabel && inbox.toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  const fn = inbox.toast.onUndo;
                  inbox.dismissToast();
                  fn();
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/10 dark:text-white"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                {inbox.toast.undoLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Đóng thông báo nhanh"
              onClick={inbox.dismissToast}
              className="rounded p-0.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
