// FILE: src/App.jsx
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Command, FlaskConical, Home, Inbox, Keyboard, Loader2, LogOut, Moon, Search, ShieldCheck, Sun, X } from "lucide-react";
import { getAgentName, getCurrentSession, logout, USE_MOCK } from "./services/auth.js";
import { setUnauthorizedHandler } from "./services/apiClient.js";
import { seedManyForPagination, seedSameNamePair } from "./services/mockBackend.js";
import BrandLogo from "./components/BrandLogo.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

const LandingPage = lazy(() => import("./features/landing/LandingPage.jsx"));
const LoginForm = lazy(() => import("./features/auth/LoginForm.jsx"));
const InboxView = lazy(() => import("./features/inbox/InboxView.jsx"));
const SimulatorView = lazy(() => import("./features/simulator/SimulatorView.jsx"));

function ViewFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#F6F7F9] text-xs text-zinc-500 dark:bg-[#09090B] dark:text-zinc-400">
      <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 shadow-xs dark:border-white/10 dark:bg-[#111114]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
        <span className="font-mono text-[11px]">Đang tải không gian làm việc…</span>
      </div>
    </div>
  );
}

const THEME_KEY = "omni_ui_theme";

function parseHashView() {
  const h = window.location.hash;
  if (h === "#simulator") return "simulator";
  if (h === "#landing") return "landing";
  if (h === "#inbox") return "inbox";
  return null;
}

