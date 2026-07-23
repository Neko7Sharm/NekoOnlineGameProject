import { useState, useEffect } from "react";
import { Heart, Shield, Zap, RotateCcw, BookOpen, Volume2, VolumeX } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../constants/theme";
import { CLASS_CFG } from "../constants/classes";
import { getMapCols, getMapRows, CELL } from "../constants/map";
import { LONG_REST_COST } from "../constants/levels";
import { useGameEngine } from "../useGameEngine";
import { audioManager } from "../utils/audioManager";
import { HpBar } from "../components/ui/HpBar";
import { GoldBadge } from "../components/ui/GoldBadge";
import { AnimeDialog } from "../components/ui/AnimeDialog";
import { CheckModal } from "../components/game/CheckModal";
import { AuthScreen } from "../components/screens/AuthScreen";
import { TitleSplashScreen } from "../components/screens/TitleSplashScreen";
import { CharSelectScreen } from "../components/screens/CharSelectScreen";
import { CharCreateScreen } from "../components/screens/CharCreateScreen";
import { WorldMapScreen } from "../components/screens/WorldMapScreen";
import { MapGrid } from "../components/game/MapGrid";
import { CombatPanel } from "../components/game/CombatPanel";
import { DiceRollOverlay } from "../components/game/DiceRollOverlay";
import { ShopModal } from "../components/modals/ShopModal";
import { InnModal } from "../components/modals/InnModal";
import { StatueModal } from "../components/modals/StatueModal";
import { QuestModal } from "../components/modals/QuestModal";
import { SeleniaDialog, SeleniaPopup } from "../components/modals/SeleniaDialog";
import { AlchemyModal } from "../components/modals/AlchemyModal";
import { BottomHUD } from "../components/hud/BottomHUD";

