import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import type { Character, Stats } from "../../types/game";
import {
  EXP_REQUIREMENTS,
  getTotalExpForLevel,
  getExpToNextLevel,
} from "../../constants/levels";

import npcStatueImg from "../../assets/npc/npc_01.png";
import npcStatueImg2 from "../../assets/npc/npc_02.png";
import npcStatueImg3 from "../../assets/npc/npc_03.png";

const STATUE_WELCOME_QUOTES = [
  "Ah, another soul seeking strength! Welcome! ✨",
  "The sacred light shines upon you, adventurer.",
  "I sense your potential growing. How may I help?",
  "The divine energy flows through you.",
  "Your determination pleases the spirits!",
];

const STATUE_LEVELUP_QUOTES = [
  "Congratulations! Your power grows! ✨",
  "The spirits bless your advancement!",
  "You've grown stronger than before!",
  "The blessing descends upon you!",
  "Such progress! The gods are pleased!",
];

const STATUE_STATUS_QUOTES = [
  "Adjusting your attributes... there we go.",
  "Your natural talents are being enhanced.",
  "The statue glows as your stats shift.",
  "Feel the power coursing through you!",
  "Your essence transforms!",
];

const STATUE_FAREWELL_QUOTES = [
  "May the spirits guide your path. Farewell!",
  "Go forth with renewed strength!",
  "The sacred light goes with you.",
  "Return whenever you need strength!",
  "Your journey is blessed by the gods.",
];