function agentInitials(name) {
  const raw = String(name || "A").split("@")[0];
  const parts = raw.split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showLogin, setShowLogin] = useState(window.location.hash === "#login");
  const [view, setView] = useState(() => parseHashView() || "inbox");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [externalConversations, setExternalConversations] = useState([]);
  const [externalSelectConv, setExternalSelectConv] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const profileRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    getCurrentSession().then((s) => {
      const ok = Boolean(s);
      setAuthed(ok);
      if (ok && window.location.hash === "#login") {
        setView("inbox");
      }
      setReady(true);
    });

    setUnauthorizedHandler(() => {
      setAuthed(false);
      setShowLogin(true);
    });

    const onHash = () => {
      if (window.location.hash === "#login") {
        setShowLogin(true);
        return;
      }
      const next = parseHashView();
      if (next) setView(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (authed) {
          setProfileOpen(false);
          setShortcutsOpen(false);
          setPaletteOpen((o) => !o);
        } else {
          setShowLogin(true);
        }
        return;
      }
      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "?" && authed) {
        e.preventDefault();
        setProfileOpen(false);
        setPaletteOpen(false);
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, [authed, shortcutsOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    function onDown(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!authed) return;
    const targetHash = view === "simulator" ? "#simulator" : view === "landing" ? "#landing" : "#inbox";
    if (window.location.hash !== targetHash) window.location.hash = targetHash;
  }, [authed, view]);

  const totalUnread = externalConversations.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);

  useEffect(() => {
    const prefix = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) ` : "";
    if (!authed) {
      document.title = "OmniInbox · AWS Serverless Unified Inbox";
      return;
    }
    if (view === "simulator") {
      document.title = `${prefix}OmniInbox · Customer Simulator (Mô phỏng)`;
    } else if (view === "landing") {
      document.title = `${prefix}OmniInbox · AWS Serverless Unified Inbox`;
    } else {
      document.title = `${prefix}OmniInbox · Hộp thư CSKH`;
    }
  }, [authed, view, totalUnread]);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-instant");
    setTheme((t) => (t === "dark" ? "light" : "dark"));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove("theme-instant"));
    });
  };

  if (!ready) return null;

  if (!authed) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F6F7F9] dark:bg-[#09090B]" />}>
        <LandingPage
          authed={false}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenLogin={() => setShowLogin(true)}
        />
        <AnimatePresence>
          {showLogin && (
            <LoginForm
              asModal
              onClose={() => {
                setShowLogin(false);
                if (window.location.hash === "#login") window.location.hash = "";
              }}
              onDone={() => {
                setAuthed(true);
                setShowLogin(false);
                setView(parseHashView() || "inbox");
              }}
            />
          )}
        </AnimatePresence>
      </Suspense>
    );
  }

  if (view === "landing") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F6F7F9] dark:bg-[#09090B]" />}>
        <LandingPage
          authed={true}
          theme={theme}
          onToggleTheme={toggleTheme}
          onEnterApp={() => setView("inbox")}
          onOpenSimulator={() => setView("simulator")}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          conversations={externalConversations}
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigate={setView}
          onSelectConversation={(c) => setExternalSelectConv(c)}
          onSeedSameName={seedSameNamePair}
          onSeedPagination={() => seedManyForPagination(60)}
        />
      </Suspense>
    );
  }

  const agentName = getAgentName() || "agent";
  const navItems = [
    { id: "inbox", label: "Hộp thư CSKH", short: "Hộp thư", icon: Inbox, badge: totalUnread },
    { id: "simulator", label: "Giả lập khách (Mô phỏng)", short: "Simulator", icon: FlaskConical },
    { id: "landing", label: "Trang giới thiệu", short: "Giới thiệu", icon: Home },
  ];

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    setAuthed(false);
    setShowLogin(false);
  };

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh flex-col bg-[#F6F7F9] text-zinc-900 md:flex-row dark:bg-[#09090B] dark:text-zinc-100">
      {/* Desktop Left Micro Navigation Rail (56px) — dimmed calm chrome */}
      <aside className="relative z-30 hidden w-14 shrink-0 flex-col items-center justify-between border-r border-zinc-200/90 bg-[#F8F8FA] py-3 md:flex dark:border-white/[0.08] dark:bg-[#0B0B0E]">
        <div className="flex flex-col items-center gap-3">
          <div className="group relative">
            <button
              type="button"
              aria-label="Về trang giới thiệu OmniInbox"
              onClick={() => setView("landing")}
              className="relative rounded-lg transition hover:opacity-85"
            >
              <BrandLogo size={32} showText={false} />
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#F8F8FA] dark:ring-[#0B0B0E] ${
                  USE_MOCK ? "bg-amber-400" : "bg-emerald-500"
                }`}
              />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100">
              OmniInbox · {USE_MOCK ? "Local Mock" : "AWS Cloud"}
            </span>
          </div>

          <div className="h-px w-7 bg-zinc-200 dark:bg-white/10" />

          <nav className="flex flex-col items-center gap-1.5">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = view === n.id;
              return (
                <div key={n.id} className="group relative">
                  {active && (
                    <motion.span
                      layoutId="railActiveBar"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      className="absolute -left-2 top-2 bottom-2 w-[3px] rounded-r-full bg-zinc-950 dark:bg-white"
                    />
                  )}
                  <button
                    type="button"
                    aria-label={n.label}
                    onClick={() => setView(n.id)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      active
                        ? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-950"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.badge > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-bold text-white">
                        {n.badge > 99 ? "99+" : n.badge}
                      </span>
                    )}
                  </button>
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100">
                    {n.label}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="group relative">
            <button
              type="button"
              aria-label="Tìm nhanh (Ctrl+K)"
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/25 dark:hover:text-white"
            >
              <Command className="h-4 w-4" />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100">
              Tìm nhanh · Ctrl+K
            </span>
          </div>

          <div className="group relative">
            <button
              type="button"
              aria-label="Đổi giao diện Sáng/Tối"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/25 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100">
              {theme === "dark" ? "Chế độ Sáng" : "Chế độ Tối"}
            </span>
          </div>

          {/* Agent Avatar + Profile/Shortcuts Popover */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              aria-label="Tài khoản nhân viên và phím tắt"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition ${
                profileOpen
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-zinc-300 bg-zinc-100 text-zinc-800 hover:border-zinc-500 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-white/35"
              }`}
            >
              {agentInitials(agentName)}
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -6, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  className="surface-specular absolute bottom-0 left-full z-50 ml-3 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl dark:border-white/15 dark:bg-[#141418]"
                >
                  <div className="flex items-center gap-2.5 border-b border-zinc-200 pb-2.5 dark:border-white/10">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-mono text-[11px] font-bold text-white dark:bg-white dark:text-zinc-950">
                      {agentInitials(agentName)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-semibold text-zinc-950 dark:text-white">
                        {agentName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        <span>{USE_MOCK ? "Local Mock Mode" : "AWS Cognito SRP"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Phím tắt nhanh
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setShortcutsOpen(true);
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        <Keyboard className="h-3 w-3" />
                        Tất cả (?)
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chuyển hội thoại</span>
                      <span className="flex gap-1 font-mono">
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">J</kbd>
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">K</kbd>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Focus ô trả lời / Tìm</span>
                      <span className="flex gap-1 font-mono">
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">R</kbd>
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">/</kbd>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Hoàn tất / Nhận / Chi tiết</span>
                      <span className="flex gap-1 font-mono">
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">E</kbd>
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">C</kbd>
                        <kbd className="rounded border border-zinc-200 px-1 dark:border-white/15">I</kbd>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Command Palette</span>
                      <kbd className="rounded border border-zinc-200 px-1 font-mono dark:border-white/15">Ctrl+K</kbd>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Đăng xuất
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Single Top Bar (< md) */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-1.5 border-b border-zinc-200 bg-white px-2.5 md:hidden dark:border-white/10 dark:bg-[#09090B]">
        <button type="button" aria-label="Về trang giới thiệu" onClick={() => setView("landing")} className="shrink-0">
          <BrandLogo size={22} showText={false} />
        </button>

        <nav className="flex min-w-0 items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  active
                    ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{n.id === "landing" ? "Home" : n.short}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Tìm nhanh"
            onClick={() => setPaletteOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-white/15 dark:text-zinc-300"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Đổi giao diện Sáng/Tối"
            onClick={toggleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-white/15 dark:text-zinc-300"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Đăng xuất"
            onClick={handleLogout}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 dark:border-white/15 dark:text-zinc-300"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Suspense fallback={<ViewFallback />}>
          {view === "inbox" ? (
            <InboxView
              onOpenSimulator={() => setView("simulator")}
              onConversationsChange={setExternalConversations}
              externalSelectConv={externalSelectConv}
              onClearExternalSelect={() => setExternalSelectConv(null)}
            />
          ) : (
            <SimulatorView onOpenInbox={() => setView("inbox")} />
          )}
        </Suspense>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        conversations={externalConversations}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={setView}
        onSelectConversation={(c) => setExternalSelectConv(c)}
        onSeedSameName={seedSameNamePair}
        onSeedPagination={() => seedManyForPagination(60)}
      />

      <AnimatePresence>
        {shortcutsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShortcutsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 glass-panel"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Bảng phím tắt OmniInbox"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="surface-specular w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/15 dark:bg-[#111114]"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                  <Keyboard className="h-4 w-4 text-sky-500" />
                  <span>Phím tắt thao tác nhanh</span>
                </div>
                <button
                  type="button"
                  aria-label="Đóng bảng phím tắt"
                  onClick={() => setShortcutsOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 p-4 text-xs sm:grid-cols-2">
                {[
                  ["J / K", "Hội thoại kế tiếp / trước"],
                  ["R", "Focus ô trả lời"],
                  ["/", "Tìm kiếm hoặc mở Mẫu nhanh"],
                  ["C", "Nhận xử lý hội thoại"],
                  ["E", "Hoàn tất / Mở lại"],
                  ["I", "Mở Contract Inspector"],
                  ["Ctrl + K", "Command Palette"],
                  ["?", "Mở / Đóng bảng phím tắt"],
                ].map(([keyLabel, desc]) => (
                  <div
                    key={keyLabel}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-[#09090B]"
                  >
                    <span className="text-zinc-600 dark:text-zinc-300">{desc}</span>
                    <kbd className="kbd-cap shrink-0 rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-900 dark:border-white/15 dark:bg-zinc-900 dark:text-white">
                      {keyLabel}
                    </kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
