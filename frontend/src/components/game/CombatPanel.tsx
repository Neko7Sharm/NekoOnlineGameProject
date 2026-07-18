import { useState } from "react";
import { C, PX, MO, NU } from "../../constants/theme";
import { CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "../../constants/classes";
import { SKILL_DICTIONARY } from "../../constants/skills";
import { MOVE_SQUARES } from "../../constants/map";
import { getWeaponHitBonus, formatMod } from "../../utils/dice";
import type { CombatState, Character, Monster, CombatModeT } from "../../types/game";
export function CombatPanel({ combat, char, monsters, combatMode, setCombatMode, selectedSpell, onEndTurn, onSelectSpell, onUseItem, onFlee, onGuard }: {
  combat: CombatState; char: Character; monsters: Monster[];
  combatMode: CombatModeT; setCombatMode: (m: CombatModeT) => void;
  selectedSpell?: string;
  onEndTurn: () => void; onSelectSpell: (name: string | null) => void; onUseItem: (item: any) => void; onFlee: () => void; onGuard: () => void;
}) {
  const current = combat.turnOrder[combat.currentIndex];
  const isPlayer = current?.type === "player";
  const isMainActionExhausted = combat.actionUsed && !(combat.extraMainActions && combat.extraMainActions > 0);
  const hasSlots = char.spellSlots ? char.spellSlots.used < char.spellSlots.max : false;
  const moveLeft = MOVE_SQUARES - combat.movedSquares;
  const [showLog, setShowLog] = useState(true);
  const [actionTab, setActionTab] = useState<"none" | "attack" | "skill" | "item">("none");
  const [tooltip, setTooltip] = useState<{ name: string; desc: string } | null>(null);
  const [hoverHitMod, setHoverHitMod] = useState<{ x: number, y: number, weapon: any } | null>(null);

  const baseSpells = CLASS_SPELLS[char.class] ?? [];
  let spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
    ? baseSpells.map(s => s.name === "Sleep"
        ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
        : s)
    : baseSpells;

  // Append active GameSkills from the new system
  if (char.gameSkills) {
    const activeSkills = char.gameSkills
      .map(id => SKILL_DICTIONARY[id])
      .filter(s => s && s.type === "active")
      .map(s => {
        const used = char.skillUsages?.[s.id] || 0;
        return {
          name: s.id, // using ID as the identifier to cast
          desc: s.description,
          isBonus: s.cost === "extra",
          level: 0,
          type: s.healAmount ? "heal" : "damage", // Simplification
          displayName: s.name, // To show in UI
          icon: s.icon,
          maxUses: s.maxUses,
          used: used,
          recharge: s.recharge
        };
      }) as any[];
    spells = [...spells, ...activeSkills];
  }
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
        .cp-sub-scroll {
          max-height: 210px;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cp-sub-scroll::-webkit-scrollbar { width: 3px; }
        .cp-sub-scroll::-webkit-scrollbar-track { background: transparent; }
        .cp-sub-scroll::-webkit-scrollbar-thumb { background: rgba(180,138,255,0.3); border-radius: 2px; }
        .cp-sub-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,138,255,0.6); }
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
              {combat.log.slice(-12).reverse().map((l, i) => {
                const isCrit = l.includes("⭐");
                return (
                  <div key={i} style={{ 
                    fontFamily: "Nunito, sans-serif", 
                    fontSize: 10, 
                    color: isCrit ? "#ffd700" : (i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"), 
                    textShadow: isCrit ? "0 0 5px #ffaa00" : "none",
                    lineHeight: 1.5, 
                    marginBottom: 2 
                  }}>{l}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      {isPlayer && (
        <div style={{ position: "absolute", right: 0, top: 4, zIndex: 20, display: "flex", flexDirection: "column", gap: 3, width: 200, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>

          <div style={{ ...rightCard(0), padding: "8px 12px", background: "rgba(10,10,25,0.9)", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: (combat.actionUsed && !combat.extraMainActions) ? C.muted : C.blue, fontFamily: PX }}>MAIN ACTION</span>
              <span style={{ fontSize: 9, fontFamily: PX }}>
                {combat.actionUsed ? "❌" : "✅"}
                {combat.extraMainActions && combat.extraMainActions > 0 ? Array(combat.extraMainActions).fill(" ✅").join("") : ""}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: combat.extraActionUsed ? C.muted : C.gold, fontFamily: PX }}>EXTRA ACTION</span>
              <span style={{ fontSize: 9, fontFamily: PX }}>{combat.extraActionUsed ? "❌" : "✅"}</span>
            </div>
          </div>

          {/* MOVE */}
          <button className="cp-right-btn" onClick={() => { setCombatMode(combatMode === "move" ? "none" : "move"); setActionTab("none"); }}
            disabled={moveLeft === 0}
            style={{
              ...rightCard(10),
              border: "none", padding: "10px 14px 10px 20px", textAlign: "right",
              background: combatMode === "move"
                ? `linear-gradient(260deg, ${C.blue}cc, ${C.blue}55)`
                : "linear-gradient(260deg, rgba(20,30,60,0.95), rgba(10,15,35,0.95))",
              color: moveLeft === 0 ? "rgba(255,255,255,0.2)" : combatMode === "move" ? "#fff" : "rgba(255,255,255,0.8)",
              fontFamily: PX, fontSize: 9, letterSpacing: 2,
              boxShadow: combatMode === "move" ? `0 0 14px ${C.blue}60` : "none",
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
              marginTop: 4
            }}>
            <span style={{ fontSize: 7, opacity: 0.65 }}>{moveLeft} tiles</span>
            MOVE ▶
          </button>

          {/* ACTION TABS */}
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

          {/* ATTACK sub-panel */}
          {actionTab === "attack" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <style>{`
                @keyframes atk-select-glow {
                  0%,100% { box-shadow: 0 0 12px ${C.red}60, inset 0 0 8px ${C.red}10; }
                  50%      { box-shadow: 0 0 22px ${C.red}aa, inset 0 0 12px ${C.red}20; }
                }
                .atk-weapon-card {
                  position: relative; cursor: pointer;
                  transition: filter 0.14s, transform 0.14s;
                  border: none; padding: 0; background: none; width: 100%; text-align: left;
                }
                .atk-weapon-card:not(:disabled):hover { filter: brightness(1.18); transform: translateX(-3px); }
                .atk-weapon-card:not(:disabled):active { transform: translateX(-1px) scale(0.98); }
                .atk-weapon-card:disabled { cursor: not-allowed; }
              `}</style>

              {/* ── MAIN HAND ─────────────────── */}
              {char.equipment.mainHand && (() => {
                const mh = char.equipment.mainHand!;
                const hitInfo = getWeaponHitBonus(char, mh);
                const isActive = combatMode === "attack";
                const isDisabled = isMainActionExhausted;
                return (
                  <button className="atk-weapon-card cp-right-btn"
                    onClick={() => !isDisabled && setCombatMode(isActive ? "none" : "attack")}
                    disabled={isDisabled}
                    onMouseEnter={(e) => setHoverHitMod({ x: e.clientX, y: e.clientY, weapon: mh })}
                    onMouseMove={(e) => setHoverHitMod({ x: e.clientX, y: e.clientY, weapon: mh })}
                    onMouseLeave={() => setHoverHitMod(null)}
                  >
                    <div style={{
                      ...rightCard(220),
                      padding: "7px 16px 7px 18px",
                      background: isActive
                        ? `linear-gradient(260deg, ${C.red}cc, rgba(80,10,10,0.95))`
                        : isDisabled
                          ? "linear-gradient(260deg, rgba(35,10,10,0.6), rgba(18,5,5,0.6))"
                          : "linear-gradient(260deg, rgba(70,16,16,0.92), rgba(30,6,6,0.92))",
                      animation: isActive ? "cp-from-right 0.35s cubic-bezier(0.2,0,0,1) 220ms both, atk-select-glow 1.6s ease-in-out infinite" : undefined,
                      opacity: isDisabled ? 0.45 : 1,
                    }}>
                      {/* Single compact row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", overflow: "visible" }}>
                        <span style={{
                          fontFamily: "Press Start 2P, monospace", fontSize: 5,
                          color: isActive ? "#fff" : "#ff8a80",
                          background: isActive ? `${C.red}50` : "rgba(255,80,80,0.12)",
                          border: `1px solid ${isActive ? C.red : "rgba(255,80,80,0.3)"}`,
                          padding: "1px 4px", flexShrink: 0,
                        }}>MAIN</span>
                        {isDisabled && <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)" }}>USED</span>}
                        {isActive && <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: C.red }}>▶ TARGET</span>}
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isDisabled ? "rgba(180,138,255,0.3)" : C.blue, flexShrink: 0 }}>{formatMod(hitInfo.total)}</span>
                        <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>HIT</span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, flexShrink: 0 }}>│</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isDisabled ? "rgba(240,112,112,0.3)" : C.red, flexShrink: 0 }}>{mh.damage ?? "—"}</span>
                        <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>DMG</span>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, flexShrink: 0 }}>│</span>
                        <span style={{
                          fontFamily: "Press Start 2P, monospace", fontSize: 8,
                          color: isDisabled ? "rgba(255,255,255,0.2)" : isActive ? "#fff" : "rgba(255,200,200,0.9)",
                          textDecoration: isDisabled ? "line-through" : "none",
                          flexShrink: 0, whiteSpace: "nowrap",
                        }}>⚔ {mh.name}</span>
                      </div>
                    </div>
                  </button>
                );
              })()}

              {/* ── OFF HAND ──────────────────── */}
              {char.equipment.offHand && char.equipment.offHand.type === "weapon" && (() => {
                const oh = char.equipment.offHand!;
                const isGuard = oh.effect === "guard";
                const isActive = combatMode === "attack_offhand";
                const isDisabled = combat.extraActionUsed;
                const hitInfo = !isGuard ? getWeaponHitBonus(char, oh) : null;
                return (
                  <button className="atk-weapon-card cp-right-btn"
                    onClick={() => {
                      if (!isDisabled) {
                        isGuard ? onGuard() : setCombatMode(isActive ? "none" : "attack_offhand");
                      }
                    }}
                    disabled={isDisabled}
                    onMouseEnter={(e) => !isGuard && setHoverHitMod({ x: e.clientX, y: e.clientY, weapon: oh })}
                    onMouseMove={(e) => !isGuard && setHoverHitMod({ x: e.clientX, y: e.clientY, weapon: oh })}
                    onMouseLeave={() => setHoverHitMod(null)}
                  >
                    <div style={{
                      ...rightCard(265),
                      padding: "7px 16px 7px 18px",
                      background: isActive
                        ? `linear-gradient(260deg, ${C.gold}aa, rgba(80,50,5,0.95))`
                        : isGuard
                          ? "linear-gradient(260deg, rgba(20,50,80,0.92), rgba(8,20,40,0.92))"
                          : isDisabled
                            ? "linear-gradient(260deg, rgba(30,25,5,0.55), rgba(15,12,3,0.55))"
                            : "linear-gradient(260deg, rgba(60,44,8,0.9), rgba(28,20,4,0.9))",
                      opacity: isDisabled ? 0.45 : 1,
                    }}>
                      {/* Single compact row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <span style={{
                          fontFamily: "Press Start 2P, monospace", fontSize: 5,
                          color: isDisabled ? "rgba(255,255,255,0.25)" : C.gold,
                          background: `${C.gold}18`, border: `1px solid ${C.gold}40`,
                          padding: "1px 4px", flexShrink: 0,
                        }}>EXTRA</span>
                        {isDisabled && <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)" }}>USED</span>}
                        {isActive && <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: C.gold }}>▶ TARGET</span>}
                        {isGuard ? (
                          <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 10, color: "rgba(100,160,255,0.7)" }}>🛡 {oh.name} · Block</span>
                        ) : (
                          <>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isDisabled ? "rgba(180,138,255,0.3)" : C.blue }}>{formatMod(hitInfo!.total)}</span>
                            <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)" }}>HIT</span>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8 }}>│</span>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isDisabled ? "rgba(240,200,80,0.3)" : C.gold }}>{oh.damage ?? "—"}</span>
                            <span style={{ fontFamily: "Press Start 2P, monospace", fontSize: 5, color: "rgba(255,255,255,0.25)" }}>DMG</span>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8 }}>│</span>
                            <span style={{
                              fontFamily: "Press Start 2P, monospace", fontSize: 8,
                              color: isDisabled ? "rgba(255,255,255,0.2)" : "rgba(255,230,160,0.9)",
                              textDecoration: isDisabled ? "line-through" : "none", flexShrink: 0,
                            }}>🗡 {oh.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })()}

              {!char.equipment.mainHand && (
                <div style={{ ...rightCard(220), padding: "14px 16px", background: "rgba(30,10,10,0.7)", textAlign: "right" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>No weapon equipped</span>
                </div>
              )}
            </div>
          )}


          {/* SKILL sub-panel */}
          {actionTab === "skill" && (
            <div style={{ position: "relative" }}>
              <div className="cp-sub-scroll">
              {spells.filter(s => s.level === 0 || hasSlots || s.maxUses).map((spell, si) => {
                const isActive = combatMode === "spell" && selectedSpell === spell.name;
                const isExtra = !!spell.isBonus;
                const outOfUses = spell.maxUses !== undefined && spell.used >= spell.maxUses;
                const isDisabled = (isExtra ? combat.extraActionUsed : isMainActionExhausted) || outOfUses;
                return (
                  <button key={spell.name} className="cp-right-btn"
                    onClick={() => !isDisabled && onSelectSpell(isActive ? null : spell.name)}
                    disabled={isDisabled}
                    onMouseEnter={() => setTooltip({ name: spell.displayName || spell.name, desc: spell.desc ?? "" })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      ...rightCard(220 + si * 40),
                      border: "none", padding: "9px 14px 9px 20px", width: "100%",
                      background: isActive
                        ? "linear-gradient(260deg, #6a22cc, #3a0a80)"
                        : "linear-gradient(260deg, rgba(40,14,70,0.95), rgba(20,8,40,0.95))",
                      color: isDisabled ? "rgba(255,255,255,0.2)" : isActive ? "#fff" : "rgba(255,255,255,0.75)",
                      fontFamily: PX, fontSize: 9, letterSpacing: 1,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
                      boxShadow: isActive ? "0 0 14px #7c3aed80" : "none",
                      marginBottom: 3, textAlign: "right",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1
                    }}>
                    {isExtra ? <span style={{ fontFamily: PX, fontSize: 6, color: C.gold, marginRight: "auto" }}>[EXTRA]</span> : null}
                    {spell.maxUses !== undefined ? (
                      <span style={{ fontFamily: MO, fontSize: 7, color: outOfUses ? C.red : "#c97fff88" }}>
                        {spell.maxUses - (spell.used || 0)}/{spell.maxUses}
                      </span>
                    ) : spell.level > 0 ? (
                      <span style={{ fontFamily: MO, fontSize: 7, color: "#c97fff88" }}>SLOT</span>
                    ) : (
                      <span style={{ fontFamily: MO, fontSize: 7, color: "rgba(255,255,255,0.3)" }}>∞</span>
                    )}
                    {spell.icon ? spell.icon : "✨"} {spell.displayName || spell.name}
                  </button>
                );
              })}
              </div>
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
          {actionTab === "item" && (
            usableItems.length === 0 ? (
              <div style={{ ...rightCard(220), padding: "8px 14px", background: "rgba(12,10,28,0.88)", textAlign: "right" }}>
                <span style={{ fontFamily: MO, fontSize: 10, color: "rgba(255,255,255,0.28)" }}>No items</span>
              </div>
            ) : (
              <div className="cp-sub-scroll">
                {usableItems.map((item, ii) => {
                  const isBomb = item.effect === "aoe_bomb";
                  const isExtra = !isBomb;
                  const isDisabled = isExtra ? combat.extraActionUsed : isMainActionExhausted;
                  return (
                    <button key={item.id} className="cp-right-btn"
                      onClick={() => !isDisabled && onUseItem(item)}
                      disabled={isDisabled}
                      style={{
                        ...rightCard(220 + Math.min(ii, 3) * 30),
                        border: "none", padding: "7px 12px 7px 18px", width: "100%", textAlign: "right",
                        background: "linear-gradient(260deg, rgba(20,70,20,0.95), rgba(10,35,10,0.95))",
                        color: isDisabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.85)",
                        fontFamily: PX, fontSize: 8, letterSpacing: 1,
                        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.5 : 1,
                        flexShrink: 0,
                      }}>
                      {isExtra ? <span style={{ fontFamily: PX, fontSize: 5, color: C.gold, marginRight: "auto" }}>[E]</span> : null}
                      <span style={{ fontFamily: MO, fontSize: 7, color: C.muted }}>x1</span>
                      {item.name} 💊
                    </button>
                  );
                })}
              </div>
            )
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

      {hoverHitMod && (
        <div style={{
          position: "fixed", top: hoverHitMod.y - 70, left: hoverHitMod.x - 215, zIndex: 99999, pointerEvents: "none",
          background: "rgba(20, 10, 10, 0.95)", border: `1px solid ${C.red}50`,
          padding: "8px 12px", borderRadius: 4, width: 200,
          display: "flex", flexDirection: "column", gap: 4, textAlign: "left",
          boxShadow: "0 4px 12px rgba(0,0,0,0.8)"
        }}>
          {(() => {
            const hitInfo = getWeaponHitBonus(char, hoverHitMod.weapon);
            return (
              <>
                <div style={{ fontFamily: PX, fontSize: 9, color: C.gold, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 2 }}>
                  ATTACK ROLL BONUS
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 11, color: C.text }}>
                  <span>Base ({hitInfo.statName})</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.statMod)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 11, color: C.text }}>
                  <span>Proficiency</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.prof)}</span>
                </div>
                {hitInfo.weaponBonus > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 11, color: C.text }}>
                    <span>Weapon Bonus</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.weaponBonus)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 11, color: C.gold, marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${C.border}` }}>
                  <span>Total Hit Roll</span>
                  <span style={{ fontFamily: MO }}>{formatMod(hitInfo.total)}</span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
