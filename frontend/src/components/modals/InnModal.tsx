import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import type { Character } from "../../types/game";
import { LONG_REST_COST } from "../../constants/levels";

import npcInnImg from "../../assets/npc/npc_01.png";
import npcInnImg2 from "../../assets/npc/npc_02.png";
import npcInnImg3 from "../../assets/npc/npc_03.png";

const INN_WELCOME_QUOTES = [
  "Welcome, traveler! Looking for a place to rest?",
  "Come in, come in! You look tired from your journey.",
  "Our rooms are the best in town, promise!",
  "Rest well, and you'll be back on your feet in no time.",
  "A warm bed is just what you need right now.",
];

const INN_REST_QUOTES = [
  "Sleep well, dear. You deserve it! 💤",
  "Sweet dreams, adventurer. Wake up refreshed!",
  "I'll make sure you're not disturbed. Rest easy.",
  "The softest pillows in all the land await you~",
  "Take all the time you need. Your room is ready.",
];

const INN_FAREWELL_QUOTES = [
  "Thank you for staying with us! Come back soon.",
  "May your journey be safe. Rest whenever you need to!",
  "Safe travels, adventurer. The inn is always open for you.",
  "You're welcome anytime. Good luck out there!",
  "Take care! We'll be here if you need us again.",
];

