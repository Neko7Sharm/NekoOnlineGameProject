import { X } from "lucide-react";
import { C, PX, NU, MO, panel, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import type { Quest, Party, Item } from "../../types/game";

export function QuestModal({ quests, partyQuests, party, onAccept, onClose, nextRefresh, onClaim, charInventory }: {
  quests: Quest[]; partyQuests: Quest[]; party: Party | null;
  onAccept: (id: string) => void; onClose: () => void; nextRefresh: number;
  onClaim?: (id: string) => void;
  charInventory?: Item[];
}) {
  const tl = Math.max(0, nextRefresh - Date.now());
  const mins = Math.floor(tl / 60000), secs = Math.floor((tl % 60000) / 1000);
  const canAccept = (party?.questIds?.length ?? 0) < 2;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
      <div style={{ ...panel, width: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", position: "relative", border: `2px solid ${C.blue}` }}>
        <PixelCorners color={C.blue} size={8} />
        <div style={{ padding: "14px 16px", borderBottom: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: PX, fontSize: 10, color: C.blue }}>📋 QUEST BOARD</div>
            <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginTop: 2 }}>
              Refresh in {mins}:{secs.toString().padStart(2, "0")} · {partyQuests.length}/2 active
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X className="w-4 h-4" /></button>
        </div>

        {partyQuests.length > 0 && (
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ACTIVE</div>
            {partyQuests.map(q => {
              const isDone = q.readyToTurnIn || q.completed;
              let gatherCurrent = 0;
              let gatherReady = false;
              if (q.gatherTarget && charInventory) {
                gatherCurrent = charInventory.filter(i => i.name === q.gatherTarget!.itemName).length;
                gatherReady = gatherCurrent >= q.gatherTarget.count;
              }
              const showTurnIn = isDone || gatherReady;
              return (
                <div key={q.id} style={{ padding: "8px 10px", background: showTurnIn ? C.gold + "12" : C.blue + "12", border: `1px solid ${showTurnIn ? C.gold + "60" : C.blue + "30"}`, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: PX, fontSize: 8, color: showTurnIn ? C.gold : C.blue }}>{q.title}</span>
                    {showTurnIn ? (
                      <button onClick={() => onClaim?.(q.id)}
                        style={{ ...pixelBtn("primary", true), fontSize: 7, background: `linear-gradient(180deg, #2a7a2a 0%, #1a5a1a 100%)`, border: `2px solid ${C.green}` }}>
                        ✅ TURN IN
                      </button>
                    ) : q.gatherTarget ? (
                      <span style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{gatherCurrent}/{q.gatherTarget.count} {q.gatherTarget.itemName}</span>
                    ) : (
                      <span style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{q.killTarget?.current}/{q.killTarget?.count}</span>
                    )}
                  </div>
                  {showTurnIn ? (
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.gold }}>✅ COMPLETE — Turn in your quest!</div>
                  ) : q.gatherTarget ? (
                    <div style={{ height: 4, background: C.card2 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (gatherCurrent / q.gatherTarget.count) * 100)}%`, background: "#4cdb70" }} />
                    </div>
                  ) : (
                    <div style={{ height: 4, background: C.card2 }}>
                      <div style={{ height: "100%", width: `${((q.killTarget?.current ?? 0) / (q.killTarget?.count ?? 1)) * 100}%`, background: C.blue }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {quests.length === 0
            ? <div style={{ textAlign: "center", color: C.muted, fontFamily: NU, fontSize: 13, padding: 32 }}>No quests available. Check back after refresh.</div>
            : quests.map(q => (
              <div key={q.id} style={{ padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: PX, fontSize: 8, color: C.text }}>{q.title}</span>
                  <button onClick={() => onAccept(q.id)} disabled={!canAccept}
                    style={{ ...pixelBtn("primary", true), opacity: canAccept ? 1 : 0.4, fontSize: 7 }}>
                    ACCEPT
                  </button>
                </div>
                <div style={{ fontFamily: NU, fontSize: 12, color: C.muted, marginBottom: 6 }}>{q.description}</div>
                <div style={{ display: "flex", gap: 10, fontFamily: MO, fontSize: 10 }}>
                  <span style={{ color: C.green }}>+{q.reward.exp} EXP</span>
                  <span style={{ color: C.gold }}>+{q.reward.gold}g</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
