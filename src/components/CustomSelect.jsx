import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export default function CustomSelect({
  value,
  options = [],
  onChange,
  disabled = false,
  ariaLabel,
  align = "right",
  triggerPrefix = null,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);

    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onDocKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onDocKey);
    };
  }, [open, options, value]);

  function commit(opt) {
    setOpen(false);
    if (opt && opt.value !== value) {
      onChange?.(opt.value);
    }
  }

  function handleTriggerKeyDown(e) {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (options.length ? (i + 1) % options.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
    } else if (e.key === "Enter" && options[activeIdx]) {
      e.preventDefault();
      commit(options[activeIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-white/35 dark:bg-white/10 dark:text-white"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/12 dark:bg-[#18181C] dark:text-zinc-200 dark:hover:border-white/25 dark:hover:bg-white/[0.06]"
        }`}
      >
        {triggerPrefix}
        {selected?.icon}
        <span className="max-w-[150px] truncate">{selected?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={`surface-specular absolute top-full z-40 mt-1.5 min-w-[220px] max-w-[280px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-[#141418] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === activeIdx;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => commit(opt)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    isHighlighted
                      ? "bg-zinc-100 text-zinc-950 dark:bg-white/[0.08] dark:text-white"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {opt.icon}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.sub && <div className="truncate font-mono text-[10px] text-zinc-400">{opt.sub}</div>}
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
