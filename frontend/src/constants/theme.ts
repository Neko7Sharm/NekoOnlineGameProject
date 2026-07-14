import { Stats } from "../types/game";

// ─────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────

export const C = {
  // ── Backgrounds (Twilight Deep)
  bg: "#0d0b1a",          // Midnight deep violet-black
  card: "#16122a",        // Dark lavender card
  card2: "#1e1836",       // Slightly lighter panel

  // ── Primary: Lavender Purple
  blue: "#b48aff",        // Lavender (was blue — renamed semantically but kept as 'blue' for compatibility)
  blueD: "#2d1f5a",       // Deep lavender background

  // ── Accent: Soft Pink / Rose
  pink: "#f4a0c8",        // Soft rose
  pinkD: "#3d1030",

  // ── Accent: Soft Gold / Moon
  gold: "#f5d87a",        // Warm soft gold / moonlight

  // ── Status Colors
  green: "#5ecf7a",       // Soft mint green
  red: "#f07070",         // Soft rose-red (not harsh)
  purple: "#c084fc",      // Bright lavender for magic

  // ── Text
  text: "#ede8ff",        // Moon white (slightly warm)
  muted: "#8878b8",       // Lavender-grey muted

  // ── Borders & Glow
  border: "rgba(180,138,255,0.25)",     // Lavender border
  borderH: "rgba(180,138,255,0.6)",     // Hovered lavender border
  glow: "0 0 14px rgba(180,138,255,0.2)",
  glowStrong: "0 0 24px rgba(180,138,255,0.4)",
} as const;

// ─────────────────────────────────────────────────
// FONT CONSTANTS
// ─────────────────────────────────────────────────

export const PX = "Press Start 2P, monospace";
export const NU = "Nunito, sans-serif";
export const MO = "JetBrains Mono, monospace";

// ─────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────

export const panel: React.CSSProperties = {
  background: C.card,
  border: `2px solid ${C.border}`,
  boxShadow: C.glow,
};

export function pixelBtn(variant: "primary" | "danger" | "ghost" = "primary", sm = false) {
  const pad = sm ? "6px 12px" : "9px 18px";
  const fs = sm ? 8 : 9;
  if (variant === "primary") return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: "linear-gradient(180deg, #7c5ccf 0%, #5a3eaa 100%)",
    border: `2px solid ${C.blue}`,
    color: "#ede8ff",
    boxShadow: `0 0 10px rgba(180,138,255,0.35), inset 0 1px 0 rgba(255,255,255,0.12)`,
  };
  if (variant === "danger") return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: "linear-gradient(180deg, #a03030 0%, #6e1c1c 100%)",
    border: `2px solid #f07070`,
    color: "#ffe0e0",
    boxShadow: "0 0 10px rgba(240,112,112,0.3)",
  };
  return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: C.card2,
    border: `2px solid rgba(180,138,255,0.3)`,
    color: C.muted,
  };
}
