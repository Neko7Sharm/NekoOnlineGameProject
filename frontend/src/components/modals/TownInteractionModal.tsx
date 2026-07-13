// frontend/src/components/modals/TownInteractionModal.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import { getRandomDialogue } from "../../constants/dialogues";
import type { Character } from "../../types/game";

const EXP_THRESHOLDS: Record<number, number> = {
  1: 500, 2: 1000, 3: 2000, 4: 4000, 5: 8000,
  6: 16000, 7: 32000, 8: 64000, 9: 128000, 10: Infinity
};

export function TownInteractionModal({
  type, character, onClose, onAction
}: {
  type: "inn" | "shrine" | "quest";
  character: Character;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}) {
  const [dialogue, setDialogue] = useState("");
  const [npcMood, setNpcMood] = useState<"idle" | "talking" | "happy" | "reluctant">("idle");
  const [animPhase, setAnimPhase] = useState<"idle" | "accepting" | "completing" | "canceling">("idle");
  const [tempStats, setTempStats] = useState(character.stats);

  // สุ่มบทพูดเมื่อเปิด Modal
  useEffect(() => {
    setDialogue(getRandomDialogue(type, "greetings"));
    setNpcMood("talking");
    const timer = setTimeout(() => setNpcMood("idle"), 3000);
    return () => clearTimeout(timer);
  }, [type]);

  // เลือกภาพ NPC (แก้ไขให้ปลอดภัย ไม่เรียกภาพผิดประเภท)
  const getNpcImage = () => {
    const prefix = type === "quest" ? "npc_b" : "npc_0";
    if (npcMood === "happy") return `/${prefix}2.png`;
    if (npcMood === "reluctant") return type === "quest" ? "/npc_b04.png" : `/${prefix}3.png`;
    if (npcMood === "talking") return `/${prefix}1.png`;
    return `/${prefix}3.png`;
  };

  // ธีมสี
  const theme = type === "shrine" 
    ? { bg: "#F5F5FA", border: "#D4AF37", accent: "#D4AF37" }
    : { bg: "#FFF8E7", border: "#8B5A2B", accent: "#8B5A2B" };

  // ปรับ Stat พร้อมตรวจสอบ Status Points
  const handleStatChange = (stat: keyof typeof character.stats, delta: number) => {
    const currentVal = tempStats[stat];
    const baseVal = character.stats[stat];

    // ป้องกันการลดต่ำกว่า base - 8
    if (delta < 0 && currentVal + delta < baseVal - 8) return;

    // ป้องกันการเพิ่มถ้าไม่มี Status Points เหลือ
    if (delta > 0 && (character.statusPoints || 0) <= 0) return;

    setTempStats(prev => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  const triggerAction = (action: string, data?: any, successMood: typeof npcMood = "happy", dialogueKey?: string) => {
    if (successMood) setNpcMood(successMood);
    if (dialogueKey) setDialogue(getRandomDialogue(type, dialogueKey));
    
    // หน่วงเวลาเล็กน้อยให้ Animation เริ่มก่อน แล้วค่อยส่ง Action ไปที่ App.tsx
    setTimeout(() => {
      onAction(action, data);
      setTimeout(() => {
        setAnimPhase("idle");
        setNpcMood("idle");
        setDialogue(getRandomDialogue(type, "greetings"));
      }, 2000);
    }, 400);
  };

  const renderContent = () => {
    if (type === "inn") {
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div 
            style={{ 
              ...pixelBtn("primary"), 
              padding: 20, 
              textAlign: "center", 
              cursor: "pointer", 
              background: theme.bg, 
              border: `2px solid ${theme.border}` 
            }}
            onClick={() => triggerAction("longRest", null, "happy", "restSuccess")}
          >
            <div style={{ fontFamily: PX, fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>🛏️ LONG REST</div>
            <div style={{ fontFamily: MO, fontSize: 10, color: "#B8860B" }}>Cost: 100 Gold</div>
            <div style={{ fontFamily: NU, fontSize: 9, color: "#6B4423", marginTop: 8 }}>Restores 100% HP & MP</div>
          </div>
        </div>
      );
    }

    if (type === "shrine") {
      const nextExp = EXP_THRESHOLDS[character.level] || Infinity;
      const canLevelUp = character.exp >= nextExp && character.level < 10;
      const availablePoints = character.statusPoints || 0;
      
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: theme.accent, textAlign: "center", marginBottom: 8 }}>
            LVL {character.level} → {character.level + 1} : {nextExp.toLocaleString()} EXP
          </div>
          <button 
            style={{ 
              ...pixelBtn("primary"), 
              opacity: canLevelUp ? 1 : 0.5, 
              cursor: canLevelUp ? "pointer" : "not-allowed" 
            }} 
            disabled={!canLevelUp} 
            onClick={() => triggerAction("levelUp", null, "happy", "levelUpSuccess")}
          >
            ⛪ ASCEND (LEVEL UP)
          </button>
          
          <div style={{ borderTop: `2px dashed ${theme.border}`, paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontFamily: PX, fontSize: 9, color: theme.accent, marginBottom: 12, textAlign: "center" }}>
              DIVINE ATTRIBUTE ADJUSTMENT
            </div>
            <div style={{ fontFamily: NU, fontSize: 9, color: C.blue, textAlign: "center", marginBottom: 12 }}>
              Available Points: {availablePoints}
            </div>
            {Object.keys(tempStats).map(stat => (
              <div key={stat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: NU, fontSize: 10, color: "#4A4A4A", textTransform: "uppercase", width: 60 }}>{stat}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button style={{...pixelBtn("ghost"), color: theme.accent, padding: "2px 8px"}} onClick={() => handleStatChange(stat as any, -1)}>−</button>
                  <span style={{ fontFamily: MO, fontSize: 12, color: theme.accent, minWidth: 24, textAlign: "center" }}>{tempStats[stat as keyof typeof tempStats]}</span>
                  <button style={{...pixelBtn("ghost"), color: theme.accent, padding: "2px 8px"}} onClick={() => handleStatChange(stat as any, 1)}>+</button>
                </div>
              </div>
            ))}
            <button 
              style={{ ...pixelBtn("primary"), width: "100%", marginTop: 16, background: theme.accent, color: "#fff" }}
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
        <div style={{ padding: 24, maxHeight: 380, overflowY: "auto", position: "relative" }}>
          <div style={{ fontFamily: PX, fontSize: 10, color: theme.accent, marginBottom: 16, letterSpacing: 1, textAlign: "center" }}>📜 AVAILABLE QUESTS</div>
          
          <div style={{ padding: 16, background: "#FDF5E6", border: `2px solid ${theme.border}`, borderRadius: 4, position: "relative" }}>
            <div style={{ fontFamily: PX, fontSize: 11, color: "#5C4033", marginBottom: 6 }}>Rat Infestation</div>
            <div style={{ fontFamily: NU, fontSize: 10, color: "#8B7355", marginBottom: 16 }}>Clear 5 rats in the cellar.</div>
            
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#8B5A2B", color: "#FFF8E7" }}
                      onClick={() => { setAnimPhase("accepting"); triggerAction("acceptQuest", "quest_1", "talking", "accept"); }}>
                ACCEPT
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#A0522D", color: "#FFF8E7" }}
                      onClick={() => { setAnimPhase("completing"); triggerAction("completeQuest", "quest_1", "happy", "complete"); }}>
                COMPLETE
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 9, flex: 1, background: "#CD853F", color: "#FFF8E7" }}
                      onClick={() => { setAnimPhase("canceling"); triggerAction("cancelQuest", "quest_1", "reluctant", "cancel"); }}>
                CANCEL
              </button>
            </div>
            
            {/* Animation: Quest Paper Flying Out */}
            <AnimatePresence>
              {animPhase === "accepting" && (
                <motion.div
                  initial={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  animate={{ opacity: 0, y: -150, scale: 0.4, rotate: 25 }}
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
                    border: "4px solid #DC143C", color: "#DC143C", fontFamily: PX, fontSize: 20, padding: "6px 16px",
                    borderRadius: 6, zIndex: 20, background: "rgba(255,255,255,0.9)", boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        style={{ 
          display: "flex", width: 680, maxHeight: "85vh", background: theme.bg, 
          border: `3px solid ${theme.border}`, boxShadow: type === "shrine" ? "0 0 30px rgba(212, 175, 55, 0.3)" : "0 0 20px rgba(0,0,0,0.5)", 
          position: "relative", overflow: "hidden" 
        }}
      >
        <PixelCorners color={theme.border} size={6} />
        
        {/* LEFT: NPC + Speech Bubble */}
        <div style={{ 
          width: "45%", padding: 32, display: "flex", flexDirection: "column", alignItems: "center", 
          borderRight: `2px solid ${theme.border}`, background: "rgba(0,0,0,0.05)",
          backgroundImage: type === "shrine" ? "linear-gradient(to bottom, rgba(212,175,55,0.1), transparent)" : "none"
        }}>
          <motion.div
            animate={
              npcMood === "happy" ? { y: [0, -15, 0] } : 
              npcMood === "reluctant" ? { x: [-5, 5, -5, 5, 0], scale: 0.95 } : 
              npcMood === "talking" ? { y: [0, -3, 0] } : {}
            }
            transition={{ duration: npcMood === "happy" ? 0.4 : 0.3 }}
            style={{ 
              width: 110, height: 110, marginBottom: 20, 
              backgroundImage: `url(${getNpcImage()})`, 
              backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" 
            }}
          />
          
          <div style={{ 
            background: "#FFFFFF", padding: 20, borderRadius: 8, border: `2px solid ${theme.border}`,
            fontFamily: NU, fontSize: 12, color: "#333", textAlign: "center", lineHeight: 1.6, minHeight: 100,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}>
            {/* ลูกศรชี้ไปทาง NPC (ด้านซ้าย) */}
            <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: `10px solid ${theme.border}` }} />
            <div style={{ position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "8px solid #FFFFFF" }} />
            
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={dialogue}>
              "{dialogue}"
            </motion.span>
            </div>
        </div>

        {/* RIGHT: UI Content */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 16, borderBottom: `2px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.03)" }}>
            <span style={{ fontFamily: PX, fontSize: 11, color: theme.accent, letterSpacing: 1 }}>
              {type === "inn" ? "🏨 HEARTHSTONE INN" : type === "shrine" ? "⛪ SACRED SHRINE" : "📋 QUEST BOARD"}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X className="w-6 h-6" />
            </button>
          </div>
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
}