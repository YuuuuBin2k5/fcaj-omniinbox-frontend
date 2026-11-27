export default function BrandLogo({ size = 28, showText = true, subtitle = "" }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        style={{ width: size, height: size }}
        className="surface-specular relative flex shrink-0 items-center justify-center rounded-xl border border-zinc-300/90 bg-zinc-950 shadow-xs dark:border-white/15 dark:bg-[#141418]"
      >
        <svg viewBox="0 0 28 28" className="h-[70%] w-[70%]" fill="none" aria-hidden="true">
          <path
            d="M5.5 7.5 9.5 11M22.5 7.5 18.5 11"
            stroke="#52525B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M5 10.5C5 8.57 6.57 7 8.5 7h11c1.93 0 3.5 1.57 3.5 3.5v6c0 1.93-1.57 3.5-3.5 3.5h-5.4l-4.1 3.2V20H8.5C6.57 20 5 18.43 5 16.5v-6Z"
            stroke="#FFFFFF"
            strokeWidth="1.95"
            strokeLinejoin="round"
          />
          <circle cx="10.2" cy="13.5" r="1.35" fill="#38BDF8" />
          <circle cx="14" cy="13.5" r="1.35" fill="#A1A1AA" />
          <circle cx="17.8" cy="13.5" r="1.35" fill="#FFFFFF" />
        </svg>
      </div>
      {showText && (
        <div className="leading-none">
          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-zinc-950 dark:text-white">
            <span>OmniInbox</span>
          </div>
          {subtitle && <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
