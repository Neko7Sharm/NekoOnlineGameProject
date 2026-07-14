import { useState } from "react";
import { C, PX, MO } from "../../constants/theme";
import { CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "../../constants/classes";
import { MOVE_SQUARES } from "../../constants/map";
import type { CombatState, Character, Monster, CombatModeT } from "../../types/game";

export function CombatPanel({ combat, char, monsters, combatMode, setCombatMode, selectedSpell, onEndTurn, onSelectSpell, onFlee }: {
  combat: CombatState; char: Character; monsters: Monster[];
  combatMode: CombatModeT; setCombatMode: (m: CombatModeT) => void;
  selectedSpell?: string;
  onEndTurn: () => void; onSelectSpell: (name: string | null) => void; onFlee: () => void;
}) {
  const current = combat.turnOrder[combat.currentIndex];
  const isPlayer = current?.type === "player";
  const hasSlots = char.spellSlots ? char.spellSlots.used < char.spellSlots.max : false;
  const moveLeft = MOVE_SQUARES - combat.movedSquares;
  const [showLog, setShowLog] = useState(true);
  const [actionTab, setActionTab] = useState<"none" | "attack" | "skill" | "item">("none");
  const [tooltip, setTooltip] = useState<{ name: string; desc: string } | null>(null);

  const baseSpells = CLASS_SPELLS[char.class] ?? [];
  const spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
    ? baseSpells.map(s => s.name === "Sleep"
        ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
        : s)
    : baseSpells;
  const usableItems = char.inventory.filter(i => i.type === "consumable" && !i.material);

  function handleActionTab(tab: typeof actionTab) {
    setActionTab(prev => prev === tab ? "none" : tab);
    if (tab !== "skill") onSelectSpell(null);
    if (tab !== "attack") setCombatMode("none");
  }

  const classColor = CLASS_CFG[char.class]?.color ?? C.blue;
  const turnColor = isPlayer ? classColor : C.red;

  const leftCard = (delay: number, extra?: React.CSSProperties): React.CSSProperties => ({
    position: "relative",
    clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%)",
    animation: `cp-from-left 0.35s cubic-bezier(0.2,0,0,1) ${delay}ms both`,
    ...extra,
  });

  const rightCard = (delay: number, extra?: React.CSSProperties): React.CSSProperties => ({
    position: "relative",
    clipPath: "polygon(10px 0, 100% 0, 100% 100%, 0 100%)",
    animation: `cp-from-right 0.35s cubic-bezier(0.2,0,0,1) ${delay}ms both`,
    ...extra,
  });

  return (
    <>
      <style>{`
        @keyframes cp-from-left {
          0% { transform: translateX(-70px) skewX(-6deg); opacity: 0; }
          65% { transform: translateX(5px) skewX(-1deg); opacity: 1; }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
        @keyframes cp-from-right {
          0% { transform: translateX(70px) skewX(6deg); opacity: 0; }
          65% { transform: translateX(-5px) skewX(1deg); opacity: 1; }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
        @keyframes cp-turn-pulse {
          0%,100% { box-shadow: 0 0 10px ${turnColor}50; }
          50% { box-shadow: 0 0 24px ${turnColor}aa, inset 0 0 12px ${turnColor}22; }
        }
        .cp-left-btn { transition: transform 0.12s, filter 0.12s; cursor: pointer; }
        .cp-left-btn:hover { transform: translateX(5px); filter: brightness(1.25); }
        .cp-left-btn:active { transform: translateX(2px); }
        .cp-right-btn { transition: transform 0.12s, filter 0.12s; cursor: pointer; }
        .cp-right-btn:hover { transform: translateX(-5px); filter: brightness(1.25); }
        .cp-right-btn:active { transform: translateX(-2px); }
      `}</style>

      {/* ══ LEFT PANEL ══ */}
      <div style={{ position: "absolute", left: 4, top: 4, zIndex: 20, display: "flex", flexDirection: "column", gap: 3, width: 180, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>

        <div style={{
          ...leftCard(0),
          background: `linear-gradient(100deg, ${turnColor}dd, ${turnColor}66)`,
          padding: "9px 16px 9px 12px",
          animation: `cp-from-left 0.35s cubic-bezier(0.2,0,0,1) 0ms both, cp-turn-pulse 2s 0.4s ease-in-out infinite`,
        }}>
          <div style={{ fontFamily: PX, fontSize: 12, color: "#fff", letterSpacing: 3, textShadow: "2px 2px 0 rgba(0,0,0,0.6)" }}>
            {isPlayer ? "YOUR TURN" : "ENEMY"}
          </div>
          <div style={{ fontFamily: PX, fontSize: 7, color: "rgba(255,255,255,0.7)", letterSpacing: 2, marginTop: 2 }}>
            ROUND {combat.round}
          </div>
        </div>

        {combat.turnOrder.map((t, i) => {
          const dead = t.type === "monster" && monsters.find(m => m.id === t.id)?.hp === 0;
          if (dead) return null;
          const act = i === combat.currentIndex;
          const col = t.type === "player" ? classColor : C.red;
          return (
            <div key={t.id + i} style={{
              ...leftCard(60 + i * 35),
              background: act ? `${col}28` : "rgba(8,6,20,0.82)",
              borderRight: `3px solid ${act ? col : col + "35"}`,
              padding: "5px 14px 5px 10px",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <div style={{ width: 6, height: 6, background: act ? col : col + "55", flexShrink: 0, clipPath: "polygon(0 50%,50% 0,100% 50%,50% 100%)" }} />
              <span style={{ fontFamily: PX, fontSize: act ? 8 : 7, color: act ? "#fff" : "rgba(255,255,255,0.4)", letterSpacing: 1, flex: 1 }}>
                {t.name.slice(0, 12)}
              </span>
              <span style={{ fontFamily: MO, fontSize: 8, color: act ? col : "rgba(255,255,255,0.25)" }}>{t.initiative}</span>
            </div>
          );
        })}

        <div style={{ marginTop: 4 }}>
          <button className="cp-left-btn" onClick={() => setShowLog(p => !p)} style={{
            ...leftCard(200),
            border: "none", padding: "5px 16px 5px 10px", width: "100%", textAlign: "left",
            background: "rgba(10,8,22,0.8)",
            color: "rgba(255,255,255,0.35)", fontFamily: PX, fontSize: 7, letterSpacing: 1,
          }}>
            {showLog ? "▲ HIDE LOG" : "▼ COMBAT LOG"}
          </button>
          {showLog && (
            <div style={{
              ...leftCard(220),
              padding: "8px 12px", background: "rgba(5,4,14,0.92)", maxHeight: 140, overflowY: "auto",
            }}>
              {combat.log.slice(-12).reverse().map((l, i) => (
                <div key={i} style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: 2 }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      {isPlayer && (
        <div style={{ position: "absolute", right: 4, top: 4, zIndex: 20, display: "flex", flexDirection: "column", gap: 3, width: 190, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>

          {/* MOVE */}
          <button className="cp-right-btn" onClick={() => { setCombatMode(combatMode === "move" ? "none" : "move"); setActionTab("none"); }}
            disabled={moveLeft === 0}
            style={{
              ...rightCard(0),
              border: "none", padding: "10px 14px 10px 20px", textAlign: "right",
              background: combatMode === "move"
                ? `linear-gradient(260deg, ${C.blue}cc, ${C.blue}55)`
                : "linear-gradient(260deg, rgba(20,30,60,0.95), rgba(10,15,35,0.95))",
              color: moveLeft === 0 ? "rgba(255,255,255,0.2)" : combatMode === "move" ? "#fff" : "rgba(255,255,255,0.8)",
              fontFamily: PX, fontSize: 9, letterSpacing: 2,
              boxShadow: combatMode === "move" ? `0 0 14px ${C.blue}60` : "none",
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
            }}>
            <span style={{ fontSize: 7, opacity: 0.65 }}>{moveLeft * 5}ft</span>
            MOVE ▶
          </button>

          {/* ACTION TABS */}
          {!combat.actionUsed ? (
            <>
              {[
                { id: "attack" as const, icon: "⚔", label: "ATTACK", col: C.red },
                { id: "skill" as const, icon: "✨", label: "SKILL", col: "#c97fff" },
                { id: "item" as const, icon: "💊", label: "ITEM", col: "#4cdb70" },
              ].map((btn, bi) => (
                <button key={btn.id} className="cp-right-btn"
                  onClick={() => handleActionTab(btn.id)}
                  style={{
                    ...rightCard(60 + bi * 50),
                    border: "none", padding: "10px 14px 10px 20px", textAlign: "right",
                    background: actionTab === btn.id
                      ? `linear-gradient(260deg, ${btn.col}cc, ${btn.col}44)`
                      : "linear-gradient(260deg, rgba(20,14,40,0.95), rgba(10,8,24,0.95))",
                    color: actionTab === btn.id ? "#fff" : "rgba(255,255,255,0.7)",
                    fontFamily: PX, fontSize: 9, letterSpacing: 2,
                    boxShadow: actionTab === btn.id ? `0 0 14px ${btn.col}50` : "none",
                    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
                  }}>
                  {btn.label}
                  <span style={{ fontSize: 15 }}>{btn.icon}</span>
                </button>
              ))}
            </>
          ) : (
            <div style={{ ...rightCard(60), padding: "9px 14px 9px 20px", background: "rgba(12,10,28,0.88)", textAlign: "right" }}>
              <span style={{ fontFamily: PX, fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: 2 }}>ACTION USED</span>
            </div>
          )}

          {/* ATTACK sub-panel */}
          {!combat.actionUsed && actionTab === "attack" && char.equipment.weapon && (
            <div style={{ ...rightCard(220), padding: "9px 14px 9px 20px", background: "linear-gradient(260deg, rgba(60,10,10,0.95), rgba(30,5,5,0.95))" }}>
              <button className="cp-right-btn"
                onClick={() => setCombatMode(combatMode === "attack" ? "none" : "attack")}
                style={{
                  background: "none", border: "none", width: "100%", padding: 0, cursor: "pointer",
                  color: combatMode === "attack" ? C.red : "rgba(255,255,255,0.85)",
                  fontFamily: PX, fontSize: 9, letterSpacing: 1,
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, textAlign: "right",
                }}>
                <span style={{ fontFamily: MO, fontSize: 9, color: C.red + "99" }}>{char.equipment.weapon.damage}</span>
                ⚔ {char.equipment.weapon.name.slice(0, 14)}
              </button>
            </div>
          )}

          {/* SKILL sub-panel */}
          {!combat.actionUsed && actionTab === "skill" && (
            <div style={{ position: "relative" }}>
              {spells.filter(s => s.level === 0 || hasSlots).map((spell, si) => {
                const isActive = combatMode === "spell" && selectedSpell === spell.name;
                return (
                  <button key={spell.name} className="cp-right-btn"
                    onClick={() => onSelectSpell(isActive ? null : spell.name)}
                    onMouseEnter={() => setTooltip({ name: spell.name, desc: spell.desc ?? "" })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      ...rightCard(220 + si * 40),
                      border: "none", padding: "9px 14px 9px 20px", width: "100%",
                      background: isActive
                        ? "linear-gradient(260deg, #6a22cc, #3a0a80)"
                        : "linear-gradient(260deg, rgba(40,14,70,0.95), rgba(20,8,40,0.95))",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                      fontFamily: PX, fontSize: 9, letterSpacing: 1,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
                      boxShadow: isActive ? "0 0 14px #7c3aed80" : "none",
                      marginBottom: 3, textAlign: "right",
                    }}>
                    {spell.level > 0 && <span style={{ fontFamily: MO, fontSize: 7, color: "#c97fff88" }}>SLOT</span>}
                    {spell.level === 0 && <span style={{ fontFamily: MO, fontSize: 7, color: "rgba(255,255,255,0.3)" }}>∞</span>}
                    {spell.name} ✨
                  </button>
                );
              })}
              {!hasSlots && <div style={{ fontFamily: MO, fontSize: 9, color: "rgba(255,80,80,0.7)", padding: "4px 14px", textAlign: "right" }}>No slots left</div>}
              {tooltip && (
                <div style={{
                  position: "absolute", right: "calc(100% + 8px)", top: 0,
                  background: "rgba(12,8,28,0.97)", border: `2px solid #7c3aed`,
                  boxShadow: "0 0 20px #7c3aed50", padding: "10px 14px",
                  width: 200, zIndex: 100, pointerEvents: "none",
                  clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%)",
                }}>
                  <div style={{ fontFamily: PX, fontSize: 9, color: "#c97fff", marginBottom: 5 }}>{tooltip.name}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{tooltip.desc}</div>
                </div>
              )}
            </div>
          )}

          {/* ITEM sub-panel */}
          {!combat.actionUsed && actionTab === "item" && (
            usableItems.length === 0 ? (
              <div style={{ ...rightCard(220), padding: "9px 14px", background: "rgba(12,10,28,0.88)", textAlign: "right" }}>
                <span style={{ fontFamily: MO, fontSize: 10, color: "rgba(255,255,255,0.28)" }}>No items</span>
              </div>
            ) : usableItems.map((item, ii) => (
              <button key={item.id} className="cp-right-btn"
                style={{
                  ...rightCard(220 + ii * 40),
                  border: "none", padding: "9px 14px 9px 20px", width: "100%", textAlign: "right",
                  background: "linear-gradient(260deg, rgba(15,40,20,0.95), rgba(8,20,12,0.95))",
                  color: "rgba(255,255,255,0.8)", fontFamily: PX, fontSize: 9, letterSpacing: 1,
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 3,
                }}>
                <span style={{ fontFamily: MO, fontSize: 9, color: "#4cdb7088" }}>USE</span>
                {item.name.slice(0, 16)} 💊
              </button>
            ))
          )}

          {/* END TURN */}
          <div style={{ height: 4 }} />
          <button className="cp-right-btn" onClick={onEndTurn}
            style={{
              ...rightCard(260),
              border: "none", padding: "12px 16px 12px 24px", textAlign: "right",
              background: `linear-gradient(260deg, ${classColor}ee, ${classColor}66)`,
              color: "#fff", fontFamily: PX, fontSize: 11, letterSpacing: 3,
              boxShadow: `0 0 22px ${classColor}55`,
            }}>
            END TURN ✓
          </button>

          {/* FLEE */}
          <button className="cp-right-btn" onClick={onFlee}
            style={{
              ...rightCard(300),
              border: "none", padding: "7px 14px 7px 20px", textAlign: "right",
              background: "linear-gradient(260deg, rgba(80,10,10,0.75), rgba(40,5,5,0.75))",
              color: "rgba(255,80,80,0.8)", fontFamily: PX, fontSize: 8, letterSpacing: 2,
            }}>
            FLEE ✗
          </button>
        </div>
      )}

      {/* Enemy turn: indicator on right */}
      {!isPlayer && (
        <div style={{ position: "absolute", right: 4, top: 4, zIndex: 20, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>
          <div style={{
            ...rightCard(0),
            padding: "10px 14px 10px 20px", background: "linear-gradient(260deg, rgba(80,10,10,0.8), rgba(40,5,5,0.8))",
          }}>
            <div style={{ fontFamily: PX, fontSize: 8, color: "rgba(255,100,100,0.7)", letterSpacing: 2, textAlign: "right" }}>ENEMY</div>
            <div style={{ fontFamily: PX, fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textAlign: "right" }}>THINKING...</div>
          </div>
        </div>
      )}
    </>
  );
}
