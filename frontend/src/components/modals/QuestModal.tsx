import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PX, NU, MO, pixelBtn } from "../../constants/theme";
import type { Character, Item, Party, Quest } from "../../types/game";
import { QUEST_CANCEL_COST } from "../../constants/levels";

import npcQuestImg from "../../assets/npc/npc_b01.png";
import npcQuestImg2 from "../../assets/npc/npc_b02.png";
import npcQuestImg3 from "../../assets/npc/npc_b03.png";
import npcQuestImg4 from "../../assets/npc/npc_b04.png";

const QUEST_WELCOME_QUOTES = [
  "Ah, another brave soul seeking adventure! What brings you here?",
  "Welcome to the Quest Guild! Looking for work?",
  "I have some interesting contracts for you...",
  "Fresh adventurers! Just what we need!",
  "Come, come! Let's find you a quest!",
];

const QUEST_ACCEPT_QUOTES = [
  "Excellent! I know you'll handle this perfectly.",
  "Great choice! I have faith in you.",
  "You're just the one for this job!",
  "Off you go, then! Good luck out there!",
  "This should suit you well!",
];

const QUEST_COMPLETE_QUOTES = [
  "Outstanding work, adventurer! You're a natural!",
  "Fantastic! You've done us a great service!",
  "Brilliant! The Guild is proud of you!",
  "Well done! You're getting stronger!",
  "Impressive! You're becoming legendary!",
];

const QUEST_CANCEL_QUOTES = [
  "Ah... I see. These things happen sometimes.",
  "No worries, take your time planning.",
  "The Guild understands. Perhaps another time.",
  "It's wise to know your limits.",
  "Don't worry, there are always more quests.",
];

