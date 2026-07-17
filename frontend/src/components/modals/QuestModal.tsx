import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PX, NU, MO, pixelBtn } from "../../constants/theme";
import type { Character, Item, Party, Quest } from "../../types/game";
import { QUEST_CANCEL_COST } from "../../constants/levels";

import npcQuestImg from "../../assets/npc/npc_b01.png";
import npcQuestImg2 from "../../assets/npc/npc_b02.png";
import npcQuestImg3 from "../../assets/npc/npc_b03.png";
import npcQuestImg4 from "../../assets/npc/npc_b04.png";
import woodenBoardImg from "../../assets/wooden_board.png";
import parchmentImg from "../../assets/parchment_paper.png";

import monsterSlime from "../../assets/monster_slime.png";
import monsterWolf from "../../assets/monster_wolf.png";
import monsterGoblin from "../../assets/monster_goblin.png";
import monsterVine from "../../assets/monster_vine.png";
import monsterTreant from "../../assets/monster_treant.png";

function getMonsterImage(name: string) {
  if (name.includes("Slime")) return monsterSlime;
  if (name.includes("Wolf")) return monsterWolf;
  if (name.includes("Goblin")) return monsterGoblin;
  if (name.includes("Vine")) return monsterVine;
  if (name.includes("Treant")) return monsterTreant;
  return null;
}

const QUEST_WELCOME_QUOTES = [
  "Welcome! We have new quests today... Eek! I almost spilled the ink!",
  "Ah! Where did that document go... Oh, found it! Which quest interests you?",
  "Heave-ho! I must work hard today! Would you like a quest?",
  "We have plenty of new requests! Please help me sort them out.",
];

const QUEST_ACCEPT_QUOTES = [
  "This quest? You got it! Stamping it now... All set!",
  "Excellent choice! Good luck... Watch your step on the way out!",
  "If it's you, Traveler, I'm sure you can handle it!",
];

const QUEST_COMPLETE_QUOTES = [
  "Wow! You actually did it! You're amazing!",
  "Incredible! Here's your reward... Ah! The coins almost dropped!",
  "Thank you for your hard work! The Guild is very proud of you.",
];

const QUEST_CANCEL_QUOTES = [
  "Canceling? What a shame... That's okay, maybe next time!",
  "Hmm... I suppose this quest might be too difficult. You can pick another!",
  "Oh... It's fine! May I have the paper back... Ah, it tore...",
];

const QUEST_IDLE_QUOTES = [
  "If you have any questions, just ask... Ah! Please don't pull that paper!",
  "Today's quests... Wait, is this information written incorrectly?",
  "Hmm... there's so much paperwork... I wish I could go adventuring too.",
  "Ouch! Paper cut... It just stings a little, I'm fine!",
  "Please give me a moment to organize these documents...",
];

