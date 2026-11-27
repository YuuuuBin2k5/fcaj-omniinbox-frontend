// FILE: src/features/inbox/Composer.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Loader2, Send, Sparkles, Zap } from "lucide-react";
import { AI_ENABLED, suggestReplies } from "../../services/apiClient.js";
import { getAgentName } from "../../services/auth.js";
import { ChannelIcon } from "../../components/ChannelBadge.jsx";

const DEST_LABEL = {
  telegram: "Telegram (Kênh thật 2 chiều)",
  shopee: "Shopee Chat (Mô phỏng)",
  zalo: "Zalo OA (Mô phỏng)",
  webchat: "Website LiveChat (Mô phỏng)",
};

const FOCUS_TINT = {
  telegram: "focus-within:border-sky-500/60 focus-within:ring-sky-500/15",
  shopee: "focus-within:border-orange-500/60 focus-within:ring-orange-500/15",
  zalo: "focus-within:border-blue-500/60 focus-within:ring-blue-500/15",
  webchat: "focus-within:border-violet-500/60 focus-within:ring-violet-500/15",
};

const QUICK_LOCAL_MACROS = [
  {
    cmd: "/chao",
    text: "Chào bạn, shop đã nhận được tin nhắn và đang kiểm tra ngay cho bạn ạ!",
  },
  {
    cmd: "/conhang",
    text: "Mẫu này bên shop hiện còn đủ size. Bạn muốn đặt màu nào và giao về khu vực nào ạ?",
  },
  {
    cmd: "/camon",
    text: "Cảm ơn bạn đã ủng hộ shop. Nếu cần hỗ trợ thêm bạn cứ nhắn tại đây nhé!",
  },
];

