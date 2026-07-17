import { useState } from "react";
import { X } from "lucide-react";
import { C, MO, PX, NU } from "../../constants/theme";
import { modStr } from "../../utils/dice";
import { STAT_DESCRIPTIONS } from "../../constants/classes";
import type { Stats } from "../../types/game";

export function StatBox({ label, value }: { label: string; value: number }) {
  const [open, setOpen] = useState(false);
  const statKey = label.toLowerCase() as keyof Stats;
  const desc = STAT_DESCRIPTIONS[statKey];

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ 
        background: C.card2, border: `1px solid ${C.border}`, padding: "4px 6px", 
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", transition: "all 0.2s"
      }}>
        <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: MO, fontSize: 13, color: C.blue, fontWeight: 700 }}>{value}</span>
        </div>
      </div>

      {open && desc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setOpen(false)}>
          <div style={{
            background: `linear-gradient(180deg, ${C.card} 0%, ${C.card2} 100%)`,
            border: `2px solid ${C.border}`, padding: 20, borderRadius: 8,
            width: 260, maxWidth: "90%", boxShadow: C.glow,
            position: "relative"
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={{
              position: "absolute", top: 8, right: 8, background: "none", border: "none",
              color: C.muted, cursor: "pointer"
            }}>
              <X className="w-5 h-5" />
            </button>
            
            <div style={{ fontFamily: PX, fontSize: 14, color: C.text, marginBottom: 8 }}>
              {desc.label} {value}
            </div>
            
            <div style={{ fontFamily: MO, fontSize: 16, color: C.blue, marginBottom: 16 }}>
              Modifier : {modStr(value)}
            </div>

            <div style={{ fontFamily: PX, fontSize: 9, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>
              Effects:
            </div>
            
            <ul style={{ margin: 0, paddingLeft: 20, fontFamily: NU, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
              {desc.effects.map((ef, i) => (
                <li key={i}>{ef}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
