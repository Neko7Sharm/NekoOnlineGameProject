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

  // เลือกภาพ NPC
  const getNpcImage = () => {
    const prefix = type === "quest" ? "npc_b" : "npc_0";
    if (npcMood === "happy") return `/${prefix}2.png`;
    if (npcMood === "reluctant") return `/npc_b04.png`;
    if (npcMood === "talking") return `/${prefix}1.png`;
    return `/${prefix}3.png`;
  };

  // ธีมสี
  const theme = type === "shrine" 
    ? { bg: "#F5F5FA", border: "#D4AF37", accent: "#D4AF37" }
    : { bg: "#FFF8E7", border: "#8B5A2B", accent: "#8B5A2B" };

  const handleStatChange = (stat: keyof typeof character.stats, delta: number) => {
    const base = character.stats[stat];
    if (tempStats[stat] + delta < base - 8) return;
    setTempStats(prev => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  const triggerAction = (action: string, data?: any, successMood: typeof npcMood = "happy", dialogueKey?: string) => {
    if (successMood) setNpcMood(successMood);
    if (dialogueKey) setDialogue(getRandomDialogue(type, dialogueKey));
    
    setTimeout(() => {
      onAction(action, data);
      setTimeout(() => {
        setAnimPhase("idle");
        setNpcMood("idle");
        setDialogue(getRandomDialogue(type, "greetings"));
      }, 2500);
    }, 500);
  };

  const renderContent = () => {
    if (type === "inn") {
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...pixelBtn("primary"), padding: 16, textAlign: "center", cursor: "pointer", background: theme.bg, border: `2px solid ${theme.border}` }}
               onClick={() => triggerAction("longRest", null, "happy", "restSuccess")}>
            <div style={{ fontFamily: PX, fontSize: 11, marginBottom: 4 }}>🛏️ LONG REST</div>
            <div style={{ fontFamily: MO, fontSize: 9, color: "#B8860B" }}>Cost: 100 Gold</div>
          </div>
        </div>
      );
    }

    if (type === "shrine") {
      const nextExp = EXP_THRESHOLDS[character.level] || Infinity;
      const canLevelUp = character.exp >= nextExp && character.level < 10;
      
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: theme.accent, textAlign: "center" }}>
            LVL {character.level}→{character.level+1}: {nextExp.toLocaleString()} EXP
          </div>
          <button style={{ ...pixelBtn("primary"), opacity: canLevelUp ? 1 : 0.5 }} 
                  disabled={!canLevelUp} onClick={() => triggerAction("levelUp", null, "happy", "levelUpSuccess")}>
            ⛪ LEVEL UP
          </button>
          
          <div style={{ borderTop: `2px dashed ${theme.border}`, paddingTop: 16 }}>
            <div style={{ fontFamily: PX, fontSize: 8, color: theme.accent, marginBottom: 12 }}>ADJUST STATS</div>
            {Object.keys(tempStats).map(stat => (
              <div key={stat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: NU, fontSize: 10, textTransform: "uppercase" }}>{stat}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button style={pixelBtn("ghost")} onClick={() => handleStatChange(stat as any, -1)}>−</button>
                  <span style={{ fontFamily: MO, fontSize: 11, minWidth: 20, textAlign: "center" }}>{tempStats[stat as keyof typeof tempStats]}</span>
                  <button style={pixelBtn("ghost")} onClick={() => handleStatChange(stat as any, 1)}>+</button>
                </div>
              </div>
            ))}
            <button style={{ ...pixelBtn("primary"), width: "100%", marginTop: 12 }}
                    onClick={() => triggerAction("saveStats", tempStats, "happy", "statSave")}>
              SAVE
            </button>
          </div>
        </div>
      );
    }

    if (type === "quest") {
      return (
        <div style={{ padding: 24, maxHeight: 350, overflowY: "auto", position: "relative" }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: theme.accent, marginBottom: 12 }}>📜 QUESTS</div>
          
          <div style={{ padding: 12, background: "#FDF5E6", border: `2px solid ${theme.border}`, marginBottom: 12, position: "relative" }}>
            <div style={{ fontFamily: PX, fontSize: 10, marginBottom: 4 }}>Rat Infestation</div>
            <div style={{ fontFamily: NU, fontSize: 10, color: "#666", marginBottom: 8 }}>Clear 5 rats</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...pixelBtn("primary"), fontSize: 8, flex: 1 }}
                      onClick={() => { setAnimPhase("accepting"); triggerAction("acceptQuest", "quest_1", "talking", "accept"); }}>
                ACCEPT
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 8, flex: 1 }}
                      onClick={() => { setAnimPhase("completing"); triggerAction("completeQuest", "quest_1", "happy", "complete"); }}>
                COMPLETE
              </button>
              <button style={{ ...pixelBtn("primary"), fontSize: 8, flex: 1 }}
                      onClick={() => { setAnimPhase("canceling"); triggerAction("cancelQuest", "quest_1", "reluctant", "cancel"); }}>
                CANCEL
              </button>
            </div>
            
            <AnimatePresence>
              {animPhase === "accepting" && (
                <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -80, scale: 0.5 }}
                  style={{ position: "absolute", inset: 0, background: "#FDF5E6", border: `2px solid ${theme.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PX, fontSize: 9 }}>
                  📜 SCROLL
                </motion.div>
              )}
              {animPhase === "completing" && (
                <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                    border: "3px solid #DC143C", color: "#DC143C", fontFamily: PX, fontSize: 18, padding: "4px 12px", background: "#fff" }}>
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
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ display: "flex", width: 640, background: theme.bg, border: `3px solid ${theme.border}`, position: "relative" }}>
        <PixelCorners color={theme.border} size={6} />
        
        {/* LEFT: NPC + Speech Bubble (เหมือน Shop) */}
        <div style={{ width: "45%", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", borderRight: `2px solid ${theme.border}`, background: "rgba(0,0,0,0.05)" }}>
          <motion.div animate={npcMood === "happy" ? { y: [0, -10, 0] } : npcMood === "reluctant" ? { scale: 0.95 } : {}}
            transition={{ duration: 0.4 }}
            style={{ width: 100, height: 100, marginBottom: 16, 
              backgroundImage: `url(${getNpcImage()})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }} />
          
          <div style={{ background: "#fff", padding: 16, borderRadius: 6, border: `2px solid ${theme.border}`,
            fontFamily: NU, fontSize: 12, color: "#333", textAlign: "center", lineHeight: 1.5, minHeight: 80,
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)",
              width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: `8px solid ${theme.border}` }} />
            <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)",
              width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "6px solid #fff" }} />
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={dialogue}>"{dialogue}"</motion.span>
          </div>
        </div>

        {/* RIGHT: UI Content */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: `2px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.05)" }}>
            <span style={{ fontFamily: PX, fontSize: 10, color: theme.accent }}>
              {type === "inn" ? "🏨 INN" : type === "shrine" ? "⛪ SHRINE" : "📋 QUEST"}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
}