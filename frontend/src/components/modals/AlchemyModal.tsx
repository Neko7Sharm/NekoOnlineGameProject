import { useState, useEffect, useRef } from "react";
import { C, PX, NU, MO } from "../../constants/theme";
import type { Character, Item } from "../../types/game";
import { TAG_RECIPE_DATABASE, craftTagAlchemy } from "../../constants/alchemy";

import npcShopImg  from "../../assets/npc/npc_01.png";
import npcShopImg2 from "../../assets/npc/npc_02.png";
import npcShopImg3 from "../../assets/npc/npc_03.png";

interface AlchemyModalProps {
  char: Character;
  onClose: () => void;
  onCraft: (ing1Id: string, ing2Id: string, catalystId?: string) => void;
}

const ALCHEMY_TALK_QUOTES = [
  "Welcome to my bench! Bring me two ingredients and I will reveal the Tag Synergy within!",
  "Tag Alchemy is the art of blending essences... each Tag carries hidden potential.",
  "The discovery book records every recipe you have uncovered. Keep experimenting!",
  "A catalyst can amplify the quality of your synthesis tremendously.",
];

const ALCHEMY_IDLE_QUOTES = [
  "Hmm... which tags could combine next?",
  "The essence of crafting is curiosity!",
  "Do not be afraid to try unusual combinations~",
  "Quality depends on the ingredients value and your catalyst!",
];

const ALCHEMY_SUCCESS_QUOTES = [
  "Magnificent! The Tags aligned perfectly!",
  "Beautiful synergy! This potion radiates power~!",
  "Brilliant work! The essences merged flawlessly!",
];

const ALCHEMY_FAIL_QUOTES = [
  "Hmm... these elements do not resonate together.",
  "No synergy found. Try a different tag combination!",
  "The essence fizzled out... Perhaps a different pairing?",
];

function getTagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t === "healing") return "#4cdb70";
  if (t === "water") return "#4499ff";
  if (t === "fire") return "#ff6644";
  if (t === "magic" || t === "crystal") return "#cc88ff";
  if (t === "moon") return "#aaddff";
  if (t === "poison") return "#88dd44";
  if (t === "plant") return "#66cc55";
  if (t === "beast") return "#dd9944";
  if (t === "metal") return "#aabbcc";
  return "#9966ff";
}