export function QuestModal({
  char,
  quests,
  partyQuests,
  party,
  onAccept,
  onClose,
  onCancel,
  nextRefresh,
  onClaim,
  charInventory,
}: {
  char: Character;
  quests: Quest[];
  partyQuests: Quest[];
  party: Party | null;
  onAccept: (id: string) => void;
  onClose: () => void;
  onCancel?: (id: string) => void;
  nextRefresh: number;
  onClaim?: (id: string) => void;
  charInventory?: Item[];
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
    after(4200, () => setBubbleShow(false));
    after(4700, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

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
    after(3500, () => setBubbleShow(false));
    after(4000, () => {
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
    after(3500, () => setBubbleShow(false));
    after(4000, () => {
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
    after(3500, () => setBubbleShow(false));
    after(4000, () => {
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
  const canAccept = (party?.questIds?.length ?? 0) < 2;
  const selectedQuest = quests.find((q) => q.id === selectedQuestId) ?? null;

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
          <div style={{ fontFamily: PX, fontSize: 9, color: cream, letterSpacing: 2, textShadow: `0 1px 3px ${guild1}` }}>GUILDMASTER</div>
          <div style={{ fontFamily: NU, fontSize: 10, color: guild5, marginTop: 2 }}>Quest Dispatcher 📋</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: paperBg, position: "relative", overflow: "hidden", animation: panelExiting ? "quest-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards" : panelVisible ? "quest-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards" : "none", opacity: panelVisible ? 1 : 0, transform: panelVisible ? "translateX(0)" : "translateX(70px)" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, ${guild5}08 18px, ${guild5}08 19px)` }} />
        <div style={{ position: "relative", zIndex: 1, background: `linear-gradient(180deg, ${guild2} 0%, ${guild1} 100%)`, borderBottom: `4px solid ${guild1}`, boxShadow: `0 4px 12px rgba(0,0,0,0.4)` }}>
          <div style={{ height: 8, background: `repeating-linear-gradient(90deg, ${guild3} 0px, ${guild3} 12px, ${guild4} 12px, ${guild4} 24px)` }} />
          <div style={{ padding: "12px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 12, color: cream, letterSpacing: 2, textShadow: `0 2px 4px ${guild1}` }}>📋 QUEST GUILD</div>
              <div style={{ fontFamily: NU, fontSize: 10, color: guild5, marginTop: 3 }}>Refresh in {mins}:{secs.toString().padStart(2, "0")} • {partyQuests.length}/2</div>
            </div>
            <button onClick={handleClose} style={{ background: `linear-gradient(180deg, ${guild3} 0%, ${guild2} 100%)`, border: `2px solid ${guild1}`, cursor: "pointer", color: cream, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 1px 0 ${guild4}60, 0 2px 4px rgba(0,0,0,0.4)`, transition: "transform 0.1s" }} onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(0.95)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "")}><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, display: "flex", background: `linear-gradient(180deg, ${guild3}60 0%, ${guild4}30 100%)`, borderBottom: `3px solid ${guild3}` }}>
          <button onClick={() => setView("available")} style={{ flex: 1, padding: "11px 8px", background: view === "available" ? `linear-gradient(180deg, ${cream} 0%, ${cream2} 100%)` : "none", border: "none", borderRight: `1px solid ${guild3}50`, borderBottom: view === "available" ? `3px solid ${guild2}` : "3px solid transparent", marginBottom: -3, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "background 0.2s" }}>
            <span style={{ fontSize: 16 }}>📝</span>
            <span style={{ fontFamily: PX, fontSize: 7, letterSpacing: 0.5, color: view === "available" ? "#7a4010" : guild2 }}>AVAILABLE</span>
          </button>
          <button onClick={() => setView("active")} style={{ flex: 1, padding: "11px 8px", background: view === "active" ? `linear-gradient(180deg, ${cream} 0%, ${cream2} 100%)` : "none", border: "none", borderLeft: `1px solid ${guild3}50`, borderBottom: view === "active" ? `3px solid ${guild2}` : "3px solid transparent", marginBottom: -3, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "background 0.2s" }}>
            <span style={{ fontSize: 16 }}>⚔️</span>
            <span style={{ fontFamily: PX, fontSize: 7, letterSpacing: 0.5, color: view === "active" ? "#7a4010" : guild2 }}>ACTIVE</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, alignContent: "start", position: "relative", zIndex: 1 }}>
          {selectedQuest && (
            <div style={{ border: `2px solid ${guild3}`, background: "#fff8ec", padding: "12px 14px", borderRadius: 10, boxShadow: `0 4px 10px rgba(0,0,0,0.12)` }}>
              <div style={{ fontFamily: PX, fontSize: 8, color: guild2, letterSpacing: 1, marginBottom: 6 }}>SELECTED CONTRACT</div>
              <div style={{ fontFamily: PX, fontSize: 11, color: guild1, marginBottom: 6 }}>{selectedQuest.title}</div>
              <div style={{ fontFamily: NU, fontSize: 11, color: "#6f4d2d", lineHeight: 1.4, marginBottom: 8 }}>{selectedQuest.description}</div>
              <div style={{ display: "flex", gap: 8, fontFamily: MO, fontSize: 9, marginBottom: 8 }}>
                <span style={{ color: "#4a7c2a" }}>+{selectedQuest.reward.exp} EXP</span>
                <span style={{ color: "#a07010" }}>+{selectedQuest.reward.gold}g</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept(selectedQuest.id);
                }}
                disabled={!canAccept}
                style={{ padding: "7px 10px", background: canAccept ? `linear-gradient(180deg, ${guild4} 0%, ${guild2} 100%)` : "#c0a898", border: `2px solid ${canAccept ? guild1 : "#9a8878"}`, color: cream, fontFamily: PX, fontSize: 8, cursor: canAccept ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: canAccept ? 1 : 0.6 }}
              >
                📋 ACCEPT QUEST
              </button>
            </div>
          )}

          {view === "available" ? (
            quests.length === 0 ? (
              <div style={{ textAlign: "center", color: guild3, fontFamily: NU, fontSize: 13, padding: 32 }}>📋 No quests available. Check back after refresh.</div>
            ) : (
              quests.map((q) => (
                <div key={q.id} onClick={() => setSelectedQuestId(q.id)} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", background: cream, border: `2px solid ${borderW}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 8px rgba(100,50,0,0.12)`, position: "relative", overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${guild3}, ${guild4}, ${guild3})` }} />
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontFamily: PX, fontSize: 10, color: guild1, marginBottom: 4 }}>{q.title}</div>
                    <div style={{ fontFamily: NU, fontSize: 11, color: "#7a5030", lineHeight: 1.4 }}>{q.description}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontFamily: MO, fontSize: 9, marginBottom: 8 }}>
                    <span style={{ color: "#4a7c2a" }}>+{q.reward.exp} EXP</span>
                    <span style={{ color: "#a07010" }}>+{q.reward.gold}g</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleAccept(q.id); }} disabled={!canAccept} style={{ padding: "7px 0", background: canAccept ? `linear-gradient(180deg, ${guild4} 0%, ${guild2} 100%)` : "#c0a898", border: `2px solid ${canAccept ? guild1 : "#9a8878"}`, color: cream, fontFamily: PX, fontSize: 8, cursor: canAccept ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: canAccept ? 1 : 0.6 }}>
                    📋 ACCEPT
                  </button>
                </div>
              ))
            )
          ) : (
            partyQuests.length === 0 ? (
              <div style={{ textAlign: "center", color: guild3, fontFamily: NU, fontSize: 13, padding: 32 }}>⚔️ No active quests. Accept one to begin!</div>
            ) : (
              partyQuests.map((q) => {
                const isDone = q.readyToTurnIn || q.completed;
                let gatherCurrent = 0;
                let gatherReady = false;
                if (q.gatherTarget && charInventory) {
                  gatherCurrent = charInventory.filter((item) => item.name === q.gatherTarget?.itemName).length;
                  gatherReady = gatherCurrent >= (q.gatherTarget?.count ?? 0);
                }
                const showTurnIn = isDone || gatherReady;

                return (
                  <div key={`${q.id}-active`} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", background: showTurnIn ? "#f4e8d0" : cream, border: `2px solid ${showTurnIn ? "#d4a020" : borderW}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 8px rgba(100,50,0,0.12)`, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: showTurnIn ? `linear-gradient(90deg, #d4a020, #f0d070, #d4a020)` : `linear-gradient(90deg, ${guild3}, ${guild4}, ${guild3})` }} />
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ fontFamily: PX, fontSize: 10, color: showTurnIn ? "#8b5a00" : guild1, marginBottom: 4 }}>{q.title}</div>
                      {showTurnIn ? (
                        <div style={{ fontFamily: PX, fontSize: 8, color: "#2a6b2a" }}>✅ COMPLETE — Turn in your quest!</div>
                      ) : q.gatherTarget ? (
                        <div>
                          <div style={{ fontFamily: MO, fontSize: 9, color: guild3, marginBottom: 6 }}>{gatherCurrent}/{q.gatherTarget.count} {q.gatherTarget.itemName}</div>
                          <div style={{ height: 4, background: "#e0e0e0", border: `1px solid #b8b8b8` }}>
                            <div style={{ height: "100%", width: `${Math.min(100, (gatherCurrent / q.gatherTarget.count) * 100)}%`, background: "#4cdb70" }} />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontFamily: MO, fontSize: 9, color: guild3, marginBottom: 6 }}>{q.killTarget?.current}/{q.killTarget?.count} Defeated</div>
                          <div style={{ height: 4, background: "#e0e0e0", border: `1px solid #b8b8b8` }}>
                            <div style={{ height: "100%", width: `${((q.killTarget?.current ?? 0) / (q.killTarget?.count ?? 1)) * 100}%`, background: guild3 }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {showTurnIn ? (
                        <button onClick={() => handleClaim(q.id)} style={{ flex: 1, padding: "7px 0", background: `linear-gradient(180deg, #4cdb70 0%, #2a9a50 100%)`, border: `2px solid #1a6a30`, color: cream, fontFamily: PX, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          🎁 TURN IN
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleCancelQuest(q.id)} disabled={char.gold < QUEST_CANCEL_COST} style={{ flex: 1, padding: "7px 0", background: char.gold >= QUEST_CANCEL_COST ? `linear-gradient(180deg, #f2c07b 0%, #df9d3f 100%)` : "#d8c0a0", border: `2px solid ${char.gold >= QUEST_CANCEL_COST ? "#a0651a" : "#b79c7d"}`, color: cream, fontFamily: PX, fontSize: 8, cursor: char.gold >= QUEST_CANCEL_COST ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: char.gold >= QUEST_CANCEL_COST ? 1 : 0.65 }}>
                            🗑️ CANCEL (-{QUEST_CANCEL_COST})
                          </button>
                          <button onClick={() => handleClaim(q.id)} style={{ flex: 1, padding: "7px 0", background: `linear-gradient(180deg, #6aa2ff 0%, #4b7dd9 100%)`, border: `2px solid #3257a6`, color: cream, fontFamily: PX, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            🧪 TEST
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "10px 20px", borderTop: `3px solid ${guild3}`, background: `linear-gradient(180deg, ${guild4}40 0%, ${guild3}30 100%)`, display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: guild2, letterSpacing: 2 }}>📋 GUILD BOARD · ALWAYS RECRUITING 📋</span>
        </div>
      </div>
    </div>
  );
}

void pixelBtn;
