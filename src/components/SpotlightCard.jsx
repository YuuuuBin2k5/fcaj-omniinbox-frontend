// FILE: src/components/SpotlightCard.jsx
import { useRef } from "react";
import { motion } from "motion/react";

export default function SpotlightCard({ children, className = "", delay = 0, ...rest }) {
  const cardRef = useRef(null);

  function handleMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`spotlight-card elevated-sheet rounded-2xl border border-zinc-200/90 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-white/[0.08] dark:bg-[#111114] dark:hover:border-white/[0.16] ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
