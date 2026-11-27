// FILE: src/features/landing/ChaosToCalmSlider.jsx
// Thanh kéo so sánh trực quan Trước (4 app rời rạc) <-> Sau (1 hộp thư OmniInbox).
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, MoveHorizontal } from "lucide-react";
import { ChannelBadge, ChannelIcon, StatusDot } from "../../components/ChannelBadge.jsx";

export default function ChaosToCalmSlider() {
  const [splitPct, setSplitPct] = useState(50);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  function updateFromClientX(clientX) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.round(Math.min(88, Math.max(12, pct))));
  }

  function handlePointerDown(e) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }

  function handlePointerUp(e) {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture already released
    }
  }

  return (
    <div className="elevated-sheet rounded-2xl border border-zinc-200/90 bg-white p-3 sm:p-4 dark:border-white/[0.09] dark:bg-[#111114]">
      {/* Quick Snap Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSplitPct(84)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              splitPct >= 65
                ? "border-rose-500/45 bg-rose-500/12 text-rose-700 dark:text-rose-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-300"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span>Trước · 4 App rời</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitPct(16)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              splitPct <= 35
                ? "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-300"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Sau · OmniInbox</span>
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>Kéo thanh hoặc dùng ← / →</span>
          <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-semibold tabular-nums text-zinc-800 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-200">
            {splitPct}%
          </span>
        </div>
      </div>

      {/* Interactive Split Stage */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative min-h-[268px] cursor-ew-resize select-none overflow-hidden rounded-xl border border-zinc-200 bg-[#F8F8FA] sm:min-h-[280px] dark:border-white/10 dark:bg-[#09090B]"
      >
        {/* Base Layer: AFTER (Calm Unified Inbox) */}
        <div className="dot-canvas absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Sau · Hợp nhất 1 màn hình
            </span>
          </div>

          <div className="ml-auto grid w-full max-w-md gap-2.5">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs dark:border-white/10 dark:bg-[#131317]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-950 dark:text-white">Nguyễn Văn A</span>
                  <ChannelBadge channel="telegram" />
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Lock className="h-2.5 w-2.5" />
                  agent.minh
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>CONV#telegram#678901234</span>
                <StatusDot status="OPEN" />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs dark:border-white/10 dark:bg-[#131317]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-950 dark:text-white">Nguyễn Văn A</span>
                  <ChannelBadge channel="shopee" />
                </div>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                  409 Protected
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>CONV#shopee#shopee_a1 · Nháp tách riêng</span>
                <StatusDot status="IN_PROGRESS" />
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
            0 sót tin · 0 nhầm khách · 0 ghi đè phân công
          </div>
        </div>

        {/* Clipped Overlay Layer: BEFORE (4 Cluttered Apps) */}
        <div
          style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
          aria-hidden="true"
          className="absolute inset-0 flex flex-col justify-between bg-rose-50/95 p-4 sm:p-5 dark:bg-[#160B0E]"
        >
          <div className="flex items-center justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-3 w-3" />
              Trước · 4 tab rời rạc
            </span>
          </div>

          <div className="relative my-auto grid max-w-md grid-cols-2 gap-2">
            <div className="-rotate-1 rounded-xl border border-rose-500/30 bg-white/95 p-2.5 shadow-sm dark:border-rose-500/25 dark:bg-[#1C1216]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white">
                  <ChannelIcon channel="telegram" className="h-3 w-3" />
                  Telegram
                </span>
                <span className="rounded-full bg-rose-500 px-1.5 font-mono text-[9px] font-bold text-white">9+</span>
              </div>
              <div className="mt-1 truncate text-[10px] text-zinc-500">Nguyễn Văn A: Shop còn size L?</div>
            </div>

            <div className="rotate-1 rounded-xl border border-rose-500/30 bg-white/95 p-2.5 shadow-sm dark:border-rose-500/25 dark:bg-[#1C1216]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white">
                  <ChannelIcon channel="shopee" className="h-3 w-3" />
                  Shopee Chat
                </span>
                <span className="rounded bg-amber-500/20 px-1 font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
                  Trùng tên!
                </span>
              </div>
              <div className="mt-1 truncate text-[10px] text-zinc-500">Nguyễn Văn A: Áo đen còn M?</div>
            </div>

            <div className="rotate-1 rounded-xl border border-zinc-300/80 bg-white/90 p-2.5 shadow-sm dark:border-white/10 dark:bg-[#18141A]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white">
                  <ChannelIcon channel="zalo" className="h-3 w-3" />
                  Zalo OA
                </span>
                <span className="font-mono text-[9px] text-rose-500">2 NV trả lời</span>
              </div>
              <div className="mt-1 truncate text-[10px] text-zinc-500">Không rõ ai đang nhận đơn…</div>
            </div>

            <div className="-rotate-1 rounded-xl border border-zinc-300/80 bg-white/90 p-2.5 shadow-sm dark:border-white/10 dark:bg-[#18141A]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white">
                  <ChannelIcon channel="webchat" className="h-3 w-3" />
                  WebChat
                </span>
                <span className="font-mono text-[9px] text-zinc-400">Sót tin</span>
              </div>
              <div className="mt-1 truncate text-[10px] text-zinc-500">Khách hỏi lại sau khi đóng…</div>
            </div>
          </div>

          <div className="font-mono text-[10px] text-rose-700 dark:text-rose-400">
            Trả lời chồng chéo · Nhầm khách trùng tên · Mất dấu tin
          </div>
        </div>

        {/* Center Draggable Divider & Grip */}
        <div
          style={{ left: `${splitPct}%` }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-20 -translate-x-1/2"
        >
          <div className="h-full w-[1.5px] bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.75)]" />
          <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/60 bg-zinc-950 text-white shadow-lg">
            <MoveHorizontal className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Keyboard Accessible Overlay Range Input */}
        <input
          type="range"
          min={12}
          max={88}
          value={splitPct}
          aria-label="Kéo so sánh Trước và Sau OmniInbox"
          onChange={(e) => setSplitPct(Number(e.target.value))}
          onPointerDown={(e) => e.stopPropagation()}
          className="sr-only"
        />
      </div>
    </div>
  );
}
