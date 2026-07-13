import { Heart, Shield, Zap, RotateCcw, BookOpen } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../constants/theme";
import { CLASS_CFG } from "../constants/classes";
import { useGameEngine } from "../useGameEngine";
import { HpBar } from "../components/ui/HpBar";
import { GoldBadge } from "../components/ui/GoldBadge";
import { AnimeDialog } from "../components/ui/AnimeDialog";
import { AuthScreen } from "../components/screens/AuthScreen";
import { CharSelectScreen } from "../components/screens/CharSelectScreen";
import { CharCreateScreen } from "../components/screens/CharCreateScreen";
import { WorldMapScreen } from "../components/screens/WorldMapScreen";
import { MapGrid } from "../components/game/MapGrid";
import { CombatPanel } from "../components/game/CombatPanel";
import { DiceRollOverlay } from "../components/game/DiceRollOverlay";
import { ShopModal } from "../components/modals/ShopModal";
import { QuestModal } from "../components/modals/QuestModal";
import { BottomHUD } from "../components/hud/BottomHUD";

export default function App() {
  const eng = useGameEngine();
  const {
    gs, session, screen, creatingChar, combat, fogRevealed, combatMode,
    effects, dyingMonsters, hitTokenIds, selectedSpell, diceRolls, battleStart,
    hudTab, hudOpen, chatTab, specialDialog, showShop, showQuests, notification,
    actionText, restAnim, zoom, shopPurchaseAnim, char,
    setHudTab, setHudOpen, setChatTab, setZoom, setCombatMode,
  } = eng;

  if (screen === "auth") return <AuthScreen onLogin={eng.handleLogin} />;
  if (screen === "charSelect") {
    if (creatingChar) return <CharCreateScreen onCreated={eng.handleCreateChar} onBack={() => eng.setCreatingChar(false)} />;
    return <CharSelectScreen session={session!} characters={gs.characters} onSelect={eng.handleSelectChar} onCreateNew={() => eng.setCreatingChar(true)} onLogout={eng.handleLogout} onDelete={eng.handleDeleteChar} />;
  }
  if (screen === "worldMap" && char) return <WorldMapScreen char={char} onEnterTown={eng.enterTown} onEnterDungeon={eng.enterDungeon} onExitToCharSelect={() => { eng.setActiveCharId(null); eng.setScreen("charSelect"); }} onLogout={eng.handleLogout} />;

  if ((screen === "town" || screen === "dungeon") && char) {
    const cfg = CLASS_CFG[char.class];
    const locationLabel = screen === "town" ? "🏰 MILLHAVEN" : "💀 DARKROOT DEPTHS";

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: NU, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: C.card, borderBottom: `2px solid ${C.border}`, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {screen === "dungeon" ? (
              gs.dungeonMonsters.every(m => m.hp <= 0) ? (
                <button onClick={() => { eng.setScreen("worldMap"); eng.updateChar(char.id, { position: { x: 10, y: 7 }, currentMap: "town" }); }} style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>← MAP</button>
              ) : (
                <span style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>DUNGEON ACTIVE</span>
              )
            ) : (
              <button onClick={() => eng.setScreen("worldMap")} style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>← MAP</button>
            )}
            <div style={{ fontFamily: PX, fontSize: 9, color: C.blue, letterSpacing: 1 }}>{locationLabel}</div>
            {screen === "town" && <span style={{ fontFamily: PX, fontSize: 7, padding: "2px 8px", background: C.green + "20", color: C.green, border: `1px solid ${C.green}40` }}>✅ SAFE ZONE</span>}
            {combat.active && <span style={{ fontFamily: PX, fontSize: 7, padding: "2px 8px", background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, animation: "pulse 1s infinite" }}>⚔️ COMBAT</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, overflow: "hidden", border: `2px solid ${cfg.color}`, flexShrink: 0 }}>
                {char.avatar ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: cfg.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{cfg.icon}</div>}
              </div>
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.name}</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: cfg.color }}>{cfg.icon} {char.class} Lv.{char.level}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Heart className="w-3 h-3" style={{ color: C.red }} />
              <div>
                <div style={{ fontFamily: MO, fontSize: 10, color: C.red }}>{char.hp}/{char.maxHp}</div>
                <div style={{ width: 60 }}><HpBar hp={char.hp} maxHp={char.maxHp} size="sm" /></div>
              </div>
            </div>
            {char.spellSlots && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Zap className="w-3 h-3" style={{ color: C.purple }} />
                <span style={{ fontFamily: MO, fontSize: 10, color: C.purple }}>{char.spellSlots.max - char.spellSlots.used}/{char.spellSlots.max}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shield className="w-3 h-3" style={{ color: C.blue }} />
              <span style={{ fontFamily: MO, fontSize: 10, color: C.blue }}>{char.ac}</span>
            </div>
            <GoldBadge amount={char.gold} />
          </div>
        </div>

        {/* Map area - Camera Follow Mode */}
        <div
          onWheel={(e) => {
            if (e.deltaY < 0) setZoom(z => Math.min(2.5, z + 0.1));
            else setZoom(z => Math.max(0.6, z - 0.1));
          }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", background: screen === "dungeon" ? "#040310" : "#080e04" }}>
          {(() => {
             const mapScale = zoom;
             const charX = char.position.x * 38 + 19;
             const charY = char.position.y * 38 + 19;
             const centerX = (20 * 38) / 2;
             const centerY = (15 * 38) / 2;
             const offsetX = centerX - charX;
             const offsetY = centerY - charY;
             return (
               <div style={{
                 transform: `scale(${mapScale}) translate(${offsetX}px, ${offsetY}px)`,
                 transformOrigin: "center",
                 transition: "transform 0.15s linear"
               }}>
                 <div style={{ position: "relative" }}>
                   <MapGrid mode={screen} char={char} monsters={gs.dungeonMonsters}
                     combat={combat} fogRevealed={fogRevealed} combatMode={combatMode}
                     selectedSpell={selectedSpell ?? undefined}
                     onTileClick={eng.handleTileClick} onMonsterClick={eng.handleMonsterClick}
                     onAOECast={eng.handleAOECastFromGrid}
                     effects={effects}
                     dyingMonsters={dyingMonsters}
                     hitTokenIds={hitTokenIds}
                     onHealSelf={eng.handleHealSelf} />
                 </div>
               </div>
             );
          })()}

              {/* Combat panel */}
              {combat.active && (
                <CombatPanel combat={combat} char={char} monsters={gs.dungeonMonsters}
                  combatMode={combatMode} setCombatMode={setCombatMode}
                  selectedSpell={selectedSpell ?? undefined}
                  onEndTurn={eng.endPlayerTurn} onSelectSpell={eng.handleSpellSelect}
                  onFlee={() => { eng.setCombat(eng.INIT_COMBAT); setCombatMode("none"); eng.setSelectedSpell(null); eng.notify("Fled from combat!"); }} />
              )}

              {/* Rest buttons */}
              {!combat.active && char.spellSlots && char.spellSlots.used > 0 && (
                <div style={{ position: "absolute", top: 4, left: 4, display: "flex", gap: 6, alignItems: "center" }}>
                  <style>{`@keyframes rest-pulse { 0%,100%{box-shadow:0 0 8px rgba(76,219,112,0.3)} 50%{box-shadow:0 0 16px rgba(76,219,112,0.7)} }`}</style>
                  <button onClick={() => {
                    eng.updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: Math.max(0, c.spellSlots!.used - 1) } }));
                    eng.notify("Short rest: 1 slot recovered.");
                    eng.setRestAnim("short");
                  }}
                    style={{
                      ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4,
                      animation: restAnim === "short" ? "rest-pulse 0.6s ease-out" : "none",
                      boxShadow: restAnim === "short" ? "0 0 12px rgba(76,219,112,0.6)" : undefined,
                    }}>
                    <RotateCcw className="w-2.5 h-2.5" />SHORT
                  </button>
                  <button onClick={() => {
                    eng.updateChar(char.id, c => ({ hp: c.maxHp, spellSlots: c.spellSlots ? { ...c.spellSlots, used: 0 } : undefined }));
                    eng.notify("Long rest: Full recovery!");
                    eng.setRestAnim("long");
                  }}
                    style={{
                      ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4,
                      animation: restAnim === "long" ? "rest-pulse 0.6s ease-out" : "none",
                      boxShadow: restAnim === "long" ? "0 0 12px rgba(76,219,112,0.6)" : undefined,
                    }}>
                    <BookOpen className="w-2.5 h-2.5" />LONG
                  </button>
                </div>
              )}

              {/* Engage First button */}
              {screen === "dungeon" && !combat.active && (() => {
                const nearbyM = gs.dungeonMonsters.filter(m => m.hp > 0 && Math.abs(char.position.x - m.position.x) + Math.abs(char.position.y - m.position.y) <= m.sightRange + 2);
                if (nearbyM.length === 0) return null;
                return (
                  <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
                    <style>{`
                      @keyframes engage-persona-in { 0%{transform:translateX(-120px) skewX(-12deg) scaleX(0.3);opacity:0} 50%{transform:translateX(8px) skewX(-4deg) scaleX(1.05);opacity:1} 70%{transform:translateX(-2px) skewX(-2deg) scaleX(1)} 100%{transform:translateX(0) skewX(0deg) scaleX(1);opacity:1} }
                      @keyframes engage-persona-pulse { 0%,100%{box-shadow:0 0 20px rgba(220,30,30,0.7),0 0 50px rgba(220,30,30,0.3)} 50%{box-shadow:0 0 35px rgba(255,60,60,0.9),0 0 80px rgba(220,30,30,0.5),inset 0 0 20px rgba(255,100,100,0.15)} }
                    `}</style>
                    <button onClick={() => eng.startCombat(nearbyM.map(m => m.id))}
                      style={{
                        background: "linear-gradient(105deg, #cc0000, #880000)",
                        border: "none", color: "#fff", fontFamily: PX, fontSize: 18,
                        padding: "12px 32px", letterSpacing: 4,
                        clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 100%, 16px 100%)",
                        cursor: "pointer",
                        animation: "engage-persona-in 0.5s cubic-bezier(0.2,0,0,1) forwards, engage-persona-pulse 1.5s 0.5s ease-in-out infinite",
                        textShadow: "2px 2px 0 rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10,
                      }}>
                      <span style={{ fontSize: 22 }}>⚔</span>ENGAGE!
                    </button>
                  </div>
                );
              })()}

              {/* Cancel targeting mode */}
              {combatMode !== "none" && !combat.active && (
                <div style={{ position: "absolute", top: 4, right: 4, zIndex: 25, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.blue, padding: "4px 8px", background: C.card + "ee", border: `1px solid ${C.blue}60`, boxShadow: `0 0 8px ${C.blue}40` }}>
                    {selectedSpell === "Small Bomb" ? "💣 SELECT BOMB TARGET" : "✨ SELECT SPELL TARGET"}
                  </div>
                  <button onClick={() => { setCombatMode("none"); eng.setSelectedSpell(null); eng.setPendingBombItemId(null); }} style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>✕ CANCEL</button>
                </div>
              )}

              {/* Tips */}
              {screen === "town" && !combat.active && (
                <div style={{ position: "absolute", bottom: 4, left: 4, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "4px 8px", fontFamily: NU, fontSize: 10, color: C.muted }}>
                  Click to move · 🏪 Shop · 📋 Quests · 🗺️ Exit
                </div>
              )}
              {screen === "dungeon" && !combat.active && (
                <div style={{ position: "absolute", bottom: 4, left: 4, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "4px 8px", fontFamily: NU, fontSize: 10, color: C.muted }}>
                  🚪 Reach north exit · Avoid monsters or fight!
                </div>
              )}
        </div>

        {/* HUD */}
        <BottomHUD char={char} hudTab={hudTab} setHudTab={setHudTab} hudOpen={hudOpen} setHudOpen={setHudOpen}
          chatTab={chatTab} setChatTab={setChatTab} globalChat={gs.globalChat} partyChat={gs.partyChat}
          onSendChat={eng.handleSendChat} onEquipItem={eng.handleEquipItem} onUnequipWeapon={eng.handleUnequipWeapon}
          onUnequipArmor={eng.handleUnequipArmor} onUnequipAcc={eng.handleUnequipAcc}
          onDropItem={eng.handleDropItem} onUseItem={eng.handleUseItem}
          party={gs.party} onCreateParty={eng.handleCreateParty} onLeaveParty={eng.handleLeaveParty} partyQuests={gs.partyQuests}
          onUseSkill={eng.handleUseSkillFromHUD}
          inCombat={combat.active} />

        {/* Modals */}
        {showShop && <ShopModal char={char} onBuy={eng.handleBuyItem} onClose={() => eng.setShowShop(false)} />}
        {showQuests && <QuestModal quests={gs.availableQuests} partyQuests={gs.partyQuests} party={gs.party} onAccept={eng.handleAcceptQuest} onClose={() => eng.setShowQuests(false)} nextRefresh={gs.questRefreshAt} onClaim={eng.handleQuestClaim} charInventory={char.inventory} />}

        {/* Special tile dialog */}
        {specialDialog && (
          <AnimeDialog
            icon={specialDialog.tile.icon}
            title={specialDialog.tile.label.toUpperCase()}
            message={specialDialog.tile.prompt}
            onYes={eng.handleSpecialYes}
            onNo={() => eng.setSpecialDialog(null)}
          />
        )}

        {/* Dice roll overlay */}
        <DiceRollOverlay rolls={diceRolls} />

        {/* Toast notification */}
        {notification && (
          <div style={{
            position: "fixed", bottom: 120, left: "50%", transform: "translateX(-50%)",
            zIndex: 9990, background: C.card, border: `2px solid ${C.blue}`,
            boxShadow: C.glowStrong, padding: "10px 20px",
            fontFamily: PX, fontSize: 8, color: C.text, letterSpacing: 0.5,
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            {notification}
          </div>
        )}

        {/* Action text overlay */}
        {actionText && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 9999, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <style>{`
              @keyframes action-text-pop {
                0% { transform: scale(3) rotate(-15deg); opacity: 0; }
                30% { transform: scale(0.9) rotate(5deg); opacity: 1; }
                50% { transform: scale(1.1) rotate(-2deg); }
                80% { transform: scale(1) rotate(0deg); opacity: 1; }
                100% { transform: scale(1.2) translateY(-20px); opacity: 0; }
              }
            `}</style>
            <div style={{
              fontFamily: PX, fontSize: 64, color: "#fff",
              textShadow: `4px 4px 0 rgba(0,0,0,0.8), 0 0 40px ${actionText.color}`,
              WebkitTextStroke: `2px ${actionText.color}`,
              animation: "action-text-pop 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards",
              letterSpacing: 4,
            }}>{actionText.text}</div>
          </div>
        )}

        {/* Shop purchase flash */}
        {shopPurchaseAnim && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9994, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <style>{`@keyframes shop-flash { 0%{opacity:0;transform:scale(0.5) translateY(20px)} 20%{opacity:1;transform:scale(1.1) translateY(0)} 70%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.9) translateY(-10px)} }`}</style>
            <div style={{
              fontFamily: PX, fontSize: 14, color: C.gold,
              textShadow: `0 0 20px ${C.gold}, 2px 2px 0 #000`,
              animation: "shop-flash 1.2s ease-out forwards",
              background: C.card, border: `2px solid ${C.gold}`,
              padding: "12px 24px", boxShadow: `0 0 30px ${C.gold}50`,
            }}>⭐ PURCHASED: {shopPurchaseAnim}</div>
          </div>
        )}

        {/* BATTLE START animation */}
        {battleStart && (
          <>
            <style>{`
              @keyframes epic-flash { 0%{background:rgba(255,255,255,0.85)} 15%{background:rgba(0,0,0,0.85)} 100%{background:rgba(0,0,0,0)} }
              @keyframes epic-shake { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-3px, 2px) scale(1.02)} 50%{transform:translate(3px, -2px) scale(0.98)} 75%{transform:translate(-2px, -1px) scale(1.01)} }
              @keyframes epic-fly-left { 0%{transform:translateX(-100vw) scale(1) skewX(20deg); opacity:0;} 15%{transform:translateX(10px) scale(1) skewX(0); opacity:1; text-shadow:0 0 100px red, 8px 8px 0 #000} 20%{transform:translateX(0) scale(1.1)} 85%{transform:translateX(0) scale(1); opacity:1;} 100%{transform:translateX(-100vw) scale(1) skewX(-20deg); opacity:0;} }
              @keyframes epic-fly-right { 0%{transform:translateX(100vw) scale(1) skewX(-20deg); opacity:0;} 15%{transform:translateX(-10px) scale(1) skewX(0); opacity:1; text-shadow:0 0 100px red, 8px 8px 0 #000} 20%{transform:translateX(0) scale(1.1)} 85%{transform:translateX(0) scale(1); opacity:1;} 100%{transform:translateX(100vw) scale(1) skewX(20deg); opacity:0;} }
            `}</style>
            <div style={{
              position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", animation: "epic-flash 1.8s ease-out forwards",
            }}>
              <div style={{ animation: "epic-shake 0.5s ease-in-out", display: "flex", gap: 16 }}>
                <div style={{
                  fontFamily: PX, fontSize: 64, color: "#fff", fontStyle: "italic", letterSpacing: 8,
                  textShadow: `0 0 50px ${C.red}, 0 0 80px #800000, 6px 6px 0 #000, -3px -3px 0 #000`,
                  animation: "epic-fly-left 1.8s cubic-bezier(0.1, 0, 0.2, 1) forwards", whiteSpace: "nowrap",
                }}>⚔ BATTLE</div>
                <div style={{
                  fontFamily: PX, fontSize: 64, color: "#fff", fontStyle: "italic", letterSpacing: 8,
                  textShadow: `0 0 50px ${C.red}, 0 0 80px #800000, 6px 6px 0 #000, -3px -3px 0 #000`,
                  animation: "epic-fly-right 1.8s cubic-bezier(0.1, 0, 0.2, 1) forwards", whiteSpace: "nowrap",
                }}>START! ⚔</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
