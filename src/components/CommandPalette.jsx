import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FlaskConical, Home, Inbox, Keyboard, Moon, Search, Sparkles, Sun, Terminal } from "lucide-react";
import { USE_MOCK } from "../services/auth.js";
import { splitHighlight } from "../services/uiFormat.js";
import { ChannelIcon, StatusIcon } from "./ChannelBadge.jsx";

function HighlightSpan({ text, query }) {
  if (!query) return text;
  return splitHighlight(text, query).map((part, i) =>
    part.match ? (
      <mark key={i} className="rounded bg-amber-300/50 px-0.5 text-inherit dark:bg-amber-400/30">
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

export default function CommandPalette({
  open,
  onClose,
  conversations = [],
  theme,
  onToggleTheme,
  onNavigate,
  onSelectConversation,
  onOpenShortcuts,
  onSeedSameName,
  onSeedPagination,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actions = [
      {
        id: "nav-inbox",
        group: "Điều hướng",
        label: "Mở Hộp thư CSKH",
        hint: "Hộp thư",
        icon: Inbox,
        run: () => onNavigate("inbox"),
      },
      {
        id: "nav-sim",
        group: "Điều hướng",
        label: "Mở trang Simulator",
        hint: "Kênh mô phỏng",
        icon: FlaskConical,
        run: () => onNavigate("simulator"),
      },
      {
        id: "nav-landing",
        group: "Điều hướng",
        label: "Xem trang giới thiệu",
        hint: "Trang chủ",
        icon: Home,
        run: () => onNavigate("landing"),
      },
      {
        id: "toggle-theme",
        group: "Giao diện",
        label: theme === "dark" ? "Đổi giao diện Sáng" : "Đổi giao diện Tối",
        hint: theme === "dark" ? "Sáng" : "Tối",
        icon: theme === "dark" ? Sun : Moon,
        run: () => onToggleTheme(),
      },
      ...(onOpenShortcuts
        ? [
            {
              id: "open-shortcuts",
              group: "Giao diện",
              label: "Bảng phím tắt (?)",
              hint: "Phím tắt",
              icon: Keyboard,
              run: () => onOpenShortcuts(),
            },
          ]
        : []),
    ];

    if (USE_MOCK) {
      actions.push(
        {
          id: "seed-pair",
          group: "Dữ liệu thử",
          label: "Tạo 2 khách trùng tên",
          hint: "Nguyễn Văn A",
          icon: Sparkles,
          run: () => {
            onSeedSameName?.();
            onNavigate("inbox");
          },
        },
        {
          id: "seed-60",
          group: "Dữ liệu thử",
          label: "Tạo 60 hội thoại",
          hint: "Thử phân trang",
          icon: Terminal,
          run: () => {
            onSeedPagination?.();
            onNavigate("inbox");
          },
        }
      );
    }

    const convItems = conversations.slice(0, 30).map((c) => ({
      id: `conv-${c.conversationId}`,
      group: "Hội thoại",
      label: c.customerName,
      sub: `${c.channel} · ${c.customerId}`,
      hint: c.channel,
      channel: c.channel,
      status: c.status,
      unreadCount: c.unreadCount,
      run: () => {
        onNavigate("inbox");
        onSelectConversation?.(c);
      },
    }));

    const all = [...actions, ...convItems];
    if (!q) return all.slice(0, 12);
    return all
      .filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          (it.sub || "").toLowerCase().includes(q) ||
          it.hint.toLowerCase().includes(q) ||
          it.group.toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [query, conversations, theme, onNavigate, onToggleTheme, onSelectConversation, onOpenShortcuts, onSeedSameName, onSeedPagination]);

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].run();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 p-4 pt-[11vh] glass-panel"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-specular w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/15 dark:bg-[#111114]"
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-200 px-3.5 py-3 dark:border-white/10">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                autoFocus
                aria-label="Tìm lệnh hoặc hội thoại"
                className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-white"
                placeholder="Tìm khách hàng, customerId hoặc gõ lệnh nhanh…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
              />
              <kbd className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-white/15">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5">
              {items.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">Không tìm thấy lệnh hay hội thoại phù hợp.</div>
              ) : (
                items.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === activeIndex;
                  const showGroupHeader = idx === 0 || items[idx - 1].group !== item.group;
                  return (
                    <div key={item.id}>
                      {showGroupHeader && (
                        <div className="px-3 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          {item.group}
                        </div>
                      )}
                      <button
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => {
                          item.run();
                          onClose();
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition ${
                          active
                            ? "bg-zinc-900 text-white dark:bg-white/[0.11] dark:text-white"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {item.channel ? (
                            <ChannelIcon channel={item.channel} className="h-4 w-4 shrink-0" />
                          ) : (
                            <Icon className="h-4 w-4 shrink-0 opacity-75" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              <HighlightSpan text={item.label} query={query} />
                            </div>
                            {item.sub && (
                              <div className={`truncate font-mono text-[10px] ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                                <HighlightSpan text={item.sub} query={query} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {item.unreadCount > 0 && (
                            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {item.unreadCount}
                            </span>
                          )}
                          {item.status ? (
                            <StatusIcon status={item.status} className="h-3.5 w-3.5" />
                          ) : (
                            <span className="font-mono text-[10px] opacity-65">{item.hint}</span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3.5 py-2 font-mono text-[10px] text-zinc-500 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-400">
              <span>↑↓ Di chuyển · ↵ Thực thi · ESC Đóng</span>
              <span>{USE_MOCK ? "Local Mock" : "AWS Cloud"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
