import { useState, useEffect, useRef, ReactNode } from "react";
import {
  User, Package, Sword, Star, MessageCircle, Users, Send,
  ChevronDown, ChevronUp, Heart, X,
} from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { CLASS_SPELLS, WIZARD_SPELL_CHOICES, CLASS_CFG } from "../../constants/classes";
import { SKILL_DICTIONARY } from "../../constants/skills";
import iconBlessing from "../../assets/icon/skill/I_01.png";
import { getMod, getWeaponHitBonus, formatMod, getVersatileDamage2H, getWeaponStat, calcACBreakdown } from "../../utils/dice";
import { HpBar } from "../ui/HpBar";
import { StatBox } from "../ui/StatBox";
import { ItemMenu, PropertyTag, DamageTypeTag } from "../modals/ItemMenu";
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

  const acBD = calcACBreakdown(char);

  const hitInfo = char.equipment.mainHand && char.equipment.mainHand.type === "weapon" 
    ? getWeaponHitBonus(char, char.equipment.mainHand)
    : { total: char.profBonus + getMod(char.stats.str), statName: "STR", statMod: getMod(char.stats.str), prof: char.profBonus, weaponBonus: 0 };

  return (
    <div style={{ background: C.card, borderTop: `2px solid ${C.border}`, flexShrink: 0, fontFamily: NU }}>
      <style>{`
        @keyframes hud-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hud-collapse {
          from { height: 188px; opacity: 1; }
          to   { height: 0px;   opacity: 0; }
        }
        .hud-tab-btn {
          transition: color 0.18s, background 0.18s, border-color 0.18s;
        }
        .hud-tab-btn:hover {
          color: #a0b8ff !important;
          background: rgba(100,130,255,0.07) !important;
        }
        .hud-tab-btn:active {
          transform: scaleY(0.95);
        }
        .hud-collapse-btn {
          transition: color 0.18s, transform 0.25s ease;
        }
        .hud-collapse-btn:hover { color: #a0b8ff !important; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", borderBottom: `2px solid ${C.border}` }}>
        <div style={{ display: "flex", flex: 1, overflowX: "auto" }} className="hud-tab-scroll">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setHudTab(t.id); if (!hudOpen) setHudOpen(true); }}
              className="hud-tab-btn"
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
                background: hudTab === t.id && hudOpen ? "rgba(100,130,255,0.09)" : "none",
                border: "none", cursor: "pointer", flexShrink: 0,
                borderBottom: hudTab === t.id && hudOpen ? `2px solid ${C.blue}` : "2px solid transparent",
                marginBottom: -2,
                fontFamily: PX, fontSize: 7, letterSpacing: 0.5,
                color: hudTab === t.id && hudOpen ? C.blue : C.muted,
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <button
          className="hud-collapse-btn"
          onClick={() => setHudOpen(p => !p)}
          style={{
            padding: "8px 12px", background: "none", border: "none", cursor: "pointer", color: C.muted,
            transform: hudOpen ? "rotate(0deg)" : "rotate(180deg)",
          }}>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div style={{
        height: hudOpen ? 188 : 0,
        overflow: "hidden",
        transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Animated content pane — re-mounts on tab change to trigger fade-in */}
        <div key={hudTab} style={{ height: "100%", animation: "hud-fadein 0.18s ease-out" }}>
          {hudTab === "char" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 16 }} className="hud-scroll">
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
              <div style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }} className="hud-scroll">
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
                    return C.border;
                  };
                  const getTagColor = (tag: string) => {
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
                    return C.purple;
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                      {stackedItems.map(item => (
                        <div key={item.id}
                          onClick={() => setItemMenu(item)}
                          style={{
                            cursor: "pointer", position: "relative",
                            border: `1.5px solid ${item.rarity && item.rarity !== "common" ? getRarityColor(item.rarity) : C.border}`,
                            background: C.card2,
                            padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, minHeight: 62,
                            transition: "all 0.15s ease-in-out",
                            boxShadow: item.rarity && item.rarity !== "common" ? `inset 0 0 10px ${getRarityColor(item.rarity)}30, 0 0 6px ${getRarityColor(item.rarity)}20` : "none"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.borderColor = C.blue;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderColor = item.rarity && item.rarity !== "common" ? getRarityColor(item.rarity) : C.border;
                          }}
                        >
                          {item.count > 1 && (
                            <div style={{ position: "absolute", top: -4, right: -4, background: C.blue, color: "#fff", fontSize: 7, fontFamily: PX, padding: "1px 4px", borderRadius: 4, zIndex: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                              x{item.count}
                            </div>
                          )}
                          <span style={{ fontSize: 20, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
                            {item.type === "weapon" ? "⚔" : item.type === "armor" ? "🛡" : item.type === "accessory" ? "💍" : item.material ? "🪵" : "💊"}
                          </span>
                          <span style={{ fontFamily: PX, fontSize: 7, color: C.text, marginTop: 4, textAlign: "center", lineHeight: 1.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "90%" }}>
                            {item.name}
                          </span>
                          {item.tags && item.tags.length > 0 && (
                            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", marginTop: 3 }}>
                              {item.tags.slice(0, 2).map((t: string) => (
                                <span key={t} style={{
                                  fontFamily: PX, fontSize: 6, padding: "1px 4px",
                                  background: getTagColor(t) + "25",
                                  border: `1px solid ${getTagColor(t)}60`,
                                  borderRadius: 3, color: getTagColor(t),
                                  lineHeight: 1.2,
                                }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* EQUIPMENT */}
          {hudTab === "equip" && (() => {
            const mh = char.equipment.mainHand;
            const oh = char.equipment.offHand;
            const ar = char.equipment.armor;
            const offEmpty = !oh;

            const WeaponInfo = ({ item, label, onUnequip }: { item: NonNullable<typeof mh>; label: string; onUnequip: () => void }) => {
              const isVers = item.properties?.includes("versatile");
              const effDmg = isVers && offEmpty && label === "MAIN" ? getVersatileDamage2H(item.damage ?? "1d4") : (item.damage ?? "-");
              const { mod: sm } = getWeaponStat(char, item);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}>
                  <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1 }}>{label} HAND</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setItemMenu(item)}>
                      <SlotBox item={item} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: PX, fontSize: 8, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 90 }}>{item.name}</div>
                      <div style={{ fontFamily: MO, fontSize: 11, color: C.red, marginBottom: 2 }}>
                        {effDmg}{sm >= 0 ? "+" : ""}{sm}
                        {isVers && offEmpty && label === "MAIN" && <span style={{ fontFamily: PX, fontSize: 6, color: "#ff9800", marginLeft: 4 }}>2H</span>}
                      </div>
                      <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        {item.damageType && <DamageTypeTag dt={item.damageType} small />}
                        {item.properties?.slice(0, 2).map(p => <PropertyTag key={p} prop={p} small />)}
                      </div>
                    </div>
                  </div>
                  <button onClick={onUnequip} style={{ fontFamily: PX, fontSize: 6, color: C.red + "80", background: "none", border: `1px solid ${C.red}25`, cursor: "pointer", padding: "2px 6px", alignSelf: "flex-start", letterSpacing: 0.5, transition: "border-color 0.15s" }}>UNEQUIP</button>
                </div>
              );
            };

            return (
              <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 0, alignItems: "flex-start" }} className="hud-scroll">

                {/* ── Equipped ───────────────────────── */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexShrink: 0 }}>

                  {mh ? <WeaponInfo item={mh} label="MAIN" onUnequip={onUnequipMainHand} /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1 }}>MAIN HAND</div>
                      <SlotBox item={null} />
                    </div>
                  )}

                  {mh?.hands === 2 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1 }}>OFF HAND</div>
                      <div style={{ width: 44, height: 44, border: `1px dashed ${C.border}40`, display: "flex", alignItems: "center", justifyContent: "center", background: C.card2, opacity: 0.4 }}>
                        <span style={{ fontFamily: PX, fontSize: 5, color: C.muted }}>2H</span>
                      </div>
                    </div>
                  ) : oh ? <WeaponInfo item={oh} label="OFF" onUnequip={onUnequipOffHand} /> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1 }}>OFF HAND</div>
                      <SlotBox item={null} />
                    </div>
                  )}

                  {/* Armor */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 80 }}>
                    <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1 }}>ARMOR</div>
                    {ar ? (
                      <>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setItemMenu(ar!)}>
                            <SlotBox item={ar} />
                          </div>
                          <div>
                            <div style={{ fontFamily: PX, fontSize: 8, color: C.text, marginBottom: 2 }}>{ar.name}</div>
                            <div style={{ fontFamily: MO, fontSize: 11, color: C.blue }}>AC {ar.ac}</div>
                          </div>
                        </div>
                        <button onClick={onUnequipArmor} style={{ fontFamily: PX, fontSize: 6, color: C.red + "80", background: "none", border: `1px solid ${C.red}25`, cursor: "pointer", padding: "2px 6px", alignSelf: "flex-start", letterSpacing: 0.5 }}>UNEQUIP</button>
                      </>
                    ) : <SlotBox item={null} />}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: 1, background: C.border, margin: "0 14px", alignSelf: "stretch" }} />

                {/* ── IN BAG ─────────────────────────── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, letterSpacing: 1, marginBottom: 7 }}>
                    IN BAG <span style={{ color: C.blue + "80", fontFamily: NU, fontSize: 10 }}>· click to inspect & equip</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {char.inventory.filter(i => i.type === "weapon" || i.type === "armor").map(item => (
                      <div key={item.id}
                        style={{ position: "relative", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 4px 3px", background: C.card2, border: `1px solid ${C.border}`, transition: "border-color 0.15s, background 0.15s" }}
                        onClick={() => setItemMenu(item)}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.blue; (e.currentTarget as HTMLDivElement).style.background = C.blue + "10"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.background = C.card2; }}>
                        <SlotBox item={item} />
                        <div style={{ fontFamily: PX, fontSize: 5, color: C.muted, maxWidth: 44, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        {item.type === "weapon" && item.damage !== "0" && (
                          <div style={{ position: "absolute", top: 2, right: 2, fontFamily: MO, fontSize: 5, color: item.hands === 2 ? "#f06292" : C.gold }}>
                            {item.hands === 2 ? "2H" : "1H"}
                          </div>
                        )}
                      </div>
                    ))}
                    {char.inventory.filter(i => i.type === "weapon" || i.type === "armor").length === 0 && (
                      <div style={{ fontFamily: NU, fontSize: 11, color: C.muted + "50", padding: "8px 0", fontStyle: "italic" }}>Empty</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}


          {/* ACCESSORIES */}
          {hudTab === "acc" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto", display: "flex", gap: 14 }} className="hud-scroll">
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
          {hudTab === "skills" && (() => {
            const baseSpells = CLASS_SPELLS[char.class] ?? [];
            const spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
              ? baseSpells.map(s => s.name === "Sleep"
                  ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
                  : s)
              : baseSpells;

            type CardEntry = {
              key: string; name: string; desc: string;
              typeLabel: string; typeColor: string;
              icon?: string; isBlessing?: boolean;
              maxUses?: number; used?: number; recharge?: string;
              damage?: string; heal?: string; range?: number;
              saveStat?: string; saveDC?: number; aoe?: boolean; isCone?: boolean;
            };

            const cards: CardEntry[] = [];

            if (char.tutorialCompleted) {
              cards.push({
                key: "blessing", name: "Blessing of Selenia",
                desc: "Max HP +5. Permanent +2% EXP from all sources.",
                typeLabel: "PASSIVE", typeColor: C.gold, isBlessing: true,
              });
            }

            char.gameSkills.forEach(skillId => {
              const def = SKILL_DICTIONARY[skillId];
              if (!def) return;
              const used = char.skillUsages?.[skillId] || 0;
              const tColor = def.type === "passive" ? C.blue : def.type === "heal" ? "#4cdb70" : def.type === "reaction" ? "#ba68c8" : C.red;
              const tLabel = def.type === "passive" ? "PASSIVE" : def.type === "reaction" ? "REACTION"
                : def.maxUses ? `${def.maxUses - used}/${def.maxUses} · ${def.recharge === "short" ? "SHORT" : "LONG"} REST`
                : "ACTIVE";
              cards.push({ key: skillId, name: def.name, desc: def.description, typeLabel: tLabel, typeColor: tColor, icon: def.icon, maxUses: def.maxUses, used, recharge: def.recharge });
            });

            spells.forEach(sp => {
              const isHeal = sp.type === "heal";
              const tColor = isHeal ? "#4cdb70" : sp.level === 0 ? C.blue : C.purple;
              const tLabel = sp.level === 0 ? "CANTRIP" : `LEVEL ${sp.level}`;
              const spAny = sp as any;
              const aoe = spAny.aoe;
              const isCone = WIZARD_SPELL_CHOICES.find(w => w.name === sp.name)?.isCone;
              cards.push({
                key: sp.name, name: sp.name, desc: sp.desc, typeLabel: tLabel, typeColor: tColor,
                damage: spAny.damage, heal: spAny.heal, range: spAny.range,
                saveStat: spAny.saveStat, saveDC: spAny.saveDC, aoe, isCone,
              });
            });

            if (cards.length === 0) return (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: NU, fontSize: 12, color: C.muted }}>No skills available yet.</div>
              </div>
            );

            return (
              <div style={{ height: "100%", padding: "8px 12px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignContent: "start" }} className="hud-scroll">
                {cards.map(card => {
                  const chargesLeft = card.maxUses != null ? card.maxUses - (card.used ?? 0) : null;
                  const isExhausted = chargesLeft === 0;
                  return (
                    <div key={card.key} style={{
                      padding: "8px 10px", background: C.card2,
                      border: `1px solid ${isExhausted ? C.border + "40" : card.typeColor + "30"}`,
                      opacity: isExhausted ? 0.5 : 1,
                    }}>
                      {/* Row 1: icon + name + type badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        {card.isBlessing && <img src={iconBlessing} alt="" style={{ width: 14, height: 14, objectFit: "contain", flexShrink: 0 }} />}
                        <span style={{ fontFamily: PX, fontSize: 8, color: card.typeColor, flex: 1, lineHeight: 1.2 }}>{card.name}</span>
                        <span style={{ fontFamily: PX, fontSize: 6, color: card.typeColor, background: card.typeColor + "18", border: `1px solid ${card.typeColor}30`, padding: "1px 4px", flexShrink: 0 }}>
                          {card.typeLabel}
                        </span>
                      </div>

                      {/* Charge pips */}
                      {card.maxUses != null && (
                        <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                          {Array.from({ length: card.maxUses }, (_, i) => (
                            <div key={i} style={{ width: 7, height: 7, border: `1px solid ${card.typeColor}`, background: i < (chargesLeft ?? 0) ? card.typeColor : "transparent" }} />
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, lineHeight: 1.4, marginBottom: card.damage || card.heal || card.range || card.saveStat ? 5 : 0 }}>
                        {card.desc}
                      </div>

                      {/* Stat tags */}
                      {(card.damage || card.heal || card.range || card.saveStat || card.aoe) && (
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
                          {card.damage && <span style={{ fontFamily: MO, fontSize: 8, color: C.red, background: C.red + "15", padding: "1px 4px", border: `1px solid ${C.red}25` }}>⚔ {card.damage}</span>}
                          {card.heal && <span style={{ fontFamily: MO, fontSize: 8, color: "#4cdb70", background: "#4cdb7015", padding: "1px 4px", border: "1px solid #4cdb7025" }}>♥ {card.heal}</span>}
                          {card.range != null && <span style={{ fontFamily: MO, fontSize: 8, color: "#ba68c8", background: "#ba68c815", padding: "1px 4px", border: "1px solid #ba68c825" }}>📏 {card.range / 5}t</span>}
                          {card.aoe && <span style={{ fontFamily: PX, fontSize: 7, color: C.gold, background: C.gold + "15", padding: "1px 4px", border: `1px solid ${C.gold}25` }}>{card.isCone ? "CONE" : "AOE"}</span>}
                          {card.saveStat && card.saveDC && <span style={{ fontFamily: MO, fontSize: 8, color: C.muted, background: C.card, padding: "1px 4px", border: `1px solid ${C.border}` }}>{card.saveStat.toUpperCase()} DC {card.saveDC}</span>}
                        </div>
                      )}

                      {/* In-combat note for active skills */}
                      {!card.isBlessing && card.typeLabel !== "PASSIVE" && inCombat && !isExhausted && (
                        <div style={{ fontFamily: PX, fontSize: 6, color: C.muted + "80", marginTop: 4, letterSpacing: 0.5 }}>USE VIA COMBAT PANEL</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}





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
              <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 3 }} className="hud-scroll">
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
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }} className="hud-scroll">
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
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }} className="hud-scroll">
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
      </div>

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
                <div style={{ fontFamily: MO, fontSize: 24, color: C.text, marginBottom: 12 }}>{acBD.total}</div>

                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                  <span>{acBD.armorLabel}</span>
                  <span style={{ fontFamily: MO, color: C.blue }}>{acBD.armorValue}</span>
                </div>
                {acBD.dexLabel && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>{acBD.dexLabel}</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acBD.dexValue)}</span>
                  </div>
                )}
                {acBD.shieldValue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Shield</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acBD.shieldValue)}</span>
                  </div>
                )}
                {acBD.otherValue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.text, marginBottom: 4 }}>
                    <span>Other Bonus</span>
                    <span style={{ fontFamily: MO, color: C.blue }}>{formatMod(acBD.otherValue)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NU, fontSize: 13, color: C.gold, marginTop: 12, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
                  <span>Total</span>
                  <span style={{ fontFamily: MO }}>{acBD.total}</span>
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
