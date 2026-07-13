import { Heart, LogOut, Users } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { CLASS_CFG } from "../../constants/classes";
import { GoldBadge } from "../ui/GoldBadge";
import { PixelCorners } from "../ui/PixelCorners";
import { HpBar } from "../ui/HpBar";
import type { Character } from "../../types/game";

export function WorldMapScreen({ char, onEnterTown, onEnterDungeon, onLogout, onExitToCharSelect }: {
  char: Character; onEnterTown: () => void; onEnterDungeon: () => void; onLogout: () => void; onExitToCharSelect: () => void;
}) {
  const cfg = CLASS_CFG[char.class];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 37px,${C.blue} 38px),repeating-linear-gradient(90deg,transparent,transparent 37px,${C.blue} 38px)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(94,184,255,0.04) 0%, transparent 70%)` }} />

      <div style={{ position: "relative", zIndex: 10, borderBottom: `2px solid ${C.border}`, background: C.card, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: PX, fontSize: 12, color: C.blue, letterSpacing: 1 }}>🗺️ WORLD MAP</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: NU, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, overflow: "hidden", border: `2px solid ${cfg.color}`, flexShrink: 0 }}>
              {char.avatar ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: cfg.color + "30" }}>{cfg.icon}</div>}
            </div>
            <span style={{ color: C.text }}>{char.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.red }}>
            <Heart className="w-3 h-3" /><span style={{ fontFamily: MO }}>{char.hp}/{char.maxHp}</span>
          </div>
          <GoldBadge amount={char.gold} />
          <button onClick={onExitToCharSelect} style={{ ...pixelBtn("ghost", true), display: "flex", alignItems: "center", gap: 4, color: C.blue }}>
            <Users className="w-3 h-3" />HEROES
          </button>
          <button onClick={onLogout} style={{ ...pixelBtn("ghost", true), display: "flex", alignItems: "center", gap: 4, color: C.red }}>
            <LogOut className="w-3 h-3" />OUT
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 10, padding: 32 }}>
        <div style={{ position: "relative", width: 640, height: 380 }}>
          <div style={{ position: "absolute", inset: 0, background: "#0a1020", border: `3px solid ${C.border}`, boxShadow: C.glow }}>
            <PixelCorners color={C.blue} size={10} />
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 640 380">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.blue + "08"} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="640" height="380" fill="url(#grid)" />
              <path d="M 160 190 Q 320 140 480 190" stroke={C.blue + "25"} strokeWidth="3" fill="none" strokeDasharray="8,5" />
              <polygon points="420,120 450,80 480,120" fill="#141828" stroke={C.border} strokeWidth="1" />
              <polygon points="450,130 475,95 500,130" fill="#141828" stroke={C.border} strokeWidth="1" />
              <circle cx="120" cy="155" r="10" fill="#1a3a1a" /><circle cx="140" cy="165" r="8" fill="#1e4a1e" /><circle cx="160" cy="150" r="9" fill="#1a3a1a" />
              <path d="M 200 360 Q 300 320 360 290 Q 400 265 440 295" stroke="#0a1840" strokeWidth="8" fill="none" opacity="0.7" />
            </svg>
          </div>

          <button onClick={onEnterTown}
            style={{ position: "absolute", left: "24%", top: "50%", transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget.querySelector(".node") as HTMLDivElement).style.boxShadow = `0 0 24px rgba(78,196,78,0.5)`; }}
            onMouseLeave={e => { (e.currentTarget.querySelector(".node") as HTMLDivElement).style.boxShadow = `0 0 14px rgba(78,196,78,0.2)`; }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="node" style={{
                width: 80, height: 80, background: "#0a1a0a",
                border: "3px solid #4ec44e",
                boxShadow: "0 0 14px rgba(78,196,78,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                transition: "box-shadow 0.2s",
                position: "relative",
              }}>
                <PixelCorners color="#4ec44e" size={8} />
                🏰
              </div>
              <div style={{ background: C.card, border: `2px solid #4ec44e40`, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 8, color: "#4ec44e", letterSpacing: 1 }}>MILLHAVEN</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>Town · Safe Zone</div>
              </div>
            </div>
          </button>

          <button onClick={onEnterDungeon}
            style={{ position: "absolute", left: "75%", top: "46%", transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget.querySelector(".dnode") as HTMLDivElement).style.boxShadow = `0 0 24px rgba(229,57,53,0.5)`; }}
            onMouseLeave={e => { (e.currentTarget.querySelector(".dnode") as HTMLDivElement).style.boxShadow = `0 0 14px rgba(229,57,53,0.2)`; }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="dnode" style={{
                width: 80, height: 80, background: "#1a0808",
                border: "3px solid #e53935",
                boxShadow: "0 0 14px rgba(229,57,53,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                transition: "box-shadow 0.2s",
                position: "relative",
              }}>
                <PixelCorners color="#e53935" size={8} />
                💀
              </div>
              <div style={{ background: C.card, border: `2px solid #e5393540`, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 8, color: "#e57373", letterSpacing: 1 }}>DARKROOT</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>Dungeon · Dangerous</div>
              </div>
            </div>
          </button>

          <div style={{ position: "absolute", bottom: 8, right: 8, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "6px 10px" }}>
            <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
              <div>🏰 Safe town with shops &amp; quests</div>
              <div>💀 Monster-filled dungeon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

void HpBar;
