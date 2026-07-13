import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { C, PX, NU, MO, panel, pixelBtn } from "../../constants/theme";
import {
  CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES, STAT_DESCRIPTIONS, PROFICIENCY_LIST,
} from "../../constants/classes";
import { PixelCorners } from "../ui/PixelCorners";
import { StatBox } from "../ui/StatBox";
import { createCharacter } from "../../game/character";
import { getMod } from "../../utils/dice";
import type { Character, CharClass, Stats } from "../../types/game";

// Pixel-art profile presets
import _p1 from "../../assets/avatar/proflie1.png";
import _p2 from "../../assets/avatar/profile2.png";
import _p3 from "../../assets/avatar/profile3.png";
import _p4 from "../../assets/avatar/profile4.png";

const PIXEL_AVATARS: string[] = [_p1, _p2, _p3, _p4];

export function CharCreateScreen({ onCreated, onBack }: { onCreated: (c: Character) => void; onBack: () => void }) {
  const [step, setStep] = useState<"basic" | "class" | "stats" | "review">("basic");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cls, setCls] = useState<CharClass | null>(null);
  const [customStats, setCustomStats] = useState<Stats>({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const [pointsLeft, setPointsLeft] = useState(5);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [wizardSpell, setWizardSpell] = useState("Sleep");

  const preview = cls ? createCharacter(name || "Hero", avatar, cls, customStats, selectedSkills, wizardSpell) : null;

  function adjustStat(stat: keyof Stats, delta: number) {
    if (delta > 0 && pointsLeft <= 0) return;
    if (delta < 0 && customStats[stat] <= 8) return;
    setCustomStats(prev => ({ ...prev, [stat]: prev[stat] + delta }));
    setPointsLeft(prev => prev - delta);
  }
  function toggleSkill(skillName: string) {
    setSelectedSkills(prev => prev.includes(skillName) ? prev.filter(s => s !== skillName) : prev.length < 4 ? [...prev, skillName] : prev);
  }
  function handleClassSelect(c: CharClass) {
    setCls(c);
    setCustomStats({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    setPointsLeft(5);
    setSelectedSkills([]);
    setWizardSpell("Sleep");
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: C.card2, border: `2px solid ${C.border}`,
    color: C.text, fontFamily: NU, fontSize: 14, padding: "10px 12px", outline: "none",
  };

  const STEPS = ["basic", "class", "stats", "review"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ ...pixelBtn("ghost", true) }}>← BACK</button>
          <div style={{ fontFamily: PX, fontSize: 10, color: C.blue, letterSpacing: 1 }}>
            {step === "basic" ? "NAME YOUR HERO" : step === "class" ? "CHOOSE CLASS" : step === "stats" ? "BUILD YOUR HERO" : "REVIEW"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 4,
              background: STEPS.indexOf(step) >= i ? C.blue : C.card2,
              boxShadow: STEPS.indexOf(step) >= i ? `0 0 6px ${C.blue}` : "none",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {step === "basic" && (
          <div style={{ ...panel, padding: 24, position: "relative" }}>
            <PixelCorners />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>CHARACTER NAME</div>
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Enter a name..." />
              </div>
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>AVATAR URL (optional)</div>
                <input value={avatar} onChange={e => setAvatar(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} placeholder="https://..." />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PIXEL_AVATARS.map((url, i) => (
                    <button key={i} onClick={() => setAvatar(url)}
                      style={{
                        width: 44, height: 44, overflow: "hidden", cursor: "pointer", padding: 0,
                        border: `2px solid ${avatar === url ? C.blue : "transparent"}`,
                        boxShadow: avatar === url ? C.glow : "none",
                      }}>
                      <img src={url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: C.card2, border: `1px solid ${C.border}` }}>
                <div style={{ width: 52, height: 52, overflow: "hidden", border: `2px solid ${C.border}`, flexShrink: 0 }}>
                  {avatar
                    ? <img src={avatar} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>?</div>
                  }
                </div>
                <div>
                  <div style={{ fontFamily: PX, fontSize: 9, color: C.text }}>{name || "..."}</div>
                  <div style={{ fontFamily: NU, fontSize: 12, color: C.muted, marginTop: 2 }}>Level 1 Adventurer</div>
                </div>
              </div>
              <button disabled={!name.trim()} onClick={() => setStep("class")}
                style={{ ...pixelBtn("primary"), opacity: name.trim() ? 1 : 0.4, width: "100%" }}>
                CONTINUE →
              </button>
            </div>
          </div>
        )}

        {step === "class" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.keys(CLASS_CFG) as CharClass[]).map(c => {
              const cfg = CLASS_CFG[c];
              const selected = cls === c;
              return (
                <button key={c} onClick={() => handleClassSelect(c)}
                  style={{
                    ...panel, padding: "14px 16px", cursor: "pointer",
                    display: "flex", alignItems: "flex-start", gap: 14,
                    border: `2px solid ${selected ? cfg.color : C.border}`,
                    boxShadow: selected ? `0 0 16px ${cfg.color}40` : C.glow,
                    width: "100%", textAlign: "left",
                  }}>
                  <div style={{ fontSize: 28, lineHeight: 1, paddingTop: 2 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: PX, fontSize: 9, color: cfg.color }}>{c.toUpperCase()}</span>
                      {cfg.spellMax && <span style={{ fontFamily: NU, fontSize: 10, padding: "1px 6px", background: C.purple + "30", color: C.purple, border: `1px solid ${C.purple}40` }}>✨ Spellcaster</span>}
                      {selected && <CheckCircle className="w-4 h-4" style={{ color: cfg.color, marginLeft: "auto" }} />}
                    </div>
                    <div style={{ fontFamily: NU, fontSize: 12, color: C.muted, marginBottom: 8 }}>{cfg.desc}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: MO, fontSize: 9, padding: "2px 5px", background: C.red + "20", color: C.red, border: `1px solid ${C.red}40` }}>HP:{cfg.hpBase}</span>
                      <span style={{ fontFamily: MO, fontSize: 9, padding: "2px 5px", background: C.blue + "20", color: C.blue, border: `1px solid ${C.blue}40` }}>AC:{cfg.acBase}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setStep("basic")} style={{ ...pixelBtn("ghost"), flex: 1 }}>← BACK</button>
              <button disabled={!cls} onClick={() => setStep("stats")} style={{ ...pixelBtn("primary"), flex: 1, opacity: cls ? 1 : 0.4 }}>BUILD STATS →</button>
            </div>
          </div>
        )}

        {step === "stats" && cls && (
          <div style={{ ...panel, padding: 24, position: "relative" }}>
            <PixelCorners color={CLASS_CFG[cls].color} />

            <div style={{ fontFamily: PX, fontSize: 8, color: CLASS_CFG[cls].color, marginBottom: 4, letterSpacing: 1 }}>ABILITY SCORES</div>
            <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 14 }}>
              Distribute <span style={{ color: C.gold, fontWeight: 700 }}>{pointsLeft} points</span> remaining · Start at 10 · Min 8
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {(Object.keys(customStats) as (keyof Stats)[]).map(stat => {
                const base = customStats[stat];
                const profBonus = selectedSkills.filter(sk => PROFICIENCY_LIST.find(p => p.name === sk)?.stat === stat).length;
                const effective = base + profBonus;
                const mod = getMod(effective);
                const desc = STAT_DESCRIPTIONS[stat];
                return (
                  <div key={stat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: MO, fontSize: 10, color: C.text, textTransform: "uppercase", marginBottom: 2 }}>{desc.label}</div>
                      <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>{desc.effect}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => adjustStat(stat, -1)} disabled={base <= 8}
                        style={{ ...pixelBtn("ghost", true), padding: "4px 8px", opacity: base <= 8 ? 0.4 : 1, fontFamily: MO, fontSize: 12 }}>−</button>
                      <div style={{ textAlign: "center", minWidth: 52 }}>
                        <div style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: profBonus > 0 ? "#4cdb70" : C.blue }}>
                          {effective}
                          {profBonus > 0 && <span style={{ fontSize: 9, color: "#4cdb70" }}> (+{profBonus})</span>}
                        </div>
                        <div style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{mod >= 0 ? `+${mod}` : `${mod}`}</div>
                      </div>
                      <button onClick={() => adjustStat(stat, 1)} disabled={pointsLeft <= 0}
                        style={{ ...pixelBtn("primary", true), padding: "4px 8px", opacity: pointsLeft <= 0 ? 0.4 : 1, fontFamily: MO, fontSize: 12 }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 20 }}>
              {pointsLeft} POINT{pointsLeft !== 1 ? "S" : ""} REMAINING
            </div>

            <div style={{ fontFamily: PX, fontSize: 8, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>PROFICIENCIES</div>
            <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 10 }}>
              Choose <span style={{ color: C.gold, fontWeight: 700 }}>4 skills</span> · {selectedSkills.length}/4 selected
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 }}>
              {PROFICIENCY_LIST.map(prof => {
                const sel = selectedSkills.includes(prof.name);
                return (
                  <button key={prof.name} onClick={() => toggleSkill(prof.name)}
                    style={{
                      padding: "8px 10px", cursor: "pointer", textAlign: "left",
                      background: sel ? C.blue + "18" : C.card2,
                      border: `2px solid ${sel ? C.blue : C.border}`,
                      boxShadow: sel ? `0 0 8px ${C.blue}30` : "none",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: MO, fontSize: 9, color: sel ? C.blue : C.text }}>{prof.name}</span>
                      <span style={{ fontFamily: MO, fontSize: 7, color: "#4cdb70", padding: "1px 4px", background: "#4cdb7015", border: "1px solid #4cdb7040" }}>+1 {prof.stat.toUpperCase()}</span>
                    </div>
                    <div style={{ fontFamily: NU, fontSize: 9, color: C.muted }}>{prof.effect.split("—")[1]?.trim() ?? ""}</div>
                  </button>
                );
              })}
            </div>

            {cls === "Wizard" && (
              <>
                <div style={{ fontFamily: PX, fontSize: 8, color: C.purple, marginBottom: 4, letterSpacing: 1 }}>PREPARED SPELL</div>
                <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 10 }}>Choose your 3rd spell (in addition to Fire Bolt + Magic Missile)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                  {WIZARD_SPELL_CHOICES.map(sp => {
                    const sel = wizardSpell === sp.name;
                    return (
                      <button key={sp.name} onClick={() => setWizardSpell(sp.name)}
                        style={{
                          padding: "8px 12px", cursor: "pointer", textAlign: "left",
                          background: sel ? C.purple + "20" : C.card2,
                          border: `2px solid ${sel ? C.purple : C.border}`,
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                        <div style={{ width: 14, height: 14, border: `2px solid ${sel ? C.purple : C.muted}`, background: sel ? C.purple : "transparent", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: MO, fontSize: 9, color: sel ? C.purple : C.text, marginBottom: 2 }}>{sp.name} {sp.aoe ? "(AOE)" : ""}</div>
                          <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>{sp.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("class")} style={{ ...pixelBtn("ghost"), flex: 1 }}>← BACK</button>
              <button disabled={selectedSkills.length < 4} onClick={() => setStep("review")}
                style={{ ...pixelBtn("primary"), flex: 1, opacity: selectedSkills.length >= 4 ? 1 : 0.4 }}>
                REVIEW →
              </button>
            </div>
          </div>
        )}

        {step === "review" && cls && preview && (
          <div style={{ ...panel, padding: 24, position: "relative" }}>
            <PixelCorners color={CLASS_CFG[cls].color} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, overflow: "hidden", border: `3px solid ${CLASS_CFG[cls].color}`, flexShrink: 0 }}>
                {avatar
                  ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: CLASS_CFG[cls].color + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{CLASS_CFG[cls].icon}</div>
                }
              </div>
              <div>
                <div style={{ fontFamily: PX, fontSize: 11, color: C.text, marginBottom: 4 }}>{name}</div>
                <div style={{ fontFamily: NU, fontSize: 13, color: CLASS_CFG[cls].color }}>{CLASS_CFG[cls].icon} {cls} · Level 1</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, fontFamily: MO, fontSize: 10 }}>
                  <span style={{ color: C.red }}>♥ {preview.maxHp}</span>
                  <span style={{ color: C.blue }}>🛡 {preview.ac}</span>
                  {preview.spellSlots && <span style={{ color: C.purple }}>✨ {preview.spellSlots.max} slots</span>}
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, margin: "0 0 14px" }} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>ABILITY SCORES</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Object.entries(preview.stats) as [keyof Stats, number][]).map(([k, v]) => (
                  <StatBox key={k} label={k} value={v} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>PROFICIENCIES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {selectedSkills.map(s => (
                  <span key={s} style={{ fontFamily: NU, fontSize: 10, padding: "2px 8px", background: C.blue + "18", color: C.blue, border: `1px solid ${C.blue}40` }}>{s}</span>
                ))}
              </div>
            </div>
            {cls === "Wizard" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>WIZARD SPELL</div>
                <span style={{ fontFamily: NU, fontSize: 11, padding: "2px 8px", background: C.purple + "20", color: C.purple, border: `1px solid ${C.purple}40` }}>✨ {wizardSpell}</span>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>STARTING EQUIPMENT</div>
              {[preview.equipment.weapon, preview.equipment.armor].filter(Boolean).map(item => item && (
                <div key={item.id} style={{ display: "flex", gap: 8, fontFamily: NU, fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: CLASS_CFG[cls].color }}>{item.type === "weapon" ? "⚔" : "🛡"}</span>
                  <span style={{ color: C.text }}>{item.name}</span>
                  <span style={{ color: C.muted }}>{item.description}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("stats")} style={{ ...pixelBtn("ghost"), flex: 1 }}>← BACK</button>
              <button onClick={() => onCreated(preview)} style={{ ...pixelBtn("primary"), flex: 1 }}>⚔ BEGIN!</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Avoid unused import warning
void CLASS_SPELLS;