export function InnModal({
  char,
  onLongRest,
  onClose,
}: {
  char: Character;
  onLongRest: (healedChar: Character) => void;
  onClose: () => void;
}) {
  type NpcFace = "talk" | "happy" | "idle" | "exiting";
  const [npcFace, setNpcFace] = useState<NpcFace>("talk");
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const [bubbleText, setBubbleText] = useState<string>("");
  const [bubbleShow, setBubbleShow] = useState(false);

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
        INN_WELCOME_QUOTES[Math.floor(Math.random() * INN_WELCOME_QUOTES.length)]
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

  function handleLongRest() {
    if (char.gold < LONG_REST_COST) return;

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote =
      INN_REST_QUOTES[Math.floor(Math.random() * INN_REST_QUOTES.length)];

    setBubbleShow(false);
    after(100, () => {
      setNpcFace("talk");
      setBubbleText(quote);
      setBubbleShow(true);
    });

    // Perform the long rest after animation
    after(1200, () => {
      const healedChar = {
        ...char,
        hp: char.maxHp,
        gold: Math.max(0, char.gold - LONG_REST_COST),
      };
      onLongRest(healedChar);
    });

    after(3500, () => setBubbleShow(false));
    after(4000, () => {
      setNpcFace("idle");
      setBubbleText("");
    });
  }

  function handleClose() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcFace("talk");
    const farewell =
      INN_FAREWELL_QUOTES[Math.floor(Math.random() * INN_FAREWELL_QUOTES.length)];
    setBubbleText(farewell);
    setBubbleShow(true);
    after(200, () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  }

  const npcSrc =
    npcFace === "talk" ? npcInnImg : npcFace === "happy" ? npcInnImg2 : npcInnImg3;

  const warm1 = "#8b6f47",
    warm2 = "#a0845c",
    warm3 = "#b89968",
    warm4 = "#d4a876",
    warm5 = "#e8c9a8";
  const cream = "#fdf4e7",
    cream2 = "#f5e8d0";
  const panelBg = "linear-gradient(170deg, #fef9f3 0%, #faf4ed 60%, #f5ede3 100%)";
  const borderW = "#c0a080";

  const canAfford = char.gold >= LONG_REST_COST;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(40, 25, 10, 0.82)",
        backdropFilter: "blur(4px)",
      }}
    >
      <style>{`
        @keyframes inn-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes inn-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes inn-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes inn-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes inn-npc-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-6px)} }
        @keyframes inn-bubble-pop-in { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes inn-bubble-fade-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
        @keyframes warm-shine { 0%{opacity:0} 50%{opacity:0.06} 100%{opacity:0} }
      `}</style>

      {/* LEFT PANEL: INN NPC */}
      <div
        style={{
          width: "25%",
          flexShrink: 0,
          position: "relative",
          background: `linear-gradient(180deg, #4a3728 0%, #6b5035 50%, #8b6f47 100%)`,
          borderRight: `4px solid ${warm3}`,
          overflow: "hidden",
          animation: npcExiting
            ? "inn-npc-out 0.7s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
            : npcEntered
              ? "inn-npc-in 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) forwards"
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
              background: `${warm2}40`,
              animation: `warm-shine 4s ease-in-out ${i * 0.8}s infinite`,
            }}
          />
        ))}

        <img
          src={npcSrc}
          alt="Inn NPC"
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            height: "auto",
            imageRendering: "pixelated",
            display: "block",
            animation: "inn-npc-breathe 3.8s ease-in-out 0.5s infinite",
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
                ? "inn-bubble-pop-in 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards"
                : "inn-bubble-fade-out 0.5s ease forwards",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background: cream,
                border: `3px solid ${warm4}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontFamily: NU,
                fontSize: 12,
                color: warm1,
                lineHeight: 1.5,
                boxShadow: `0 4px 16px rgba(139, 111, 71, 0.35)`,
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
                  borderTop: `10px solid ${warm4}`,
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
            background: `linear-gradient(180deg, ${warm2}ee 0%, ${warm1}f8 100%)`,
            borderTop: `3px solid ${warm4}`,
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
              textShadow: `0 1px 3px ${warm1}`,
            }}
          >
            LYRA
          </div>
          <div style={{ fontFamily: NU, fontSize: 10, color: warm5, marginTop: 2 }}>
            Innkeeper 🏠
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: REST OPTIONS */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: panelBg,
          position: "relative",
          overflow: "hidden",
          animation: panelExiting
            ? "inn-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
            : panelVisible
              ? "inn-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards"
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
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, ${warm5}08 18px, ${warm5}08 19px)`,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: `linear-gradient(180deg, ${warm2} 0%, ${warm1} 100%)`,
            borderBottom: `4px solid ${warm1}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
          }}
        >
          <div
            style={{
              height: 8,
              background: `repeating-linear-gradient(90deg, ${warm3} 0px, ${warm3} 12px, ${warm4} 12px, ${warm4} 24px)`,
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
                  textShadow: `0 2px 4px ${warm1}`,
                }}
              >
                🏠 COZY INN
              </div>
              <div
                style={{
                  fontFamily: NU,
                  fontSize: 11,
                  color: warm5,
                  marginTop: 3,
                }}
              >
                Rest & Recovery ☕
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: `linear-gradient(180deg, ${warm3} 0%, ${warm2} 100%)`,
                border: `2px solid ${warm1}`,
                cursor: "pointer",
                color: cream,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `inset 0 1px 0 ${warm4}60, 0 2px 4px rgba(0,0,0,0.4)`,
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontFamily: PX,
                fontSize: 14,
                color: warm1,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              LONG REST
            </div>
            <div
              style={{
                fontFamily: NU,
                fontSize: 12,
                color: warm3,
                lineHeight: 1.6,
              }}
            >
              Restore all HP and recover your strength 💤
              <br />
              <span style={{ fontFamily: MO, fontSize: 11, marginTop: 4, display: "block" }}>
                Cost: {LONG_REST_COST}g
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
              padding: "12px 16px",
              background: `${warm4}20`,
              border: `2px solid ${warm4}60`,
              borderRadius: 4,
            }}
          >
            <span style={{ fontFamily: MO, fontSize: 12, color: warm2 }}>
              Current HP:
            </span>
            <span style={{ fontFamily: MO, fontSize: 13, color: warm1, fontWeight: 700 }}>
              {char.hp}/{char.maxHp}
            </span>
          </div>

          <button
            onClick={handleLongRest}
            disabled={!canAfford}
            style={{
              padding: "10px 24px",
              background: canAfford
                ? `linear-gradient(180deg, ${warm4} 0%, ${warm2} 100%)`
                : "#b8a8a0",
              border: `2px solid ${canAfford ? warm1 : "#989090"}`,
              color: cream,
              fontFamily: PX,
              fontSize: 10,
              cursor: canAfford ? "pointer" : "not-allowed",
              opacity: canAfford ? 1 : 0.6,
              boxShadow: canAfford
                ? `inset 0 1px 0 ${warm4}80, 0 3px 8px rgba(0,0,0,0.3)`
                : "none",
              transition: "transform 0.1s, box-shadow 0.15s",
              textShadow: `0 1px 2px ${warm1}`,
              letterSpacing: 1,
            }}
            onMouseEnter={(e) => {
              if (canAfford) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `inset 0 1px 0 ${warm4}80, 0 6px 12px rgba(139, 111, 71, 0.4)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = canAfford
                ? `inset 0 1px 0 ${warm4}80, 0 3px 8px rgba(0,0,0,0.3)`
                : "none";
            }}
          >
            💤 REST HERE
          </button>

          {!canAfford && (
            <div
              style={{
                marginTop: 16,
                fontFamily: NU,
                fontSize: 10,
                color: "#c84040",
                textAlign: "center",
              }}
            >
              Not enough gold ({char.gold}/{LONG_REST_COST}g)
            </div>
          )}
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "10px 20px",
            borderTop: `3px solid ${warm4}`,
            background: `linear-gradient(180deg, ${warm4}40 0%, ${warm3}30 100%)`,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: PX,
              fontSize: 7,
              color: warm2,
              letterSpacing: 2,
            }}
          >
            ☕ WARM & COZY ☕
          </span>
        </div>
      </div>
    </div>
  );
}

void pixelBtn;
