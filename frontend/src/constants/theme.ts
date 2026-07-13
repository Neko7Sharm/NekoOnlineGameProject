import { Stats } from "../types/game";

// ─────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────

export const C = {
  bg: "#08091a",
  card: "#0d1228",
  card2: "#111930",
  blue: "#5eb8ff",
  blueD: "#1a3a6a",
  pink: "#ff6b9d",
  pinkD: "#4a1028",
  gold: "#ffd54f",
  green: "#4caf50",
  red: "#f44336",
  purple: "#ab47bc",
  text: "#e8efff",
  muted: "#6b7ab8",
  border: "rgba(94,184,255,0.22)",
  borderH: "rgba(94,184,255,0.6)",
  glow: "0 0 12px rgba(94,184,255,0.25)",
  glowStrong: "0 0 20px rgba(94,184,255,0.45)",
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
    background: "linear-gradient(180deg, #3a8adf 0%, #1a5aaf 100%)",
    border: `2px solid ${C.blue}`,
    color: "#ffffff",
    boxShadow: `0 0 10px rgba(94,184,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,
  };
  if (variant === "danger") return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: "linear-gradient(180deg, #c0392b 0%, #8b1a1a 100%)",
    border: `2px solid #e53935`,
    color: "#fff",
    boxShadow: "0 0 10px rgba(229,57,53,0.3)",
  };
  return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: C.card2,
    border: `2px solid rgba(94,184,255,0.3)`,
    color: C.muted,
  };
}
