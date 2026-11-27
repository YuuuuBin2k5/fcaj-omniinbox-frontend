// FILE: src/features/landing/LandingPage.jsx
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Command,
  Cpu,
  Database,
  Layers,
  Lock,
  Moon,
  Radio,
  ShieldCheck,
  Sun,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo.jsx";
import SpotlightCard from "../../components/SpotlightCard.jsx";
import { ChannelIcon } from "../../components/ChannelBadge.jsx";
import InteractivePipelineHero from "./InteractivePipelineHero.jsx";
import { USE_MOCK } from "../../services/auth.js";

const PIPELINE_NODES = [
  {
    id: "ingest",
    title: "omni-webhook-ingest",
    sub: "Node 22 · arm64 · 128MB",
    detail:
      "Kiểm tra whitelist kênh, X-Telegram-Bot-Api-Secret-Token (timingSafeEqual), giới hạn 64KB, gán receivedAt và đẩy SQS.",
  },
  {
    id: "sqs",
    title: "SQS + DLQ",
    sub: "Visibility 30s · Max 5",
    detail:
      "omni-inbound-queue tách tầng nhận và xử lý; record lỗi sau 5 lần nhận chuyển sang omni-inbound-dlq để redrive không mất tin.",
  },
  {
    id: "normalizer",
    title: "omni-message-normalizer",
    sub: "Node 22 · arm64 · 256MB",
    detail:
      "Claim khóa idempotency PROCESSING→DONE, TransactWriteItems lưu tin + cập nhật hội thoại, reopen RESOLVED→OPEN.",
  },
  {
    id: "ws",
    title: "WS Ticket & Outbound",
    sub: "omni-ws / omni-outbound",
    detail:
      "WebSocket xác thực bằng ticket dùng 1 lần (60s); Outbound suy ra người nhận từ server, gửi Telegram thật hoặc gắn deliveredVia=simulator.",
  },
];

const PROOF_ITEMS = [
  { label: "Compute Serverless", value: "5 Core Lambdas · Node 22 arm64", icon: Cpu },
  { label: "Kênh tích hợp", value: "1 Thật (Telegram) + 3 Mô phỏng", icon: Radio },
  { label: "WebSocket Security", value: "Ticket dùng 1 lần · 60s TTL", icon: ShieldCheck },
  { label: "Concurrency Lock", value: "DynamoDB Condition · HTTP 409", icon: Lock },
];

const NAV_SECTIONS = [
  { id: "preview", label: "Sandbox" },
  { id: "problem", label: "Trước & Sau" },
  { id: "architecture", label: "Kiến trúc AWS" },
  { id: "reliability", label: "Độ tin cậy" },
];

const BEFORE_PAINS = [
  {
    title: "Nhầm lẫn khách trùng tên",
    detail: "Mở 4 tab Telegram, Shopee, Zalo, WebChat rời rạc; 2 khách tên \"Nguyễn Văn A\" rất dễ gửi nhầm phản hồi.",
  },
  {
    title: "Hai nhân viên trả lời trùng",
    detail: "Không biết ai đã nhận hội thoại, gây đè phân công hoặc gửi hai câu trả lời trái ngược cho cùng một khách.",
  },
  {
    title: "Sót tin khi mạng lag / retry",
    detail: "Webhook lỗi hoặc hội thoại vừa đóng lại có tin mới khiến tin nhắn trôi mất, không có hàng đợi bù.",
  },
];

const AFTER_GUARANTEES = [
  {
    title: "Cô lập chặt theo conversationId",
    detail: "Mọi tin nhắn, nháp Composer (draftsByConv) và phản hồi Simulator khóa theo CONV#channel#customerId.",
  },
  {
    title: "Khóa lạc quan HTTP 409",
    detail: "PATCH kèm expectedAssignedAgent + DynamoDB ConditionExpression ngăn tuyệt đối ghi đè phân công.",
  },
  {
    title: "SQS + DLQ & Idempotency",
    detail: "Khóa PROCESSING → DONE chống xử lý trùng, tin lỗi sau 5 lần đưa sang DLQ và tự reopen RESOLVED → OPEN.",
  },
];