export function StatueModal({
  char,
  onLevelUp,
  onUpdateStats,
  onClose,
}: {
  char: Character;
  onLevelUp: (leveledChar: Character) => void;
  onUpdateStats: (updatedChar: Character) => void;
  onClose: () => void;
}) {
  type NpcFace = "talk" | "happy" | "idle" | "exiting";
  const [npcFace, setNpcFace] = useState<NpcFace>("talk");
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [npcBounce, setNpcBounce] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const [bubbleText, setBubbleText] = useState<string>("");
  const [bubbleShow, setBubbleShow] = useState(false);

  const [mode, setMode] = useState<"menu" | "levelup" | "stats">("menu");
  const [tempStats, setTempStats] = useState<Stats>(char.stats);
  const [statChanges, setStatChanges] = useState<Record<keyof Stats, number>>({
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
  });

  const canLevelUp =
    char.level < 10 &&
    char.exp >= getTotalExpForLevel(char.level + 1);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  function after(ms: number, fn: () => void) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }

  useEffect(() => {
    after(60, () => setNpcEntered(true));
    after(480, () => setPanelVisible(true));
    after(800, () => {
      setNpcFace("talk");
      setBubbleText(
        STATUE_WELCOME_QUOTES[
          Math.floor(Math.random() * STATUE_WELCOME_QUOTES.length)
        ]
      );
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

  function handleLevelUp() {
    if (!canLevelUp) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote =
      STATUE_LEVELUP_QUOTES[
        Math.floor(Math.random() * STATUE_LEVELUP_QUOTES.length)
      ];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("happy");
      setNpcBounce(true);
      setBubbleText(quote);
      setBubbleShow(true);
    });
    after(700, () => setNpcBounce(false));

    after(1200, () => {
      const newLevel = char.level + 1;
      const leveledChar = {
        ...char,
        level: newLevel,
        statusPoints: char.statusPoints + 1,
      };
      onLevelUp(leveledChar);
    });

    after(3500, () => setBubbleShow(false));
    after(4000, () => {
      setNpcFace("idle");
      setBubbleText("");
      setMode("menu");
    });
  }

  function handleStatChange(stat: keyof Stats, delta: number) {
    const newChange = statChanges[stat] + delta;
    // Limit to max reduction of 8 per stat
    if (newChange >= -8 && newChange <= 8) {
      setStatChanges((prev) => ({ ...prev, [stat]: newChange }));
      setTempStats((prev) => ({
        ...prev,
        [stat]: char.stats[stat] + newChange,
      }));
    }
  }

  function handleSaveStats() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote =
      STATUE_STATUS_QUOTES[
        Math.floor(Math.random() * STATUE_STATUS_QUOTES.length)
      ];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("talk");
      setBubbleText(quote);
      setBubbleShow(true);
    });

    after(1200, () => {
      const updatedChar = {
        ...char,
        stats: tempStats,
      };
      onUpdateStats(updatedChar);
    });

    after(3500, () => setBubbleShow(false));
    after(4000, () => {
      setNpcFace("idle");
      setBubbleText("");
      setMode("menu");
    });
  }

  function handleResetStats() {
    setTempStats(char.stats);
    setStatChanges({
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
  }

  function handleClose() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcFace("talk");
    const farewell =
      STATUE_FAREWELL_QUOTES[
        Math.floor(Math.random() * STATUE_FAREWELL_QUOTES.length)
      ];
    setBubbleText(farewell);
    setBubbleShow(true);
    after(200, () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  }

  const npcSrc =
    npcFace === "talk"
      ? npcStatueImg
      : npcFace === "happy"
        ? npcStatueImg2
        : npcStatueImg3;

  const sacred1 = "#4a3a5c",
    sacred2 = "#6b5a7f",
    sacred3 = "#8b7a9f",
    sacred4 = "#b4a0c8",
    sacred5 = "#d4c0e8";
  const cream = "#fdf4e7",
    cream2 = "#f5e8d0";
  const panelBg =
    "linear-gradient(170deg, #f5f0fb 0%, #ede8f5 60%, #e8e0f0 100%)";
  const borderW = "#b8a8d8";

  const nextLevelExp = getTotalExpForLevel(char.level + 1);
  const expToNext = getExpToNextLevel(char.level, char.exp);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(20, 10, 30, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      <style>{`
        @keyframes statue-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes statue-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes statue-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes statue-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes statue-npc-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-7px)} }
        @keyframes statue-npc-bounce { 0%{transform:translateX(-50%) translateY(0px) scale(1)} 25%{transform:translateX(-50%) translateY(-22px) scale(1.04)} 55%{transform:translateX(-50%) translateY(6px) scale(0.97)} 75%{transform:translateX(-50%) translateY(-8px) scale(1.01)} 100%{transform:translateX(-50%) translateY(0px) scale(1)} }
        @keyframes sacred-shine { 0%{opacity:0} 50%{opacity:0.1} 100%{opacity:0} }
        @keyframes statue-bubble-pop { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes statue-bubble-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
      `}</style>

      {/* LEFT PANEL: NPC */}
      <div
        style={{
          width: "25%",
          flexShrink: 0,
          position: "relative",
          background: `linear-gradient(180deg, #2a1a3c 0%, #3d2a52 50%, #4a3a5c 100%)`,
          borderRight: `4px solid ${sacred2}`,
          overflow: "hidden",
          animation: npcExiting
            ? "statue-npc-out 0.7s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
            : npcEntered
              ? "statue-npc-in 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) forwards"
              : "none",
          transform: "translateX(-115%)",
        }}
      >
        {[0.15, 0.35, 0.55, 0.72, 0.88].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${p * 100}%`,
              height: 1,
              background: `${sacred2}40`,
              animation: `sacred-shine 4s ease-in-out ${i * 0.8}s infinite`,
            }}
          />
        ))}

        <img
          src={npcSrc}
          alt="Statue NPC"
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            height: "auto",
            imageRendering: "pixelated",
            display: "block",
            animation: npcBounce
              ? "statue-npc-bounce 0.6s cubic-bezier(0.34, 1.5, 0.64, 1) forwards"
              : "statue-npc-breathe 3.8s ease-in-out 0.5s infinite",
          }}
        />

        {bubbleText && (
          <div
            style={{
              position: "absolute",
              top: "6%",
              left: 10,
              width: "calc(100% - 20px)",
              zIndex: 6,
              animation: bubbleShow
                ? "statue-bubble-pop 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards"
                : "statue-bubble-out 0.5s ease forwards",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: cream,
                border: `3px solid ${sacred4}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontFamily: NU,
                fontSize: 12,
                color: sacred1,
                lineHeight: 1.5,
                boxShadow: `0 4px 16px rgba(107, 90, 127, 0.35)`,
                position: "relative",
              }}
            >
              {bubbleText}
              <div
                style={{
                  position: "absolute",
                  bottom: -10,
                  left: "50%",
                  marginLeft: -7,
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: `10px solid ${sacred4}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  marginLeft: -5,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `8px solid ${cream}`,
                }}
              />
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5,
            padding: "10px 12px",
            background: `linear-gradient(180deg, ${sacred2}ee 0%, ${sacred1}f8 100%)`,
            borderTop: `3px solid ${sacred4}`,
            boxShadow: `0 -4px 16px rgba(0,0,0,0.6)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: PX,
              fontSize: 9,
              color: cream,
              letterSpacing: 2,
              textShadow: `0 1px 3px ${sacred1}`,
            }}
          >
            STATUE
          </div>
          <div style={{ fontFamily: NU, fontSize: 10, color: sacred5, marginTop: 2 }}>
            Ancient Guardian ✨
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Options */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: panelBg,
          position: "relative",
          overflow: "hidden",
          animation: panelExiting
            ? "statue-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
            : panelVisible
              ? "statue-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards"
              : "none",
          opacity: panelVisible ? 1 : 0,
          transform: panelVisible ? "translateX(0)" : "translateX(70px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, ${sacred5}08 18px, ${sacred5}08 19px)`,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: `linear-gradient(180deg, ${sacred2} 0%, ${sacred1} 100%)`,
            borderBottom: `4px solid ${sacred1}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
          }}
        >
          <div
            style={{
              height: 8,
              background: `repeating-linear-gradient(90deg, ${sacred3} 0px, ${sacred3} 12px, ${sacred4} 12px, ${sacred4} 24px)`,
            }}
          />
          <div
            style={{
              padding: "12px 20px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: PX,
                  fontSize: 12,
                  color: cream,
                  letterSpacing: 2,
                  textShadow: `0 2px 4px ${sacred1}`,
                }}
              >
                ✨ SACRED STATUE
              </div>
              <div
                style={{
                  fontFamily: NU,
                  fontSize: 11,
                  color: sacred5,
                  marginTop: 3,
                }}
              >
                Enlightenment & Ascension
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: `linear-gradient(180deg, ${sacred3} 0%, ${sacred2} 100%)`,
                border: `2px solid ${sacred1}`,
                cursor: "pointer",
                color: cream,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `inset 0 1px 0 ${sacred4}60, 0 2px 4px rgba(0,0,0,0.4)`,
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {mode === "menu" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              position: "relative",
              zIndex: 1,
              gap: 24,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: PX,
                  fontSize: 12,
                  color: sacred1,
                  marginBottom: 8,
                }}
              >
                Level {char.level} / 10
              </div>
              <div style={{ fontFamily: NU, fontSize: 10, color: sacred3 }}>
                EXP: {char.exp} / {nextLevelExp}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 4,
                  background: sacred5 + "40",
                  border: `1px solid ${borderW}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${sacred4}, ${sacred3})`,
                    width: `${Math.min(100, (char.exp / nextLevelExp) * 100)}%`,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                flexDirection: "column",
                width: "100%",
                maxWidth: 300,
              }}
            >
              <button
                onClick={() => {
                  setMode("levelup");
                }}
                disabled={!canLevelUp}
                style={{
                  padding: "12px 20px",
                  background: canLevelUp
                    ? `linear-gradient(180deg, ${sacred4} 0%, ${sacred2} 100%)`
                    : "#9a8ab8",
                  border: `2px solid ${canLevelUp ? sacred1 : "#7a7a98"}`,
                  color: cream,
                  fontFamily: PX,
                  fontSize: 10,
                  cursor: canLevelUp ? "pointer" : "not-allowed",
                  opacity: canLevelUp ? 1 : 0.6,
                  boxShadow: canLevelUp
                    ? `inset 0 1px 0 ${sacred4}80, 0 3px 8px rgba(0,0,0,0.3)`
                    : "none",
                  transition: "transform 0.1s",
                  letterSpacing: 1,
                }}
                onMouseEnter={(e) => {
                  if (canLevelUp) e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                ⬆️ LEVEL UP
              </button>

              <button
                onClick={() => {
                  setMode("stats");
                  handleResetStats();
                }}
                style={{
                  padding: "12px 20px",
                  background: `linear-gradient(180deg, ${sacred4} 0%, ${sacred2} 100%)`,
                  border: `2px solid ${sacred1}`,
                  color: cream,
                  fontFamily: PX,
                  fontSize: 10,
                  cursor: "pointer",
                  boxShadow: `inset 0 1px 0 ${sacred4}80, 0 3px 8px rgba(0,0,0,0.3)`,
                  transition: "transform 0.1s",
                  letterSpacing: 1,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                ⚙️ ADJUST STATS
              </button>
            </div>

            {char.statusPoints > 0 && (
              <div
                style={{
                  background: `${sacred4}20`,
                  border: `2px solid ${sacred4}60`,
                  borderRadius: 4,
                  padding: "10px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: MO,
                    fontSize: 12,
                    color: sacred2,
                  }}
                >
                  Status Points: <span style={{ fontWeight: 700 }}>{char.statusPoints}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "levelup" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div
                style={{
                  fontFamily: PX,
                  fontSize: 14,
                  color: sacred1,
                  marginBottom: 8,
                }}
              >
                READY TO ASCEND?
              </div>
              <div style={{ fontFamily: NU, fontSize: 11, color: sacred3 }}>
                You are ready to reach Level {char.level + 1}!
              </div>
            </div>

            <button
              onClick={handleLevelUp}
              style={{
                padding: "14px 32px",
                background: `linear-gradient(180deg, ${sacred4} 0%, ${sacred2} 100%)`,
                border: `2px solid ${sacred1}`,
                color: cream,
                fontFamily: PX,
                fontSize: 11,
                cursor: "pointer",
                boxShadow: `inset 0 1px 0 ${sacred4}80, 0 4px 12px rgba(0,0,0,0.4)`,
                transition: "all 0.1s",
                letterSpacing: 1,
                marginBottom: 16,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `inset 0 1px 0 ${sacred4}80, 0 6px 16px rgba(107, 90, 127, 0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = `inset 0 1px 0 ${sacred4}80, 0 4px 12px rgba(0,0,0,0.4)`;
              }}
            >
              ✨ ASCEND ✨
            </button>

            <button
              onClick={() => setMode("menu")}
              style={{
                padding: "8px 24px",
                background: `${sacred3}40`,
                border: `2px solid ${sacred3}`,
                color: sacred1,
                fontFamily: PX,
                fontSize: 9,
                cursor: "pointer",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-1px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              BACK
            </button>
          </div>
        )}

        {mode === "stats" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              position: "relative",
              zIndex: 1,
              overflowY: "auto",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: PX,
                  fontSize: 11,
                  color: sacred1,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                STAT ADJUSTMENT (DEMO)
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                }}
              >
                {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                  <div
                    key={stat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px",
                      background: `${sacred4}20`,
                      border: `1px solid ${sacred4}60`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: PX,
                        fontSize: 9,
                        color: sacred1,
                        minWidth: 40,
                        textTransform: "uppercase",
                      }}
                    >
                      {stat}
                    </span>
                    <button
                      onClick={() => handleStatChange(stat, -1)}
                      disabled={statChanges[stat] <= -8}
                      style={{
                        width: 24,
                        height: 24,
                        background: `${sacred2}80`,
                        border: `1px solid ${sacred1}`,
                        color: cream,
                        cursor:
                          statChanges[stat] <= -8 ? "not-allowed" : "pointer",
                        opacity: statChanges[stat] <= -8 ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      style={{
                        fontFamily: MO,
                        fontSize: 11,
                        color: sacred1,
                        fontWeight: 700,
                        minWidth: 30,
                        textAlign: "center",
                      }}
                    >
                      {tempStats[stat]}
                    </span>
                    <button
                      onClick={() => handleStatChange(stat, 1)}
                      disabled={statChanges[stat] >= 8}
                      style={{
                        width: 24,
                        height: 24,
                        background: `${sacred2}80`,
                        border: `1px solid ${sacred1}`,
                        color: cream,
                        cursor:
                          statChanges[stat] >= 8 ? "not-allowed" : "pointer",
                        opacity: statChanges[stat] >= 8 ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span
                      style={{
                        fontFamily: PX,
                        fontSize: 8,
                        color: sacred3,
                        minWidth: 30,
                        textAlign: "right",
                      }}
                    >
                      {statChanges[stat] > 0 ? "+" : ""}{statChanges[stat]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={handleSaveStats}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: `linear-gradient(180deg, ${sacred4} 0%, ${sacred2} 100%)`,
                  border: `2px solid ${sacred1}`,
                  color: cream,
                  fontFamily: PX,
                  fontSize: 9,
                  cursor: "pointer",
                  transition: "transform 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                ✓ CONFIRM
              </button>
              <button
                onClick={() => setMode("menu")}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: `${sacred3}40`,
                  border: `2px solid ${sacred3}`,
                  color: sacred1,
                  fontFamily: PX,
                  fontSize: 9,
                  cursor: "pointer",
                  transition: "transform 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                ✕ CANCEL
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "10px 20px",
            borderTop: `3px solid ${sacred4}`,
            background: `linear-gradient(180deg, ${sacred4}40 0%, ${sacred3}30 100%)`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: PX,
              fontSize: 7,
              color: sacred2,
              letterSpacing: 2,
            }}
          >
            🕯️ SACRED GROUNDS 🕯️
          </span>
        </div>
      </div>
    </div>
  );
}

void pixelBtn;