const GlobalBgmButton = () => {
  const [showSlider, setShowSlider] = useState(false);
  const [masterVol, setMasterVol] = useState(audioManager.getMasterVolume());
  const [bgmVol, setBgmVol] = useState(audioManager.getBgmVolume());
  const [sfxVol, setSfxVol] = useState(audioManager.getSfxVolume());
  const [isMuted, setIsMuted] = useState(audioManager.getIsMuted());

  useEffect(() => {
    return audioManager.subscribe(() => {
      setMasterVol(audioManager.getMasterVolume());
      setBgmVol(audioManager.getBgmVolume());
      setSfxVol(audioManager.getSfxVolume());
      setIsMuted(audioManager.getIsMuted());
    });
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 110,
        right: 14,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {/* Audio Mixer Popup Panel (Expands when speaker button is clicked) */}
      {showSlider && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "14px 18px",
            borderRadius: 16,
            background: "rgba(12, 8, 25, 0.94)",
            backdropFilter: "blur(16px)",
            border: `1.5px solid rgba(196, 146, 214, 0.6)`,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(196, 146, 214, 0.3)",
            animation: "audio-panel-expand 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            minWidth: 230,
          }}
        >
          <style>{`
            @keyframes audio-panel-expand {
              0% { opacity: 0; transform: translateY(-10px) scale(0.92); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(196, 146, 214, 0.2)", paddingBottom: 8 }}>
            <div style={{ fontFamily: PX, fontSize: 10, color: C.gold, letterSpacing: 1 }}>🎚️ AUDIO MIXER</div>
            <button
              onClick={() => audioManager.toggleMute()}
              style={{
                background: isMuted ? "rgba(220, 38, 38, 0.8)" : "rgba(196, 146, 214, 0.2)",
                border: `1px solid ${isMuted ? "#ef4444" : "rgba(196, 146, 214, 0.5)"}`,
                color: isMuted ? "#fff" : C.gold,
                borderRadius: 6,
                padding: "2px 8px",
                fontFamily: PX,
                fontSize: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              {isMuted ? "MUTED" : "MUTE"}
            </button>
          </div>

          {/* 1. MASTER SOUND */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: isMuted ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: PX, fontSize: 8, color: C.text }}>🔊 MASTER SOUND</span>
              <span style={{ fontFamily: MO, fontSize: 9, color: C.gold }}>{isMuted ? "MUTED" : `${Math.round(masterVol * 100)}%`}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.02"
              value={masterVol}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                audioManager.setMasterVolume(val);
              }}
              style={{ width: "100%", height: 5, accentColor: C.gold, cursor: "pointer" }}
            />
          </div>

          {/* 2. BGM MUSIC */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: isMuted ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: PX, fontSize: 8, color: C.text }}>🎶 BGM (MUSIC)</span>
              <span style={{ fontFamily: MO, fontSize: 9, color: "#c492d6" }}>{isMuted ? "MUTED" : `${Math.round(bgmVol * 100)}%`}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.02"
              value={bgmVol}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                audioManager.setBgmVolume(val);
              }}
              style={{ width: "100%", height: 5, accentColor: "#c492d6", cursor: "pointer" }}
            />
          </div>

          {/* 3. SFX EFFECTS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: isMuted ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: PX, fontSize: 8, color: C.text }}>⚔️ SFX (EFFECTS)</span>
              <span style={{ fontFamily: MO, fontSize: 9, color: C.blue }}>{isMuted ? "MUTED" : `${Math.round(sfxVol * 100)}%`}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.02"
              value={sfxVol}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                audioManager.setSfxVolume(val);
              }}
              style={{ width: "100%", height: 5, accentColor: C.blue, cursor: "pointer" }}
            />
          </div>
        </div>
      )}

      {/* Primary Round Speaker Button (Click to toggle Audio Mixer Panel) */}
      <button
        onClick={() => setShowSlider(prev => !prev)}
        onDoubleClick={() => audioManager.toggleMute()}
        title={showSlider ? "Close Audio Mixer" : "Click to Adjust Master, BGM & SFX Volume"}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: isMuted ? "rgba(220, 38, 38, 0.88)" : "rgba(15, 10, 30, 0.85)",
          backdropFilter: "blur(10px)",
          border: `1.5px solid ${isMuted ? "#ef4444" : "rgba(196, 146, 214, 0.6)"}`,
          color: isMuted ? "#ffffff" : "#c492d6",
          boxShadow: isMuted ? "0 0 16px rgba(239, 68, 68, 0.5)" : "0 0 16px rgba(196, 146, 214, 0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0,
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = "scale(1.12)";
          e.currentTarget.style.borderColor = isMuted ? "#f87171" : "#e9d5ff";
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.borderColor = isMuted ? "#ef4444" : "rgba(196, 146, 214, 0.6)";
        }}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  );
};

export default function App() {
  const eng = useGameEngine();
  const {
    gs, session, screen, creatingChar, combat, fogRevealed, combatMode,
    effects, dyingMonsters, hitTokenIds, selectedSpell, diceRolls, battleStart,
    hudTab, hudOpen, chatTab, specialDialog, notification,
    actionText, restAnim, zoom, shopPurchaseAnim, char,
    setHudTab, setHudOpen, setChatTab, setZoom, setCombatMode,
  } = eng;

  const [isMuted, setIsMuted] = useState(audioManager.getIsMuted());
  const [volume, setVolume] = useState(audioManager.getVolume());
  const [showAlchemyModal, setShowAlchemyModal] = useState(false);
  const [hasPressedStart, setHasPressedStart] = useState(false);

  useEffect(() => {
    return audioManager.subscribe(() => {
      setIsMuted(audioManager.getIsMuted());
      setVolume(audioManager.getVolume());
    });
  }, []);

  const renderScreen = () => {
    if (screen === "auth") {
      if (!hasPressedStart) {
        return <TitleSplashScreen onStart={() => setHasPressedStart(true)} />;
      }
      return <AuthScreen onLogin={eng.handleLogin} />;
    }
    if (screen === "charSelect") {
      if (creatingChar) return <CharCreateScreen onCreated={eng.handleCreateChar} onBack={() => eng.setCreatingChar(false)} />;
      return <CharSelectScreen session={session!} characters={gs.characters} onSelect={eng.handleSelectChar} onCreateNew={() => eng.setCreatingChar(true)} onLogout={eng.handleLogout} onDelete={eng.handleDeleteChar} />;
    }
    if (screen === "worldMap" && char) return <WorldMapScreen char={char} onEnterTown={eng.enterTown} onEnterDungeon={eng.enterDungeon} onExitToCharSelect={() => { eng.setActiveCharId(null); eng.setScreen("charSelect"); }} onLogout={eng.handleLogout} />;

    if ((screen === "town" || screen === "dungeon" || screen === "sanctuary" || screen === "tutorial") && char) {
    const cfg = CLASS_CFG[char.class];
    const locationLabel = screen === "town" ? "🏰 MILLHAVEN" : screen === "sanctuary" ? "✨ SANCTUARY" : screen === "tutorial" ? "⚔️ TRAINING GROUND" : "💀 DARKROOT DEPTHS";

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
            {(screen === "town" || screen === "sanctuary") && <span style={{ fontFamily: PX, fontSize: 7, padding: "2px 8px", background: C.green + "20", color: C.green, border: `1px solid ${C.green}40` }}>✅ SAFE ZONE</span>}
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

        {/* Wrapper: relative container for map + combat overlay (CombatPanel must be OUTSIDE overflow:hidden) */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

        {/* Map area - Camera Follow Mode */}
        <div
          onWheel={(e) => {
            if (e.deltaY < 0) setZoom(z => Math.min(3.0, z + 0.1));
            else setZoom(z => Math.max(0.15, z - 0.1));
          }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", minHeight: 0, background: screen === "dungeon" ? "#040310" : screen === "sanctuary" ? "radial-gradient(circle at 50% 35%, #1b1238 0%, #0c081e 65%, #05030c 100%)" : "#080e04" }}>
          {/* Floating Moonlight Orbs background overlay for Sanctuary map viewport */}
          {screen === "sanctuary" && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
              <style>{`
                @keyframes sanc-viewport-orb-float {
                  0% { transform: translateY(0px) rotate(0deg); opacity: 0.35; }
                  50% { opacity: 0.85; }
                  100% { transform: translateY(-100px) rotate(180deg); opacity: 0.2; }
                }
              `}</style>
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={`sanc-viewport-orb-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i * 13 + 5) % 100}%`,
                    top: `${(i * 19 + 7) % 100}%`,
                    width: `${(i % 3) * 4 + 4}px`,
                    height: `${(i % 3) * 4 + 4}px`,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "#c492d6" : "#60a5fa",
                    boxShadow: i % 2 === 0 ? "0 0 16px #c492d6" : "0 0 16px #60a5fa",
                    animation: `sanc-viewport-orb-float ${5 + (i % 5)}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}
          {(() => {
             const mapScale = eng.zoom;
             const mapCols = getMapCols(screen);
             const mapRows = getMapRows(screen);
             const charX = char.position.x * CELL + (CELL / 2);
             const charY = char.position.y * CELL + (CELL / 2);
             const centerX = (mapCols * CELL) / 2;
             const centerY = (mapRows * CELL) / 2;
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
                     chests={gs.dungeonChests} dungeonObjects={gs.dungeonObjects} secrets={gs.dungeonSecrets}
                     combat={combat} fogRevealed={fogRevealed} combatMode={combatMode}
                     selectedSpell={selectedSpell ?? undefined}
                     onTileClick={eng.handleTileClick} onMonsterClick={eng.handleMonsterClick}
                     onObjectClick={eng.handleObjectClick}
                     onAOECast={eng.handleAOECastFromGrid}
                     effects={effects}
                     dyingMonsters={dyingMonsters}
                     hitTokenIds={hitTokenIds}
                     insightVisionTiles={eng.insightVisionTiles}
                     onHealSelf={eng.handleHealSelf} />
                 </div>
               </div>
             );
          })()}

          {/* Short Rest */}
          {(screen === "dungeon" || screen === "town") && !combat.active && char && (
            <button onClick={eng.handleShortRest}
              style={{
                position: "absolute", top: 16, right: 16, zIndex: 100,
                background: "rgba(0,0,0,0.6)", border: `1px solid ${C.border}`,
                color: C.muted, padding: "8px 12px", borderRadius: 8,
                fontFamily: PX, cursor: "pointer", display: "flex", gap: 8, alignItems: "center",
                fontSize: 12, transition: "0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(0,0,0,0.6)"}
            >
              <span style={{ fontSize: 16 }}>⛺</span>
              SHORT REST
            </button>
          )}
          {/* Alchemy Bench Button */}
          {screen === "town" && !combat.active && char && (
            <button onClick={() => setShowAlchemyModal(true)}
              style={{
                position: "absolute", top: 16, right: 155, zIndex: 100,
                background: "rgba(100,50,180,0.5)", border: `1px solid ${C.purple}`,
                color: "#fff", padding: "8px 14px", borderRadius: 8,
                fontFamily: PX, cursor: "pointer", display: "flex", gap: 8, alignItems: "center",
                fontSize: 12, boxShadow: `0 0 12px ${C.purple}60`, transition: "0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(120,60,200,0.8)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(100,50,180,0.5)"}
            >
              <span style={{ fontSize: 16 }}>🧪</span>
              ALCHEMY BENCH
            </button>
          )}



          {/* Exploration Panel */}
          {screen === "dungeon" && !combat.active && char && (
            <div style={{
              position: "absolute", top: 16, left: 16, zIndex: 100,
              display: "flex", flexDirection: "column", gap: 8
            }}>
              {/* Insight Button */}
              <button onClick={eng.handleInsight}
                style={{
                  background: Date.now() < eng.insightCooldown ? "#333" : "rgba(0,0,0,0.6)", 
                  border: `1px solid ${C.border}`,
                  color: Date.now() < eng.insightCooldown ? "#888" : C.muted, 
                  padding: "8px 12px", borderRadius: 8,
                  fontFamily: PX, cursor: Date.now() < eng.insightCooldown ? "not-allowed" : "pointer", 
                  display: "flex", gap: 8, alignItems: "center", fontSize: 12, transition: "0.2s"
                }}
              >
                <span style={{ fontSize: 16 }}>🔍</span>
                {Date.now() < eng.insightCooldown ? `COOLDOWN (${Math.ceil((eng.insightCooldown - Date.now()) / 1000)}s)` : "INSIGHT (WIS)"}
              </button>

              {/* Stealth Button */}
              <button onClick={eng.handleStealth}
                style={{
                  background: (eng.stealthActive || eng.stealthCasting) ? "rgba(40,100,40,0.8)" : "rgba(0,0,0,0.6)", 
                  border: `1px solid ${(eng.stealthActive || eng.stealthCasting) ? "#4cdb70" : C.border}`,
                  color: (eng.stealthActive || eng.stealthCasting) ? "#4cdb70" : C.muted, 
                  padding: "8px 12px", borderRadius: 8,
                  fontFamily: PX, cursor: eng.stealthCasting ? "not-allowed" : "pointer", 
                  display: "flex", gap: 8, alignItems: "center", fontSize: 12, transition: "0.2s"
                }}
                disabled={eng.stealthCasting}
              >
                <span style={{ fontSize: 16 }}>🥷</span>
                {eng.stealthCasting ? "HIDING..." : eng.stealthActive ? `STEALTHED` : "STEALTH (DEX)"}
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


        </div>{/* end map div */}

        {/* Combat panel — outside overflow:hidden so it won't be clipped */}
        {combat.active && (
          <CombatPanel combat={combat} char={char} monsters={gs.dungeonMonsters}
            combatMode={combatMode} setCombatMode={setCombatMode}
            selectedSpell={selectedSpell ?? undefined}
            onEndTurn={eng.endPlayerTurn} onSelectSpell={eng.handleSpellSelect} onUseItem={eng.handleUseItem}
            onGuard={eng.handleGuard}
            onFlee={() => {
              const aliveEngaged = gs.dungeonMonsters.filter(m =>
                m.hp > 0 && combat.engagedMonsterIds.includes(m.id)
              );
              const stillSeen = aliveEngaged.some(m =>
                Math.abs(char.position.x - m.position.x) + Math.abs(char.position.y - m.position.y) <= m.sightRange
              );
              if (stillSeen) {
                eng.notify("⚠️ Enemy can still see you! Move further away first!");
              } else {
                eng.setCombat(eng.INIT_COMBAT);
                setCombatMode("none");
                eng.setSelectedSpell(null);
                eng.notify("🏃 Fled from combat!");
              }
            }}
          />
        )}

        </div>{/* end map+combat wrapper */}

        {/* HUD */}
        <BottomHUD char={char} hudTab={hudTab} setHudTab={setHudTab} hudOpen={hudOpen} setHudOpen={setHudOpen}
          chatTab={chatTab} setChatTab={setChatTab} globalChat={gs.globalChat} partyChat={gs.partyChat}
          onSendChat={eng.handleSendChat} onEquipItem={eng.handleEquipItem} 
          onUnequipMainHand={eng.handleUnequipMainHand} onUnequipOffHand={eng.handleUnequipOffHand}
          onUnequipArmor={eng.handleUnequipArmor} onUnequipAcc={eng.handleUnequipAcc}
          onDropItem={eng.handleDropItem} onUseItem={eng.handleUseItem}
          party={gs.party} onCreateParty={eng.handleCreateParty} onLeaveParty={eng.handleLeaveParty} activeQuests={char.activeQuests || []}
          onUseSkill={eng.handleUseSkillFromHUD}
          inCombat={eng.combat.active} />

        {/* ========================================== */}
        {/* ✅ MODALS SECTION (แก้ไขใหม่ทั้งหมด) */}
        {/* ========================================== */}
        
        {/* 1. Prompt Yes/No (ใช้ AnimeDialog แบบเดียวกับ Shop) */}
        {specialDialog && !specialDialog.confirmed && specialDialog.tile.type !== "check" && (
          <AnimeDialog
            icon={specialDialog.tile.icon}
            title={specialDialog.tile.label.toUpperCase()}
            message={specialDialog.tile.prompt}
            onYes={() => {
              if (specialDialog.tile.type === "exit" || specialDialog.tile.type === "sanctuary_exit") {
                eng.handleSpecialYes();
              } else if (specialDialog.tile.type === "selenia") {
                eng.handleSpeakWithSelenia();
                eng.setSpecialDialog(null);
              } else {
                eng.setSpecialDialog({ ...specialDialog, confirmed: true });
              }
            }}
            onNo={() => eng.setSpecialDialog(null)}
          />
        )}
        
        {/* 1.5 Check Modal for skill checks */}
        {specialDialog && specialDialog.tile.type === "check" && char && (
          <CheckModal
            char={char}
            tile={specialDialog.tile}
            onClose={() => eng.setSpecialDialog(null)}
            onSuccess={(txt) => { eng.handleCheckResult(true, specialDialog.tile); }}
            onFail={(txt) => { eng.handleCheckResult(false, specialDialog.tile); }}
          />
        )}

        {/* 2. Shop / Alchemy / Blacksmith Modal (แสดงเมื่อ confirmed แล้ว) */}
        {specialDialog?.confirmed && (specialDialog?.tile.type === 'shop' || specialDialog?.tile.type === 'alchemy' || specialDialog?.tile.type === 'blacksmith') && char && (
          <ShopModal 
            char={char} 
            onBuy={eng.handleBuyItem} 
            onClose={() => eng.setSpecialDialog(null)} 
          />
        )}

        {/* 3. Inn Modal */}
        {specialDialog?.confirmed && specialDialog?.tile.type === 'inn' && char && (
          <InnModal
            char={char}
            onLongRest={(healedChar) => {
              if (char.gold >= LONG_REST_COST) {
                eng.updateChar(char.id, (c: any) => ({ 
                  gold: c.gold - LONG_REST_COST, 
                  hp: c.maxHp,
                  skillUsages: {},
                  spellSlots: c.spellSlots ? { ...c.spellSlots, used: 0 } : undefined
                }));
                eng.notify("You rest well at the inn and feel fully restored!");
              } else {
                eng.notify(`Not enough gold for a Long Rest (${LONG_REST_COST}g required).`);
              }
              setTimeout(() => eng.setSpecialDialog(null), 800);
            }}
            onClose={() => eng.setSpecialDialog(null)}
          />
        )}

        {/* 4. Statue Modal (Level Up + Stat Adjustment) */}
        {specialDialog?.confirmed && specialDialog?.tile.type === 'shrine' && char && (
          <StatueModal
            char={char}
            onLevelUp={(leveledChar) => {
              eng.updateChar(char.id, () => leveledChar);
              eng.notify("🎉 Level Up! You feel stronger!");
            }}
            onUpdateStats={(updatedChar) => {
              eng.updateChar(char.id, (c: any) => ({ 
                stats: updatedChar.stats,
                statusPoints: updatedChar.statusPoints
              }));
              eng.notify("✨ Status Points allocated!");
            }}
            onPray={() => {
              eng.setSpecialDialog(null);
              eng.enterSanctuary();
            }}
            onClose={() => eng.setSpecialDialog(null)}
          />
        )}

        {/* 5. Quest Modal */}
        {specialDialog?.confirmed && specialDialog?.tile.type === 'quest' && char && (
          <QuestModal
            char={char}
            quests={gs.availableQuests}
            activeQuests={char.activeQuests || []}
            nextRefresh={gs.questRefreshAt}
            onAccept={(questId) => {
              eng.handleAcceptQuest(questId);
              eng.notify("Quest accepted!");
            }}
            onClaim={(questId) => {
              eng.handleQuestClaim(questId);
            }}
            onCancel={(questId) => {
              eng.handleCancelQuest(questId);
            }}
            charInventory={char.inventory}
            onClose={() => eng.setSpecialDialog(null)}
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
              @keyframes battle-bg-flash {
                0% { opacity: 0; background: rgba(255, 255, 255, 0.4); }
                15% { opacity: 1; background: rgba(15, 5, 20, 0.85); }
                80% { opacity: 1; background: rgba(15, 5, 20, 0.85); }
                100% { opacity: 0; background: rgba(0, 0, 0, 0); }
              }
              @keyframes battle-banner-bounce {
                0% { transform: scaleX(0) scaleY(0.2) skewX(-15deg); opacity: 0; }
                25% { transform: scaleX(1.08) scaleY(1.08) skewX(-12deg); opacity: 1; filter: drop-shadow(0 0 30px #ff3333); }
                80% { transform: scaleX(1) scaleY(1) skewX(-12deg); opacity: 1; }
                100% { transform: scaleX(1.2) scaleY(0) skewX(-20deg); opacity: 0; }
              }
              @keyframes battle-text-pop {
                0% { transform: scale(0.6) translateY(20px); opacity: 0; }
                25% { transform: scale(1.15) translateY(0); opacity: 1; text-shadow: 0 0 40px #ff3366, 0 0 80px #ff9900, 4px 4px 0 #000; }
                80% { transform: scale(1) translateY(0); opacity: 1; }
                100% { transform: scale(1.2) translateY(-10px); opacity: 0; }
              }
            `}</style>
            <div style={{
              position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", animation: "battle-bg-flash 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}>
              <div style={{
                position: "relative", width: "100%", height: 110,
                background: "linear-gradient(90deg, rgba(220, 38, 38, 0) 0%, rgba(180, 20, 50, 0.92) 20%, rgba(140, 10, 30, 0.95) 50%, rgba(180, 20, 50, 0.92) 80%, rgba(220, 38, 38, 0) 100%)",
                borderTop: "2px solid #ffd700", borderBottom: "2px solid #ffd700",
                boxShadow: "0 0 40px rgba(239, 68, 68, 0.8), inset 0 0 20px rgba(255, 215, 0, 0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "battle-banner-bounce 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}>
                <div style={{
                  fontFamily: PX, fontSize: 44, color: "#ffffff", fontStyle: "italic", letterSpacing: 8,
                  textShadow: `0 0 30px ${C.gold}, 0 0 60px ${C.red}, 4px 4px 0 #000, -2px -2px 0 #000`,
                  animation: "battle-text-pop 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                  display: "flex", alignItems: "center", gap: 16,
                }}>
                  <span style={{ color: C.gold }}>⚔</span>
                  <span>BATTLE START!</span>
                  <span style={{ color: C.gold }}>⚔</span>
                </div>
              </div>
            </div>
          </>
        )}
        {/* 5. Selenia Dialog */}
        {eng.seleniaDialogTree && (
          <SeleniaDialog
            dialogTree={eng.seleniaDialogTree}
            onClose={() => eng.setSeleniaDialogTree(null)}
          />
        )}
        {/* 6. Selenia Popup (Combat Reactions) */}
        {eng.seleniaPopup && (
          <SeleniaPopup emotion={eng.seleniaPopup.emotion} text={eng.seleniaPopup.text} />
        )}
        
        {/* 7. Skill Obtained Popup */}
        {eng.skillObtained && (
          <div style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            background: "linear-gradient(135deg, rgba(20,15,40,0.95), rgba(10,5,20,0.95))",
            border: `2px solid ${C.gold}`, borderRadius: 8, padding: "16px 20px",
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${C.gold}44`,
            display: "flex", gap: 16, alignItems: "center",
            animation: "skill-obtain-in 0.5s cubic-bezier(0.34, 1.25, 0.64, 1) forwards, skill-obtain-out 0.5s ease-in 4.5s forwards",
            cursor: "pointer"
          }} onClick={() => eng.setSkillObtained(null)}>
            <style>{`
              @keyframes skill-obtain-in { 0% { transform: translateX(120%) scale(0.9); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
              @keyframes skill-obtain-out { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(120%); opacity: 0; } }
            `}</style>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "radial-gradient(circle, #ffe680 0%, #a47012 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 0 12px #ffe680"
            }}>
              {eng.skillObtained.icon}
            </div>
            <div>
              <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, letterSpacing: 1, marginBottom: 4 }}>NEW SKILL OBTAINED!</div>
              <div style={{ fontFamily: PX, fontSize: 13, color: "#fff", textShadow: "1px 1px 0 #000" }}>{eng.skillObtained.name}</div>
              <div style={{ fontFamily: MO, fontSize: 10, color: C.muted, marginTop: 4 }}>{eng.skillObtained.desc}</div>
            </div>
          </div>
        )}

        {/* Tag Alchemy Modal */}
        {showAlchemyModal && char && (
          <AlchemyModal
            char={char}
            onClose={() => setShowAlchemyModal(false)}
            onCraft={(ing1Id, ing2Id, catId) => eng.handleCraftAlchemy(ing1Id, ing2Id, catId)}
          />
        )}
      </div>
    );
    }
    return null;
  };

  const currentScreenKey = `${screen}-${creatingChar ? "create" : "main"}-${char?.id ?? "none"}`;

  return (
    <>
      <style>{`
        @keyframes page-fade-switch {
          0% { opacity: 0; transform: scale(0.985); filter: blur(5px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
      `}</style>
      {!combat.active && <GlobalBgmButton />}
      <div
        key={currentScreenKey}
        style={{
          width: "100%",
          minHeight: "100vh",
          animation: "page-fade-switch 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {renderScreen()}
      </div>
    </>
  );
}