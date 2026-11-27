// FILE: src/features/inbox/ConversationList.jsx
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, RefreshCw, Search, SlidersHorizontal, UserCheck, X } from "lucide-react";
import { ChannelBadge, ChannelIcon, StatusIcon } from "../../components/ChannelBadge.jsx";
import { formatAgentShort, formatRelativeTime, splitHighlight } from "../../services/uiFormat.js";

const CHANNEL_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "telegram", label: "Telegram · Thật", icon: "telegram", sim: false },
  { id: "shopee", label: "Shopee", icon: "shopee", sim: true },
  { id: "zalo", label: "Zalo", icon: "zalo", sim: true },
  { id: "webchat", label: "WebChat", icon: "webchat", sim: true },
];

const STATUS_TABS = [
  { id: "all", label: "Tất cả", title: "Tất cả trạng thái" },
  { id: "OPEN", label: "Mở", title: "OPEN — Chưa xử lý" },
  { id: "IN_PROGRESS", label: "Đang tư vấn", title: "IN_PROGRESS — Đang tư vấn" },
  { id: "RESOLVED", label: "Hoàn tất", title: "RESOLVED — Đã hoàn tất" },
];

const QUEUE_SCOPES = [
  { id: "all", label: "Tất cả" },
  { id: "mine", label: "Của tôi" },
  { id: "unassigned", label: "Chưa nhận" },
];

