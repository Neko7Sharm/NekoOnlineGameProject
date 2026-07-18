import React, { useState } from "react";
import { C, PX, NU } from "../../constants/theme";
import type { Character } from "../../types/game";
import { rollSkillCheck } from "../../utils/dice";
import { PROFICIENCY_LIST } from "../../constants/classes";

interface CheckModalProps {
  char: Character;
  tile: any;
  onClose: () => void;
  onSuccess: (text: string) => void;
  onFail: (text: string) => void;
}

export const CheckModal: React.FC<CheckModalProps> = ({ char, tile, onClose, onSuccess, onFail }) => {
  const [rolled, setRolled] = useState(false);
  const [result, setResult] = useState<any>(null);

  const skill = tile.requiredSkill || "Perception";
  const dc = tile.dc || 10;
  
  const profDef = PROFICIENCY_LIST.find(p => p.name === skill);
  const stat = profDef ? profDef.stat.toUpperCase() : "INT";

  const handleRoll = () => {
    const res = rollSkillCheck(char, skill);
    setResult(res);
    setRolled(true);
    
    setTimeout(() => {
      if (res.total >= dc) {
        onSuccess(tile.successText || "Success!");
      } else {
        onFail(tile.failText || "Failed.");
      }
    }, 2000); // 2 second delay to show the roll
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{
        background: C.bg, width: 320, padding: 20, border: `2px solid ${C.gold}`, borderRadius: 4,
        boxShadow: `0 0 20px ${C.gold}40`, textAlign: "center"
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{tile.icon}</div>
        <div style={{ fontFamily: PX, color: C.gold, fontSize: 14, marginBottom: 5 }}>{tile.label.toUpperCase()}</div>
        <div style={{ fontFamily: NU, color: C.text, fontSize: 13, marginBottom: 20 }}>{tile.prompt}</div>

        <div style={{ background: C.card, padding: 10, border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ fontFamily: PX, color: C.blue, fontSize: 10, marginBottom: 5 }}>SKILL CHECK REQUIRED</div>
          <div style={{ fontFamily: NU, color: C.text, fontSize: 14, fontWeight: 700 }}>
            {skill} ({stat})
          </div>
          <div style={{ fontFamily: PX, color: C.red, fontSize: 12, marginTop: 5 }}>
            Difficulty Class: {dc}
          </div>
        </div>

        {!rolled ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={onClose} style={{
              background: "transparent", border: `1px solid ${C.border}`, color: C.text,
              padding: "8px 16px", fontFamily: PX, fontSize: 10, cursor: "pointer"
            }}>
              LEAVE
            </button>
            <button onClick={handleRoll} style={{
              background: C.gold, border: "none", color: "#000",
              padding: "8px 16px", fontFamily: PX, fontSize: 10, cursor: "pointer", fontWeight: 700
            }}>
              ROLL d20
            </button>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
            <div style={{ fontSize: 40, fontFamily: NU, fontWeight: 800, color: result.total >= dc ? C.green : C.red, marginBottom: 10 }}>
              {result.total}
            </div>
            <div style={{ fontFamily: PX, fontSize: 10, color: C.muted, marginBottom: 20 }}>
              (Roll: {result.roll} + Stat: {result.mod} {result.prof > 0 ? `+ Prof: ${result.prof}` : ""})
            </div>
            
            <div style={{ fontFamily: PX, fontSize: 14, color: result.total >= dc ? C.green : C.red, marginBottom: 20 }}>
              {result.total >= dc ? "SUCCESS!" : "FAILED"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
