// FILE: src/features/inbox/ChatThread.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Loader2 } from "lucide-react";
import { groupMessages } from "../../services/messageGrouping.js";
import { ChannelBadge, ChannelIcon } from "../../components/ChannelBadge.jsx";
import MessageBubble from "./MessageBubble.jsx";

function originInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ChatThread({
  conv,
  convId,
  messages,
  loading = false,
  pendingOutgoing = null,
  hasOlder,
  retryingMessageId,
  onLoadOlder,
  onRetry,
}) {
  const containerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const prevLenRef = useRef(0);
  const prevConvRef = useRef(null);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [farFromBottom, setFarFromBottom] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= 80;
    nearBottomRef.current = near;
    setFarFromBottom(distance > 280);
    if (near) setHasNewBelow(false);
  }

  function scrollToBottom() {
    const el = containerRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    nearBottomRef.current = true;
    setFarFromBottom(false);
    setHasNewBelow(false);
  }

  async function handleLoadOlder() {
    if (loadingOlder || !onLoadOlder) return;
    setLoadingOlder(true);
    try {
      await onLoadOlder();
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const switchedConv = prevConvRef.current !== convId;
    const grew = messages.length > prevLenRef.current;

    if (switchedConv) {
      el.scrollTop = el.scrollHeight;
      nearBottomRef.current = true;
      setFarFromBottom(false);
      setHasNewBelow(false);
    } else if (grew || pendingOutgoing) {
      if (nearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      } else if (grew) {
        setHasNewBelow(true);
      }
    }

    prevConvRef.current = convId;
    prevLenRef.current = messages.length;
  }, [convId, messages.length, pendingOutgoing]);

  return (
    <div className="dot-canvas relative flex-1 overflow-hidden bg-[#F6F7F9] dark:bg-[#09090B]">
      <div ref={containerRef} onScroll={handleScroll} className="gutter-stable h-full overflow-y-auto p-3 sm:p-5">
        {hasOlder ? (
          <div className="mb-3 text-center">
            <button
              type="button"
              disabled={loadingOlder}
              className="elevated-sheet inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-55 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-200 dark:hover:bg-white/10"
              onClick={handleLoadOlder}
            >
              {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{loadingOlder ? "Đang tải tin cũ…" : "Xem tin cũ hơn"}</span>
            </button>
          </div>
        ) : (
          conv && (
            <div className="mb-5 flex flex-col items-center border-b border-zinc-200/70 pb-4 pt-2 text-center dark:border-white/[0.06]">
              <div className="relative">
                <div className="elevated-sheet flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-800 dark:border-white/12 dark:bg-[#141418] dark:text-zinc-100">
                  {originInitials(conv.customerName)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white shadow-xs dark:border-[#09090B] dark:bg-[#18181C]">
                  <ChannelIcon channel={conv.channel} className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Bắt đầu hội thoại với {conv.customerName}
                </span>
                <ChannelBadge channel={conv.channel} />
              </div>
              <div className="mt-1 font-mono text-[10px] text-zinc-400">{conv.conversationId}</div>
            </div>
          )
        )}

        {loading && grouped.length === 0 ? (
          <div aria-label="Đang tải lịch sử tin nhắn" className="space-y-3 py-4">
            <div className="flex items-end gap-2">
              <div className="skeleton-shimmer h-7 w-7 shrink-0 rounded-full" />
              <div className="skeleton-shimmer h-14 w-60 rounded-2xl rounded-bl-md" />
            </div>
            <div className="flex justify-end">
              <div className="skeleton-shimmer h-12 w-52 rounded-2xl rounded-br-md" />
            </div>
            <div className="flex items-end gap-2">
              <div className="skeleton-shimmer h-7 w-7 shrink-0 rounded-full" />
              <div className="skeleton-shimmer h-16 w-72 rounded-2xl rounded-bl-md" />
            </div>
            <div className="flex justify-end">
              <div className="skeleton-shimmer h-10 w-44 rounded-2xl rounded-br-md" />
            </div>
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400">
            Chưa có tin nhắn nào trong lịch sử đã tải.
          </div>
        ) : (
          grouped.map((item) =>
            item.type === "date" ? (
              <div key={item.id} className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-300/80 dark:to-white/10" />
                <span className="elevated-sheet rounded-full border border-zinc-200/90 bg-white px-2.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:border-white/10 dark:bg-[#111114] dark:text-zinc-400">
                  {item.label}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-300/80 dark:to-white/10" />
              </div>
            ) : (
              <MessageBubble
                key={item.id}
                msg={item.msg}
                isGroupStart={item.isGroupStart}
                isGroupEnd={item.isGroupEnd}
                isRetrying={retryingMessageId === item.msg.messageId}
                onRetry={onRetry}
              />
            )
          )
        )}

        {pendingOutgoing && (
          <div className="mt-2 flex justify-end">
            <div className="bubble-outbound max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-white opacity-80">
              <div className="whitespace-pre-wrap break-words leading-relaxed">{pendingOutgoing.content}</div>
              <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-blue-100">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Đang gửi…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(hasNewBelow || farFromBottom) && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            type="button"
            onClick={scrollToBottom}
            className={`absolute bottom-3 right-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg glass-panel ${
              hasNewBelow
                ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                : "border border-zinc-200 bg-white/95 text-zinc-700 hover:bg-zinc-100 dark:border-white/15 dark:bg-[#18181C]/95 dark:text-zinc-200"
            }`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>{hasNewBelow ? "Có tin mới" : "Về cuối"}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
