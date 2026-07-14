import { C } from "../../constants/theme";

export function HpBar({ hp, maxHp, size = "md" }: { hp: number; maxHp: number; size?: "sm" | "md" }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const color = pct > 60 ? C.green : pct > 25 ? "#ff9800" : C.red;
  const h = size === "sm" ? 4 : 8;
  return (
    <div style={{ width: "100%", height: h, background: C.card2, border: "1px solid rgba(180,138,255,0.2)", imageRendering: "pixelated" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s", boxShadow: `0 0 4px ${color}` }} />
    </div>
  );
}
