// FILE: src/features/landing/LandingPage.jsx
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Command, Moon, Sun, Zap } from "lucide-react";
import BrandLogo from "../../components/BrandLogo.jsx";
import { ChannelIcon } from "../../components/ChannelBadge.jsx";
import InteractivePipelineHero from "./InteractivePipelineHero.jsx";
import InteractiveFeatureCards from "./InteractiveFeatureCards.jsx";
import { USE_MOCK } from "../../services/auth.js";

const NAV_SECTIONS = [
  { id: "preview", label: "Sandbox" },
  { id: "mechanics", label: "Cơ chế" },
  { id: "launch", label: "Bắt đầu" },
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
  const [activeSection, setActiveSection] = useState("preview");
  const [scrollPct, setScrollPct] = useState(0);

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
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-sky-500/[0.09] blur-3xl dark:bg-sky-500/[0.11]" />

      {/* Floating Glass Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 glass-panel dark:border-white/[0.08] dark:bg-[#09090B]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo subtitle="Unified Inbox" />

          <nav className="hidden items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400 md:flex">
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
              {USE_MOCK ? "Local Mock" : "AWS Cloud"}
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

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              data-testid={authed ? undefined : "open-login-btn"}
              onClick={authed ? onEnterApp : onOpenLogin}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <span>{authed ? "Mở Portal" : "Đăng nhập Portal"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
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

      <main className="relative z-10 mx-auto max-w-6xl border-x border-zinc-200/70 px-4 pb-16 pt-10 sm:px-8 sm:pt-12 dark:border-white/[0.06]">
        {/* Crisp Hero + 3D Convergence Artwork */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="elevated-sheet mx-auto inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3.5 py-1 font-mono text-[11px] font-semibold text-zinc-700 dark:border-white/12 dark:bg-[#111114] dark:text-zinc-300"
          >
            <Zap className="h-3.5 w-3.5 text-sky-500" />
            <span>AWS Serverless · ap-southeast-1</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance mx-auto mt-5 max-w-3xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-600 bg-clip-text text-4xl font-extrabold tracking-[-0.035em] text-transparent sm:text-6xl sm:leading-[1.06] dark:from-white dark:via-zinc-100 dark:to-zinc-400"
          >
            Một hộp thư. Mọi kênh.
            <br className="hidden sm:block" /> Không sót một tin.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400"
          >
            Hợp nhất <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Telegram thật</strong> cùng{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">Shopee · Zalo · WebChat</strong>{" "}
            <span className="inline-block whitespace-nowrap rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Mô phỏng
            </span>{" "}
            trên hạ tầng Serverless thời gian thực.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={authed ? onEnterApp : onOpenLogin}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:bg-zinc-200"
            >
              <span>{authed ? "Vào Agent Portal" : "Đăng nhập Agent Portal"}</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            {authed ? (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onOpenSimulator}
                className="elevated-sheet inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-100 dark:hover:border-white/30"
              >
                Mở Customer Simulator (Mô phỏng)
              </motion.button>
            ) : (
              <a
                href="#preview"
                className="elevated-sheet inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 dark:border-white/15 dark:bg-[#111114] dark:text-zinc-200 dark:hover:border-white/30"
              >
                Thử Sandbox tương tác ↓
              </a>
            )}
          </motion.div>

          {/* Visual 3D Convergence Showcase */}
          <div className="elevated-sheet relative mt-8 flex min-h-[168px] flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-[#09090B] p-4 text-left sm:min-h-[190px] sm:flex-row sm:items-end sm:p-5 dark:border-white/[0.1]">
            <img
              src="/art/hero-convergence-3d.jpg"
              alt="Luồng dữ liệu đa kênh hội tụ vào lõi OmniInbox"
              fetchPriority="high"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-90"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/40 to-[#09090B]/85" />
            <div className="relative z-10 flex flex-wrap items-center gap-1.5">
              {[
                { id: "telegram", label: "Telegram · Thật" },
                { id: "shopee", label: "Shopee · Mô phỏng" },
                { id: "zalo", label: "Zalo · Mô phỏng" },
                { id: "webchat", label: "WebChat · Mô phỏng" },
              ].map((ch) => (
                <span
                  key={ch.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-100 glass-panel"
                >
                  <ChannelIcon channel={ch.id} className="h-3 w-3 shrink-0" />
                  <span>{ch.label}</span>
                </span>
              ))}
            </div>
            <span className="relative z-10 mt-3 self-start rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 font-mono text-[10px] text-zinc-300 glass-panel sm:mt-0 sm:self-auto">
              5 Core Lambdas · SQS + DLQ · DynamoDB
            </span>
          </div>
        </section>

        {/* Section 01: Playable Interactive Sandbox */}
        <section id="preview" className="mt-8 scroll-mt-24">
          <div className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            01 / Interactive Event Sandbox
          </div>
          <InteractivePipelineHero />
        </section>

        {/* Section 02: Touch-to-Understand Visual Mechanics */}
        <section id="mechanics" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                02 / Core Mechanics
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
                Chạm để xem hệ thống bảo vệ từng tin nhắn
              </h2>
            </div>
            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              React 19 · Tailwind v4 · AWS Node 22 arm64
            </span>
          </div>

          <InteractiveFeatureCards />
        </section>

        {/* Section 03: Flagship Obsidian 3D Launch Banner */}
        <section
          id="launch"
          className="sandbox-rim elevated-sheet relative mt-12 scroll-mt-24 overflow-hidden rounded-3xl border border-zinc-300/80 bg-[#09090B] p-6 text-white sm:p-8 dark:border-white/[0.12]"
        >
          <img
            src="/art/cta-obsidian-prism.jpg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-55 sm:w-3/4 sm:opacity-85"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/95 to-[#09090B]/55 sm:via-[#09090B]/90 sm:to-transparent" />

          <div className="relative z-10 max-w-lg">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
              Live Demo Ready
            </div>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Mở hộp thư và thử ngay.
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              {USE_MOCK
                ? "Chạy tức thì ở Local Mock Mode (hỗ trợ 2 tab) hoặc nối AWS thật bằng 1 biến môi trường."
                : "Đang kết nối trực tiếp Amazon Cognito, API Gateway REST và WebSocket."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={authed ? onEnterApp : onOpenLogin}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                <span>{authed ? "Mở Hộp thư CSKH" : "Đăng nhập trải nghiệm"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              {authed && onOpenSimulator && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 glass-panel"
                >
                  Mở Simulator (Mô phỏng)
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/80 pt-5 text-xs text-zinc-500 dark:border-white/[0.08] dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>OmniInbox · AWS First Cloud Journey (FCAJ)</span>
          </div>
          <span className="font-mono text-[11px]">React 19 · Tailwind v4 · Serverless</span>
        </footer>
      </main>
    </div>
  );
}
