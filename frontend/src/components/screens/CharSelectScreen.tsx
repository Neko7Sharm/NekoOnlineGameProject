import { LogOut, Heart, ChevronRight, Plus, Trash2 } from "lucide-react";
import { C, PX, NU, MO, panel, pixelBtn } from "../../constants/theme";
import { CLASS_CFG } from "../../constants/classes";
import { HpBar } from "../ui/HpBar";
import { GoldBadge } from "../ui/GoldBadge";
import type { Character } from "../../types/game";

export function CharSelectScreen({ session, characters, onSelect, onCreateNew, onLogout, onDelete }: {
  session: { username: string; charIds: string[] };
  characters: Record<string, Character>;
  onSelect: (id: string) => void; onCreateNew: () => void; onLogout: () => void; onDelete: (id: string) => void;
}) {
  const chars = session.charIds.map(id => characters[id]).filter(Boolean);
  const canCreate = chars.length < 5;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 35%, #1b1238 0%, #0c081e 65%, #05030c 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes charsel-orb-float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-90px) rotate(180deg); opacity: 0.2; }
        }
      `}</style>

      {/* Floating Moonlight Particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <div
            key={`charsel-orb-${i}`}
            style={{
              position: "absolute",
              left: `${(i * 13 + 5) % 100}%`,
              top: `${(i * 19 + 7) % 100}%`,
              width: `${(i % 3) * 4 + 4}px`,
              height: `${(i % 3) * 4 + 4}px`,
              borderRadius: "50%",
              background: i % 2 === 0 ? "#c492d6" : "#60a5fa",
              boxShadow: i % 2 === 0 ? "0 0 16px #c492d6" : "0 0 16px #60a5fa",
              animation: `charsel-orb-float ${5 + (i % 5)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 620 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: PX, fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: 6 }}>SELestia HORIZON</div>
            <div style={{ fontFamily: PX, fontSize: 9, color: C.blue, letterSpacing: 1, marginBottom: 4 }}>CHOOSE HERO</div>
            <div style={{ fontFamily: NU, fontSize: 13, color: C.muted }}>
              Welcome, <span style={{ color: C.text }}>{session.username}</span> · {chars.length}/5 characters
            </div>
          </div>
          <button onClick={onLogout} style={{ ...pixelBtn("ghost", true), display: "flex", alignItems: "center", gap: 6, color: C.red, borderRadius: 10 }}>
            <LogOut className="w-3 h-3" />LOGOUT
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          {chars.map(char => {
            const cfg = CLASS_CFG[char.class];
            return (
              <div key={char.id} style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onSelect(char.id)}
                  style={{
                    ...panel, padding: "14px 16px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14,
                    flex: 1, textAlign: "left", borderRadius: 14,
                    background: `linear-gradient(180deg, ${C.card} 0%, ${C.card2} 100%)`,
                    transition: "box-shadow 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = C.glowStrong;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = C.glow;
                  }}>
                  <div style={{
                    width: 52, height: 52, flexShrink: 0, overflow: "hidden",
                    border: `2px solid ${cfg.color}60`, position: "relative",
                  }}>
                    {char.avatar
                      ? <img src={char.avatar} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", background: cfg.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{cfg.icon}</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: PX, fontSize: 9, color: C.text }}>{char.name}</span>
                      <span style={{ fontFamily: NU, fontSize: 11, padding: "2px 6px", background: cfg.color + "25", color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                        {cfg.icon} {char.class}
                      </span>
                      <span style={{ fontFamily: MO, fontSize: 10, color: C.muted }}>Lv.{char.level}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Heart className="w-3 h-3" style={{ color: C.red }} />
                        <span style={{ fontFamily: MO, fontSize: 10, color: C.text }}>{char.hp}/{char.maxHp}</span>
                      </div>
                      <div style={{ flex: 1 }}><HpBar hp={char.hp} maxHp={char.maxHp} size="sm" /></div>
                      <GoldBadge amount={char.gold} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: C.muted, flexShrink: 0 }} />
                </button>
                <button
                  onClick={() => onDelete(char.id)}
                  style={{
                    ...pixelBtn("ghost", true),
                    width: 50,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.red, border: `1px solid ${C.border}`,
                    background: C.card
                  }}
                  title="Delete Character"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {canCreate ? (
          <button onClick={onCreateNew}
            style={{
              width: "100%", padding: "14px", cursor: "pointer",
              background: `linear-gradient(180deg, ${C.card} 0%, ${C.card2} 100%)`, border: `2px dashed ${C.border}`,
              color: C.muted, fontFamily: PX, fontSize: 8, letterSpacing: 1, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue + "80"; (e.currentTarget as HTMLButtonElement).style.color = C.blue; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}>
            <Plus className="w-4 h-4" />CREATE NEW CHARACTER
          </button>
        ) : (
          <div style={{ textAlign: "center", fontFamily: NU, fontSize: 12, color: C.muted, padding: 12, border: `1px solid ${C.border}` }}>
            Maximum 5 characters per account reached.
          </div>
        )}
      </div>
    </div>
  );
}
