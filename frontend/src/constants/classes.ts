import type { CharClass, Item, Stats } from "../types/game";

// ─────────────────────────────────────────────────
// CLASS CONFIGURATIONS
// ─────────────────────────────────────────────────

export const CLASS_CFG: Record<CharClass, {
  color: string; icon: string; desc: string;
  hpBase: number; acBase: number; stats: Stats;
  skills: string[]; saves: string[];
  gameSkills: string[];
  spellMax?: number;
  weapon: Omit<Item, "id">; armor: Omit<Item, "id">;
  extra?: Omit<Item, "id">[];
}> = {
  Fighter: {
    color: "#e05050", icon: "⚔️",
    desc: "Master of martial combat. Second Wind restores HP once per short rest.",
    hpBase: 12, acBase: 16,
    stats: { str: 16, dex: 13, con: 15, int: 8, wis: 12, cha: 10 },
    skills: ["Athletics", "Intimidation"], saves: ["Strength", "Constitution"],
    gameSkills: [],
    weapon: { name: "Longsword", type: "weapon", hands: 1, damage: "1d8", damageType: "slashing", properties: ["versatile"], range: 5, value: 15, description: "A versatile blade. 1d8+STR slashing, 1 tile reach." },
    armor: { name: "Chain Mail", type: "armor", ac: 16, value: 75, description: "Heavy interlocking rings. AC 16." },
  },
  Cleric: {
    color: "#ffd54f", icon: "✨",
    desc: "Divine spellcaster with healing magic and heavy armor proficiency.",
    hpBase: 10, acBase: 14,
    stats: { str: 13, dex: 10, con: 14, int: 12, wis: 16, cha: 15 },
    skills: ["Medicine", "Religion"], saves: ["Wisdom", "Charisma"],
    gameSkills: ["cleric_divine_domain", "cleric_healing_word"],
    spellMax: 2,
    weapon: { name: "Mace", type: "weapon", hands: 1, damage: "1d6", damageType: "bludgeoning", properties: [], range: 5, value: 5, description: "Holy war club. 1d6 bludgeoning." },
    armor: { name: "Scale Mail", type: "armor", ac: 14, value: 50, description: "Overlapping metal scales. AC 14." },
  },
  Paladin: {
    color: "#c080ff", icon: "🛡️",
    desc: "Sacred oath-bound warrior with divine smite and heavy armor.",
    hpBase: 12, acBase: 18,
    stats: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
    skills: ["Persuasion", "Athletics"], saves: ["Wisdom", "Charisma"],
    gameSkills: ["paladin_aura_of_protection", "paladin_divine_smite", "paladin_shield_block"],
    spellMax: 2,
    weapon: { name: "Longsword", type: "weapon", hands: 1, damage: "1d8", damageType: "slashing", properties: ["versatile"], range: 5, value: 15, description: "A blessed blade. 1d8+STR slashing." },
    armor: { name: "Plate Armor", type: "armor", ac: 18, value: 150, description: "Full plate. AC 18." },
  },
  Ranger: {
    color: "#4cdb70", icon: "🏹",
    desc: "Wilderness warrior with archery mastery and Favored Enemy tracking.",
    hpBase: 10, acBase: 14,
    stats: { str: 12, dex: 16, con: 13, int: 10, wis: 14, cha: 8 },
    skills: ["Survival", "Perception"], saves: ["Strength", "Dexterity"],
    gameSkills: ["ranger_hunters_mark", "ranger_nimble_escape"],
    weapon: { name: "Shortbow", type: "weapon", hands: 2, damage: "1d6", damageType: "piercing", properties: ["two-handed"], range: 30, value: 25, description: "Nimble hunting bow. 1d6+DEX piercing, 6 tiles range." },
    armor: { name: "Leather Armor", type: "armor", ac: 13, value: 10, description: "Supple leather. AC 13 + DEX mod." },
    extra: [{ name: "Dagger", type: "weapon", hands: 1, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: 5, value: 10, description: "Light blade. 1d4+STR/DEX piercing." }],
  },
  Wizard: {
    color: "#5eb8ff", icon: "🔮",
    desc: "Arcane scholar with a spellbook of powerful ranged spells.",
    hpBase: 6, acBase: 12,
    stats: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
    skills: ["Arcana", "Investigation"], saves: ["Intelligence", "Wisdom"],
    gameSkills: ["wizard_arcane_recovery", "wizard_shield_spell"],
    spellMax: 2,
    weapon: { name: "Quarterstaff", type: "weapon", hands: 2, damage: "1d4", damageType: "bludgeoning", properties: ["versatile"], range: 5, value: 2, description: "Arcane staff. 1d4+STR bludgeoning." },
    armor: { name: "Mage Robes", type: "armor", ac: 10, value: 5, description: "Enchanted cloth. AC 10 + DEX mod." },
  },
};

