import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Stamp } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import { getRandomDialogue, NPC_DIALOGUES } from "../../constants/dialogues";
import type { Character } from "../../types/game";

const EXP_THRESHOLDS: Record<number, number> = {
  1: 500, 2: 1000, 3: 2000, 4: 4000, 5: 8000,
  6: 16000, 7: 32000, 8: 64000, 9: 128000, 10: Infinity
};

type NpcMood = "idle" | "talking" | "happy" | "reluctant";

export function TownInteractionModal({
  type, character, onClose, onAction
}: {
  type: "inn" | "shrine" | "quest";
  character: Character;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}) {
  const [dialogue, setDialogue] = useState("");
  const [npcMood, setNpcMood] = useState<NpcMood>("idle");
  const [animPhase, setAnimPhase] = useState<"idle" | "accepting" | "completing" | "canceling">("idle");
  const [tempStats, setTempStats] = useState(character.stats);

  // สุ่มบทพูดเริ่มต้นเมื่อเปิด Modal (จำลองการมองหน้าสักพัก)
  useEffect(() => {
    setDialogue(getRandomDialogue(type, "greetings"));
    setNpcMood("talking");
    
    // กลับไปท่าทางปกติหลังจากพูดจบ (จำลองด้วย timeout)
    const timer = setTimeout(() => setNpcMood("idle"), 3000);
    return () => clearTimeout(timer);
  }, [type]);

  // ฟังก์ชันเลือกภาพ NPC ตามประเภทและอารมณ์
  const getNpcImage = () => {
    const prefix = type === "quest" ? "npc_b" : "npc_0";
    if (npcMood === "happy") return `/${prefix}2.png`; // npc_02.png หรือ npc_b02.png
    if (npcMood === "reluctant") return `/npc_b04.png`; // มีเฉพาะ quest
    if (npcMood === "talking") return `/${prefix}1.png`; // npc_01.png หรือ npc_b01.png
    return `/${prefix}3.png`; // npc_03.png หรือ npc_b03.png (idle)
  };

  // ธีมสีตามสถานที่
  const theme = type === "shrine" 
    ? { bg: "#F5F5FA", border: "#D4AF37", accent: "#D4AF37", glow: "0 0 20px rgba(212, 175, 55, 0.3)" } // Sacred Warmth
    : { bg: "#FFF8E7", border: "#8B5A2B", accent: "#8B5A2B", glow: "0 0 15px rgba(139, 90, 43, 0.2)" }; // Cozy Wooden Cafe

  const handleStatChange = (stat: keyof typeof character.stats, delta: number) => {
    const base = character.stats[stat];
    if (tempStats[stat] + delta < base - 8) return;
    setTempStats(prev => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  const triggerAction = (action: string, data?: any, successMood: NpcMood = "happy", successDialogueKey: string = "") => {
    setNpcMood(successMood);
    if (successDialogueKey) {
      setDialogue(getRandomDialogue(type, successDialogueKey));
    }
    setTimeout(() => {
      onAction(action, data);
      // Reset after action
      setTimeout(() => {
        setAnimPhase("idle");
        setNpcMood("idle");
        setDialogue(getRandomDialogue(type, "greetings"));
      }, 2500);
    }, 500);
  };

  const renderRightPanel = () => {
    if (type === "inn") {
      return (
        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          <div style={{ 
            ...pixelBtn("primary"), padding: 20, width: "100%", textAlign: "center", cursor: "pointer",
            background: theme.bg, border: `2px solid ${theme.border}`, color: theme.accent
          }} onClick={() => triggerAction("longRest", null, "happy", "restSuccess")}>
            <div style={{ fontFamily: PX, fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>🛏️ LONG REST</div>
            <div style={{ fontFamily: MO, fontSize: 10, color: "#B8860B" }}>Cost: 100 Gold</div>
            <div style={{ fontFamily: NU, fontSize: 9, color: "#6B4423", marginTop: 8 }}>Restores 100% HP & MP</div>
          </div>
        </div>
      );
    }

    if (type === "shrine") {
      const nextExp = EXP_THRESHOLDS[character.level] || Infinity;
      const canLevelUp = character.exp >= nextExp && character.level < 10;
      
      return (
        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontFamily: PX, fontSize: 10, color: theme.accent, textAlign: "center", marginBottom: 8, letterSpacing: 1 }}>
            LEVEL {character.level} → {character.level + 1} REQUIRES {nextExp.toLocaleString()} EXP
          </div>
          <button 
            style={{ 
              ...pixelBtn("primary"), opacity: canLevelUp ? 1 : 0.5, cursor: canLevelUp ? "pointer" : "not-allowed",
              background: canLevelUp ? theme.accent : "#ccc", color: "#fff"
            }} 
            disabled={!canLevelUp} 
            onClick={() => triggerAction("levelUp", null, "happy", "levelUpSuccess")}
          >
            ⛪ ASCEND (LEVEL UP)
          </button>
          
          <div style={{ borderTop: `2px dashed ${theme.border}`, paddingTop: 20, marginTop: 8 }}>
            <div style={{ fontFamily: PX, fontSize: 9, color: theme.accent, marginBottom: 16, textAlign: "center", letterSpacing: 1 }}>DIVINE ATTRIBUTE ADJUSTMENT</div>
            {Object.keys(tempStats).map(stat => (
              <div key={stat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: NU, fontSize: 11, color: "#4A4A4A", textTransform: "uppercase", width: 60 }}>{stat}</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button style={{...pixelBtn("ghost"), color: theme.accent}} onClick={() => handleStatChange(stat as any, -1)}>−</button>
                  <span style={{ fontFamily: MO, fontSize: 14, color: theme.accent, minWidth: 24, textAlign: "center" }}>{tempStats[stat as keyof typeof tempStats]}</span>
                  <button style={{...pixelBtn("ghost"), color: theme.accent}} onClick={() => handleStatChange(stat as any, 1)}>+</button>
                </div>
              </div>
            ))}
            <button 
              style={{ ...pixelBtn("primary"), width: "100%", marginTop: 20, background: theme.accent, color: "#fff" }}
              onClick={() => triggerAction("saveStats", tempStats, "happy", "statSave")}
            >
              CONSECRATE STATS
            </button>
          </div>
        </div>
      );
    }

    if (type === "quest") {
      return (
        <div style={{ padding: 24, maxHeight: 420, overflowY: "auto", position: "relative" }}>
          <div style={{ fontFamily: PX, fontSize: 10, color: theme.accent, marginBottom: 16, letterSpacing: 1, textAlign: "center" }}>📜 AVAILABLE QUESTS</div>
          
          <div style={{ padding: 16, background: "#FDF5E6", border: `2px solid ${theme.border}`, borderRadius: 4, position: "relative" }}>
            <div style={{ fontFamily: PX, fontSize: 11, color: "#5C4033", marginBottom: 8 }}>Rat Infestation</div>
            <div style={{ fontFamily: NU, fontSize: 11, color: "#8B7355", marginBottom: 16 }}>Clear 5 rats in the cellar.</div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#8B5A2B", color: "#FFF8E7" }}
                      onClick={() => {
                        setAnimPhase("accepting");
                        triggerAction("acceptQuest", "quest_1", "talking", "accept");
                      }}>
                ACCEPT
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#A0522D", color: "#FFF8E7" }}
                      onClick={() => {
                        setAnimPhase("completing");
                        triggerAction("completeQuest", "quest_1", "happy", "complete");
                      }}>
                COMPLETE
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#CD853F", color: "#FFF8E7" }}
                      onClick={() => {
                        setAnimPhase("canceling");
                        triggerAction("cancelQuest", "quest_1", "reluctant", "cancel");
                      }}>
                CANCEL
              </button>
            </div>
            
            {/* Animation: Quest Paper Flying Out */}
            <AnimatePresence>
              {animPhase === "accepting" && (
                <motion.div
                  initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  animate={{ opacity: 0, y: -200, scale: 0.4, rotate: 25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  style={{
                    position: "absolute", inset: 0, background: "#FDF5E6", border: `2px solid ${theme.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PX, fontSize: 10, color: "#5C4033", zIndex: 10
                  }}
                >
                  📜 QUEST SCROLL
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animation: Stamp Slamming Down */}
            <AnimatePresence>
              {animPhase === "completing" && (
                <motion.div
                  initial={{ scale: 3, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: -15 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    border: "4px solid #DC143C", color: "#DC143C", fontFamily: PX, fontSize: 24, padding: "8px 16px",
                    borderRadius: 8, zIndex: 20, background: "rgba(255,255,255,0.8)"
                  }}
                >
                  COMPLETE
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ 
          display: "flex", width: 750, maxHeight: "85vh", background: theme.bg, 
          border: `3px solid ${theme.border}`, boxShadow: theme.glow, position: "relative", overflow: "hidden"
        }}
      >
        <PixelCorners color={theme.border} size={8} />
        
        {/* LEFT: NPC Section (Vertical Church-like feel for Shrine, Cozy for others) */}
        <div style={{ 
          width: "40%", background: "rgba(0,0,0,0.05)", padding: 32, display: "flex", flexDirection: "column", 
          alignItems: "center", justifyContent: "center", borderRight: `2px solid ${theme.border}`,
          backgroundImage: type === "shrine" ? "linear-gradient(to bottom, rgba(212,175,55,0.1), transparent)" : "none"
        }}>
          <motion.div
            animate={
              animPhase === "completing" ? { y: [0, -40, 0] } : // กระโดดดีใจ
              npcMood === "reluctant" ? { scale: 0.9, x: [-5, 5, -5, 5, 0] } : // ส่ายหน้าลำบากใจ
              npcMood === "talking" ? { y: [0, -3, 0] } : {} // พูดขยับนิดหน่อย
            }
            transition={{ duration: animPhase === "completing" ? 0.4 : 0.3 }}
            style={{ 
              width: 120, height: 120, marginBottom: 24, 
              backgroundImage: `url(${getNpcImage()})`, 
              backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center"
            }}
          />
          
          <div style={{ 
            background: "#FFFFFF", padding: 20, borderRadius: 8, border: `2px solid ${theme.border}`,
            fontFamily: NU, fontSize: 13, color: "#333", lineHeight: 1.6, textAlign: "center", minHeight: 120,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            {/* ลูกศรชี้ไปทาง NPC */}
            <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: `10px solid ${theme.border}` }} />
            <div style={{ position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "8px solid #FFFFFF" }} />
            
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={dialogue} // Trigger animation when dialogue changes
            >
              "{dialogue}"
            </motion.span>
          </div>
        </div>

        {/* RIGHT: Interaction Section */}
        <div style={{ width: "60%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, borderBottom: `2px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.02)" }}>
            <span style={{ fontFamily: PX, fontSize: 11, color: theme.accent, letterSpacing: 1 }}>
              {type === "inn" ? "🏨 HEARTHSTONE INN" : type === "shrine" ? "⛪ SACRED SHRINE" : "📋 QUEST BOARD"}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X className="w-6 h-6" />
            </button>
          </div>
          {renderRightPanel()}
        </div>
      </motion.div>
    </div>
  );
}