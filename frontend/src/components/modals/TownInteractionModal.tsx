// frontend/src/components/modals/TownInteractionModal.tsx
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { getRandomDialogue } from "../../constants/dialogues";
import type { Character } from "../../types/game";

// Import ภาพ NPC จาก assets (เหมือน ShopModal)
import npc01Img from "../../assets/npc/npc_01.png";
import npc02Img from "../../assets/npc/npc_02.png";
import npc03Img from "../../assets/npc/npc_03.png";
import npcB01Img from "../../assets/npc/npc_b01.png";
import npcB02Img from "../../assets/npc/npc_b02.png";
import npcB03Img from "../../assets/npc/npc_b03.png";
import npcB04Img from "../../assets/npc/npc_b04.png";

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <>{displayed}</>;
}

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

  // Animation states (เหมือน ShopModal)
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [npcBounce, setNpcBounce] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const [bubbleShow, setBubbleShow] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  function after(ms: number, fn: () => void) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }

  // Initial animation (เหมือน ShopModal)
  useEffect(() => {
    after(60, () => setNpcEntered(true));
    after(480, () => setPanelVisible(true));
    after(800, () => {
      setNpcMood("talking");
      setDialogue(getRandomDialogue(type, "greetings"));
      setBubbleShow(true);
    });
    after(4200, () => setBubbleShow(false));
    after(4700, () => { setNpcMood("idle"); setDialogue(""); });
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [type]);

  // Idle dialogue loop (เหมือน ShopModal)
  useEffect(() => {
    if (npcMood === "idle") {
      const waitTime = 6000 + Math.random() * 8000;
      const t = setTimeout(() => {
        setNpcMood("talking");
        setDialogue(getRandomDialogue(type, "greetings"));
        setBubbleShow(true);
        after(5000, () => setBubbleShow(false));
        after(5500, () => { setNpcMood("idle"); setDialogue(""); });
      }, waitTime);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [npcMood, type]);

  // เลือกภาพ NPC
  const getNpcImage = () => {
    if (type === "quest") {
      if (npcMood === "happy") return npcB02Img;
      if (npcMood === "reluctant") return npcB04Img;
      if (npcMood === "talking") return npcB01Img;
      return npcB03Img;
    } else {
      if (npcMood === "happy") return npc02Img;
      if (npcMood === "talking") return npc01Img;
      return npc03Img;
    }
  };

  // ธีมสี
  const theme = type === "shrine" 
    ? { 
        bg: "#F5F5FA", 
        border: "#D4AF37", 
        accent: "#D4AF37",
        wood1: "#8B7355",
        wood2: "#A08060",
        wood3: "#D4AF37",
        cream: "#FAFAFA"
      }
    : { 
        bg: "#FFF8E7", 
        border: "#8B5A2B", 
        accent: "#8B5A2B",
        wood1: "#3d2006",
        wood2: "#6b3a1f",
        wood3: "#a0622a",
        cream: "#fdf4e7"
      };

  const handleStatChange = (stat: keyof typeof character.stats, delta: number) => {
    const currentVal = tempStats[stat];
    const baseVal = character.stats[stat];
    if (delta < 0 && currentVal + delta < baseVal - 8) return;
    if (delta > 0 && (character.statusPoints || 0) <= 0) return;
    setTempStats(prev => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  const triggerAction = (action: string, data?: any, successMood: typeof npcMood = "happy", dialogueKey?: string) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    
    if (successMood) setNpcMood(successMood);
    if (dialogueKey) {
      setBubbleShow(false);
      after(100, () => {
        setNpcBounce(true);
        setDialogue(getRandomDialogue(type, dialogueKey));
        setBubbleShow(true);
      });
      after(700, () => setNpcBounce(false));
      after(4700, () => setBubbleShow(false));
      after(5200, () => { setNpcMood("idle"); setDialogue(""); });
    }
    
    setTimeout(() => {
      onAction(action, data);
    }, 400);
  };

  function handleClose() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcMood("talking");
    setDialogue("Come back soon, adventurer!");
    setBubbleShow(true);
    after(200, () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  }

  const npcSrc = getNpcImage();

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
              background: theme.cream, 
              border: `2px solid ${theme.border}` 
            }}
            onClick={() => triggerAction("longRest", null, "happy", "restSuccess")}
          >
            <div style={{ fontFamily: PX, fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>️ LONG REST</div>
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
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      display: "flex", alignItems: "stretch",
      background: "rgba(20, 10, 4, 0.78)",
      backdropFilter: "blur(3px)",
    }}>
      <style>{`
        @keyframes town-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes town-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes town-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes town-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes npc-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-7px)} }
        @keyframes npc-bounce-once { 0%{transform:translateX(-50%) translateY(0px) scale(1)} 25%{transform:translateX(-50%) translateY(-22px) scale(1.04)} 55%{transform:translateX(-50%) translateY(6px) scale(0.97)} 75%{transform:translateX(-50%) translateY(-8px) scale(1.01)} 100%{transform:translateX(-50%) translateY(0px) scale(1)} }
        @keyframes bubble-pop-in { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes bubble-fade-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
      `}</style>

      {/* LEFT PANEL: NPC */}
      <div style={{
        width: "25%", flexShrink: 0, position: "relative",
        background: type === "shrine" 
          ? `linear-gradient(180deg, #2a2040 0%, #3d3060 50%, #4d4080 100%)`
          : `linear-gradient(180deg, #1a0c04 0%, #2d1606 50%, #3d2008 100%)`,
        borderRight: `4px solid ${theme.wood2}`,
        overflow: "hidden",
        animation: npcExiting ? "town-npc-out 0.7s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
          : npcEntered ? "town-npc-in 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : "none",
        transform: "translateX(-115%)",
      }}>
        <img src={npcSrc} alt="NPC"
          style={{
            position: "absolute", bottom: 0, left: "50%",
            transform: "translateX(-50%)", width: "100%", height: "auto",
            imageRendering: "pixelated", display: "block",
            animation: npcBounce ? "npc-bounce-once 0.6s cubic-bezier(0.34, 1.5, 0.64, 1) forwards" : "npc-breathe 3.8s ease-in-out 0.5s infinite",
          }} />

        {bubbleText && (
          <div style={{
            position: "absolute", top: "6%", left: 10, width: "calc(100% - 20px)", zIndex: 6,
            animation: bubbleShow ? "bubble-pop-in 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards" : "bubble-fade-out 0.5s ease forwards",
            pointerEvents: "none",
          }}>
            <div style={{
              background: theme.cream, border: `3px solid ${theme.wood3}`, borderRadius: 12,
              padding: "10px 12px", fontFamily: NU, fontSize: 12, color: theme.wood1, lineHeight: 1.5,
              boxShadow: `0 4px 16px rgba(100,50,0,0.35)`, position: "relative",
            }}>
              <TypewriterText text={dialogue} speed={25} />
              <div style={{ position: "absolute", bottom: -10, left: "50%", marginLeft: -7, width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `10px solid ${theme.wood3}` }} />
              <div style={{ position: "absolute", bottom: -6, left: "50%", marginLeft: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `8px solid ${theme.cream}` }} />
            </div>
          </div>
        )}

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
          padding: "10px 12px",
          background: `linear-gradient(180deg, ${theme.wood2}ee 0%, ${theme.wood1}f8 100%)`,
          borderTop: `3px solid ${theme.wood3}`,
          boxShadow: `0 -4px 16px rgba(0,0,0,0.6)`, textAlign: "center",
        }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: theme.cream, letterSpacing: 2, textShadow: `0 1px 3px ${theme.wood1}` }}>
            {type === "inn" ? "INNKEEPER" : type === "shrine" ? "PRIESTESS" : "QUEST GIVER"}
          </div>
          <div style={{ fontFamily: NU, fontSize: 10, color: theme.wood3, marginTop: 2 }}>
            {type === "inn" ? "Hearthstone Inn" : type === "shrine" ? "Sacred Shrine" : "Quest Board"}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: theme.bg, position: "relative", overflow: "hidden",
        animation: panelExiting ? "town-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
          : panelVisible ? "town-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards" : "none",
        opacity: panelVisible ? 1 : 0,
        transform: panelVisible ? "translateX(0)" : "translateX(70px)",
      }}>
        <div style={{
          position: "relative", zIndex: 1,
          background: `linear-gradient(180deg, ${theme.wood2} 0%, ${theme.wood1} 100%)`,
          borderBottom: `4px solid ${theme.wood1}`, boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ height: 8, background: `repeating-linear-gradient(90deg, ${theme.wood3} 0px, ${theme.wood3} 12px, ${theme.wood2} 12px, ${theme.wood2} 24px)` }} />
          <div style={{ padding: "12px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 12, color: theme.cream, letterSpacing: 2, textShadow: `0 2px 4px ${theme.wood1}` }}>
                {type === "inn" ? "🏨 HEARTHSTONE INN" : type === "shrine" ? "⛪ SACRED SHRINE" : " QUEST BOARD"}
              </div>
              <div style={{ fontFamily: NU, fontSize: 11, color: theme.wood3, marginTop: 3 }}>
                {type === "inn" ? "Rest and recover" : type === "shrine" ? "Divine blessings await" : "Adventures await"}
              </div>
            </div>
            <button onClick={handleClose} style={{
              background: `linear-gradient(180deg, ${theme.wood3} 0%, ${theme.wood2} 100%)`,
              border: `2px solid ${theme.wood1}`, cursor: "pointer", color: theme.cream, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `inset 0 1px 0 ${theme.wood2}60, 0 2px 4px rgba(0,0,0,0.4)`, transition: "transform 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          position: "relative", zIndex: 1,
        }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}