export default function Composer({
  conv,
  draft,
  onDraftChange,
  sending,
  unconfirmedNotice,
  onClearUnconfirmed,
  onSend,
  textareaRef,
}) {
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showMacros, setShowMacros] = useState(false);
  const [macroIdx, setMacroIdx] = useState(0);
  const localRef = useRef(null);
  const activeConvRef = useRef(conv.conversationId);
  activeConvRef.current = conv.conversationId;

  function setMergedRef(node) {
    localRef.current = node;
    if (typeof textareaRef === "function") textareaRef(node);
    else if (textareaRef) textareaRef.current = node;
  }

  useEffect(() => {
    setAi(null);
    setAiError("");
    setShowMacros(false);
    setMacroIdx(0);
  }, [conv.conversationId]);

  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, Math.max(44, el.scrollHeight))}px`;
  }, [draft, conv.conversationId]);

  const currentAgent = getAgentName();
  const otherAssignee =
    conv.assignedAgent && conv.assignedAgent !== "unassigned" && conv.assignedAgent !== currentAgent
      ? conv.assignedAgent
      : null;

  async function askAi() {
    const targetId = conv.conversationId;
    setAiError("");
    setAiLoading(true);
    try {
      const res = await suggestReplies(targetId);
      if (activeConvRef.current === targetId) setAi(res);
    } catch (e) {
      if (activeConvRef.current === targetId) setAiError(e.message);
    } finally {
      if (activeConvRef.current === targetId) setAiLoading(false);
    }
  }

  async function submit() {
    const content = (draft || "").trim();
    if (!content || sending) return;
    setShowMacros(false);
    const r = await onSend(conv, content);
    if (r && (r.ok || r.recordedOnServer)) {
      onDraftChange("");
    }
  }

  function applyMacro(m) {
    onDraftChange(m.text);
    setShowMacros(false);
    setMacroIdx(0);
    localRef.current?.focus();
  }

  function handleDraftInput(val) {
    onDraftChange(val);
    if (val.startsWith("/") && !val.includes("\n") && val.length <= 16) {
      setShowMacros(true);
      setMacroIdx(0);
    } else if (showMacros && (!val.startsWith("/") || val.length > 16)) {
      setShowMacros(false);
    }
  }

  const label =
    ai && ai.source === "bedrock" ? "AI (Amazon Bedrock)" : ai ? "Gợi ý mẫu (AI chưa khả dụng)" : "";
  const focusTint = FOCUS_TINT[conv.channel] || "focus-within:border-zinc-500 focus-within:ring-zinc-400/20";
  const draftLen = (draft || "").length;

  return (
    <div className="bg-[#F6F7F9] px-3 pb-3 pt-1.5 sm:px-4 dark:bg-[#09090B]">
      {otherAssignee && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Hội thoại đang do <b className="font-mono">{otherAssignee}</b> phụ trách — cân nhắc trước khi gửi hoặc nhận
            lại hội thoại.
          </span>
        </div>
      )}

      {unconfirmedNotice && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
          <span>{unconfirmedNotice}</span>
          <button type="button" className="font-semibold underline" onClick={onClearUnconfirmed}>
            Đã hiểu
          </button>
        </div>
      )}

      <AnimatePresence>
        {showMacros && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="elevated-sheet mb-2 space-y-1.5 rounded-xl border border-zinc-200/90 bg-white p-2.5 dark:border-white/12 dark:bg-[#141418]"
          >
            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
              <span>Mẫu trả lời nhanh (Local — không phải AI) · ↑↓ Chọn · ↵ Chèn</span>
              <button
                type="button"
                onClick={() => setShowMacros(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Đóng (ESC)
              </button>
            </div>
            {QUICK_LOCAL_MACROS.map((m, i) => (
              <button
                key={m.cmd}
                type="button"
                onMouseEnter={() => setMacroIdx(i)}
                onClick={() => applyMacro(m)}
                className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                  i === macroIdx
                    ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-white/35 dark:bg-white/[0.08] dark:text-white"
                    : "border-zinc-200/80 bg-zinc-50/70 text-zinc-800 dark:border-white/[0.08] dark:bg-[#09090B] dark:text-zinc-200"
                }`}
              >
                <span className="shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
                  {m.cmd}
                </span>
                <span className="leading-snug">{m.text}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {ai && (
        <div className="mb-2 flex flex-col gap-1">
          {ai.suggestions.map((s, i) => (
            <button
              type="button"
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-2 text-left text-xs text-zinc-800 hover:border-zinc-400 dark:border-white/10 dark:bg-[#18181C] dark:text-zinc-200"
              onClick={() => onDraftChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Floating Unified Composer Card */}
      <div
        className={`elevated-sheet rounded-2xl border border-zinc-200/90 bg-white transition focus-within:ring-2 dark:border-white/12 dark:bg-[#111114] ${focusTint}`}
      >
        {/* Destination Indicator Strip */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3.5 py-1.5 text-[11px] text-zinc-500 dark:border-white/[0.06] dark:text-zinc-400">
          <div className="flex min-w-0 items-center gap-1.5">
            <ChannelIcon channel={conv.channel} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Trả lời qua{" "}
              <b className="font-semibold text-zinc-800 dark:text-zinc-200">
                {DEST_LABEL[conv.channel] || conv.channel}
              </b>
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-zinc-400">{conv.customerId}</span>
        </div>

        <textarea
          ref={setMergedRef}
          aria-label="Nội dung trả lời"
          className="max-h-[160px] min-h-[44px] w-full resize-none bg-transparent px-3.5 pb-1.5 pt-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-white"
          rows={1}
          value={draft}
          maxLength={4000}
          placeholder={`Nhập phản hồi gửi tới ${conv.customerName} (gõ / để mở mẫu nhanh)…`}
          onChange={(e) => handleDraftInput(e.target.value)}
          onKeyDown={(e) => {
            if (showMacros) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMacroIdx((i) => (i + 1) % QUICK_LOCAL_MACROS.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMacroIdx((i) => (i - 1 + QUICK_LOCAL_MACROS.length) % QUICK_LOCAL_MACROS.length);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setShowMacros(false);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                applyMacro(QUICK_LOCAL_MACROS[macroIdx]);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        {draftLen > 2500 && (
          <div className="mx-3.5 mb-1 h-0.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
            <div
              style={{ width: `${Math.min(100, (draftLen / 4000) * 100)}%` }}
              className={`h-full transition-all ${draftLen > 3600 ? "bg-rose-500" : "bg-amber-400"}`}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2 dark:border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-expanded={showMacros}
              onClick={() => setShowMacros((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                showMacros
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Mẫu nhanh</span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
              disabled={!AI_ENABLED || aiLoading}
              title={AI_ENABLED ? "Gợi ý 3 câu trả lời" : "AI là pha 2 – chưa bật (VITE_ENABLE_AI)"}
              onClick={askAi}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? "Đang gợi ý…" : "Gợi ý trả lời"}
            </button>

            {label && <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>}
            {aiError && <span className="text-xs text-rose-500">{aiError}</span>}
            {draftLen > 2500 && (
              <span className="font-mono text-[10px] tabular-nums text-amber-500">{draftLen}/4000</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden font-mono text-[10px] text-zinc-400 sm:inline">
              Enter gửi · / mở mẫu nhanh
            </span>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              disabled={sending || !(draft || "").trim()}
              onClick={submit}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{sending ? "Đang gửi…" : "Gửi (Enter)"}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
