import { UserCheck, UserMinus } from "lucide-react";
import { getAgentName } from "../../services/auth.js";
import { formatAgentShort } from "../../services/uiFormat.js";
import CustomSelect from "../../components/CustomSelect.jsx";

const CONFIGURED = (import.meta.env.VITE_AGENT_LIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function agentInitials(name) {
  const raw = String(name || "A").split("@")[0];
  const parts = raw.split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

export default function AssignSelect({ conv, disabled, onAssign }) {
  const me = getAgentName();
  const current = conv.assignedAgent || "unassigned";
  const agents = Array.from(
    new Set([me, ...CONFIGURED, current !== "unassigned" ? current : null].filter(Boolean))
  );

  const options = [
    {
      value: "unassigned",
      label: "Chưa nhận",
      sub: "Hàng đợi chung",
      icon: (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <UserMinus className="h-2.5 w-2.5" />
        </span>
      ),
    },
    ...agents.map((a) => {
      const shortName = formatAgentShort(a);
      const subText = a.includes("@")
        ? a === me
          ? `${a} · Bạn`
          : a
        : a === me
          ? "Tài khoản của bạn"
          : "Nhân viên CSKH";
      return {
        value: a,
        label: shortName,
        sub: subText,
        icon: (
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-bold ${
              a === me
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
            }`}
          >
            {agentInitials(a)}
          </span>
        ),
      };
    }),
  ];

  return (
    <CustomSelect
      ariaLabel="Phân công nhân viên"
      value={current}
      options={options}
      disabled={disabled}
      align="right"
      triggerPrefix={current === "unassigned" ? null : <UserCheck className="h-3 w-3 text-zinc-400" />}
      onChange={(val) => onAssign(conv, val)}
    />
  );
}
