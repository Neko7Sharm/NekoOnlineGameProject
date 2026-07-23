import { useState, useEffect } from "react";
import { C, PX } from "../../constants/theme";
import type { DiceRollDisplay } from "../../types/game";

export function DiceRollOverlay({ rolls }: { rolls: DiceRollDisplay[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!rolls.some(r => r.phase === "rolling")) return;
    const iv = setInterval(() => setTick(t => t + 1), 35);
    return () => clearInterval(iv);
  }, [rolls]);

  if (rolls.length === 0) return null;
  const COLORS: Record<DiceRollDisplay["type"], { bg: string; border: string; col: string; label: string }> = {
    hit:    { bg: "linear-gradient(135deg, rgba(20,50,100,0.95), rgba(10,20,50,0.95))", border: C.blue,     col: C.blue,     label: "HIT ROLL" },
    save:   { bg: "linear-gradient(135deg, rgba(20,80,30,0.95), rgba(10,30,15,0.95))", border: "#4cdb70",  col: "#4cdb70",  label: "SAVE ROLL" },
    damage: { bg: "linear-gradient(135deg, rgba(100,20,10,0.95), rgba(40,10,5,0.95))", border: "#ff3333",  col: "#ffaa33",  label: "DAMAGE" },
    skill:  { bg: "linear-gradient(135deg, rgba(60,20,100,0.95), rgba(30,10,50,0.95))", border: "#b366ff",  col: "#d9a6ff",  label: "SKILL CHECK" },
  };

  return (
    <>
      <style>{`
        @keyframes dnd-dice-roll {
          0% { transform: translateY(-80px) rotate(-15deg) scale(0.5); opacity: 0; filter: blur(4px); }
          50% { transform: translateY(10px) rotate(5deg) scale(1.1); opacity: 1; filter: blur(0); }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes dnd-dice-slam {
          0% { transform: scale(1.45) skewX(-10deg); filter: brightness(2.2) drop-shadow(0 0 35px rgba(255,215,0,0.9)); }
          40% { transform: scale(0.92) skewX(2deg); filter: brightness(1.3) drop-shadow(0 0 15px rgba(255,255,255,0.5)); }
          100% { transform: scale(1) skewX(-5deg); filter: brightness(1) drop-shadow(0 0 20px rgba(0,0,0,0.8)); }
        }
        @keyframes dnd-dice-nums { 0%,100%{opacity:0.6; transform: scale(0.95)} 50%{opacity:1; transform: scale(1.05)} }
      `}</style>
      <div style={{ position: "fixed", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 9998, display: "flex", gap: 20, pointerEvents: "none" }}>
        {rolls.map(r => {
          const c = COLORS[r.type];
          const spinning = r.phase === "rolling";
          
          const renderDiceBlock = (val: number, isDiscarded: boolean, isAdvRoll: boolean) => {
            const dispVal = spinning ? ((tick * 13 + r.max * (isAdvRoll ? 11 : 7)) % r.max) + 1 : val;
            
            return (
              <div style={{
                background: isDiscarded && !spinning ? "linear-gradient(135deg, rgba(30,30,30,0.95), rgba(10,10,10,0.95))" : c.bg,
                borderLeft: `6px solid ${isDiscarded && !spinning ? "#555" : c.border}`,
                borderRight: `6px solid ${isDiscarded && !spinning ? "#555" : c.border}`,
                padding: "16px 28px", textAlign: "center", minWidth: 100,
                clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
                animation: spinning ? "dnd-dice-roll 0.4s cubic-bezier(0.2,0,0,1) forwards" : "dnd-dice-slam 0.5s cubic-bezier(0.1,0.9,0.2,1) forwards",
                position: "relative",
                transform: "skewX(-5deg)",
                opacity: isDiscarded && !spinning ? 0.6 : 1,
                filter: isDiscarded && !spinning ? "grayscale(100%)" : "none",
                transition: "opacity 0.3s, filter 0.3s"
              }}>
                <div style={{ fontFamily: PX, fontSize: 11, color: "#fff", letterSpacing: 2, marginBottom: 6, opacity: 0.9, textShadow: "1px 1px 0 rgba(0,0,0,0.8)" }}>
                  {isAdvRoll ? (r.advType === "adv" ? "ADVANTAGE" : "DISADVANTAGE") : c.label}
                </div>
                
                <div style={{ position: "relative" }}>
                  <div style={{
                    fontFamily: PX, fontSize: spinning ? 32 : 46, color: spinning ? "#fff" : (isDiscarded ? "#888" : c.col), lineHeight: 1,
                    filter: spinning ? "blur(1px)" : "none",
                    transition: "filter 0.1s, font-size 0.2s",
                    animation: spinning ? "dnd-dice-nums 0.1s linear infinite" : "none",
                    textShadow: spinning ? "none" : (isDiscarded ? "none" : `2px 2px 0 rgba(0,0,0,0.8), 0 0 25px ${c.border}`),
                  }}>{dispVal}</div>
                  
                  {isDiscarded && !spinning && (
                    <div style={{ position: "absolute", top: "50%", left: -10, right: -10, height: 4, background: "#ff3333", transform: "translateY(-50%) rotate(-10deg)", boxShadow: "0 0 10px rgba(255,0,0,0.8)" }} />
                  )}
                </div>

                {!isDiscarded && r.phase === "done" && r.mod !== 0 && (
                  <div style={{ fontFamily: PX, fontSize: 12, color: "#fff", marginTop: 8, textShadow: "1px 1px 0 rgba(0,0,0,0.8)" }}>
                    {r.mod > 0 ? `+${r.mod}` : r.mod} = <span style={{ color: c.border, fontSize: 18 }}>{r.total}</span>
                  </div>
                )}
                {!isDiscarded && r.phase === "done" && r.mod === 0 && (
                  <div style={{ fontFamily: PX, fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>{r.label}</div>
                )}
              </div>
            );
          };

          if (r.advValues && r.advType) {
            const v1 = r.advValues[0];
            const v2 = r.advValues[1];
            let discardIndex = 0;
            if (r.advType === "adv") discardIndex = v1 < v2 ? 0 : 1;
            if (r.advType === "dis") discardIndex = v1 > v2 ? 0 : 1;
            
            return (
              <div key={r.id} style={{ display: "flex", gap: 10 }}>
                {renderDiceBlock(v1, discardIndex === 0, true)}
                {renderDiceBlock(v2, discardIndex === 1, true)}
              </div>
            );
          }

          return <div key={r.id}>{renderDiceBlock(r.value, false, false)}</div>;
        })}
      </div>
    </>
  );
}
