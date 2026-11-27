// FILE: src/components/ChannelBadge.jsx
// Custom SVG vector icons cho 4 kênh & trạng thái hình học chuẩn Linear (0 emoji rác).

export function ChannelIcon({ channel, className = "h-3.5 w-3.5" }) {
  const ch = String(channel || "").toLowerCase();

  if (ch === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M20.665 3.717 2.935 10.554c-1.21.485-1.203 1.16-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434Z"
          fill="#2AABEE"
        />
      </svg>
    );
  }

  if (ch === "shopee") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M6.5 8.5h11l1.1 11.2A2 2 0 0 1 16.61 22H7.39a2 2 0 0 1-1.99-2.3L6.5 8.5Z"
          fill="#EE4D2D"
          fillOpacity="0.18"
          stroke="#EE4D2D"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5" stroke="#EE4D2D" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M14.2 12.6c-.45-.48-1.15-.75-2.05-.75-1.2 0-1.95.55-1.95 1.38 0 .92.85 1.25 2.08 1.52 1.28.28 2.12.66 2.12 1.66 0 1.02-.92 1.69-2.25 1.69-1.05 0-1.88-.32-2.4-.9"
          stroke="#EE4D2D"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (ch === "zalo") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <rect
          x="2.5"
          y="3.5"
          width="19"
          height="16"
          rx="5"
          fill="#0068FF"
          fillOpacity="0.16"
          stroke="#0068FF"
          strokeWidth="1.8"
        />
        <path
          d="M7.5 9.2h4.2l-4.2 5.1h4.4M14.2 11.2v3.1m0-5.1h.01M16.8 11.2a1.7 1.7 0 1 0 0 3.1"
          stroke="#0068FF"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M5.5 6.5h13a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3v-3H5.5A2.5 2.5 0 0 1 3 15V9a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="#8B5CF6"
        fillOpacity="0.16"
        stroke="#8B5CF6"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="1" fill="#8B5CF6" />
      <circle cx="12" cy="12" r="1" fill="#8B5CF6" />
      <circle cx="15" cy="12" r="1" fill="#8B5CF6" />
    </svg>
  );
}

const CHANNEL_META = {
  telegram: {
    label: "Telegram",
    kind: "Thật",
    cls: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  shopee: {
    label: "Shopee",
    kind: "Mô phỏng",
    cls: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  zalo: {
    label: "Zalo",
    kind: "Mô phỏng",
    cls: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  webchat: {
    label: "WebChat",
    kind: "Mô phỏng",
    cls: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
};

export function ChannelBadge({ channel, compact = false }) {
  const ch = String(channel || "webchat").toLowerCase();
  const meta = CHANNEL_META[ch] || CHANNEL_META.webchat;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${meta.cls}`}
    >
      <ChannelIcon channel={ch} className="h-3 w-3" />
      <span>{compact ? meta.kind : `${meta.label} · ${meta.kind}`}</span>
    </span>
  );
}

const STATUS_META = {
  OPEN: {
    label: "Chưa xử lý",
    text: "text-amber-700 dark:text-amber-300",
  },
  IN_PROGRESS: {
    label: "Đang tư vấn",
    text: "text-blue-700 dark:text-blue-300",
  },
  RESOLVED: {
    label: "Đã hoàn tất",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

export function StatusIcon({ status, className = "h-3.5 w-3.5" }) {
  if (status === "RESOLVED") {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" fill="#10B981" fillOpacity="0.18" stroke="#10B981" strokeWidth="1.5" />
        <path
          d="M5.4 8.2 7.2 10l3.5-3.8"
          stroke="#10B981"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.2" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.35" />
        <path d="M8 1.8A6.2 6.2 0 1 1 1.8 8H8V1.8Z" fill="#3B82F6" fillOpacity="0.28" />
        <path d="M8 1.8A6.2 6.2 0 0 1 14.2 8" stroke="#3B82F6" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.2"
        stroke="#F59E0B"
        strokeWidth="1.6"
        strokeDasharray="2.8 2.1"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.5" fill="#F59E0B" />
    </svg>
  );
}

export function StatusDot({ status, showCode = false }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${meta.text}`}>
      <StatusIcon status={status} className="h-3 w-3 shrink-0" />
      <span>{showCode ? `${meta.label} (${status})` : status}</span>
    </span>
  );
}
