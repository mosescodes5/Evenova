/**
 * Motion.jsx
 * Reusable Framer Motion wrappers for scroll-triggered and entrance animations.
 * Import these anywhere instead of writing motion props from scratch.
 */
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ── Base variants ──────────────────────────────────────── */
export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
};
export const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
export const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.1, 0.64, 1] } },
};
export const staggerContainer = (stagger = 0.1, delay = 0) => ({
  hidden: {},
  show:   { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/* ── Scroll-reveal wrapper ──────────────────────────────── */
export function Reveal({ children, variants = fadeUp, delay = 0, className = "", style = {}, once = true }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-80px 0px" });
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      transition={{ delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger reveal container ───────────────────────────── */
export function StaggerReveal({ children, stagger = 0.1, delay = 0, className = "", style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger item (child of StaggerReveal) ──────────────── */
export function StaggerItem({ children, variants = fadeUp, className = "", style = {} }) {
  return (
    <motion.div variants={variants} className={className} style={style}>
      {children}
    </motion.div>
  );
}

/* ── Page transition wrapper ────────────────────────────── */
export function PageMotion({ children, style = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Hover card ─────────────────────────────────────────── */
export function HoverCard({ children, style = {}, onClick, lift = 6 }) {
  return (
    <motion.div
      whileHover={{ y: -lift, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ cursor: onClick ? "pointer" : "default", ...style }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

/* ── Counter number (count up on enter) ─────────────────── */
export function CountUp({ value, color, label }) {
  return (
    <Reveal variants={scaleIn}>
      <div style={{ textAlign: "center" }}>
        <p className="outfit" style={{ fontSize: 22, fontWeight: 900, color }}>{value}</p>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</p>
      </div>
    </Reveal>
  );
}