export function AlchemyModal({ char, onClose, onCraft }: AlchemyModalProps) {
  const [ing1, setIng1] = useState<Item | null>(null);
  const [ing2, setIng2] = useState<Item | null>(null);
  const [catalyst, setCatalyst] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<"craft" | "book">("craft");

  type NpcFace = "talk" | "happy" | "idle" | "exiting";
  const [npcFace, setNpcFace] = useState<NpcFace>("talk");
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [npcBounce, setNpcBounce] = useState(false);
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
    after(60,  () => setNpcEntered(true));
    after(480, () => setPanelVisible(true));
    after(800, () => {
      setNpcFace("talk");
      setBubbleText(ALCHEMY_TALK_QUOTES[0]);
      setBubbleShow(true);
    });
    after(6200, () => setBubbleShow(false));
    after(6700, () => { setNpcFace("idle"); setBubbleText(""); });
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (npcFace === "idle") {
      const waitTime = 6000 + Math.random() * 8000;
      const t = setTimeout(() => {
        const q = ALCHEMY_IDLE_QUOTES[Math.floor(Math.random() * ALCHEMY_IDLE_QUOTES.length)];
        setNpcFace("talk");
        setBubbleText(q);
        setBubbleShow(true);
        after(7000, () => setBubbleShow(false));
        after(5500, () => { setNpcFace("idle"); setBubbleText(""); });
      }, waitTime);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [npcFace]);

  function handleClose() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcFace("talk");
    setBubbleText("Come back when you have more ingredients!");
    setBubbleShow(true);
    after(200,  () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  }

  const materials = char.inventory.filter(i => i.material || i.type === "consumable");
  const discovered = new Set(char.discoveredRecipes || []);
  const previewResult = ing1 && ing2 ? craftTagAlchemy(ing1, ing2, catalyst || undefined) : null;

  const handleSelectMaterial = (item: Item) => {
    if (!ing1) setIng1(item);
    else if (!ing2 && ing1.id !== item.id) setIng2(item);
    else if (!catalyst && ing1.id !== item.id && ing2?.id !== item.id) setCatalyst(item);
  };

  function handleCraft() {
    if (!ing1 || !ing2 || !previewResult?.success) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const q = ALCHEMY_SUCCESS_QUOTES[Math.floor(Math.random() * ALCHEMY_SUCCESS_QUOTES.length)];
    setBubbleShow(false);
    after(80, () => {
      setNpcFace("happy");
      setNpcBounce(true);
      setBubbleText(q);
      setBubbleShow(true);
    });
    after(700,  () => setNpcBounce(false));
    after(6700, () => setBubbleShow(false));
    after(7200, () => { setNpcFace("idle"); setBubbleText(""); });
    onCraft(ing1.id, ing2.id, catalyst?.id);
    setIng1(null); setIng2(null); setCatalyst(null);
  }

  function handleFailFeedback() {
    const q = ALCHEMY_FAIL_QUOTES[Math.floor(Math.random() * ALCHEMY_FAIL_QUOTES.length)];
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setBubbleShow(false);
    after(80, () => {
      setNpcFace("idle");
      setBubbleText(q);
      setBubbleShow(true);
    });
    after(5000, () => setBubbleShow(false));
  }

  const npcSrc = npcFace === "talk" ? npcShopImg : npcFace === "happy" ? npcShopImg2 : npcShopImg3;

  const bg1 = "#0a0a1a"; const bg2 = "#120d28"; const bg3 = "#1a1040";
  const accent = "#7c44cc"; const accent2 = "#a366ee";
  const cream2 = "#d8ccf5";
  const panelBg = "linear-gradient(170deg, #0e0b22 0%, #130e2e 60%, #0a0718 100%)";

  function TagBadge({ tag }: { tag: string }) {
    const color = getTagColor(tag);
    return (
      <span style={{
        fontFamily: PX, fontSize: 7, padding: "1px 5px",
        background: color + "20", border: `1px solid ${color}50`,
        borderRadius: 3, color,
      }}>{tag}</span>
    );
  }

  function SlotCard({ label, item, color, onClear }: { label: string; item: Item | null; color: string; onClear: () => void }) {
    return (
      <div onClick={onClear} style={{
        flex: 1, minHeight: 80, background: item ? color + "18" : "rgba(255,255,255,0.03)",
        border: `1.5px dashed ${item ? color : "#444"}`,
        borderRadius: 8, padding: "8px 10px", textAlign: "center",
        cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
      }}>
        <div style={{ fontSize: 9, color: color, fontFamily: PX, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
        {item ? (
          <>
            <div style={{ fontFamily: PX, fontSize: 10, color: "#fff" }}>{item.name}</div>
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                {item.tags.map((t: string) => <TagBadge key={t} tag={t} />)}
              </div>
            )}
            <div style={{ fontSize: 8, color: "#666", marginTop: 3, fontFamily: NU }}>(click to clear)</div>
          </>
        ) : (
          <div style={{ fontFamily: PX, fontSize: 9, color: "#555", marginTop: 4 }}>+ Select</div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      display: "flex", alignItems: "stretch",
      background: "rgba(5, 3, 18, 0.85)",
      backdropFilter: "blur(4px)",
    }}>
      <style>{`
        @keyframes alch-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes alch-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes alch-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes alch-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes alch-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-7px)} }
        @keyframes alch-bounce { 0%{transform:translateX(-50%) translateY(0) scale(1)} 25%{transform:translateX(-50%) translateY(-22px) scale(1.04)} 55%{transform:translateX(-50%) translateY(6px) scale(0.97)} 75%{transform:translateX(-50%) translateY(-8px) scale(1.01)} 100%{transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes alch-shine { 0%{opacity:0} 50%{opacity:0.07} 100%{opacity:0} }
        @keyframes alch-bubble-in { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes alch-bubble-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
        @keyframes alch-pulse { 0%,100%{box-shadow:0 0 12px #7c44cc50} 50%{box-shadow:0 0 28px #a366ee80} }
      `}</style>

      {/* LEFT PANEL: NPC */}
      <div style={{
        width: "25%", flexShrink: 0, position: "relative",
        background: `linear-gradient(180deg, ${bg1} 0%, ${bg2} 50%, ${bg3} 100%)`,
        borderRight: `4px solid ${accent}60`,
        overflow: "hidden",
        animation: npcExiting
          ? "alch-npc-out 0.7s cubic-bezier(0.4,0,0.8,0.4) forwards"
          : npcEntered ? "alch-npc-in 0.75s cubic-bezier(0.34,1.4,0.64,1) forwards" : "none",
        transform: "translateX(-115%)",
      }}>
        {[0.12, 0.33, 0.54, 0.73, 0.90].map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0, top: `${p * 100}%`,
            height: 1, background: `${accent}30`,
            animation: `alch-shine 5s ease-in-out ${i * 1.1}s infinite`,
          }} />
        ))}

        <img src={npcSrc} alt="Alchemist NPC" style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", width: "100%", height: "auto",
          imageRendering: "pixelated", display: "block",
          animation: npcBounce
            ? "alch-bounce 0.6s cubic-bezier(0.34,1.5,0.64,1) forwards"
            : "alch-breathe 3.8s ease-in-out 0.5s infinite",
        }} />

        {bubbleText && (
          <div style={{
            position: "absolute", top: "6%", left: 10, width: "calc(100% - 20px)", zIndex: 6,
            animation: bubbleShow
              ? "alch-bubble-in 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards"
              : "alch-bubble-out 0.5s ease forwards",
            pointerEvents: "none",
          }}>
            <div style={{
              background: "#1a1040", border: `2px solid ${accent2}`,
              borderRadius: 10, padding: "10px 12px",
              fontFamily: NU, fontSize: 12, color: "#f0eaff", lineHeight: 1.5,
              boxShadow: `0 4px 20px ${accent}40`, position: "relative",
            }}>
              {bubbleText}
              <div style={{ position: "absolute", bottom: -10, left: "50%", marginLeft: -7, width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `10px solid ${accent2}` }} />
              <div style={{ position: "absolute", bottom: -6, left: "50%", marginLeft: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid #1a1040" }} />
            </div>
          </div>
        )}

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
          padding: "10px 12px",
          background: `linear-gradient(180deg, ${accent}22 0%, ${bg1}f8 100%)`,
          borderTop: `2px solid ${accent}50`,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.7)", textAlign: "center",
        }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: cream2, letterSpacing: 2, textShadow: `0 0 8px ${accent2}` }}>HINA</div>
          <div style={{ fontFamily: NU, fontSize: 10, color: accent2, marginTop: 2 }}>Tag Alchemist</div>
        </div>
      </div>

      {/* RIGHT PANEL: Alchemy */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        background: panelBg,
        animation: panelExiting
          ? "alch-panel-out 0.6s cubic-bezier(0.4,0,0.6,1) forwards"
          : panelVisible ? "alch-panel-in 0.55s cubic-bezier(0.34,1.2,0.64,1) forwards" : "none",
        opacity: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${accent}30`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: `linear-gradient(90deg, ${accent}10 0%, transparent 100%)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🧪</span>
            <div>
              <div style={{ fontFamily: PX, fontSize: 15, color: "#fff", letterSpacing: 2 }}>TAG ALCHEMY BENCH</div>
              <div style={{ fontFamily: NU, fontSize: 10, color: accent2 }}>Combine ingredient tags to discover recipes</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setActiveTab("craft")} style={{
              background: activeTab === "craft" ? accent : "rgba(255,255,255,0.06)",
              border: `1px solid ${activeTab === "craft" ? accent2 : "#333"}`,
              color: "#fff", fontFamily: PX, fontSize: 9, padding: "6px 14px",
              borderRadius: 4, cursor: "pointer", letterSpacing: 1,
            }}>Synthesize</button>
            <button onClick={() => setActiveTab("book")} style={{
              background: activeTab === "book" ? accent : "rgba(255,255,255,0.06)",
              border: `1px solid ${activeTab === "book" ? accent2 : "#333"}`,
              color: "#fff", fontFamily: PX, fontSize: 9, padding: "6px 14px",
              borderRadius: 4, cursor: "pointer", letterSpacing: 1,
            }}>Recipe Book</button>
            <button onClick={handleClose} style={{
              background: "none", border: "1px solid #444", color: "#888",
              fontSize: 16, cursor: "pointer", borderRadius: 4, padding: "4px 8px",
            }}>x</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {activeTab === "craft" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: PX, fontSize: 10, color: accent2, letterSpacing: 2 }}>SYNTHESIS SLOTS</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <SlotCard label="INGREDIENT 1" item={ing1} color={accent2} onClear={() => setIng1(null)} />
                  <SlotCard label="INGREDIENT 2" item={ing2} color={accent2} onClear={() => setIng2(null)} />
                  <SlotCard label="CATALYST" item={catalyst} color={C.gold} onClear={() => setCatalyst(null)} />
                </div>

                <div style={{
                  background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: 14,
                  border: `1px solid ${accent}30`,
                  boxShadow: previewResult?.success ? `inset 0 0 20px ${accent}20` : "none",
                  transition: "box-shadow 0.4s",
                }}>
                  <div style={{ fontSize: 9, color: "#888", fontFamily: PX, letterSpacing: 1, marginBottom: 6 }}>TAG SYNERGY PREVIEW</div>
                  {previewResult ? (
                    <div>
                      <div style={{
                        fontFamily: PX, fontSize: 13,
                        color: previewResult.success ? "#4cdb70" : "#ff4444",
                        textShadow: previewResult.success ? "0 0 10px #4cdb7060" : "0 0 8px #ff444450",
                      }}>
                        {previewResult.success ? `* ${previewResult.resultItem?.name}` : "No Synergy"}
                      </div>
                      {previewResult.success && (
                        <div style={{ fontSize: 10, color: "#fff", marginTop: 6, fontFamily: NU }}>
                          Quality: <span style={{ color: C.gold, fontFamily: PX }}>{previewResult.quality}%</span>
                          <div style={{ fontSize: 9, color: "#888", marginTop: 3 }}>{previewResult.recipe?.description}</div>
                        </div>
                      )}
                      {!previewResult.success && (
                        <div style={{ fontSize: 9, color: "#666", fontFamily: NU, marginTop: 4, fontStyle: "italic" }}>
                          {previewResult.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#555", fontFamily: NU, fontStyle: "italic" }}>
                      Select 2 ingredients to preview tag combination...
                    </div>
                  )}
                </div>

                <button
                  disabled={!ing1 || !ing2}
                  onClick={() => {
                    if (previewResult?.success) handleCraft();
                    else if (ing1 && ing2) handleFailFeedback();
                  }}
                  style={{
                    background: previewResult?.success
                      ? `linear-gradient(90deg, ${accent}, ${accent2})`
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${previewResult?.success ? accent2 : "#333"}`,
                    borderRadius: 6, padding: "12px 0", color: "#fff",
                    fontFamily: PX, fontSize: 11, letterSpacing: 2,
                    cursor: (!ing1 || !ing2) ? "not-allowed" : "pointer",
                    boxShadow: previewResult?.success ? `0 0 20px ${accent}60` : "none",
                    transition: "all 0.3s",
                    animation: previewResult?.success ? "alch-pulse 2s ease-in-out infinite" : "none",
                  }}>
                  SYNTHESIZE POTION
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: PX, fontSize: 10, color: "#aaa", letterSpacing: 2 }}>AVAILABLE INGREDIENTS</div>
                <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                  {materials.length === 0 ? (
                    <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 20, fontFamily: NU }}>
                      No crafting materials in inventory.
                    </div>
                  ) : (
                    materials.map(m => (
                      <div key={m.id} onClick={() => handleSelectMaterial(m)} style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 6, padding: "8px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", transition: "background 0.15s",
                      }}>
                        <div>
                          <div style={{ fontFamily: PX, fontSize: 10, color: "#fff" }}>{m.name}</div>
                          {m.tags && m.tags.length > 0 && (
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 3 }}>
                              {m.tags.map((t: string) => <TagBadge key={t} tag={t} />)}
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontFamily: PX, fontSize: 9, color: accent2,
                          padding: "3px 8px", border: `1px solid ${accent}40`, borderRadius: 3,
                        }}>Select</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "book" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 11, color: C.gold, letterSpacing: 1 }}>RECIPE DISCOVERY BOOK</div>
                <div style={{ fontFamily: PX, fontSize: 9, color: "#888" }}>{discovered.size} / {TAG_RECIPE_DATABASE.length} Discovered</div>
              </div>
              <div style={{ height: 4, background: "#222", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(discovered.size / TAG_RECIPE_DATABASE.length) * 100}%`,
                  background: `linear-gradient(90deg, ${accent}, ${C.gold})`,
                  transition: "width 0.5s",
                }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {TAG_RECIPE_DATABASE.map(rec => {
                  const isDisc = discovered.has(rec.id);
                  return (
                    <div key={rec.id} style={{
                      background: isDisc ? accent + "15" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isDisc ? accent : "#2a2a2a"}`,
                      borderRadius: 8, padding: 14,
                      boxShadow: isDisc ? `inset 0 0 12px ${accent}20` : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontFamily: PX, fontSize: 11, color: isDisc ? "#fff" : "#444" }}>
                          {isDisc ? rec.name : "??? (Undiscovered)"}
                        </div>
                        <div style={{ fontSize: 10 }}>{"*".repeat(rec.stars ?? 1)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
                        {isDisc ? rec.requiredTags.map((t: string, i: number) => (
                          <span key={t} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <TagBadge tag={t} />
                            {i < rec.requiredTags.length - 1 && <span style={{ color: "#555", fontSize: 9 }}>+</span>}
                          </span>
                        )) : (
                          <span style={{ fontFamily: PX, fontSize: 8, color: "#333" }}>??? + ???</span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: isDisc ? "#aaa" : "#333", fontFamily: NU, fontStyle: "italic" }}>
                        {isDisc ? rec.description : "Experiment with different ingredient tags to unlock!"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