const REALTIME_META = {
  connected: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  connecting: { label: "Connecting", dot: "bg-amber-400 animate-pulse", text: "text-amber-700 dark:text-amber-300" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber-400 animate-pulse", text: "text-amber-700 dark:text-amber-300" },
  mock: { label: "Local Mock", dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
};

const AVATAR_RING = {
  telegram: "bg-sky-500/12 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  shopee: "bg-orange-500/12 text-orange-700 ring-orange-500/30 dark:text-orange-300",
  zalo: "bg-blue-500/12 text-blue-700 ring-blue-500/30 dark:text-blue-300",
  webchat: "bg-violet-500/12 text-violet-700 ring-violet-500/30 dark:text-violet-300",
};

function initials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function HighlightText({ text, query }) {
  if (!query) return text;
  const parts = splitHighlight(text, query);
  return parts.map((p, idx) =>
    p.match ? (
      <mark key={idx} className="rounded bg-amber-300/45 px-0.5 text-inherit dark:bg-amber-400/25">
        {p.text}
      </mark>
    ) : (
      <span key={idx}>{p.text}</span>
    )
  );
}

export default function ConversationList({
  allConversations,
  filteredList,
  selectedId,
  channel,
  status,
  queueScope = "all",
  currentAgent = "",
  realtime,
  nextToken,
  loading = false,
  showQaTools,
  refreshing = false,
  draftsByConv = {},
  searchInputRef,
  onToggleQaTools,
  onRefresh,
  onChannelChange,
  onStatusChange,
  onQueueScopeChange,
  onResetFilters,
  onQuickAssign,
  onQuickResolve,
  onSelect,
  onLoadMore,
}) {
  const [search, setSearch] = useState("");
  const rowRefs = useRef({});
  const rt = REALTIME_META[realtime] || { label: realtime, dot: "bg-zinc-400", text: "text-zinc-500" };
  const selectedChannelTab = CHANNEL_TABS.find((t) => t.id === channel);

  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  const trimmedSearch = search.trim();
  const q = trimmedSearch.toLowerCase();
  const visibleList = q
    ? filteredList.filter(
        (c) =>
          (c.customerName || "").toLowerCase().includes(q) ||
          (c.customerId || "").toLowerCase().includes(q) ||
          (c.lastMessage || "").toLowerCase().includes(q)
      )
    : filteredList;

  const hasActiveFilters = Boolean(trimmedSearch || channel !== "all" || status !== "all" || queueScope !== "all");

  const statusCounts = {
    all: allConversations.length,
    OPEN: allConversations.filter((c) => c.status === "OPEN").length,
    IN_PROGRESS: allConversations.filter((c) => c.status === "IN_PROGRESS").length,
    RESOLVED: allConversations.filter((c) => c.status === "RESOLVED").length,
  };

  const scopeCounts = {
    all: allConversations.length,
    mine: currentAgent ? allConversations.filter((c) => c.assignedAgent === currentAgent).length : 0,
    unassigned: allConversations.filter((c) => !c.assignedAgent || c.assignedAgent === "unassigned").length,
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#111114]">
      {/* Single Compact Column Header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-200/90 px-3 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-white">Hộp thư</h2>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            {allConversations.length}
          </span>
          <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold ${rt.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${rt.dot}`} />
            {rt.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Làm mới"
            title="Làm mới danh sách"
            onClick={onRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            aria-label="Công cụ QA / Latency"
            title="Công cụ QA / Latency"
            onClick={onToggleQaTools}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              showQaTools
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search + Queue Scope + Single-Row Channel & Status Filters */}
      <div className="space-y-2 border-b border-zinc-200/90 p-2.5 dark:border-white/[0.08]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
          <input
            ref={searchInputRef}
            aria-label="Tìm tên khách hoặc customerId"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên khách, customerId…"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-8 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-[#09090B] dark:text-white dark:focus:border-white/30"
          />
          {search ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="kbd-cap pointer-events-none absolute right-2 top-1.5 rounded border border-zinc-200 bg-white px-1 font-mono text-[10px] text-zinc-400 dark:border-white/10 dark:bg-zinc-900">
              /
            </kbd>
          )}
        </div>

        {/* Queue Scope Segmented Control */}
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100/90 p-0.5 dark:bg-[#09090B]">
          {QUEUE_SCOPES.map((s) => {
            const active = queueScope === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onQueueScopeChange?.(s.id)}
                className={`relative flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition ${
                  active
                    ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <span>{s.label}</span>
                <span className="font-mono text-[9px] tabular-nums opacity-70">{scopeCounts[s.id]}</span>
              </button>
            );
          })}
        </div>

        {/* Channel Filter Bar */}
        <div className="flex flex-wrap items-center gap-1">
          {CHANNEL_TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              title={t.sim ? `${t.label} (Kênh mô phỏng)` : t.label}
              onClick={() => onChannelChange(t.id)}
              className={`relative inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[10.5px] font-medium transition ${
                channel === t.id
                  ? "text-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              }`}
            >
              {channel === t.id && (
                <motion.span
                  layoutId="channelFilterPill"
                  transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-white"
                />
              )}
              {t.icon && <ChannelIcon channel={t.icon} className="relative z-10 h-3 w-3" />}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        {selectedChannelTab?.sim && (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Đang lọc kênh {selectedChannelTab.label} · Mô phỏng (Simulator)
          </div>
        )}

        {/* Status Filter Bar */}
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_TABS.map((t) => (
            <button
              type="button"
              key={t.id}
              title={t.title}
              onClick={() => onStatusChange(t.id)}
              className={`relative inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                status === t.id
                  ? "text-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
              }`}
            >
              {status === t.id && (
                <motion.span
                  layoutId="statusFilterPill"
                  transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-zinc-800 dark:bg-zinc-200"
                />
              )}
              {t.id !== "all" && <StatusIcon status={t.id} className="relative z-10 h-2.5 w-2.5 shrink-0" />}
              <span className="relative z-10">{t.label}</span>
              <span className="relative z-10 font-mono text-[9px] tabular-nums opacity-70">{statusCounts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="gutter-stable flex-1 overflow-y-auto">
        {loading && allConversations.length === 0 ? (
          <div aria-label="Đang tải danh sách hội thoại" className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-2.5 px-3 py-3">
                <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="skeleton-shimmer h-3 w-32 rounded-md" />
                    <div className="skeleton-shimmer h-2.5 w-10 rounded-md" />
                  </div>
                  <div className="skeleton-shimmer h-3 w-4/5 rounded-md" />
                  <div className="flex items-center justify-between gap-4">
                    <div className="skeleton-shimmer h-3 w-24 rounded-md" />
                    <div className="skeleton-shimmer h-2.5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleList.length === 0 ? (
          <div className="p-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {nextToken ? (
              <div className="space-y-2.5">
                <p>Chưa thấy kết quả trong {allConversations.length} hội thoại đã tải.</p>
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 font-semibold text-zinc-900 hover:bg-zinc-200 dark:border-white/15 dark:bg-white/10 dark:text-white"
                >
                  Tải thêm hội thoại cũ hơn
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p>Không có hội thoại phù hợp.</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      onResetFilters?.();
                    }}
                    className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          visibleList.map((c) => {
            const isSelected = c.conversationId === selectedId;
            const ringCls = AVATAR_RING[c.channel] || AVATAR_RING.webchat;
            const draftPreview = (draftsByConv[c.conversationId] || "").trim();
            const hasUnread = c.unreadCount > 0;
            const canQuickClaim = (!c.assignedAgent || c.assignedAgent === "unassigned") && Boolean(currentAgent);
            const canQuickResolve = c.status !== "RESOLVED";

            return (
              <div
                key={c.conversationId}
                ref={(el) => {
                  rowRefs.current[c.conversationId] = el;
                }}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(c);
                  }
                }}
                className={`group relative cursor-pointer border-b border-zinc-100 px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:bg-zinc-100 dark:border-white/[0.06] dark:focus-visible:bg-white/[0.08] ${
                  isSelected
                    ? "bg-zinc-100/95 dark:bg-white/[0.07]"
                    : "hover:bg-zinc-50/90 dark:hover:bg-white/[0.03]"
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-zinc-950 dark:bg-white" />
                )}

                <div className="flex items-start gap-2.5">
                  {/* Avatar + Channel Micro-Icon Overlay */}
                  <div className="relative mt-0.5 shrink-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ring-1 ${ringCls}`}
                    >
                      {initials(c.customerName)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white shadow-xs dark:border-[#111114] dark:bg-[#18181C]">
                      <ChannelIcon channel={c.channel} className="h-2.5 w-2.5" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Line 1: Name (with Highlight) + Timestamp / Hover Quick-Triage Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-xs ${
                          hasUnread
                            ? "font-bold text-zinc-950 dark:text-white"
                            : "font-semibold text-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        <HighlightText text={c.customerName} query={trimmedSearch} />
                      </span>

                      <div className="relative flex shrink-0 items-center">
                        <span
                          title={c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("vi-VN") : ""}
                          className="font-mono text-[10px] tabular-nums text-zinc-400 transition group-hover:opacity-0 group-focus-within:opacity-0"
                        >
                          {formatRelativeTime(c.lastMessageAt)}
                        </span>

                        <div className="pointer-events-none absolute right-0 flex items-center gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                          {canQuickClaim && (
                            <button
                              type="button"
                              aria-label={`Nhận nhanh ${c.customerName}`}
                              title="Nhận xử lý nhanh (C)"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAssign?.(c, currentAgent);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:border-zinc-400 hover:text-zinc-950 dark:border-white/15 dark:bg-[#1C1C22] dark:text-zinc-200 dark:hover:text-white"
                            >
                              <UserCheck className="h-3 w-3" />
                            </button>
                          )}
                          {canQuickResolve && (
                            <button
                              type="button"
                              aria-label={`Hoàn tất ${c.customerName}`}
                              title="Đánh dấu Đã hoàn tất (E)"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickResolve?.(c);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-md border border-zinc-200 bg-white text-emerald-600 shadow-xs hover:border-emerald-400 dark:border-white/15 dark:bg-[#1C1C22] dark:text-emerald-400"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Line 2: Draft indicator or Last Message (with Highlight) + Unread Badge */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {draftPreview ? (
                        <span className="truncate text-xs text-amber-600 dark:text-amber-300">
                          <b className="font-semibold">Nháp:</b> {draftPreview}
                        </span>
                      ) : (
                        <span
                          className={`truncate text-xs ${
                            hasUnread
                              ? "font-medium text-zinc-800 dark:text-zinc-200"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <HighlightText text={c.lastMessage} query={trimmedSearch} />
                        </span>
                      )}

                      {hasUnread && (
                        <span
                          title="Chưa đọc (dùng chung nhóm)"
                          className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums leading-none text-white"
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Line 3: Channel Badge + customerId (with Highlight) + StatusIcon + Short Agent */}
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <ChannelBadge channel={c.channel} />
                        <span className="truncate font-mono text-zinc-400">
                          <HighlightText text={c.customerId} query={trimmedSearch} />
                        </span>
                      </div>
                      <div
                        title={c.assignedAgent}
                        className="flex shrink-0 items-center gap-1 text-zinc-500 dark:text-zinc-400"
                      >
                        <StatusIcon status={c.status} className="h-3 w-3" />
                        <span className="max-w-[88px] truncate font-mono">{formatAgentShort(c.assignedAgent)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {nextToken && visibleList.length > 0 && (
          <button
            type="button"
            className="w-full border-t border-zinc-200 p-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
            onClick={onLoadMore}
          >
            Tải thêm hội thoại cũ hơn
          </button>
        )}
      </div>
    </div>
  );
}
