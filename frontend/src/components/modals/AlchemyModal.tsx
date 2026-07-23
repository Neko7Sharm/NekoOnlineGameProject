import { useState } from "react";
import { C, PX } from "../../constants/theme";
import type { Character, Item } from "../../types/game";
import { TAG_RECIPE_DATABASE, craftTagAlchemy } from "../../constants/alchemy";

interface AlchemyModalProps {
  char: Character;
  onClose: () => void;
  onCraft: (ing1Id: string, ing2Id: string, catalystId?: string) => void;
}

export function AlchemyModal({ char, onClose, onCraft }: AlchemyModalProps) {
  const [ing1, setIng1] = useState<Item | null>(null);
  const [ing2, setIng2] = useState<Item | null>(null);
  const [catalyst, setCatalyst] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<"craft" | "book">("craft");

  const materials = char.inventory.filter(i => i.material || i.type === "consumable");
  const discovered = new Set(char.discoveredRecipes || []);

  const handleSelectMaterial = (item: Item) => {
    if (!ing1) setIng1(item);
    else if (!ing2 && ing1.id !== item.id) setIng2(item);
    else if (!catalyst && ing1.id !== item.id && ing2?.id !== item.id) setCatalyst(item);
  };

  const previewResult = ing1 && ing2 ? craftTagAlchemy(ing1, ing2, catalyst || undefined) : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,3,12,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        width: 720, background: "linear-gradient(145deg, #140e28, #0a0718)", border: `2px solid ${C.purple}`,
        borderRadius: 12, boxShadow: `0 0 40px ${C.purple}50`, padding: 24, display: "flex", flexDirection: "column", gap: 16
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", pb: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>🧪</span>
            <span style={{ fontFamily: PX, fontSize: 18, color: "#fff", letterSpacing: 2 }}>TAG ALCHEMY BENCH</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setActiveTab("craft")} style={{
              background: activeTab === "craft" ? C.purple : "rgba(255,255,255,0.08)", border: "none",
              color: "#fff", fontFamily: PX, fontSize: 10, padding: "6px 14px", borderRadius: 4, cursor: "pointer"
            }}>Synthesize</button>
            <button onClick={() => setActiveTab("book")} style={{
              background: activeTab === "book" ? C.purple : "rgba(255,255,255,0.08)", border: "none",
              color: "#fff", fontFamily: PX, fontSize: 10, padding: "6px 14px", borderRadius: 4, cursor: "pointer"
            }}>📖 Discovery Book</button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        </div>

        {activeTab === "craft" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: 3 Slots & Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: PX, fontSize: 11, color: C.purple, letterSpacing: 1 }}>SYNTHESIS SLOTS</div>
              <div style={{ display: "flex", gap: 10 }}>
                {/* Slot 1 */}
                <div onClick={() => setIng1(null)} style={{
                  flex: 1, height: 75, background: ing1 ? "rgba(100,50,180,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1.5px dashed ${ing1 ? C.purple : "#444"}`, borderRadius: 8, padding: 8, textAlign: "center", cursor: "pointer"
                }}>
                  <div style={{ fontSize: 9, color: "#aaa" }}>INGREDIENT 1</div>
                  <div style={{ fontFamily: PX, fontSize: 10, color: "#fff", marginTop: 4 }}>{ing1 ? ing1.name : "+ Select"}</div>
                  {ing1?.tags && <div style={{ fontSize: 8, color: C.gold, marginTop: 2 }}>[{ing1.tags.join(", ")}]</div>}
                </div>

                {/* Slot 2 */}
                <div onClick={() => setIng2(null)} style={{
                  flex: 1, height: 75, background: ing2 ? "rgba(100,50,180,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1.5px dashed ${ing2 ? C.purple : "#444"}`, borderRadius: 8, padding: 8, textAlign: "center", cursor: "pointer"
                }}>
                  <div style={{ fontSize: 9, color: "#aaa" }}>INGREDIENT 2</div>
                  <div style={{ fontFamily: PX, fontSize: 10, color: "#fff", marginTop: 4 }}>{ing2 ? ing2.name : "+ Select"}</div>
                  {ing2?.tags && <div style={{ fontSize: 8, color: C.gold, marginTop: 2 }}>[{ing2.tags.join(", ")}]</div>}
                </div>

                {/* Catalyst */}
                <div onClick={() => setCatalyst(null)} style={{
                  flex: 1, height: 75, background: catalyst ? "rgba(220,180,50,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1.5px dashed ${catalyst ? C.gold : "#444"}`, borderRadius: 8, padding: 8, textAlign: "center", cursor: "pointer"
                }}>
                  <div style={{ fontSize: 9, color: C.gold }}>CATALYST</div>
                  <div style={{ fontFamily: PX, fontSize: 10, color: "#fff", marginTop: 4 }}>{catalyst ? catalyst.name : "+ Optional"}</div>
                  {catalyst?.tags && <div style={{ fontSize: 8, color: C.gold, marginTop: 2 }}>[{catalyst.tags.join(", ")}]</div>}
                </div>
              </div>

              {/* Result Preview */}
              <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>POTENTIAL SYNERGY:</div>
                {previewResult ? (
                  <div>
                    <div style={{ fontFamily: PX, fontSize: 12, color: previewResult.success ? "#4cdb70" : "#ff4444" }}>
                      {previewResult.success ? `✨ ${previewResult.resultItem?.name}` : "⚠️ Inert Sludge"}
                    </div>
                    {previewResult.success && (
                      <div style={{ fontSize: 10, color: "#fff", marginTop: 4 }}>
                        Quality Rating: <span style={{ color: C.gold, fontWeight: "bold" }}>{previewResult.quality}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: "#666", fontStyle: "italic" }}>Select 2 ingredients to preview tag combination...</div>
                )}
              </div>

              <button disabled={!previewResult?.success} onClick={() => {
                if (ing1 && ing2) {
                  onCraft(ing1.id, ing2.id, catalyst?.id);
                  setIng1(null); setIng2(null); setCatalyst(null);
                }
              }} style={{
                background: previewResult?.success ? `linear-gradient(90deg, ${C.purple}, #8a2be2)` : "#333",
                border: "none", borderRadius: 6, padding: "10px 0", color: "#fff", fontFamily: PX, fontSize: 12,
                cursor: previewResult?.success ? "pointer" : "not-allowed", letterSpacing: 2
              }}>
                SYNTHESIZE POTION 🧪
              </button>
            </div>

            {/* Right: Available Materials */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: PX, fontSize: 11, color: "#aaa", letterSpacing: 1 }}>AVAILABLE INGREDIENTS</div>
              <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                {materials.length === 0 ? (
                  <div style={{ fontSize: 10, color: "#666", textAlign: "center", marginTop: 20 }}>No crafting materials in inventory.</div>
                ) : (
                  materials.map(m => (
                    <div key={m.id} onClick={() => handleSelectMaterial(m)} style={{
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
                      cursor: "pointer", transition: "background 0.15s"
                    }}>
                      <div>
                        <div style={{ fontFamily: PX, fontSize: 10, color: "#fff" }}>{m.name}</div>
                        {m.tags && <div style={{ fontSize: 8, color: C.purple, marginTop: 2 }}>Tags: {m.tags.join(" • ")}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: C.gold }}>Select</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Discovery Book */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: PX, fontSize: 11, color: C.gold, letterSpacing: 1 }}>DISCOVERED TAG RECIPES ({discovered.size}/{TAG_RECIPE_DATABASE.length})</div>
            <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TAG_RECIPE_DATABASE.map(rec => {
                const isDisc = discovered.has(rec.id);
                return (
                  <div key={rec.id} style={{
                    background: isDisc ? "rgba(100,50,180,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isDisc ? C.purple : "#333"}`, borderRadius: 8, padding: 12
                  }}>
                    <div style={{ fontFamily: PX, fontSize: 11, color: isDisc ? "#fff" : "#666" }}>
                      {isDisc ? rec.name : "??? (Undiscovered)"}
                    </div>
                    <div style={{ fontSize: 9, color: isDisc ? C.gold : "#444", marginTop: 4 }}>
                      Required Tags: {isDisc ? rec.requiredTags.join(" + ") : "??? + ???"}
                    </div>
                    <div style={{ fontSize: 8, color: "#aaa", marginTop: 4, fontStyle: "italic" }}>
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
  );
}
