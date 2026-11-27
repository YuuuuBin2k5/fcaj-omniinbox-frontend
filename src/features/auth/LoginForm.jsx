// FILE: src/features/auth/LoginForm.jsx
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { login, USE_MOCK } from "../../services/auth.js";
import { evaluatePasswordRules } from "../../services/uiFormat.js";
import BrandLogo from "../../components/BrandLogo.jsx";

const MOCK_AGENTS = (import.meta.env.VITE_AGENT_LIST || "agent.minh@omniinbox.local,agent.lan@omniinbox.local")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PERSONA_RING = [
  "bg-sky-500/15 text-sky-700 ring-sky-500/35 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 ring-emerald-500/35 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 ring-violet-500/35 dark:text-violet-300",
];

function personaInitials(value) {
  const raw = String(value || "A").split("@")[0];
  const parts = raw.split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

export default function LoginForm({ onDone, onClose, asModal = false }) {
  const [username, setUsername] = useState(USE_MOCK ? MOCK_AGENTS[0] || "agent.minh@omniinbox.local" : "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pwdRules = evaluatePasswordRules(newPwd);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && asModal && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (!USE_MOCK || pending) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const num = Number(e.key);
      if (num >= 1 && num <= MOCK_AGENTS.length) {
        e.preventDefault();
        setUsername(MOCK_AGENTS[num - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asModal, onClose, pending]);

  async function submitWith(targetUser) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const r = await login(targetUser.trim(), password);
      if (r.status === "NEW_PASSWORD_REQUIRED") {
        setPending(r);
      } else {
        onDone();
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (pending) {
      setError("");
      setBusy(true);
      try {
        await pending.completeNewPassword(newPwd);
        return onDone();
      } catch (err) {
        setError(err.message || "Đổi mật khẩu thất bại");
      } finally {
        setBusy(false);
      }
      return;
    }
    await submitWith(username);
  }

  const card = (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      onClick={(e) => e.stopPropagation()}
      className="elevated-sheet relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-white/15 dark:bg-[#111114]"
    >
      {/* Subtle Blueprint Top Header */}
      <div className="hero-grid-bg relative border-b border-zinc-200/80 bg-zinc-50/70 px-6 pb-4 pt-5 dark:border-white/[0.08] dark:bg-[#0D0D10]">
        {onClose && (
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <BrandLogo size={30} />
        <h1 className="mt-3.5 text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
          OmniInbox – Đăng nhập nhân viên
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {USE_MOCK ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Chế độ Local Mock · Chọn persona để thử tranh nhận 409
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Xác thực qua Amazon Cognito User Pool (SRP)
            </>
          )}
        </p>
      </div>

      <div className="space-y-4 p-6">
        {!pending ? (
          <>
            {USE_MOCK && (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  <span>Nhân viên Demo (Mock Persona)</span>
                  <span>Phím 1–{MOCK_AGENTS.length}</span>
                </div>
                <div className="grid gap-2">
                  {MOCK_AGENTS.map((a, idx) => {
                    const selected = username === a;
                    const ringCls = PERSONA_RING[idx % PERSONA_RING.length];
                    return (
                      <div
                        key={a}
                        role="button"
                        tabIndex={0}
                        onClick={() => setUsername(a)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setUsername(a);
                          }
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition ${
                          selected
                            ? "border-zinc-900 bg-zinc-100/90 dark:border-white/40 dark:bg-white/[0.08]"
                            : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 dark:border-white/10 dark:bg-[#09090B] dark:hover:border-white/20"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ring-1 ${ringCls}`}
                          >
                            {personaInitials(a)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                              {a}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Agent CSKH #{idx + 1} · Local Mock
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <kbd className="kbd-cap rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-400">
                            {idx + 1}
                          </kbd>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUsername(a);
                              submitWith(a);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-800 hover:border-zinc-500 dark:border-white/15 dark:bg-[#18181C] dark:text-zinc-100 dark:hover:border-white/35"
                          >
                            <span>Vào</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tên đăng nhập (Email)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-white/15 dark:bg-[#09090B] dark:text-white dark:focus:border-white/40"
                placeholder="agent.minh@omniinbox.local"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            {USE_MOCK ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>Local Mock Mode · Không cần mật khẩu Cognito</span>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mật khẩu</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 pr-9 text-sm text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-white/15 dark:bg-[#09090B] dark:text-white dark:focus:border-white/40"
                    type={showPwd ? "text" : "password"}
                    placeholder="Nhập mật khẩu Cognito"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label="Hiện/ẩn mật khẩu"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-center text-emerald-700 dark:text-emerald-300">
                01. Tài khoản hợp lệ ✓
              </div>
              <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-center font-semibold text-sky-700 dark:text-sky-300">
                02. Đặt mật khẩu mới
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <Lock className="h-3.5 w-3.5" />
                Đặt mật khẩu mới (lần đầu đăng nhập Cognito)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-white/15 dark:bg-[#09090B] dark:text-white"
                type="password"
                placeholder="Nhập mật khẩu mới"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-[11px] dark:border-white/10 dark:bg-[#09090B]">
              {[
                [pwdRules.minLength, "Tối thiểu 8 ký tự"],
                [pwdRules.hasUpper, "Chữ in hoa (A–Z)"],
                [pwdRules.hasLower, "Chữ thường (a–z)"],
                [pwdRules.hasNumber, "Chữ số (0–9)"],
              ].map(([ok, text]) => (
                <div
                  key={text}
                  className={`flex items-center gap-1.5 ${
                    ok ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <Check className={`h-3 w-3 shrink-0 ${ok ? "opacity-100" : "opacity-30"}`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: [0, -4, 4, -2, 0] }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{busy ? "Đang xử lý…" : pending ? "Đổi mật khẩu" : "Đăng nhập"}</span>
        </motion.button>
      </div>

      {/* Security Posture Footer */}
      <div className="flex items-center justify-between border-t border-zinc-200/80 bg-zinc-50/70 px-6 py-2.5 font-mono text-[10px] text-zinc-500 dark:border-white/[0.08] dark:bg-[#09090B] dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          {USE_MOCK ? "Local Mock Session · Không gọi AWS" : "Amazon Cognito SRP · Zero Secret"}
        </span>
        {asModal && <span>ESC đóng</span>}
      </div>
    </motion.form>
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 glass-panel"
        onClick={onClose}
      >
        {card}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7F9] p-4 dark:bg-[#09090B]">{card}</div>
  );
}
