import { useState } from "react";
import { C, PX, NU } from "../../constants/theme";

// Half-body Portraits
import imgNormal from "../../assets/npc/npc_g01.png";
import imgHappy from "../../assets/npc/npc_g02.png";
import imgGentle from "../../assets/npc/npc_g03.png";
import imgPlayful from "../../assets/npc/npc_g06.png";
import imgShocked from "../../assets/npc/npc_g04.png";
import imgWondering from "../../assets/npc/npc_g05.png";
import imgBlushing from "../../assets/npc/npc_g07.png";

import type { Emotion, DialogNode } from "../../types/game";

export function SeleniaDialog({
  dialogTree,
  initialNode = "start",
  onClose
}: {
  dialogTree: Record<string, DialogNode>;
  initialNode?: string;
  onClose: () => void;
}) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(initialNode);
  const node = dialogTree[currentNodeId];

  if (!node) {
    onClose();
    return null;
  }

  const emotionImages: Record<Emotion, string> = {
    normal: imgNormal,
    happy: imgHappy,
    gentle: imgGentle,
    playful: imgPlayful,
    shocked: imgShocked,
    wondering: imgWondering,
    blushing: imgBlushing
  };

  const handleNext = () => {
    if (typeof node.next === "function") {
      node.next();
    } else if (typeof node.next === "string") {
      setCurrentNodeId(node.next);
    } else {
      onClose();
    }
  };

  const handleChoice = (next: string | (() => void)) => {
    if (typeof next === "function") {
      next();
    } else {
      setCurrentNodeId(next);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center"
    }}>
      {/* Character Portrait */}
      <img
        key={node.emotion}
        src={emotionImages[node.emotion]}
        style={{
          height: "70vh",
          objectFit: "contain",
          position: "absolute",
          bottom: 150, // above the dialog box
          animation: "selenia-bounce 0.4s ease-out",
        }}
        alt="Selenia"
      />

      {/* Dialog Box */}
      <div style={{
        width: "90%", maxWidth: 600,
        background: "rgba(255, 255, 255, 0.95)",
        border: `3px solid #d8b4e2`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 20,
        boxShadow: "0 8px 32px rgba(216, 180, 226, 0.4)",
        position: "relative",
        zIndex: 101,
        fontFamily: NU,
        color: "#4a4a68"
      }}>
        {/* Nameplate */}
        <div style={{
          position: "absolute", top: -16, left: 24,
          background: "#c492d6",
          color: "#fff",
          padding: "4px 16px",
          borderRadius: 8,
          fontFamily: PX,
          fontSize: 14,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          letterSpacing: 1
        }}>
          Goddess Selenia
        </div>

        {/* Text */}
        <div style={{ fontSize: 16, lineHeight: 1.5, minHeight: 60, marginTop: 8 }}>
          {node.text}
        </div>

        {/* Choices or Continue */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
          {node.choices ? (
            node.choices.map((c, i) => (
              <button key={i} onClick={() => handleChoice(c.next)}
                style={{
                  padding: "8px 16px",
                  background: "#f3e8f5",
                  border: "1px solid #d8b4e2",
                  borderRadius: 6,
                  color: "#a365b9",
                  fontFamily: NU,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#e6d0ea"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f3e8f5"; e.currentTarget.style.transform = ""; }}
              >
                {c.label}
              </button>
            ))
          ) : (
            <button onClick={handleNext}
              style={{
                padding: "8px 24px",
                background: "#c492d6",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontFamily: PX,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = ""}
            >
              NEXT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SeleniaPopup({ emotion, text }: { emotion: string; text: string }) {
  const images: Record<string, string> = {
    normal: imgNormal,
    happy: imgHappy,
    gentle: imgGentle,
    playful: imgPlayful,
    shocked: imgShocked,
    wondering: imgWondering,
    blushing: imgBlushing,
  };
  const src = images[emotion] || imgNormal;

  return (
    <div style={{
      position: "absolute",
      bottom: 150, right: 20,
      background: C.card,
      border: `2px solid ${C.purple}`,
      borderRadius: 16,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "12px 20px",
      boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
      zIndex: 100,
      maxWidth: 380,
      animation: "fade-in-up 0.3s ease-out"
    }}>
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <img src={src} alt="Selenia" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 32, border: `1px solid ${C.border}` }} />
      <div>
        <div style={{ fontFamily: PX, color: C.purple, fontSize: 14, marginBottom: 4 }}>Selenia</div>
        <div style={{ fontFamily: NU, color: C.text, fontSize: 15, lineHeight: 1.4 }}>{text}</div>
      </div>
    </div>
  );
}