// ─────────────────────────────────────────────────
// SPELLS PER CLASS
// ─────────────────────────────────────────────────

export const CLASS_SPELLS: Partial<Record<CharClass, Array<{
  name: string; level: number; type: "attack" | "heal" | "save" | "cantrip";
  damage?: string; heal?: string; range: number; auto?: boolean;
  saveStat?: keyof Stats; saveDC?: number; desc: string; isBonus?: boolean;
}>>> = {
  Wizard: [
    { name: "Fire Bolt", level: 0, type: "cantrip", damage: "1d10", range: 60, desc: "Ranged spell attack. 1d10 fire damage." },
    { name: "Magic Missile", level: 1, type: "attack", damage: "3*(1d4+1)", range: 60, auto: true, desc: "Three force darts. Auto-hits." },
    { name: "Sleep", level: 1, type: "save", range: 30, desc: "Magical slumber. CON save DC 13 or incapacitated." },
  ],
  Cleric: [
    { name: "Sacred Flame", level: 0, type: "cantrip", damage: "1d8", range: 30, saveStat: "dex", saveDC: 13, desc: "Radiant flame. DEX save DC 13." },
    { name: "Cure Wounds", level: 1, type: "heal", heal: "1d8", range: 5, desc: "Touch to heal 1d8 + WIS modifier HP." },
  ],
  Paladin: [
    { name: "Lay on Hands", level: 0, type: "cantrip", heal: "5", range: 5, desc: "Touch to restore 5 HP." },
    { name: "Divine Smite", level: 1, type: "attack", damage: "2d8", range: 5, isBonus: true, desc: "Expend spell slot on hit for 2d8 radiant bonus." },
  ],
};

// ─────────────────────────────────────────────────
// WIZARD 3RD SPELL CHOICES
// ─────────────────────────────────────────────────

export const WIZARD_SPELL_CHOICES = [
  { name: "Sleep", aoe: true, aoeRadius: 4, isCone: false, desc: "Magical slumber. AOE(Circle) 4 tiles radius. CON save DC 13 or incapacitated." },
  { name: "Thunderwave", aoe: true, aoeRadius: 3, isCone: false, desc: "Thunder burst. AOE(Circle) 3 tiles radius. DEX save DC 13 or 2d8 + push." },
  { name: "Burning Hands", aoe: true, aoeRadius: 3, isCone: true, desc: "Fire cone. AOE(Cone) 3 tiles. DEX save DC 13 or 3d6 fire damage." },
];

// ─────────────────────────────────────────────────
// STAT DESCRIPTIONS
// ─────────────────────────────────────────────────

export const STAT_DESCRIPTIONS: Record<keyof Stats, { label: string; effect: string }> = {
  str: { label: "Strength", effect: "Melee ATK/DMG bonus, Athletics, carrying" },
  dex: { label: "Dexterity", effect: "Ranged ATK, AC (light armor), Initiative" },
  con: { label: "Constitution", effect: "Max HP bonus per level, CON saves" },
  int: { label: "Intelligence", effect: "Wizard spell DC & ATK, Arcana, History" },
  wis: { label: "Wisdom", effect: "Cleric/Paladin spell DC, Perception, Insight" },
  cha: { label: "Charisma", effect: "Persuasion, Deception, Paladin aura" },
};

// ─────────────────────────────────────────────────
// PROFICIENCY LIST
// ─────────────────────────────────────────────────

export const PROFICIENCY_LIST: Array<{ name: string; stat: keyof Stats; effect: string }> = [
  { name: "Athletics", stat: "str", effect: "+Prof bonus to STR — climbing, grapple" },
  { name: "Acrobatics", stat: "dex", effect: "+Prof bonus to DEX — balance, tumble" },
  { name: "Stealth", stat: "dex", effect: "+Prof bonus to DEX — hide, move silently" },
  { name: "Perception", stat: "wis", effect: "+Prof bonus to WIS — spot traps & foes" },
  { name: "Insight", stat: "wis", effect: "+Prof bonus to WIS — read people" },
  { name: "Medicine", stat: "wis", effect: "+Prof bonus to WIS — stabilize & treat" },
  { name: "Survival", stat: "wis", effect: "+Prof bonus to WIS — track, navigate" },
  { name: "Arcana", stat: "int", effect: "+Prof bonus to INT — magic lore" },
  { name: "History", stat: "int", effect: "+Prof bonus to INT — ancient knowledge" },
  { name: "Investigation", stat: "int", effect: "+Prof bonus to INT — find clues" },
  { name: "Persuasion", stat: "cha", effect: "+Prof bonus to CHA — convince others" },
  { name: "Intimidation", stat: "cha", effect: "+Prof bonus to CHA — threaten & coerce" },
];
