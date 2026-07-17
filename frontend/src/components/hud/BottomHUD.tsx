import { useState, useEffect, useRef, ReactNode } from "react";
import {
  User, Package, Sword, Star, MessageCircle, Users, Send,
  ChevronDown, ChevronUp, Heart, X,
} from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { CLASS_SPELLS, WIZARD_SPELL_CHOICES, CLASS_CFG } from "../../constants/classes";
import { SKILL_DICTIONARY } from "../../constants/skills";
import iconBlessing from "../../assets/icon/skill/I_01.png";
import { getMod, getWeaponHitBonus, formatMod } from "../../utils/dice";
import { HpBar } from "../ui/HpBar";
import { StatBox } from "../ui/StatBox";
import { ItemMenu } from "../modals/ItemMenu";
import type { Character, GameState, Item, Quest, Stats, HudTab } from "../../types/game";

export function BottomHUD({ char, hudTab, setHudTab, hudOpen, setHudOpen, chatTab, setChatTab, globalChat, partyChat, onSendChat, onEquipItem, onUnequipMainHand, onUnequipOffHand, onUnequipArmor, onUnequipAcc, onDropItem, onUseItem, party, onCreateParty, onLeaveParty, activeQuests, onUseSkill, inCombat }: {
  char: Character; hudTab: HudTab; setHudTab: (t: HudTab) => void;
  hudOpen: boolean; setHudOpen: (o: boolean) => void;
  chatTab: "global" | "party"; setChatTab: (t: "global" | "party") => void;
  globalChat: GameState["globalChat"]; partyChat: GameState["partyChat"];
  onSendChat: (msg: string, ch: "global" | "party") => void;
  onEquipItem: (i: Item) => void; onUnequipMainHand: () => void; onUnequipOffHand: () => void; onUnequipArmor: () => void; onUnequipAcc: (i: number) => void;
  onDropItem: (id: string) => void; onUseItem: (i: Item) => void;
  party: { name: string; leaderId: string; memberIds: string[]; questIds: string[] } | null;
  onCreateParty: (n: string) => void; onLeaveParty: () => void;
  activeQuests: Quest[];
  onUseSkill: (sk: string) => void;
  inCombat: boolean;
}) {
  const [itemMenu, setItemMenu] = useState<Item | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [partyName, setPartyName] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [invCategory, setInvCategory] = useState<"usable" | "material">("usable");
  const [activeSecModal, setActiveSecModal] = useState<"hit" | "ac" | "hp" | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveSecModal(null);
    if (activeSecModal) window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeSecModal]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [globalChat, partyChat]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim(), chatTab);
    setChatInput("");
  };

  const TABS: Array<{ id: HudTab; icon: ReactNode; label: string }> = [
    { id: "char", icon: <User className="w-3 h-3" />, label: "CHAR" },
    { id: "inv", icon: <Package className="w-3 h-3" />, label: "BAG" },
    { id: "equip", icon: <Sword className="w-3 h-3" />, label: "EQUIP" },
    { id: "acc", icon: <Star className="w-3 h-3" />, label: "JEWEL" },
    { id: "skills" as HudTab, icon: "✨", label: "SKILLS" },
    { id: "quest" as HudTab, icon: "📜", label: "QUEST" },
    { id: "chat", icon: <MessageCircle className="w-3 h-3" />, label: "CHAT" },
    { id: "party", icon: <Users className="w-3 h-3" />, label: "PARTY" },
  ];

  const SlotBox = ({ item, onClick }: { item: Item | null; onClick?: () => void }) => (
    <div onClick={onClick} style={{
      width: 38, height: 38, background: item ? C.card2 : C.bg,
      border: `2px solid ${item ? C.border : C.border + "60"}`,
      borderStyle: item ? "solid" : "dashed",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: onClick ? "pointer" : "default", fontSize: 16,
    }}>
      {item
        ? (item.type === "weapon" ? "⚔" : item.type === "armor" ? "🛡" : item.type === "accessory" ? "💍" : "💊")
        : <span style={{ color: C.border, fontSize: 12 }}>+</span>
      }
    </div>
  );
  const renderSecModalBtn = (type: "hit" | "ac" | "hp", e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSecModal(activeSecModal === type ? null : type);
  };

  const hpBase = CLASS_CFG[char.class]?.hpBase ?? 10;
  const hpCon = getMod(char.stats.con) * char.level;
  const hpLevelBonus = char.maxHp - hpBase - hpCon;

  const acBase = char.equipment.armor ? (char.equipment.armor.ac || 11) : 10;
  const addDex = !char.equipment.armor || ["Leather Armor", "Mage Robes"].includes(char.equipment.armor.name);
  const acDex = addDex ? getMod(char.stats.dex) : 0;
  const acShield = char.equipment.offHand?.effect === "guard" ? 2 : 0;
  const acOther = char.ac - acBase - acDex - acShield;

  const hitInfo = char.equipment.mainHand && char.equipment.mainHand.type === "weapon" 
    ? getWeaponHitBonus(char, char.equipment.mainHand)
    : { total: char.profBonus + getMod(char.stats.str), statName: "STR", statMod: getMod(char.stats.str), prof: char.profBonus, weaponBonus: 0 };

  return (
    <div style={{ background: C.card, borderTop: `2px solid ${C.border}`, flexShrink: 0, fontFamily: NU }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: `2px solid ${C.border}` }}>
        <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setHudTab(t.id); if (!hudOpen) setHudOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
                background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                borderBottom: hudTab === t.id && hudOpen ? `2px solid ${C.blue}` : "2px solid transparent",
                marginBottom: -2,
                fontFamily: PX, fontSize: 7, letterSpacing: 0.5,
                color: hudTab === t.id && hudOpen ? C.blue : C.muted,
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setHudOpen(p => !p)} style={{ padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: C.muted }}>
          {hudOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {hudOpen && (
        <div style={{ height: 188, overflow: "hidden" }}>

          {/* CHAR */}
          {hudTab === "char" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 16 }}>
              <div style={{ width: 120, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <img src={char.avatar} alt="Avatar" style={{ width: 100, height: 100, objectFit: "cover", border: `2px solid ${C.border}`, borderRadius: 4, background: C.card2 }} />
                {char.statusPoints > 0 && (
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.gold, background: C.gold + "20", padding: "4px 8px", border: `1px solid ${C.gold}`, borderRadius: 4, animation: "pulse 2s infinite" }}>
                    STATUS POINTS: {char.statusPoints}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>ABILITY SCORES</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {(Object.entries(char.stats) as [keyof Stats, number][]).map(([k, v]) => <StatBox key={k} label={k} value={v} />)}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div onClick={(e) => renderSecModalBtn("hp", e)} style={{ padding: "8px 10px", background: activeSecModal === "hp" ? C.card : C.card2, border: `1px solid ${C.border}`, cursor: "pointer", transition: "0.2s" }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>HP</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Heart className="w-3 h-3" style={{ color: C.red }} />
                      <span style={{ fontFamily: MO, fontSize: 11, color: C.red }}>{char.hp}/{char.maxHp}</span>
                    </div>
                    <HpBar hp={char.hp} maxHp={char.maxHp} size="sm" />
                  </div>

                  <div onClick={(e) => renderSecModalBtn("ac", e)} style={{ padding: "8px 10px", background: activeSecModal === "ac" ? C.card : C.card2, border: `1px solid ${C.border}`, cursor: "pointer", transition: "0.2s" }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>ARMOR CLASS</div>
                    <span style={{ fontFamily: MO, fontSize: 16, color: C.blue }}>{char.ac}</span>
                  </div>

                  <div onClick={(e) => renderSecModalBtn("hit", e)} style={{ padding: "8px 10px", background: activeSecModal === "hit" ? C.card : C.card2, border: `1px solid ${C.border}`, cursor: "pointer", transition: "0.2s" }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>ATTACK BONUS</div>
                    <span style={{ fontFamily: MO, fontSize: 16, color: C.blue }}>{formatMod(hitInfo.total)}</span>
                  </div>
                  {char.spellSlots && (
                    <div style={{ padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                      <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>SPELLS</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {Array.from({ length: char.spellSlots.max }, (_, i) => (
                          <div key={i} style={{ width: 14, height: 14, border: `2px solid ${C.purple}`, background: i < char.spellSlots!.max - char.spellSlots!.used ? C.purple + "80" : "transparent" }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>EXP / GOLD</div>
                    <div style={{ fontFamily: MO, fontSize: 10 }}>
                      <span style={{ color: C.green }}>{char.exp}</span>
                      <span style={{ color: C.muted }}> / </span>
                      <span style={{ color: C.gold }}>{char.gold}g</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>PROFICIENCIES</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {char.skills.map(s => <span key={s} style={{ fontFamily: NU, fontSize: 10, padding: "2px 6px", background: C.card2, color: C.text + "80", border: `1px solid ${C.border}` }}>{s}</span>)}
                    {char.savingThrows.map(s => <span key={s} style={{ fontFamily: NU, fontSize: 10, padding: "2px 6px", background: C.blue + "15", color: C.blue, border: `1px solid ${C.blue}30` }}>{s}</span>)}
                  </div>
                </div>

                {char.gameSkills && char.gameSkills.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.gold, marginBottom: 4, letterSpacing: 1 }}>ABILITIES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {char.gameSkills.map(skillId => {
                        const skill = SKILL_DICTIONARY[skillId];
                        if (!skill) return null;
                        const typeColor = skill.type === "active" ? C.red : skill.type === "passive" ? C.blue : C.gold;
                        return (
                          <div key={skillId} style={{ display: "flex", flexDirection: "column", background: C.card2, padding: "6px 8px", borderRadius: 4, border: `1px solid ${typeColor}40` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontFamily: PX, fontSize: 8, color: typeColor }}>{skill.icon} {skill.name}</span>
                              <span style={{ fontFamily: PX, fontSize: 6, color: C.muted, border: `1px solid ${C.border}`, padding: "2px 4px" }}>
                                {skill.type.toUpperCase()}{skill.cost !== "none" ? ` (${skill.cost.toUpperCase()})` : ""}
                              </span>
                            </div>
                            <div style={{ fontFamily: NU, fontSize: 10, color: C.text + "aa", marginTop: 4 }}>{skill.description}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {hudTab === "inv" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <style>{`@keyframes item-detail-in { 0%{opacity:0;clip-path:polygon(0 0,100% 0,100% 0,0 0)} 100%{opacity:1;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)} }`}</style>
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {(["usable", "material"] as const).map(cat => (
                  <button key={cat} onClick={() => { setInvCategory(cat); setExpandedItem(null); }}
                    style={{
                      flex: 1, padding: "5px 4px", cursor: "pointer", border: "none",
                      background: invCategory === cat ? C.blue + "20" : "transparent",
                      borderBottom: invCategory === cat ? `2px solid ${C.blue}` : "2px solid transparent",
                      fontFamily: PX, fontSize: 6, letterSpacing: 0.3,
                      color: invCategory === cat ? C.blue : C.muted, transition: "all 0.15s",
                    }}>
                    {cat === "usable" ? "💊 USE" : "🪵 MATS"}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
                {(() => {
                  const filtered = char.inventory.filter(i => {
                    if (invCategory === "usable") return i.type === "consumable" && !i.material;
                    return i.material;
                  });
                  if (filtered.length === 0) return <div style={{ color: C.muted, fontFamily: NU, fontSize: 11, textAlign: "center", paddingTop: 20 }}>Empty</div>;
                  
                  const getRarityColor = (rarity?: string) => {
                    if (rarity === "uncommon") return "#63c74d";
                    if (rarity === "rare") return "#1e90ff";
                    if (rarity === "epic") return "#9d57a9";
                    if (rarity === "legendary") return "#fdb813";
                    return C.border; // common
                  };

                  const stackedItems = Object.values(filtered.reduce((acc, item) => {
                    if (acc[item.name]) {
                      acc[item.name].count += 1;
                    } else {
                      acc[item.name] = { ...item, count: 1 };
                    }
                    return acc;
                  }, {} as Record<string, Item & { count: number }>));

                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                      {stackedItems.map(item => (
                        <div key={item.id}
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          style={{
                            cursor: "pointer", position: "relative",
                            border: `2px solid ${expandedItem === item.id ? C.blue : getRarityColor(item.rarity)}`,
                            background: expandedItem === item.id ? C.blue + "15" : C.card2,
                            padding: 6, display: "flex", flexDirection: "column", alignItems: "center",
                            transition: "border-color 0.15s, background 0.15s",
                            boxShadow: item.rarity && item.rarity !== "common" ? `inset 0 0 8px ${getRarityColor(item.rarity)}40` : "none"
                          }}>
                          {item.count > 1 && (
                            <div style={{ position: "absolute", top: -4, right: -4, background: C.blue, color: "#fff", fontSize: 7, fontFamily: PX, padding: "1px 3px", borderRadius: 4, zIndex: 2 }}>
                              x{item.count}
                            </div>
                          )}
                          <span style={{ fontSize: 18 }}>
                            {item.type === "weapon" ? "⚔" : item.type === "armor" ? "🛡" : item.type === "accessory" ? "💍" : item.material ? "🪵" : "💊"}
                          </span>
                          <span style={{ fontFamily: PX, fontSize: 5, color: C.muted, marginTop: 2, textAlign: "center", lineHeight: 1.2, overflow: "hidden", maxHeight: 18 }}>
                            {item.name.slice(0, 6)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {expandedItem && (() => {
                const item = char.inventory.find(i => i.id === expandedItem);
                if (!item) return null;
                return (
                  <div style={{
                    borderTop: `1px solid ${C.border}`, padding: "10px 12px",
                    background: C.card, flexShrink: 0,
                    animation: "item-detail-in 0.2s ease-out",
                  }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontFamily: PX, fontSize: 8, color: getRarityColor(item.rarity), flex: 1, textShadow: item.rarity && item.rarity !== "common" ? `0 0 4px ${getRarityColor(item.rarity)}80` : "none" }}>{item.name}</span>
                      {item.rarity && <span style={{ fontFamily: PX, fontSize: 5, padding: "2px 4px", border: `1px solid ${getRarityColor(item.rarity)}`, color: getRarityColor(item.rarity), borderRadius: 2 }}>{item.rarity.toUpperCase()}</span>}
                      {item.hands === 2 && <span style={{ fontFamily: PX, fontSize: 5, padding: "2px 4px", border: `1px solid ${C.muted}`, color: C.muted, borderRadius: 2 }}>2H</span>}
                      <button onClick={() => setExpandedItem(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: MO, fontSize: 12 }}>×</button>
                    </div>
                    <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, marginBottom: 6 }}>{item.description}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {item.damage && <span style={{ fontFamily: MO, fontSize: 9, color: C.red, padding: "2px 5px", background: C.card2 }}>DMG: {item.damage}</span>}
                      {item.ac && <span style={{ fontFamily: MO, fontSize: 9, color: C.blue, padding: "2px 5px", background: C.card2 }}>AC: +{item.ac}</span>}
                      {item.healAmount && <span style={{ fontFamily: MO, fontSize: 9, color: C.green, padding: "2px 5px", background: C.card2 }}>HEAL: {item.healAmount}</span>}
                      {item.range && <span style={{ fontFamily: MO, fontSize: 9, color: C.muted, padding: "2px 5px", background: C.card2 }}>{item.range / 5} tiles</span>}
                      {item.aoeRadius && <span style={{ fontFamily: MO, fontSize: 9, color: C.gold, padding: "2px 5px", background: C.card2 }}>AOE r{item.aoeRadius}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {(item.type === "consumable" && !item.material) && (
                        !inCombat ? (
                          <button onClick={() => { onUseItem(item); setExpandedItem(null); }}
                            style={{ ...pixelBtn("primary", true), fontSize: 6 }}>USE</button>
                        ) : (
                          <span style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>↑ Combat panel</span>
                        )
                      )}
                      {(item.type === "weapon" || item.type === "armor" || item.type === "accessory") && (
                        <button onClick={() => { onEquipItem(item); setExpandedItem(null); }}
                          style={{ ...pixelBtn("primary", true), fontSize: 6 }}>EQUIP</button>
                      )}
                      <button onClick={() => { onDropItem(item.id); setExpandedItem(null); }}
                        style={{ ...pixelBtn("danger", true), fontSize: 6 }}>DROP</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* EQUIPMENT */}
          {hudTab === "equip" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 14 }}>
              <div style={{ display: "flex", gap: 14 }}>
                <div>
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>MAIN HAND</div>
                  <SlotBox item={char.equipment.mainHand} onClick={char.equipment.mainHand ? () => setItemMenu(char.equipment.mainHand!) : undefined} />
                  {char.equipment.mainHand && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.equipment.mainHand.name}</div>
                      <div style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{(() => {
                        const w = char.equipment.mainHand;
                        const isR = (w.range ?? 5) > 5;
                        const sm = isR ? getMod(char.stats.dex) : getMod(char.stats.str);
                        return `${w.damage}${sm >= 0 ? "+" : ""}${sm}`;
                      })()}</div>
                      <button onClick={onUnequipMainHand} style={{ fontFamily: NU, fontSize: 10, color: C.red + "80", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>unequip</button>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>OFF HAND</div>
                  {char.equipment.mainHand?.hands === 2 ? (
                    <div style={{ width: 44, height: 44, border: `1px dashed ${C.border}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: C.card2, opacity: 0.5 }}>
                      <span style={{ fontFamily: PX, fontSize: 6, color: C.muted, textAlign: "center" }}>(2H<br/>WEAPON)</span>
                    </div>
                  ) : (
                    <>
                      <SlotBox item={char.equipment.offHand} onClick={char.equipment.offHand ? () => setItemMenu(char.equipment.offHand!) : undefined} />
                      {char.equipment.offHand && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.equipment.offHand.name}</div>
                          <button onClick={onUnequipOffHand} style={{ fontFamily: NU, fontSize: 10, color: C.red + "80", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>unequip</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div style={{ width: 1, background: C.border }} />
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ARMOR</div>
                <SlotBox item={char.equipment.armor} onClick={char.equipment.armor ? () => setItemMenu(char.equipment.armor!) : undefined} />
                {char.equipment.armor && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.equipment.armor.name}</div>
                    <div style={{ fontFamily: MO, fontSize: 9, color: C.blue }}>AC {char.equipment.armor.ac}</div>
                    <button onClick={onUnequipArmor} style={{ fontFamily: NU, fontSize: 10, color: C.red + "80", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>unequip</button>
                  </div>
                )}
              </div>
              <div style={{ width: 1, background: C.border }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>IN BAG</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {char.inventory.filter(i => i.type === "weapon" || i.type === "armor").map(item => (
                    <div key={item.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => onEquipItem(item)} title={`Equip ${item.name}`}>
                      <SlotBox item={item} />
                      {item.type === "weapon" && (
                        <div style={{ position: "absolute", top: -4, right: -4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 3px", fontFamily: MO, fontSize: 6, color: item.hands === 2 ? C.red : C.gold, zIndex: 2 }}>
                          {item.hands === 2 ? "2H" : "1H"}
                        </div>
                      )}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", opacity: 0, transition: "opacity 0.15s", fontFamily: PX, fontSize: 6, color: C.blue, borderRadius: 4, zIndex: 1 }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}>
                        EQUIP
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACCESSORIES */}
          {hudTab === "acc" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 14 }}>
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>JEWELRY (3 SLOTS)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {char.equipment.accessories.map((acc, i) => (
                    <div key={i}>
                      <SlotBox item={acc} onClick={acc ? () => setItemMenu(acc) : undefined} />
                      <div style={{ fontFamily: PX, fontSize: 5, color: C.muted, textAlign: "center", marginTop: 2 }}>#{i + 1}</div>
                      {acc && (
                        <div style={{ marginTop: 2 }}>
                          <div style={{ fontFamily: PX, fontSize: 5, color: C.text, maxWidth: 38, overflow: "hidden", textOverflow: "ellipsis" }}>{acc.name.slice(0, 6)}</div>
                          <button onClick={() => onUnequipAcc(i)} style={{ fontFamily: NU, fontSize: 9, color: C.red + "70", background: "none", border: "none", cursor: "pointer", padding: 0 }}>remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ width: 1, background: C.border }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>IN BAG</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {char.inventory.filter(i => i.type === "accessory").map(item => (
                    <div key={item.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => onEquipItem(item)} title={`Equip ${item.name}`}>
                      <SlotBox item={item} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SKILLS */}
          {hudTab === "skills" && (
            <div style={{ height: "100%", padding: "8px 14px", overflowY: "auto" }}>
              {(() => {
                const baseSpells = CLASS_SPELLS[char.class] ?? [];
                const spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
                  ? baseSpells.map(s => s.name === "Sleep"
                      ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
                      : s)
                  : baseSpells;

                const extraAbilities: Array<{ 
                  name: string; desc: string; color: string; level: number; type: string; 
                  icon?: string; isPassive?: boolean; maxUses?: number; used?: number; recharge?: string 
                }> = [];
                
                if (char.tutorialCompleted) {
                  extraAbilities.push({ 
                    name: "Blessing of Selenia", 
                    desc: "Passive. Max HP +5. Permanent +2% EXP from all sources.", 
                    color: C.gold, 
                    level: 0, 
                    type: "passive",
                    icon: "I_01.png",
                    isPassive: true
                  });
                }

                char.gameSkills.forEach(skillId => {
                  const def = SKILL_DICTIONARY[skillId];
                  if (def) {
                    const used = char.skillUsages?.[skillId] || 0;
                    extraAbilities.push({
                      name: def.name,
                      desc: def.description,
                      color: def.type === "heal" ? "#4cdb70" : (char.class === "Fighter" ? C.red : C.blue),
                      level: 0,
                      type: def.type === "passive" ? "passive" : (def.maxUses ? `${def.maxUses}/${def.recharge === "short" ? "Short" : "Long"} Rest` : "cantrip"),
                      icon: def.icon,
                      isPassive: def.type === "passive" || def.type === "reaction",
                      maxUses: def.maxUses,
                      used: used,
                      recharge: def.recharge
                    });
                  }
                });

                if (spells.length === 0 && extraAbilities.length === 0) return (
                  <div style={{ color: C.muted, fontFamily: NU, fontSize: 12, textAlign: "center", paddingTop: 30 }}>No skills available.</div>
                );

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <style>{`
                      @keyframes skill-expand { 0%{opacity:0;transform:skewX(6deg) scaleY(0.5)} 100%{opacity:1;transform:skewX(0deg) scaleY(1)} }
                      @keyframes skill-sweep { 0%{background-position:-100% 0} 100%{background-position:200% 0} }
                    `}</style>
                    {[...spells, ...extraAbilities].map((spell) => {
                      const isExpanded = expandedSkill === spell.name;
                      const isCantrip = spell.level === 0;
                      const attackType = (spell as { aoe?: boolean }).aoe ? (WIZARD_SPELL_CHOICES.find(w => w.name === spell.name)?.isCone ? "Cone AOE" : "Circle AOE")
                        : spell.type === "heal" ? "Healing" : "Single Target";
                      const spellColor = spell.type === "heal" ? "#4cdb70" : isCantrip ? C.blue : C.purple;

                      return (
                        <div key={spell.name} style={{ border: `1px solid ${isExpanded ? spellColor : C.border}`, transition: "border-color 0.2s" }}>
                          <button onClick={() => setExpandedSkill(isExpanded ? null : spell.name)}
                            style={{
                              width: "100%", padding: "8px 10px", cursor: "pointer",
                              background: isExpanded ? spellColor + "18" : C.card2,
                              display: "flex", alignItems: "center", gap: 8,
                              border: "none", borderBottom: isExpanded ? `1px solid ${spellColor}30` : "none",
                              transition: "background 0.2s",
                            }}>
                            {spell.name === "Blessing of Selenia" && (
                              <img src={iconBlessing} alt="Blessing" style={{ width: 14, height: 14, objectFit: "contain", marginRight: 4 }} />
                            )}
                            <span style={{ fontFamily: PX, fontSize: 7, color: spellColor, flex: 1, textAlign: "left" }}>{spell.name}</span>
                            <span style={{ fontFamily: MO, fontSize: 8, color: C.muted }}>
                              {(spell as any).maxUses ? `${(spell as any).maxUses - ((spell as any).used || 0)}/${(spell as any).maxUses} ` : ""}
                              {(spell as any).isPassive ? "passive" : (spell as any).type ? (spell as any).type : (isCantrip ? "cantrip" : `lvl ${spell.level}`)}
                            </span>
                            <span style={{ fontFamily: MO, fontSize: 9, color: spellColor }}>{isExpanded ? "▲" : "▼"}</span>
                          </button>

                          {isExpanded && (
                            <div style={{
                              padding: "10px 12px", background: C.card,
                              animation: "skill-expand 0.22s ease-out", transformOrigin: "top",
                            }}>
                              <div style={{
                                height: 2, marginBottom: 8,
                                background: `linear-gradient(90deg, transparent, ${spellColor}, transparent)`,
                                animation: "skill-sweep 1.5s ease-in-out infinite", backgroundSize: "200% 100%",
                              }} />
                              <div style={{ fontFamily: NU, fontSize: 11, color: C.text + "c0", marginBottom: 6, lineHeight: 1.5 }}>{spell.desc}</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
                                {(spell as { damage?: string }).damage && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.red, background: C.card2, padding: "3px 6px" }}>DMG: {(spell as { damage?: string }).damage}</div>
                                )}
                                {(spell as { heal?: string }).heal && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: "#4cdb70", background: C.card2, padding: "3px 6px" }}>HEAL: {(spell as { heal?: string }).heal}</div>
                                )}
                                {(spell as { range?: number }).range !== undefined && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.blue, background: C.card2, padding: "3px 6px" }}>RANGE: {((spell as { range?: number }).range || 0) / 5} tiles</div>
                                )}
                                <div style={{ fontFamily: MO, fontSize: 9, color: C.gold, background: C.card2, padding: "3px 6px" }}>{attackType}</div>
                                {(spell as { saveStat?: keyof Stats; saveDC?: number }).saveStat && (spell as { saveDC?: number }).saveDC && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, background: C.card2, padding: "3px 6px", gridColumn: "span 2" }}>
                                    {(spell as { saveStat?: string }).saveStat?.toUpperCase()} save DC {(spell as { saveDC?: number }).saveDC}
                                  </div>
                                )}
                              </div>
                              {!inCombat && !(spell as any).isPassive ? (
                                <button onClick={() => onUseSkill(spell.name)}
                                  style={{
                                    width: "100%", padding: "6px", cursor: "pointer",
                                    background: `linear-gradient(135deg, ${spellColor}30, ${spellColor}18)`,
                                    border: `2px solid ${spellColor}`, color: spellColor, fontFamily: PX, fontSize: 7,
                                    boxShadow: `0 0 8px ${spellColor}30`, transition: "box-shadow 0.2s",
                                  }}>
                                  ✨ USE SKILL
                                </button>
                              ) : (
                                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, textAlign: "center", padding: "4px 0" }}>↑ Use via combat panel</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* CHAT */}
          {hudTab === "chat" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {(["global", "party"] as const).map(t => (
                  <button key={t} onClick={() => setChatTab(t)} style={{
                    padding: "6px 14px", background: "none", border: "none", cursor: "pointer",
                    borderBottom: chatTab === t ? `2px solid ${C.blue}` : "2px solid transparent", marginBottom: -1,
                    fontFamily: PX, fontSize: 7, letterSpacing: 0.5, color: chatTab === t ? C.blue : C.muted,
                  }}>
                    {t === "global" ? "🌍 GLOBAL" : "👥 PARTY"}
                  </button>
                ))}
              </div>
              <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
                {(chatTab === "global" ? globalChat : partyChat).map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: 6, fontSize: 11, lineHeight: 1.5 }}>
                    <span style={{ fontFamily: MO, fontSize: 9, color: C.muted, flexShrink: 0 }}>{msg.time}</span>
                    <span style={{ fontFamily: PX, fontSize: 8, color: C.blue, flexShrink: 0 }}>{msg.sender.slice(0, 12)}:</span>
                    <span style={{ fontFamily: NU, color: C.text + "cc" }}>{msg.text}</span>
                  </div>
                ))}
                {chatTab === "party" && partyChat.length === 0 && (
                  <div style={{ color: C.muted, fontFamily: NU, fontSize: 12, textAlign: "center", paddingTop: 24 }}>
                    {party ? "No party messages yet." : "Join a party to use party chat."}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  disabled={chatTab === "party" && !party}
                  style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, color: C.text, fontFamily: NU, fontSize: 12, padding: "5px 8px", outline: "none" }}
                  placeholder={chatTab === "party" && !party ? "Join a party first..." : "Say something..."} />
                <button onClick={sendChat} style={{ ...pixelBtn("primary", true) }}><Send className="w-3 h-3" /></button>
              </div>
            </div>
          )}

          {/* QUEST */}
          {hudTab === "quest" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }}>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ACTIVE QUESTS</div>
              {activeQuests.length === 0
                ? <div style={{ fontFamily: NU, fontSize: 11, color: C.muted }}>No quests. Visit the Quest Board in town.</div>
                : activeQuests.map(q => (
                  <div key={q.id} style={{ padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: PX, fontSize: 7, color: C.blue }}>{q.title}</span>
                      <span style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{q.killTarget?.current}/{q.killTarget?.count}</span>
                    </div>
                    <div style={{ height: 4, background: C.bg }}>
                      <div style={{ height: "100%", background: C.blue, width: `${((q.killTarget?.current ?? 0) / (q.killTarget?.count ?? 1)) * 100}%` }} />
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* PARTY */}
          {hudTab === "party" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }}>
              {party ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: PX, fontSize: 9, color: C.blue }}>{party.name}</div>
                      <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginTop: 2 }}>{party.memberIds.length} member</div>
                    </div>
                    <button onClick={onLeaveParty} style={{ ...pixelBtn("danger", true), fontSize: 7 }}>LEAVE</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontFamily: NU, fontSize: 13, color: C.muted }}>You are not in a party.</div>
                  <div>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>CREATE PARTY</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={partyName} onChange={e => setPartyName(e.target.value)}
                        style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, color: C.text, fontFamily: NU, fontSize: 12, padding: "6px 8px", outline: "none" }}
                        placeholder="Party name..." />
                      <button disabled={!partyName.trim()} onClick={() => { onCreateParty(partyName.trim()); setPartyName(""); }}
                        style={{ ...pixelBtn("primary", true), opacity: partyName.trim() ? 1 : 0.4 }}>CREATE</button>
                    </div>
                    <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginTop: 6 }}>Parties can accept up to 2 quests from the Quest Board in town.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {itemMenu && (
        <ItemMenu
          item={itemMenu}
          inInventory={char.inventory.some(i => i.id === itemMenu.id)}
          onUse={itemMenu.type === "consumable" ? () => { onUseItem(itemMenu); setItemMenu(null); } : undefined}
          onEquip={["weapon", "armor", "accessory"].includes(itemMenu.type) && char.inventory.some(i => i.id === itemMenu.id)
            ? () => { onEquipItem(itemMenu); setItemMenu(null); } : undefined}
          onUnequip={!char.inventory.some(i => i.id === itemMenu.id) ? () => {
            if (char.equipment.mainHand?.id === itemMenu.id) onUnequipMainHand();
            else if (char.equipment.offHand?.id === itemMenu.id) onUnequipOffHand();
            else if (char.equipment.armor?.id === itemMenu.id) onUnequipArmor();
            else {
              const accIdx = char.equipment.accessories.findIndex(a => a.id === itemMenu.id);
              if (accIdx >= 0) onUnequipAcc(accIdx);
            }
            setItemMenu(null);
          } : undefined}
          onDrop={() => { onDropItem(itemMenu.id); setItemMenu(null); }}
          onClose={() => setItemMenu(null)}
        />
      )}

      {activeSecModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setActiveSecModal(null)}>
          <div style={{
            background: `linear-gradient(180deg, ${C.card} 0%, ${C.card2} 100%)`,
            border: `2px solid ${C.border}`, padding: 20, borderRadius: 8,
            width: 260, maxWidth: "90%", boxShadow: C.glow,
            position: "relative"
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveSecModal(null)} style={{
              position: "absolute", top: 8, right: 8, background: "none", border: "none",
              color: C.muted, cursor: "pointer"
            }}>
              <X className="w-5 h-5" />
            </button>

            {activeSecModal === "hp" && (
              <>
                <div style={{ fontFamily: PX, fontSize: 14, color: C.red, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 8 }}>
                  Maximum HP
                </div>
                <div style={{ fontFamily: MO, fontSize: 24, color: C.text, marginBottom: 12 }}>{char.maxHp}</div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>Base HP</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{hpBase}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>Constitution</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hpCon)}</span>
                </div>
                {hpLevelBonus > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Level Bonus</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hpLevelBonus)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.red, marginTop: 12, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                  <span>Total</span>
                  <span style={{ fontFamily: MO }}>{char.maxHp}</span>
                </div>
              </>
            )}

            {activeSecModal === "ac" && (
              <>
                <div style={{ fontFamily: PX, fontSize: 14, color: C.gold, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 8 }}>
                  Armor Class
                </div>
                <div style={{ fontFamily: MO, fontSize: 24, color: C.text, marginBottom: 12 }}>{char.ac}</div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>{char.equipment.armor?.name || "Base"}</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{acBase}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>Dexterity Modifier</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acDex)}</span>
                </div>
                {acShield > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Shield</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acShield)}</span>
                  </div>
                )}
                {acOther > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Other Bonus</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acOther)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.gold, marginTop: 12, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                  <span>Total</span>
                  <span style={{ fontFamily: MO }}>{char.ac}</span>
                </div>
              </>
            )}

            {activeSecModal === "hit" && (
              <>
                <div style={{ fontFamily: PX, fontSize: 14, color: C.gold, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 8 }}>
                  Attack Bonus
                </div>
                <div style={{ fontFamily: MO, fontSize: 24, color: C.text, marginBottom: 12 }}>{formatMod(hitInfo.total)}</div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>{hitInfo.statName === "STR" ? "Strength" : "Dexterity"} Modifier</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.statMod)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>Proficiency Bonus</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.prof)}</span>
                </div>
                {hitInfo.weaponBonus > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Weapon Bonus</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(hitInfo.weaponBonus)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.gold, marginTop: 12, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                  <span>Total</span>
                  <span style={{ fontFamily: MO }}>{formatMod(hitInfo.total)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