export function QuestModal({
  char,
  quests,
  activeQuests,
  nextRefresh,
  onAccept,
  onCancel,
  onClaim,
  charInventory,
  onClose,
}: {
  char: Character;
  quests: Quest[];
  activeQuests: Quest[];
  nextRefresh: number;
  onAccept: (id: string) => void;
  onCancel?: (id: string) => void;
  onClaim?: (id: string) => void;
  charInventory?: Item[];
  onClose: () => void;
}) {
  type NpcFace = "talk" | "happy" | "sad" | "idle" | "exiting";
  const [npcFace, setNpcFace] = useState<NpcFace>("talk");
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [npcBounce, setNpcBounce] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleShow, setBubbleShow] = useState(false);
  const [view, setView] = useState<"available" | "active">("available");
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, fn: () => void) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };

  useEffect(() => {
    after(60, () => setNpcEntered(true));
    after(480, () => setPanelVisible(true));
    after(800, () => {
      setNpcFace("talk");
      setBubbleText(QUEST_WELCOME_QUOTES[Math.floor(Math.random() * QUEST_WELCOME_QUOTES.length)]);
      setBubbleShow(true);
    });
    after(6200, () => setBubbleShow(false));
    after(6700, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (npcFace === "idle") {
      const waitTime = 6000 + Math.random() * 8000;
      const t = setTimeout(() => {
        setNpcFace("talk");
        setBubbleText(QUEST_IDLE_QUOTES[Math.floor(Math.random() * QUEST_IDLE_QUOTES.length)]);
        setBubbleShow(true);
        after(7000, () => setBubbleShow(false));
        after(5500, () => { setNpcFace("idle"); setBubbleText(""); });
      }, waitTime);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [npcFace]);

  const handleAccept = (id: string) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote = QUEST_ACCEPT_QUOTES[Math.floor(Math.random() * QUEST_ACCEPT_QUOTES.length)];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("talk");
      setBubbleText(quote);
      setBubbleShow(true);
    });

    after(300, () => onAccept(id));
    after(5500, () => setBubbleShow(false));
    after(6000, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
  };

  const handleCancelQuest = (id: string) => {
    if (!onCancel || char.gold < QUEST_CANCEL_COST) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote = QUEST_CANCEL_QUOTES[Math.floor(Math.random() * QUEST_CANCEL_QUOTES.length)];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("sad");
      setBubbleText(quote);
      setBubbleShow(true);
    });

    after(300, () => onCancel(id));
    after(5500, () => setBubbleShow(false));
    after(6000, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
  };

  const handleClaim = (id: string) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote = QUEST_COMPLETE_QUOTES[Math.floor(Math.random() * QUEST_COMPLETE_QUOTES.length)];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("happy");
      setNpcBounce(true);
      setBubbleText(quote);
      setBubbleShow(true);
    });
    after(700, () => setNpcBounce(false));
    after(300, () => onClaim?.(id));
    after(5500, () => setBubbleShow(false));
    after(6000, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
  };

  const handleClose = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcFace("talk");
    setBubbleText("Good luck out there, adventurer!");
    setBubbleShow(true);
    after(200, () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  };

  const npcSrc =
    npcFace === "talk"
      ? npcQuestImg
      : npcFace === "happy"
        ? npcQuestImg2
        : npcFace === "sad"
          ? npcQuestImg4
          : npcQuestImg3;

  const guild1 = "#3d4a6b";
  const guild2 = "#556080";
  const guild3 = "#7a8faa";
  const guild4 = "#a4b5d4";
  const guild5 = "#c8d4f0";
  const cream = "#fdf4e7";
  const cream2 = "#f5e8d0";
  const paperBg = "linear-gradient(170deg, #fef9f3 0%, #faf4ed 60%, #f5ede3 100%)";
  const borderW = "#c0a080";

  const tl = Math.max(0, nextRefresh - Date.now());
  const mins = Math.floor(tl / 60000);
  const secs = Math.floor((tl % 60000) / 1000);
  const canAccept = (activeQuests?.length ?? 0) < 2;
  const selectedQuest = quests.find((q) => q.id === selectedQuestId) ?? activeQuests.find((q) => q.id === selectedQuestId) ?? null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(20, 20, 30, 0.80)",
        backdropFilter: "blur(4px)",
      }}
    >
      <style>{`
        @keyframes quest-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes quest-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes quest-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes quest-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes quest-item-in { 0%{transform:translateX(36px) scaleX(0.92);opacity:0} 65%{transform:translateX(-2px) scaleX(1.01);opacity:1} 100%{transform:translateX(0) scaleX(1);opacity:1} }
        @keyframes quest-npc-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-7px)} }
        @keyframes quest-npc-bounce { 0%{transform:translateX(-50%) translateY(0px) scale(1)} 25%{transform:translateX(-50%) translateY(-22px) scale(1.04)} 55%{transform:translateX(-50%) translateY(6px) scale(0.97)} 75%{transform:translateX(-50%) translateY(-8px) scale(1.01)} 100%{transform:translateX(-50%) translateY(0px) scale(1)} }
        @keyframes guild-shine { 0%{opacity:0} 50%{opacity:0.08} 100%{opacity:0} }
        @keyframes quest-bubble-pop { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes quest-bubble-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
      `}</style>

      <div style={{ width: "25%", flexShrink: 0, position: "relative", background: `linear-gradient(180deg, #1a1a2e 0%, #2d2d52 50%, #3d4a6b 100%)`, borderRight: `4px solid ${guild2}`, overflow: "hidden", animation: npcExiting ? "quest-npc-out 0.7s cubic-bezier(0.4, 0, 0.8, 0.4) forwards" : npcEntered ? "quest-npc-in 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : "none", transform: "translateX(-115%)" }}>
        {[0.15, 0.35, 0.55, 0.72, 0.88].map((p, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${p * 100}%`, height: 1, background: `${guild2}40`, animation: `guild-shine 4s ease-in-out ${i * 0.8}s infinite` }} />
        ))}
        <img src={npcSrc} alt="Quest NPC" style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: "auto", imageRendering: "pixelated", display: "block", animation: npcBounce ? "quest-npc-bounce 0.6s cubic-bezier(0.34, 1.5, 0.64, 1) forwards" : "quest-npc-breathe 3.8s ease-in-out 0.5s infinite" }} />
        {bubbleText && (
          <div style={{ position: "absolute", top: "6%", left: 10, width: "calc(100% - 20px)", zIndex: 6, animation: bubbleShow ? "quest-bubble-pop 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards" : "quest-bubble-out 0.5s ease forwards", pointerEvents: "none" }}>
            <div style={{ background: cream, border: `3px solid ${guild3}`, borderRadius: 12, padding: "10px 12px", fontFamily: NU, fontSize: 12, color: guild1, lineHeight: 1.5, boxShadow: `0 4px 16px rgba(61, 74, 107, 0.35)`, position: "relative" }}>
              {bubbleText}
              <div style={{ position: "absolute", bottom: -10, left: "50%", marginLeft: -7, width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `10px solid ${guild3}` }} />
              <div style={{ position: "absolute", bottom: -6, left: "50%", marginLeft: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `8px solid ${cream}` }} />
            </div>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, padding: "10px 12px", background: `linear-gradient(180deg, ${guild2}ee 0%, ${guild1}f8 100%)`, borderTop: `3px solid ${guild3}`, boxShadow: `0 -4px 16px rgba(0,0,0,0.6)`, textAlign: "center" }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: cream, letterSpacing: 2, textShadow: `0 1px 3px ${guild1}` }}>CHLOE</div>
          <div style={{ fontFamily: NU, fontSize: 10, color: guild5, marginTop: 2 }}>Guild Staff 📋</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundImage: `url(${woodenBoardImg})`, backgroundSize: "128px", imageRendering: "pixelated", position: "relative", overflow: "hidden", animation: panelExiting ? "quest-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards" : panelVisible ? "quest-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards" : "none", opacity: panelVisible ? 1 : 0, transform: panelVisible ? "translateX(0)" : "translateX(70px)", boxShadow: "inset 10px 0 20px rgba(0,0,0,0.5)" }}>
        
        {/* Tabs - Now at the absolute top of the panel */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", borderBottom: `4px solid #302010`, boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
          <button onClick={() => setView("available")} style={{ flex: 1, padding: "8px", background: view === "available" ? guild1 : guild2, border: "none", color: cream, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "background 0.2s" }}>
            <span style={{ fontSize: 16 }}>📝</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontFamily: PX, fontSize: 10, letterSpacing: 2 }}>AVAILABLE</span>
              <span style={{ fontFamily: MO, fontSize: 8, opacity: 0.8, marginTop: 2 }}>Refresh: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
            </div>
          </button>
          <button onClick={() => setView("active")} style={{ flex: 1, padding: "12px", background: view === "active" ? "#1a6a30" : "#2a9a50", border: "none", color: cream, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, transition: "background 0.2s" }}>
            <span style={{ fontSize: 16 }}>⚔️</span>
            <span style={{ fontFamily: PX, fontSize: 10, letterSpacing: 2 }}>ACTIVE</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>
          
          {/* Featured Selected Quest */}
          <div style={{ border: `3px solid #302010`, borderRadius: 4, backgroundImage: `url(${parchmentImg})`, backgroundSize: "96px", backgroundRepeat: "repeat", imageRendering: "pixelated", display: "flex", minHeight: 180, boxShadow: "0 8px 16px rgba(0,0,0,0.4)" }}>
            {selectedQuest ? (
              <>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "rgba(0, 0, 0, 0.1)", padding: "8px 12px", fontFamily: PX, fontSize: 12, color: "#302010", borderBottom: `2px solid #504030` }}>
                    {selectedQuest.title}
                  </div>
                  <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.4)", padding: "12px", fontFamily: NU, fontSize: 14, color: "#201000", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ flex: 1 }}>{selectedQuest.description}</div>
                    <div style={{ display: "flex", gap: 12, fontFamily: MO, fontSize: 10, color: "#8b5a00" }}>
                      <span style={{ color: "#2a5c1a" }}>+{selectedQuest.reward.exp} EXP</span>
                      <span style={{ color: "#805000" }}>+{selectedQuest.reward.gold}g</span>
                    </div>
                  </div>
                  <div style={{ background: "rgba(100, 200, 100, 0.4)", padding: "8px 12px", borderTop: `2px solid #504030`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontFamily: MO, fontSize: 11, color: "#1a5a20", fontWeight: "bold" }}>
                      {selectedQuest.killTarget ? `Target: ${selectedQuest.killTarget.count} ${selectedQuest.killTarget.monster}` : ""}
                      {selectedQuest.gatherTarget ? `Target: ${selectedQuest.gatherTarget.count} ${selectedQuest.gatherTarget.itemName}` : ""}
                      {view === "active" && selectedQuest.killTarget && ` (${selectedQuest.killTarget.current}/${selectedQuest.killTarget.count})`}
                    </div>
                    {view === "available" ? (
                      <button onClick={() => handleAccept(selectedQuest.id)} disabled={!canAccept} style={{ padding: "8px 16px", background: canAccept ? "#e05050" : "#a0a0a0", border: "2px solid #802020", color: "#fff", fontFamily: PX, fontSize: 9, cursor: canAccept ? "pointer" : "not-allowed", borderRadius: 4 }}>
                        ACCEPT QUEST
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleCancelQuest(selectedQuest.id)} disabled={char.gold < QUEST_CANCEL_COST} style={{ padding: "6px 12px", background: char.gold >= QUEST_CANCEL_COST ? "#f2c07b" : "#a0a0a0", border: char.gold >= QUEST_CANCEL_COST ? "2px solid #a0651a" : "2px solid #606060", color: "#fff", fontFamily: PX, fontSize: 8, cursor: char.gold >= QUEST_CANCEL_COST ? "pointer" : "not-allowed", borderRadius: 4 }}>
                          CANCEL (-{QUEST_CANCEL_COST}g)
                        </button>
                        {(() => {
                          const canTurnIn = selectedQuest.killTarget 
                            ? selectedQuest.killTarget.current >= selectedQuest.killTarget.count
                            : selectedQuest.gatherTarget
                            ? charInventory.filter(i => i.name === selectedQuest.gatherTarget?.itemName).length >= selectedQuest.gatherTarget.count
                            : false;
                          return (
                            <button onClick={() => handleClaim(selectedQuest.id)} disabled={!canTurnIn} style={{ padding: "6px 12px", background: canTurnIn ? "#4cdb70" : "#a0a0a0", border: canTurnIn ? "2px solid #1a6a30" : "2px solid #606060", color: "#fff", fontFamily: PX, fontSize: 8, cursor: canTurnIn ? "pointer" : "not-allowed", borderRadius: 4 }}>
                              TURN IN
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ width: 140, background: "rgba(255, 255, 255, 0.6)", borderLeft: `3px solid ${guild1}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12 }}>
                  <div style={{ width: 80, height: 80, background: "rgba(0,0,0,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, marginBottom: 8, overflow: "hidden" }}>
                    {selectedQuest.killTarget && getMonsterImage(selectedQuest.killTarget.monster) ? (
                      <img src={getMonsterImage(selectedQuest.killTarget.monster) ?? ""} style={{ width: 64, height: 64, imageRendering: "pixelated" }} />
                    ) : selectedQuest.killTarget ? "🐉" : "🌿"}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: NU, fontSize: 14, color: guild3 }}>
                Select a quest from the grid below
              </div>
            )}
          </div>

          {/* Quest Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, flex: 1, alignContent: "start" }}>
            {(view === "available" ? quests : (activeQuests || [])).map((q) => {
              const isSelected = selectedQuestId === q.id;
              return (
                <div key={q.id} onClick={() => setSelectedQuestId(q.id)} style={{ aspectRatio: "1/1.2", backgroundImage: `url(${parchmentImg})`, backgroundSize: "96px", backgroundRepeat: "repeat", imageRendering: "pixelated", borderRadius: 4, border: `2px solid ${isSelected ? "#d02020" : "#302010"}`, cursor: "pointer", display: "flex", flexDirection: "column", boxShadow: isSelected ? `0 0 0 2px ${guild4}, 0 6px 12px rgba(0,0,0,0.5)` : `0 4px 8px rgba(0,0,0,0.4)`, transition: "transform 0.1s, border-color 0.1s", transform: isSelected ? "scale(1.05)" : "scale(1)", overflow: "hidden" }}>
                  <div style={{ flex: 1, background: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, borderBottom: `2px solid #302010` }}>
                    {q.killTarget && getMonsterImage(q.killTarget.monster) ? (
                      <img src={getMonsterImage(q.killTarget.monster) ?? ""} style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
                    ) : q.killTarget ? "🐉" : "🌿"}
                  </div>
                  <div style={{ padding: "8px 4px", textAlign: "center", fontFamily: PX, fontSize: 13, fontWeight: "bold", color: "#110", background: "rgba(255, 255, 255, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                    {q.killTarget ? q.killTarget.monster : q.gatherTarget?.itemName}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "8px 20px", borderTop: `2px solid ${guild3}`, background: `linear-gradient(180deg, ${guild4}40 0%, ${guild3}30 100%)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: guild2, letterSpacing: 2 }}>📋 GUILD BOARD</span>
          <button onClick={handleClose} style={{ padding: "8px 16px", background: "#d03030", border: "2px solid #601010", color: "#fff", fontFamily: PX, fontSize: 10, cursor: "pointer", borderRadius: 4, boxShadow: "0 4px 8px rgba(0,0,0,0.4)" }}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

void pixelBtn;
