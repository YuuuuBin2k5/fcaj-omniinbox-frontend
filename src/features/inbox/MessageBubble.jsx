import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, CheckCheck, Copy, RotateCcw } from "lucide-react";
import { ChannelIcon } from "../../components/ChannelBadge.jsx";
import { formatAgentShort, splitHighlight } from "../../services/uiFormat.js";

const SIMULATED = new Set(["shopee", "zalo", "webchat"]);

function senderInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function HighlightBody({ content, query, outbound }) {
  if (!query || !query.trim()) return content;
  return splitHighlight(content, query).map((part, idx) =>
    part.match ? (
      <mark
        key={idx}
        className={`rounded px-0.5 ${
          outbound
            ? "bg-amber-300 text-zinc-950"
            : "bg-amber-300/65 text-zinc-950 dark:bg-amber-400/35 dark:text-white"
        }`}
      >
        {part.text}
      </mark>
    ) : (
      <span key={idx}>{part.text}</span>
    )
  );
}

export default function MessageBubble({
  msg,
  isGroupStart = true,
  isGroupEnd = true,
  highlightQuery = "",
  isRetrying,
  onRetry,
  onSyncStatus,
}) {
  const [copied, setCopied] = useState(false);
  const out = msg.direction === "OUTBOUND";
  const failed = out && msg.status === "FAILED";
  const rawAgent = msg.agentId || msg.senderName || "";
  const timeText = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "";

  function copyContent() {
    navigator.clipboard?.writeText(msg.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 460, damping: 35 }}
      className={`group flex items-end gap-2 ${out ? "justify-end" : "justify-start"} ${isGroupStart ? "mt-3.5" : "mt-1"}`}
    >
      {!out &&
        (isGroupStart ? (
          <div className="relative shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-[10px] font-bold text-zinc-700 shadow-xs dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-200">
              {senderInitials(msg.senderName)}
            </div>
            {msg.channel && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#F6F7F9] bg-white dark:border-[#09090B] dark:bg-[#18181C]">
                <ChannelIcon channel={msg.channel} className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        ) : (
          <div className="w-7 shrink-0" aria-hidden="true" />
        ))}

      {out && (
        <div className="mb-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {!isGroupStart && timeText && (
            <span className="font-mono text-[10px] tabular-nums text-zinc-400">{timeText}</span>
          )}
          <button
            type="button"
            aria-label="Sao chép tin nhắn"
            title="Sao chép"
            onClick={copyContent}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
          out
            ? failed
              ? "bubble-outbound text-white ring-1 ring-rose-400/80"
              : "bubble-outbound text-white"
            : "elevated-sheet border border-zinc-200/90 bg-white text-zinc-900 dark:border-white/[0.09] dark:bg-[#16161B] dark:text-zinc-100"
        } ${
          out
            ? `${!isGroupStart ? "rounded-tr-md" : ""} ${!isGroupEnd ? "rounded-br-md" : ""}`
            : `${!isGroupStart ? "rounded-tl-md" : ""} ${!isGroupEnd ? "rounded-bl-md" : ""}`
        }`}
      >
        {isGroupStart && (
          <div
            className={`mb-1 flex items-center justify-between gap-3 text-[11px] ${
              out ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span title={out ? rawAgent : msg.senderName} className="truncate font-semibold">
              {out ? `NV: ${formatAgentShort(rawAgent)}` : msg.senderName}
            </span>
            {timeText && <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-80">{timeText}</span>}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words leading-relaxed">
          <HighlightBody content={msg.content} query={highlightQuery} outbound={out} />
        </div>

        {out && (
          <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] text-blue-100">
            {msg.deliveredVia === "simulator" && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 font-medium">Mô phỏng</span>
            )}
            {msg.deliveredVia === "telegram" && msg.status === "SENT" && (
              <span className="rounded bg-white/15 px-1.5 py-0.5 font-medium">Telegram</span>
            )}
            {msg.status === "SENT" && (
              <span className="inline-flex items-center gap-1 font-medium">
                <CheckCheck className="h-3 w-3" />
                Đã gửi
              </span>
            )}
            {out && ["SENDING", "UNKNOWN"].includes(msg.status) && (
              <span className="inline-flex items-center gap-1.5 rounded bg-amber-400/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-950">
                <span title={msg.errorDetail || "Kiểm tra Telegram phía khách trước khi soạn lại"}>
                  Chưa xác nhận kết quả gửi
                </span>
                {onSyncStatus && (
                  <button
                    type="button"
                    onClick={() => onSyncStatus()}
                    title="Đồng bộ lại lịch sử từ máy chủ"
                    className="inline-flex items-center gap-0.5 rounded bg-zinc-950/15 px-1.5 py-0.5 font-mono text-[9px] font-bold hover:bg-zinc-950/25"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Đồng bộ
                  </button>
                )}
              </span>
            )}
            {failed && (
              <button
                type="button"
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-zinc-950 shadow-sm transition hover:bg-amber-300 disabled:opacity-60"
                onClick={() => onRetry(msg)}
                title={msg.errorDetail || "Gửi lại tin này"}
              >
                {isRetrying ? (
                  <>
                    <RotateCcw className="h-3 w-3 animate-spin" />
                    <span>Đang thử lại…</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    <span>Gửi lỗi – Bấm để thử lại</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {!out && (
        <div className="mb-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            aria-label="Sao chép tin nhắn"
            title="Sao chép"
            onClick={copyContent}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
          {!isGroupStart && timeText && (
            <span className="font-mono text-[10px] tabular-nums text-zinc-400">{timeText}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
