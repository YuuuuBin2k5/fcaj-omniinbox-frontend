import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Lock, MousePointer2, Radio, Repeat, RotateCcw, ShieldCheck } from "lucide-react";
import SpotlightCard from "../../components/SpotlightCard.jsx";
import { ChannelIcon, StatusIcon } from "../../components/ChannelBadge.jsx";

function OptimisticLockCard() {
  const [phase, setPhase] = useState("resolved");

  function replayRace() {
    setPhase("racing");
    setTimeout(() => setPhase("resolved"), 680);
  }

  return (
    <SpotlightCard className="flex flex-col justify-between p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            <span>01 · Khóa phân công</span>
          </div>
          <button
            type="button"
            onClick={replayRace}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-white/12 dark:bg-[#18181C] dark:text-zinc-200"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Thử tranh nhận
          </button>
        </div>
        <h3 className="mt-2 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
          Khóa tranh nhận 409
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Hai nhân viên bấm cùng lúc — không ghi đè.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-[#F8F8FA] p-3 dark:border-white/10 dark:bg-[#09090B]">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-2 dark:border-white/[0.08] dark:bg-[#111114]">
          <div className="flex items-center gap-2">
            <ChannelIcon channel="telegram" className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Nguyễn Văn A</span>
          </div>
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold transition ${
              phase === "resolved"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
            }`}
          >
            {phase === "resolved" ? "agent.minh" : "Nhận xử lý"}
          </span>
        </div>

        <div className="mt-2.5 space-y-2 font-mono text-[10px]">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                <MousePointer2 className="h-3 w-3" />
                Minh (12ms)
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                {phase === "racing" ? "PATCH…" : "200 OK"}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-emerald-500/20">
              <motion.div
                key={`bar-minh-${phase}`}
                initial={{ width: "12%" }}
                animate={{ width: phase === "racing" ? "65%" : "100%" }}
                transition={{ duration: 0.35 }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                <MousePointer2 className="h-3 w-3" />
                Lan (+40ms)
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">
                {phase === "racing" ? "PATCH…" : "409 Sync → Minh"}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-amber-500/20">
              <motion.div
                key={`bar-lan-${phase}`}
                initial={{ width: "8%" }}
                animate={{ width: phase === "racing" ? "45%" : "72%" }}
                transition={{ duration: 0.38, delay: 0.08 }}
                className="h-full rounded-full bg-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

function IdempotencyReopenCard() {
  const [mode, setMode] = useState("dedup");
  const [tick, setTick] = useState(0);
  const [blockedCount, setBlockedCount] = useState(1);

  return (
    <SpotlightCard className="flex flex-col justify-between p-5" delay={0.05}>
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>02 · Chống trùng &amp; Mở lại</span>
          </div>
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-[10px] font-semibold dark:bg-[#09090B]">
            <button
              type="button"
              onClick={() => {
                setMode("dedup");
                setTick((t) => t + 1);
              }}
              className={`rounded-md px-2 py-0.5 transition ${
                mode === "dedup"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              Chống trùng
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("reopen");
                setTick((t) => t + 1);
              }}
              className={`rounded-md px-2 py-0.5 transition ${
                mode === "reopen"
                  ? "bg-white text-zinc-950 shadow-xs dark:bg-[#1C1C22] dark:text-white"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              Tự mở lại
            </button>
          </div>
        </div>
        <h3 className="mt-2 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
          Khử trùng &amp; Tự mở lại
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Chặn tin lặp. Hội thoại cũ tự bật lại OPEN.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-[#F8F8FA] p-3 font-mono text-[10px] dark:border-white/10 dark:bg-[#09090B]">
        {mode === "dedup" ? (
          <motion.div
            key={`dedup-${tick}`}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-600 dark:border-white/10 dark:bg-[#111114] dark:text-zinc-300">
              <span>#dup_01</span>
              <span className="font-semibold text-zinc-900 dark:text-white">DONE Lock</span>
              <button
                type="button"
                onClick={() => {
                  setBlockedCount((c) => c + 1);
                  setTick((t) => t + 1);
                }}
                className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 font-semibold text-sky-700 hover:bg-sky-500/25 dark:text-sky-300"
              >
                <Repeat className="h-2.5 w-2.5" />
                Bắn lặp ×2
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300">
                <span>Đã lưu</span>
                <span className="font-bold">1×</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-amber-700 dark:text-amber-300">
                <span>Đã chặn</span>
                <span className="font-bold tabular-nums">{blockedCount}×</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`reopen-${tick}`}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-white/10 dark:bg-[#111114]">
              <span className="inline-flex items-center gap-1 text-zinc-400 line-through">
                <StatusIcon status="RESOLVED" className="h-3 w-3" />
                RESOLVED
              </span>
              <span className="text-sky-500">→</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-300">
                <StatusIcon status="OPEN" className="h-3 w-3" />
                OPEN
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300">
              <span>Giữ nguyên agent.minh</span>
              <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">+1 unread</span>
            </div>
          </motion.div>
        )}
      </div>
    </SpotlightCard>
  );
}

function ChannelTruthCard() {
  return (
    <SpotlightCard className="flex flex-col justify-between p-5" delay={0.1}>
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Radio className="h-3.5 w-3.5" />
          <span>03 · Kênh &amp; Bảo mật</span>
        </div>
        <h3 className="mt-2 text-base font-bold tracking-tight text-zinc-950 dark:text-white">
          1 Kênh thật · 3 Mô phỏng
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Phân tách minh bạch từ Webhook đến UI.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/[0.08] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15">
              <ChannelIcon channel="telegram" className="h-3.5 w-3.5" />
            </span>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">Telegram Bot</div>
              <div className="font-mono text-[9px] text-sky-700 dark:text-sky-300">2 chiều thật · secret_token</div>
            </div>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {["shopee", "zalo", "webchat"].map((ch) => (
                <span
                  key={ch}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white shadow-xs dark:border-[#111114] dark:bg-[#18181C]"
                >
                  <ChannelIcon channel={ch} className="h-3 w-3" />
                </span>
              ))}
            </div>
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Shopee · Zalo · WebChat</div>
          </div>
          <span className="shrink-0 rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
            Mô phỏng
          </span>
        </div>

        <div className="flex items-center justify-between px-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>WS Ticket 60s (lần 2: 401)</span>
          <span>AI Pha 2: tùy chọn</span>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function InteractiveFeatureCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <OptimisticLockCard />
      <IdempotencyReopenCard />
      <ChannelTruthCard />
    </div>
  );
}
