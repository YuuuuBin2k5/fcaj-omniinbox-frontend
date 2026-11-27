// FILE: src/components/JsonCodeBlock.jsx
import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { tokenizeJson } from "../services/uiFormat.js";

const TOKEN_COLOR = {
  key: "text-sky-300",
  string: "text-emerald-300",
  number: "text-amber-300",
  boolean: "text-violet-300",
  null: "text-rose-300",
  punct: "text-zinc-500",
  text: "text-zinc-300",
};

export default function JsonCodeBlock({ title = "", code = "", className = "" }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => tokenizeJson(code), [code]);

  function handleCopy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-200 bg-[#0B0C10] shadow-xs dark:border-white/10 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-[10px] text-zinc-400">
          <span className="truncate">{title}</span>
          <button
            type="button"
            aria-label="Sao chép JSON"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed">
        <code>
          {tokens.map((t, i) => (
            <span key={i} className={TOKEN_COLOR[t.type] || "text-zinc-300"}>
              {t.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