export default function LandingPage({
  authed,
  theme,
  onToggleTheme,
  onOpenLogin,
  onEnterApp,
  onOpenSimulator,
  onOpenPalette,
}) {
  const [activeNode, setActiveNode] = useState("normalizer");
  const [activeSection, setActiveSection] = useState("preview");
  const [scrollPct, setScrollPct] = useState(0);

  const activeIdx = Math.max(
    0,
    PIPELINE_NODES.findIndex((n) => n.id === activeNode)
  );
  const selectedNode = PIPELINE_NODES[activeIdx] || PIPELINE_NODES[2];
  const activeNodeX = 75 + activeIdx * 150;

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      setScrollPct(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const els = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-28% 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F6F7F9] text-zinc-900 dark:bg-[#09090B] dark:text-zinc-100">
      <div className="hero-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_38%,transparent_80%)]" />
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" />

      {/* Subtle architectural top radial halo */}
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-sky-500/[0.09] blur-3xl dark:bg-sky-500/[0.11]" />

      {/* Floating Glass Header + Scroll-Spy + 1px Scroll Progress */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 glass-panel dark:border-white/[0.08] dark:bg-[#09090B]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo subtitle="AWS Serverless Unified Inbox" />

          <nav className="hidden items-center gap-5 text-xs font-medium text-zinc-600 dark:text-zinc-400 md:flex">
            {NAV_SECTIONS.map((sec) => {
              const active = activeSection === sec.id;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`relative py-1 transition-colors hover:text-zinc-950 dark:hover:text-white ${
                    active ? "font-semibold text-zinc-950 dark:text-white" : ""
                  }`}
                >
                  {sec.label}
                  {active && (
                    <motion.span
                      layoutId="landingNavIndicator"
                      transition={{ type: "spring", stiffness: 450, damping: 34 }}
                      className="absolute inset-x-0 -bottom-0.5 h-[1.5px] rounded-full bg-zinc-950 dark:bg-white"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium sm:inline-flex ${
                USE_MOCK
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${USE_MOCK ? "bg-amber-400" : "bg-emerald-400"}`} />
              {USE_MOCK ? "Local Mock Mode" : "AWS Cloud Mode"}
            </span>

            {authed && onOpenPalette && (
              <button
                type="button"
                aria-label="Tìm nhanh (Ctrl+K)"
                onClick={onOpenPalette}
                className="hidden h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 font-mono text-[11px] text-zinc-600 transition hover:border-zinc-400 sm:inline-flex dark:border-white/10 dark:bg-[#111114] dark:text-zinc-300"
              >
                <Command className="h-3.5 w-3.5" />
                <span>Ctrl+K</span>
              </button>
            )}

            <button
              type="button"
              aria-label="Đổi giao diện Sáng/Tối"
              onClick={onToggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:bg-[#111114] dark:text-zinc-300 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {authed ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={onEnterApp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Mở Agent Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                data-testid="open-login-btn"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Đăng nhập Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          style={{ width: `${scrollPct}%` }}
          className="h-[1.5px] bg-gradient-to-r from-sky-500 via-zinc-900 to-sky-500 transition-[width] duration-75 dark:via-white"
        />
        <nav
          aria-label="Điều hướng mục"
          className="flex items-center gap-1.5 overflow-x-auto border-t border-zinc-200/70 px-4 py-1.5 text-[11px] font-medium text-zinc-600 no-scrollbar md:hidden dark:border-white/[0.06] dark:text-zinc-400"
        >
          {NAV_SECTIONS.map((sec) => {
            const active = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={`shrink-0 rounded-full px-2.5 py-0.5 transition ${
                  active
                    ? "bg-zinc-900 font-semibold text-white dark:bg-white dark:text-zinc-950"
                    : "hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                {sec.label}
              </a>
            );
          })}
        </nav>
      </header>

      {/* Architectural Framed Container */}
      <main className="relative z-10 mx-auto max-w-6xl border-x border-zinc-200/70 px-4 pb-20 pt-10 sm:px-8 sm:pt-14 dark:border-white/[0.06]">
        {/* Product-First Hero */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="elevated-sheet mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-white/12 dark:bg-[#111114] dark:text-zinc-300"
          >
            <Zap className="h-3.5 w-3.5 text-sky-500" />
            <span>AWS First Cloud Journey · Serverless Event-Driven · ap-southeast-1</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance mx-auto mt-5 max-w-4xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-600 bg-clip-text text-4xl font-extrabold tracking-[-0.035em] text-transparent sm:text-6xl sm:leading-[1.05] dark:from-white dark:via-zinc-100 dark:to-zinc-400"
          >
            Một hộp thư. Mọi kênh khách.
            <br className="hidden sm:block" /> Không bao giờ sót tin.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400"
          >
            Hộp thư CSKH đa nhân viên vận hành trên 5 hàm Lambda, SQS + DLQ, DynamoDB và WebSocket ticket một lần.{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Telegram</strong> là kênh thật hai chiều;{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Shopee, Zalo, WebChat</strong> chạy qua
            Simulator{" "}
            <span className="inline-block whitespace-nowrap rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Mô phỏng
            </span>
            .
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={authed ? onEnterApp : onOpenLogin}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:bg-zinc-200"
            >
              {authed ? "Vào Agent Portal ngay" : "Đăng nhập Agent Portal"}
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            {authed ? (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onOpenSimulator}
                className="elevated-sheet inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-100 dark:hover:border-white/30"
              >
                Mở Customer Simulator (Mô phỏng)
              </motion.button>
            ) : (
              <a
                href="#preview"
                className="elevated-sheet inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-200 dark:hover:border-white/30"
              >
                Thử luồng AWS tương tác ↓
              </a>
            )}
          </motion.div>

          {/* Architectural Proof Strip */}
          <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PROOF_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="elevated-sheet rounded-xl border border-zinc-200/90 bg-white px-3.5 py-3 text-left dark:border-white/[0.08] dark:bg-[#111114]"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    <Icon className="h-3 w-3 text-sky-500" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.value}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 01: Playable Split-World AWS Event Sandbox */}
        <section id="preview" className="mt-10 scroll-mt-24">
          <div className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            01 / Interactive Event Sandbox
          </div>
          <InteractivePipelineHero />
        </section>

        {/* Architectural Divider with CAD crosshairs */}
        <div className="relative my-14 flex items-center">
          <span
            aria-hidden="true"
            className="absolute -left-[37px] hidden font-mono text-xs text-zinc-400 sm:block dark:text-zinc-600"
          >
            +
          </span>
          <div className="h-px flex-1 bg-zinc-200/80 dark:bg-white/[0.07]" />
          <span
            aria-hidden="true"
            className="absolute -right-[37px] hidden font-mono text-xs text-zinc-400 sm:block dark:text-zinc-600"
          >
            +
          </span>
        </div>

        {/* Section 02: Before vs After OmniInbox */}
        <section id="problem" className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                02 / Problem → Solution
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
                Từ vận hành rời rạc sang hộp thư hợp nhất đáng tin cậy
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              Bài toán thực tế đội CSKH đa kênh
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SpotlightCard className="border-rose-500/20 dark:border-rose-500/15">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Trước OmniInbox · Quản lý 4 app rời</span>
              </div>
              <div className="mt-4 space-y-3">
                {BEFORE_PAINS.map((p) => (
                  <div
                    key={p.title}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-white/[0.07] dark:bg-[#09090B]"
                  >
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{p.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{p.detail}</div>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            <SpotlightCard className="border-emerald-500/25 dark:border-emerald-500/20" delay={0.05}>
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Với OmniInbox · AWS Serverless Event-Driven</span>
              </div>
              <div className="mt-4 space-y-3">
                {AFTER_GUARANTEES.map((g) => (
                  <div
                    key={g.title}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 dark:border-emerald-500/15 dark:bg-[#09090B]"
                  >
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{g.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{g.detail}</div>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* Architectural Divider with CAD crosshairs */}
        <div className="relative my-14 flex items-center">
          <span
            aria-hidden="true"
            className="absolute -left-[37px] hidden font-mono text-xs text-zinc-400 sm:block dark:text-zinc-600"
          >
            +
          </span>
          <div className="h-px flex-1 bg-zinc-200/80 dark:bg-white/[0.07]" />
          <span
            aria-hidden="true"
            className="absolute -right-[37px] hidden font-mono text-xs text-zinc-400 sm:block dark:text-zinc-600"
          >
            +
          </span>
        </div>

        {/* Section 03: Bento Grid */}
        <section id="architecture" className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                03 / Architecture &amp; Reliability
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
                Thiết kế cho tốc độ vận hành và độ tin cậy thực chiến
              </h2>
            </div>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              5 Core Lambdas · Node.js 22.x · arm64
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            {/* Card 1: Interactive AWS Pipeline (4 cols) */}
            <SpotlightCard className="md:col-span-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Layers className="h-4 w-4 text-sky-500" />
                  <span>Kiến trúc AWS Serverless Event-Driven</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">Bấm từng khối để xem chi tiết</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE_NODES.map((n, idx) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setActiveNode(n.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      activeNode === n.id
                        ? "border-zinc-900 bg-zinc-100/90 dark:border-white/40 dark:bg-white/10"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/25"
                    }`}
                  >
                    <div className="font-mono text-[10px] text-zinc-400">0{idx + 1}</div>
                    <div className="mt-0.5 text-[11px] font-bold leading-snug text-zinc-900 dark:text-white">
                      {n.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-sky-600 dark:text-sky-400">{n.sub}</div>
                  </button>
                ))}
              </div>

              <svg viewBox="0 0 600 26" className="my-2.5 hidden h-6 w-full lg:block" aria-hidden="true">
                <line x1="20" y1="13" x2="580" y2="13" stroke="rgba(161,161,170,0.22)" strokeWidth="2" />
                <line
                  x1="20"
                  y1="13"
                  x2={activeNodeX}
                  y2="13"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  className="pipeline-dash"
                />
                {[75, 225, 375, 525].map((cx, idx) => (
                  <circle
                    key={cx}
                    cx={cx}
                    cy="13"
                    r={idx === activeIdx ? 5.5 : 3}
                    fill={idx <= activeIdx ? "#38BDF8" : "rgba(161,161,170,0.45)"}
                  />
                ))}
              </svg>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:border-white/10 dark:bg-[#09090B] dark:text-zinc-300">
                <span className="font-mono font-semibold text-zinc-950 dark:text-white">{selectedNode.title}: </span>
                {selectedNode.detail}
              </div>
            </SpotlightCard>

            {/* Card 2: Context Isolation (2 cols) */}
            <SpotlightCard className="flex flex-col justify-between md:col-span-2" delay={0.05}>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Users className="h-4 w-4 text-sky-500" />
                  <span>Không lẫn khách trùng tên</span>
                </div>
                <h3 className="mt-2.5 text-base font-bold">Cô lập theo conversationId</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Nháp tin nhắn (<code className="font-mono">draftsByConv</code>) và phản hồi Simulator khóa chặt theo{" "}
                  <code className="font-mono text-zinc-900 dark:text-zinc-200">CONV#channel#id</code>.
                </p>
              </div>
              <div className="mt-4 space-y-1.5 font-mono text-[10px]">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#09090B]">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] font-semibold">Nguyễn Văn A</span>
                    <span className="text-sky-600 dark:text-sky-400">shopee_a1</span>
                  </div>
                  <div className="mt-1 text-amber-600 dark:text-amber-300">Nháp: &quot;Size M còn đủ 2 màu...&quot;</div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-white/10 dark:bg-[#09090B]">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] font-semibold">Nguyễn Văn A</span>
                    <span className="text-zinc-500 dark:text-zinc-400">shopee_a2</span>
                  </div>
                  <div className="mt-1 text-zinc-400">Nháp: (trống — tách biệt hoàn toàn)</div>
                </div>
              </div>
            </SpotlightCard>

            {/* Card 3: WebSocket One-Time Ticket (2 cols) */}
            <SpotlightCard
              id="reliability"
              className="flex scroll-mt-24 flex-col justify-between md:col-span-2"
              delay={0.08}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Radio className="h-4 w-4 text-emerald-500" />
                  <span>WebSocket Ticket 1 lần</span>
                </div>
                <h3 className="mt-2.5 text-base font-bold">Bảo mật &amp; Tự đồng bộ bù</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Xin vé 60s qua <code className="font-mono">POST /ws-ticket</code> (JWT),{" "}
                  <code className="font-mono">$connect</code> xóa vé ngay lập tức, ping 5 phút và gọi{" "}
                  <code className="font-mono">onResync()</code> khi nối lại.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-[10px] dark:border-white/10 dark:bg-[#09090B]">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span>POST /ws-ticket</span>
                  <span>→</span>
                  <span>TTL 60s</span>
                  <span>→</span>
                  <span>$connect</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <div className="flex items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-center text-emerald-700 dark:text-emerald-300">
                    Lần 1: 101 OK
                  </div>
                  <div className="flex items-center justify-center rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-center text-rose-700 dark:text-rose-300">
                    Lần 2: 401 Chặn
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* Card 4: Safe Handover 409 (2 cols) */}
            <SpotlightCard className="flex flex-col justify-between md:col-span-2" delay={0.11}>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <span>Chống tranh nhận HTTP 409</span>
                </div>
                <h3 className="mt-2.5 text-base font-bold">Optimistic Concurrency</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Gửi kèm <code className="font-mono">expectedAssignedAgent</code>. Nếu người khác đã nhận trước, UI cập
                  nhật tức thì trạng thái mới từ server thay vì ghi đè.
                </p>
              </div>

              <div className="mt-4 space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-[10px] dark:border-white/10 dark:bg-[#09090B]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">agent.minh → Nhận</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-300">
                    200 OK
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">agent.lan (+40ms)</span>
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                    409 Sync
                  </span>
                </div>
              </div>
            </SpotlightCard>

            {/* Card 5: Prebuild Safety Guard (2 cols) */}
            <SpotlightCard className="flex flex-col justify-between md:col-span-2" delay={0.14}>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="h-4 w-4 text-rose-500" />
                  <span>Kiểm soát lỗi &amp; Guard</span>
                </div>
                <h3 className="mt-2.5 text-base font-bold">Chặn build nhầm Mock</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Hook <code className="font-mono">prebuild</code> chạy <code className="font-mono">check-env.mjs</code>{" "}
                  tự chặn nếu <code className="font-mono">VITE_USE_MOCK !== &quot;false&quot;</code>, đảm bảo Production
                  khớp Architecture.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-[#0B0C10] p-2.5 font-mono text-[10px] leading-relaxed dark:border-white/10">
                <div className="text-zinc-400">$ npm run build</div>
                <div className="mt-1 text-rose-400">✕ VITE_USE_MOCK=true → BLOCKED</div>
                <div className="text-emerald-400">✓ AWS Cloud env → PASS</div>
              </div>
            </SpotlightCard>

            {/* Card 6: Keyboard & Scope Clarity (6 cols) */}
            <SpotlightCard className="md:col-span-6" delay={0.16}>
              <div className="grid gap-5 md:grid-cols-2 md:items-center">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Command className="h-4 w-4 text-zinc-500" />
                    <span>Thao tác tốc độ cao &amp; Minh bạch phạm vi</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">Điều khiển nhanh &amp; Trung thực kênh thật / mô phỏng</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Nhân viên dùng phím tắt để duyệt hội thoại, nhận xử lý, hoàn tất nhanh hoặc đổi giao diện. AI Amazon
                    Bedrock là{" "}
                    <strong className="text-zinc-900 dark:text-zinc-100">Pha 2 tùy chọn (Go/No-Go Ngày 9)</strong> — chỉ
                    gắn nhãn Bedrock khi <code className="font-mono">source=&quot;bedrock&quot;</code>.
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-2 font-mono text-[10px]">
                    {[
                      ["Ctrl+K", "Tìm lệnh"],
                      ["J / K", "Chuyển hội thoại"],
                      ["E", "Hoàn tất / Mở lại"],
                      ["C", "Nhận xử lý"],
                      ["I", "Inspector"],
                      ["/", "Tìm / Macro"],
                    ].map(([keyLabel, desc]) => (
                      <span
                        key={keyLabel}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-white/10 dark:bg-[#09090B]"
                      >
                        <kbd className="kbd-cap rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-semibold text-zinc-900 dark:border-white/20 dark:bg-zinc-900 dark:text-white">
                          {keyLabel}
                        </kbd>
                        <span className="text-zinc-500 dark:text-zinc-400">{desc}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-[#09090B]">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                      <ChannelIcon channel="telegram" className="h-3.5 w-3.5" />
                      Telegram Bot
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">Kênh THẬT duy nhất · 2 chiều</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-[#09090B]">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                      <Terminal className="h-3.5 w-3.5 text-orange-500" />
                      Simulator Workbench
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">Shopee · Zalo · WebChat (Mô phỏng)</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-[#09090B]">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                      <Database className="h-3.5 w-3.5 text-emerald-500" />
                      DynamoDB + GSI
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">4 bảng On-Demand + TTL</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-[#09090B]">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                      <Bot className="h-3.5 w-3.5 text-violet-500" />
                      Amazon Bedrock
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">Pha 2 tùy chọn · Go/No-Go Ngày 9</div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* Closing Architectural CTA */}
        <section className="sandbox-rim elevated-sheet relative mt-14 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-6 dark:border-white/[0.09] dark:bg-[#111114]">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                Ready for Demo &amp; Vertical Slice
              </div>
              <h3 className="mt-1 text-lg font-bold text-zinc-950 dark:text-white">
                Trải nghiệm ngay Agent Portal và Simulated Phone Device
              </h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {USE_MOCK
                  ? "Đang chạy Local Mock Mode (BroadcastChannel 2 tab) — sẵn sàng chuyển sang AWS URL qua VITE_USE_MOCK=false."
                  : "Đang kết nối AWS Cognito, API Gateway REST & WebSocket trực tiếp."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {authed && onOpenSimulator && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-200"
                >
                  Mở Simulator (Mô phỏng)
                </button>
              )}
              <button
                type="button"
                onClick={authed ? onEnterApp : onOpenLogin}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <span>{authed ? "Mở Hộp thư CSKH" : "Đăng nhập trải nghiệm ngay"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/80 pt-6 text-xs text-zinc-500 dark:border-white/[0.08] dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>OmniInbox · AWS First Cloud Journey (FCAJ) · S3 + CloudFront OAC + Cognito</span>
          </div>
          <span className="font-mono text-[11px]">Frontend Workspace · React 19 + Tailwind v4</span>
        </footer>
      </main>
    </div>
  );
}
