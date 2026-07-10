import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import _p1 from "../imports/proflie1.png";
import _p2 from "../imports/profile2.png";
import _p3 from "../imports/profile3.png";
import _p4 from "../imports/profile4.png";
import {
  Sword, Shield, User, Package, MessageCircle, Users,
  ChevronDown, ChevronUp, ChevronRight, X, Plus, LogOut, Heart, Zap,
  RotateCcw, BookOpen, Star, Send, Move, AlertTriangle, CheckCircle
} from "lucide-react";

// ─────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────

type Screen = "auth" | "charSelect" | "charCreate" | "worldMap" | "town" | "dungeon";
type CharClass = "Fighter" | "Cleric" | "Paladin" | "Ranger" | "Wizard";
type ItemType = "weapon" | "armor" | "accessory" | "consumable";
type HudTab = "char" | "inv" | "equip" | "acc" | "chat" | "party" | "skills";
type CombatModeT = "none" | "move" | "attack" | "spell";

interface Stats { str: number; dex: number; con: number; int: number; wis: number; cha: number }
interface Item {
  id: string; name: string; type: ItemType; description: string; value: number;
  damage?: string; damageType?: string; range?: number;
  ac?: number; healAmount?: string; effect?: string; stat?: keyof Stats; bonus?: number;
  material?: boolean;
  saveStat?: keyof Stats;
  saveDC?: number;
  aoeRadius?: number;
}
interface Equipment {
  weapon: Item | null; armor: Item | null;
  accessories: [Item | null, Item | null, Item | null];
}
interface Character {
  id: string; name: string; avatar: string; class: CharClass;
  level: number; exp: number; gold: number; stats: Stats;
  hp: number; maxHp: number; ac: number; profBonus: number;
  skills: string[]; savingThrows: string[];
  spellSlots?: { used: number; max: number };
  spellChoice?: string;  // Wizard's chosen 3rd spell
  customSkills?: string[]; // player-chosen proficiency skills
  inventory: Item[]; equipment: Equipment;
  position: { x: number; y: number }; currentMap: "town" | "dungeon";
}
interface Monster {
  id: string; name: string; hp: number; maxHp: number; ac: number;
  position: { x: number; y: number }; damage: string; range: number;
  attackMod: number; initiative: number; xp: number; sightRange: number; alerted: boolean;
}
interface Combatant { id: string; type: "player" | "monster"; name: string; initiative: number }
interface CombatState {
  active: boolean; round: number;
  turnOrder: Combatant[]; currentIndex: number;
  actionUsed: boolean; bonusActionUsed: boolean; movedSquares: number;
  log: string[]; engagedMonsterIds: string[];
}
interface VisualEffect {
  id: string;
  type: "slash" | "scratch" | "fire_bolt" | "magic_missile" | "sacred_flame" | "thunder" | "fire_aoe" | "smite" | "heal" | "miss" | "number" | "sword_swing" | "arrow";
  targetX?: number; targetY?: number; // for directional effects
  gridX: number; gridY: number;
  value?: string;
}
interface DiceRollDisplay {
  id: string;
  type: "hit" | "save" | "damage";
  value: number;   // raw die result
  total: number;   // with modifiers
  mod: number;     // modifier applied
  max: number;     // die size (20 or damage max)
  label: string;
  phase: "rolling" | "done";
}
interface Quest {
  id: string; title: string; description: string;
  killTarget?: { monster: string; count: number; current: number };
  gatherTarget?: { itemName: string; count: number };
  reward: { exp: number; gold: number };
  completed?: boolean;
  readyToTurnIn?: boolean;
}
interface Party { name: string; leaderId: string; memberIds: string[]; questIds: string[] }
interface GameState {
  accounts: Array<{ username: string; password: string; charIds: string[] }>;
  characters: Record<string, Character>;
  globalChat: Array<{ id: string; sender: string; text: string; time: string }>;
  partyChat: Array<{ id: string; sender: string; text: string; time: string }>;
  party: Party | null;
  dungeonMonsters: Monster[];
  availableQuests: Quest[];
  partyQuests: Quest[];
  questRefreshAt: number;
}

// ─────────────────────────────────────────────────
// STYLE CONSTANTS
// ─────────────────────────────────────────────────

const C = {
  bg: "#08091a",
  card: "#0d1228",
  card2: "#111930",
  blue: "#5eb8ff",
  blueD: "#1a3a6a",
  pink: "#ff6b9d",
  pinkD: "#4a1028",
  gold: "#ffd54f",
  green: "#4caf50",
  red: "#f44336",
  purple: "#ab47bc",
  text: "#e8efff",
  muted: "#6b7ab8",
  border: "rgba(94,184,255,0.22)",
  borderH: "rgba(94,184,255,0.6)",
  glow: "0 0 12px rgba(94,184,255,0.25)",
  glowStrong: "0 0 20px rgba(94,184,255,0.45)",
};

const PX = "Press Start 2P, monospace";
const NU = "Nunito, sans-serif";
const MO = "JetBrains Mono, monospace";

// Local pixel-art profile presets (static imports so Vite bundles them)
const PROFILE_PRESETS: string[] = [_p1, _p2, _p3, _p4];

// Pixel-art panel style
const panel = {
  background: C.card,
  border: `2px solid ${C.border}`,
  boxShadow: C.glow,
};

// Pixel button
function pixelBtn(variant: "primary" | "danger" | "ghost" = "primary", sm = false) {
  const pad = sm ? "6px 12px" : "9px 18px";
  const fs = sm ? 8 : 9;
  if (variant === "primary") return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: "linear-gradient(180deg, #3a8adf 0%, #1a5aaf 100%)",
    border: `2px solid ${C.blue}`,
    color: "#ffffff",
    boxShadow: `0 0 10px rgba(94,184,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,
  };
  if (variant === "danger") return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: "linear-gradient(180deg, #c0392b 0%, #8b1a1a 100%)",
    border: "2px solid #e53935",
    color: "#fff",
    boxShadow: "0 0 10px rgba(229,57,53,0.3)",
  };
  return {
    fontFamily: PX, fontSize: fs, padding: pad, cursor: "pointer",
    background: C.card2,
    border: `2px solid rgba(94,184,255,0.3)`,
    color: C.muted,
  };
}

// Pixel corners decorator
function PixelCorners({ color = C.blue, size = 6 }: { color?: string; size?: number }) {
  const s = size;
  return (
    <>
      <div style={{ position: "absolute", top: -2, left: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", top: -2, right: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", bottom: -2, left: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", bottom: -2, right: -2, width: s, height: s, background: color }} />
    </>
  );
}

// ─────────────────────────────────────────────────
// GAME CONSTANTS
// ─────────────────────────────────────────────────

const COLS = 20; const ROWS = 15; const CELL = 38;
const MOVE_SQUARES = 4; const SIGHT = 6;
const TOWN_ENTER = { x: 10, y: 13 };
const DUNGEON_ENTER = { x: 10, y: 13 };
const DUNGEON_EXIT = { x: 9, y: 0 };

const TOWN_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string }> = {
  "4,2": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "5,2": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "6,2": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "4,3": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "5,3": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "6,3": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "13,2": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "14,2": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "15,2": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "13,3": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "14,3": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "15,3": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "9,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
  "10,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
  "11,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
};

const CLASS_CFG: Record<CharClass, {
  color: string; icon: string; desc: string;
  hpBase: number; acBase: number; stats: Stats;
  skills: string[]; saves: string[];
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
    weapon: { name: "Longsword", type: "weapon", damage: "1d8", damageType: "slashing", range: 5, value: 15, description: "A versatile blade. 1d8 slashing, 5ft reach." },
    armor: { name: "Chain Mail", type: "armor", ac: 16, value: 75, description: "Heavy interlocking rings. AC 16." },
  },
  Cleric: {
    color: "#ffd54f", icon: "✨",
    desc: "Divine spellcaster with healing magic and heavy armor proficiency.",
    hpBase: 10, acBase: 14,
    stats: { str: 13, dex: 10, con: 14, int: 12, wis: 16, cha: 15 },
    skills: ["Medicine", "Religion"], saves: ["Wisdom", "Charisma"],
    spellMax: 2,
    weapon: { name: "Mace", type: "weapon", damage: "1d6", damageType: "bludgeoning", range: 5, value: 5, description: "Holy war club. 1d6 bludgeoning." },
    armor: { name: "Scale Mail", type: "armor", ac: 14, value: 50, description: "Overlapping metal scales. AC 14." },
  },
  Paladin: {
    color: "#c080ff", icon: "🛡️",
    desc: "Sacred oath-bound warrior with divine smite and heavy armor.",
    hpBase: 12, acBase: 18,
    stats: { str: 15, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
    skills: ["Persuasion", "Athletics"], saves: ["Wisdom", "Charisma"],
    spellMax: 2,
    weapon: { name: "Longsword", type: "weapon", damage: "1d8", damageType: "slashing", range: 5, value: 15, description: "A blessed blade. 1d8 slashing." },
    armor: { name: "Plate Armor", type: "armor", ac: 18, value: 150, description: "Full plate. AC 18." },
  },
  Ranger: {
    color: "#4cdb70", icon: "🏹",
    desc: "Wilderness warrior with archery mastery and Favored Enemy tracking.",
    hpBase: 10, acBase: 14,
    stats: { str: 12, dex: 16, con: 13, int: 10, wis: 14, cha: 8 },
    skills: ["Survival", "Perception"], saves: ["Strength", "Dexterity"],
    weapon: { name: "Shortbow", type: "weapon", damage: "1d6", damageType: "piercing", range: 80, value: 25, description: "Nimble hunting bow. 1d6 piercing, 80ft range." },
    armor: { name: "Leather Armor", type: "armor", ac: 13, value: 10, description: "Supple leather. AC 13 + DEX mod." },
    extra: [{ name: "Shortsword", type: "weapon", damage: "1d6", damageType: "piercing", range: 5, value: 10, description: "Light blade. 1d6 piercing." }],
  },
  Wizard: {
    color: "#5eb8ff", icon: "🔮",
    desc: "Arcane scholar with a spellbook of powerful ranged spells.",
    hpBase: 6, acBase: 12,
    stats: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
    skills: ["Arcana", "Investigation"], saves: ["Intelligence", "Wisdom"],
    spellMax: 2,
    weapon: { name: "Quarterstaff", type: "weapon", damage: "1d6", damageType: "bludgeoning", range: 5, value: 2, description: "Arcane staff. 1d6 bludgeoning." },
    armor: { name: "Mage Robes", type: "armor", ac: 10, value: 5, description: "Enchanted cloth. AC 10 + DEX mod." },
  },
};

const CLASS_SPELLS: Partial<Record<CharClass, Array<{
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

const STAT_DESCRIPTIONS: Record<keyof Stats, { label: string; effect: string }> = {
  str: { label: "Strength", effect: "Melee ATK/DMG bonus, Athletics, carrying" },
  dex: { label: "Dexterity", effect: "Ranged ATK, AC (light armor), Initiative" },
  con: { label: "Constitution", effect: "Max HP bonus per level, CON saves" },
  int: { label: "Intelligence", effect: "Wizard spell DC & ATK, Arcana, History" },
  wis: { label: "Wisdom", effect: "Cleric/Paladin spell DC, Perception, Insight" },
  cha: { label: "Charisma", effect: "Persuasion, Deception, Paladin aura" },
};

const PROFICIENCY_LIST: Array<{ name: string; stat: keyof Stats; effect: string }> = [
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

const WIZARD_SPELL_CHOICES = [
  { name: "Sleep", aoe: true, aoeRadius: 4, isCone: false, desc: "Magical slumber. AOE(Circle) 20ft radius. CON save DC 13 or incapacitated." },
  { name: "Thunderwave", aoe: true, aoeRadius: 3, isCone: false, desc: "Thunder burst. AOE(Circle) 15ft radius. DEX save DC 13 or 2d8 + push." },
  { name: "Burning Hands", aoe: true, aoeRadius: 3, isCone: true, desc: "Fire cone. AOE(Cone) 15ft. DEX save DC 13 or 3d6 fire damage." },
];

const BRANCH_ITEM: Omit<Item, "id"> = {
  name: "Branch", type: "consumable", value: 1, material: true,
  description: "Rough wooden branch from a training dummy. Used as crafting material.",
};

// DiceBear pixel-art avatar presets (anime pixel style)
const PIXEL_AVATARS = PROFILE_PRESETS;

const SHOP_ITEMS: Item[] = [
  { id: "s1", name: "Longsword", type: "weapon", damage: "1d8", damageType: "slashing", range: 5, value: 15, description: "Classic blade." },
  { id: "s2", name: "Dagger", type: "weapon", damage: "1d4", damageType: "piercing", range: 20, value: 2, description: "Light and quick." },
  { id: "s3", name: "Handaxe", type: "weapon", damage: "1d6", damageType: "slashing", range: 20, value: 5, description: "Throwable axe." },
  { id: "s4", name: "Shortbow", type: "weapon", damage: "1d6", damageType: "piercing", range: 80, value: 25, description: "Hunting bow." },
  { id: "s5", name: "Leather Armor", type: "armor", ac: 13, value: 10, description: "Supple leather. AC 13." },
  { id: "s6", name: "Chain Mail", type: "armor", ac: 16, value: 75, description: "Interlocked rings. AC 16." },
  { id: "s7", name: "Shield", type: "armor", ac: 2, value: 10, description: "Wooden shield. +2 AC." },
  { id: "s8", name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." },
  { id: "s9", name: "Ring of Protection", type: "accessory", ac: 1, value: 100, description: "+1 AC." },
  { id: "s10", name: "Amulet of Vigor", type: "accessory", stat: "con", bonus: 2, value: 80, description: "+2 CON." },
  { id: "s11", name: "Cloak of Elvenkind", type: "accessory", stat: "dex", bonus: 2, value: 80, description: "+2 DEX." },
  { id: "s12", name: "Gauntlets of Strength", type: "accessory", stat: "str", bonus: 2, value: 80, description: "+2 STR." },
  { id: "s13", name: "Small Bomb", type: "consumable", damage: "3d6", effect: "aoe_bomb", saveStat: "dex", saveDC: 15, aoeRadius: 2, value: 60, description: "3d6 explosion, DEX save DC 15. Half damage on save. Circle AOE." },
];

const QUEST_TEMPLATES: Array<{ title: string; desc: string; n: number; exp: number; gold: number; gather?: string }> = [
  { title: "Pest Control", desc: "Clear {n} Wooden Dummies from the dungeon.", n: 3, exp: 60, gold: 15 },
  { title: "Training Exercise", desc: "Destroy {n} training dummies.", n: 5, exp: 100, gold: 25 },
  { title: "Quick Skirmish", desc: "Defeat {n} Wooden Dummies.", n: 2, exp: 40, gold: 10 },
  { title: "Dungeon Sweep", desc: "Eliminate {n} Wooden Dummies.", n: 4, exp: 80, gold: 20 },
  { title: "The Big Cull", desc: "Slay {n} Wooden Dummies for a bounty.", n: 6, exp: 120, gold: 30 },
  { title: "Rookie Hunt", desc: "Kill {n} Wooden Dummies to prove worth.", n: 2, exp: 40, gold: 12 },
  { title: "Exterminator", desc: "Wipe out {n} Wooden Dummies below.", n: 5, exp: 95, gold: 22 },
  { title: "Combat Trial", desc: "Face and destroy {n} Wooden Dummies.", n: 3, exp: 65, gold: 16 },
  { title: "Timber Collection", desc: "Collect {n} wooden branches from training dummies.", n: 5, exp: 50, gold: 20, gather: "Branch" },
  { title: "Wood for the Workshop", desc: "Bring {n} branches from the dungeon.", n: 3, exp: 30, gold: 12, gather: "Branch" },
];

const NPC_CHAT = [
  { sender: "Elara✨", text: "Cleared the dungeon east wing! Watch the north corridor." },
  { sender: "Tavern Master", text: "New potions in stock! First one's half off~" },
  { sender: "GrendakBold⚔️", text: "Anyone up for a party dungeon run? Solo is rough." },
  { sender: "Sister Aelia🙏", text: "May the light guide your swords, brave adventurers!" },
  { sender: "Kira🏹", text: "Found a ring in the dungeon. Sold for 80g, nice haul!" },
  { sender: "VexWanderer", text: "Wooden dummies hit harder than they look. Keep HP up!" },
  { sender: "Merchant Dov🏪", text: "Rare shipment arrived. Stock up before entering." },
  { sender: "Aldric🛡️", text: "Fighter LFG Cleric for dungeon runs. DM me~" },
];

// ─────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────

const gid = () => Math.random().toString(36).slice(2, 9);
const d20 = () => Math.floor(Math.random() * 20) + 1;
const getMod = (s: number) => Math.floor((s - 10) / 2);
const modStr = (s: number) => { const m = getMod(s); return m >= 0 ? `+${m}` : `${m}`; };
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const tnow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function rollDice(notation: string): number {
  if (notation.startsWith("3*(")) {
    const inner = notation.slice(3, -1);
    return rollDice(inner) + rollDice(inner) + rollDice(inner);
  }
  const m = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return parseInt(notation) || 0;
  let total = parseInt(m[3] || "0");
  for (let i = 0; i < parseInt(m[1]); i++) total += Math.floor(Math.random() * parseInt(m[2])) + 1;
  return Math.max(0, total);
}

function getSpellcastingMod(char: Character): number {
  switch (char.class) {
    case "Wizard": return getMod(char.stats.int);
    case "Cleric": return getMod(char.stats.wis);
    case "Paladin": return getMod(char.stats.cha);
    default: return 0;
  }
}

function calcAC(char: Character): number {
  const dexMod = getMod(char.stats.dex);
  const armorName = char.equipment.armor?.name ?? "";
  const armorAC = char.equipment.armor?.ac ?? (10 + dexMod);
  const addDex = ["Leather Armor", "Mage Robes"].includes(armorName);
  const accAC = char.equipment.accessories.reduce((s, a) => s + (a?.ac ?? 0), 0);
  return armorAC + (addDex ? dexMod : 0) + accAC;
}

function createCharacter(name: string, avatar: string, cls: CharClass, customStats?: Stats, selectedSkills?: string[], spellChoice?: string): Character {
  const cfg = CLASS_CFG[cls];
  const stats: Stats = { ...(customStats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }) };
  // Each chosen proficiency adds +1 to its associated ability score
  if (selectedSkills) {
    selectedSkills.forEach(sk => {
      const prof = PROFICIENCY_LIST.find(p => p.name === sk);
      if (prof) (stats[prof.stat] as number) += 1;
    });
  }
  const conMod = getMod(stats.con);
  const maxHp = cfg.hpBase + conMod;
  const weapon: Item = { ...cfg.weapon, id: gid() };
  const armor: Item = { ...cfg.armor, id: gid() };
  const extra: Item[] = (cfg.extra ?? []).map(e => ({ ...e, id: gid() }));
  const char: Character = {
    id: gid(), name, avatar, class: cls,
    level: 1, exp: 0, gold: 10,
    stats, hp: maxHp, maxHp, ac: cfg.acBase,
    profBonus: 2, skills: cfg.skills, savingThrows: cfg.saves,
    spellSlots: cfg.spellMax ? { used: 0, max: cfg.spellMax } : undefined,
    spellChoice,
    customSkills: selectedSkills ?? cfg.skills,
    inventory: extra,
    equipment: { weapon, armor, accessories: [null, null, null] },
    position: { x: 10, y: 7 }, currentMap: "town",
  };
  char.ac = calcAC(char);
  return char;
}

function genMonsters(): Monster[] {
  const count = 3 + Math.floor(Math.random() * 3);
  const monsters: Monster[] = [];
  const used = new Set<string>();
  while (monsters.length < count) {
    const x = 2 + Math.floor(Math.random() * 16);
    const y = 2 + Math.floor(Math.random() * 8);
    const key = `${x},${y}`;
    if (used.has(key) || dist({ x, y }, DUNGEON_ENTER) < 5) continue;
    used.add(key);
    monsters.push({
      id: gid(), name: "Wooden Dummy", hp: 10, maxHp: 10, ac: 5,
      position: { x, y }, damage: "1d4", range: 5,
      attackMod: 0, initiative: 0, xp: 15, sightRange: 4, alerted: false,
    });
  }
  return monsters;
}

function genQuests(n = 10): Quest[] {
  return [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, n).map(t => {
    if (t.gather) {
      return {
        id: gid(), title: t.title, description: t.desc.replace("{n}", String(t.n)),
        gatherTarget: { itemName: t.gather, count: t.n },
        reward: { exp: t.exp, gold: t.gold },
      };
    }
    return {
      id: gid(), title: t.title, description: t.desc.replace("{n}", String(t.n)),
      killTarget: { monster: "Wooden Dummy", count: t.n, current: 0 },
      reward: { exp: t.exp, gold: t.gold },
    };
  });
}

// ─────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────

const SAVE_KEY = "dnd_online_v2";

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    accounts: [], characters: {},
    globalChat: [
      { id: gid(), sender: "System", text: "Welcome to DnD Online! Your adventure begins.", time: tnow() },
      { id: gid(), sender: "Tavern Master", text: "Ale and steel! The dungeon won't explore itself~", time: tnow() },
    ],
    partyChat: [], party: null,
    dungeonMonsters: genMonsters(),
    availableQuests: genQuests(10),
    partyQuests: [], questRefreshAt: Date.now() + 5 * 60 * 1000,
  };
}
function persist(gs: GameState) { localStorage.setItem(SAVE_KEY, JSON.stringify(gs)); }

// ─────────────────────────────────────────────────
// SHARED UI ATOMS
// ─────────────────────────────────────────────────

function HpBar({ hp, maxHp, size = "md" }: { hp: number; maxHp: number; size?: "sm" | "md" }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const color = pct > 60 ? C.green : pct > 25 ? "#ff9800" : C.red;
  const h = size === "sm" ? 4 : 8;
  return (
    <div style={{ width: "100%", height: h, background: "#0a0c1a", border: "1px solid rgba(94,184,255,0.15)", imageRendering: "pixelated" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s", boxShadow: `0 0 4px ${color}` }} />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "6px 8px", textAlign: "center", minWidth: 50 }}>
      <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MO, fontSize: 14, color: C.blue, fontWeight: 700 }}>{value}</div>
      <div style={{ fontFamily: MO, fontSize: 9, color: C.text + "80" }}>{modStr(value)}</div>
    </div>
  );
}

function GoldBadge({ amount }: { amount: number }) {
  return (
    <span style={{ fontFamily: MO, fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 2 }}>
      <Star className="w-3 h-3" style={{ fill: C.gold, color: C.gold }} />{amount}g
    </span>
  );
}

// ─────────────────────────────────────────────────
// ANIME DIALOG (centered modal)
// ─────────────────────────────────────────────────

function AnimeDialog({ icon, title, message, onYes, onNo, yesLabel = "YES", noLabel = "NO" }: {
  icon?: string; title: string; message?: string;
  onYes: () => void; onNo: () => void;
  yesLabel?: string; noLabel?: string;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)",
    }}>
      <div style={{
        position: "relative",
        background: C.card,
        border: `3px solid ${C.blue}`,
        boxShadow: `0 0 0 1px ${C.bg}, ${C.glowStrong}, inset 0 0 40px rgba(94,184,255,0.04)`,
        width: 340,
        padding: "28px 28px 24px",
        imageRendering: "pixelated",
      }}>
        <PixelCorners color={C.blue} size={8} />

        {/* Icon */}
        {icon && (
          <div style={{ textAlign: "center", fontSize: 40, marginBottom: 10, lineHeight: 1 }}>{icon}</div>
        )}

        {/* Title */}
        <div style={{
          fontFamily: PX, fontSize: 10, color: C.blue,
          textAlign: "center", lineHeight: 2, marginBottom: 10,
          letterSpacing: "0.05em",
        }}>{title}</div>

        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}60, transparent)`, margin: "8px 0 14px" }} />

        {/* Message */}
        {message && (
          <div style={{ fontFamily: NU, fontSize: 13, color: C.text + "cc", textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onNo} style={pixelBtn("ghost")}>{noLabel}</button>
          <button onClick={onYes} style={pixelBtn("primary")}>{yesLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────

function AuthScreen({ onLogin }: { onLogin: (u: string, ids: string[], gs: GameState) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [gs] = useState<GameState>(loadState);

  function handleLogin() {
    const acc = gs.accounts.find(a => a.username === username && a.password === password);
    if (!acc) { setError("Invalid username or password."); return; }
    onLogin(username, acc.charIds, gs);
  }
  function handleRegister() {
    if (username.length < 3) { setError("Username must be 3+ characters."); return; }
    if (password.length < 4) { setError("Password must be 4+ characters."); return; }
    if (gs.accounts.find(a => a.username === username)) { setError("Username already taken."); return; }
    const newGs = { ...gs, accounts: [...gs.accounts, { username, password, charIds: [] }] };
    persist(newGs);
    onLogin(username, [], newGs);
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: C.card2, border: `2px solid ${C.border}`,
    color: C.text, fontFamily: NU, fontSize: 14,
    padding: "10px 12px", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Animated background grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 37px,${C.blue} 38px),repeating-linear-gradient(90deg,transparent,transparent 37px,${C.blue} 38px)`,
      }} />
      {/* Radial glow */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(94,184,255,0.06) 0%, transparent 70%)` }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 360, padding: "0 20px" }}>
        {/* Game title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: PX, fontSize: 20, color: C.blue, lineHeight: 1.6, letterSpacing: 2, textShadow: `0 0 20px ${C.blue}, 0 0 40px rgba(94,184,255,0.4)` }}>
            DnD<br />Online
          </div>
          <div style={{ fontFamily: NU, fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" }}>
            ✨ Embark on your legend ✨
          </div>
          <div style={{ height: 2, margin: "12px auto 0", width: 120, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)` }} />
        </div>

        {/* Card */}
        <div style={{ ...panel, padding: 24, position: "relative" }}>
          <PixelCorners color={C.blue} size={6} />

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1, padding: "8px 4px", background: "none", border: "none",
                  borderBottom: tab === t ? `2px solid ${C.blue}` : "2px solid transparent",
                  marginBottom: -2, cursor: "pointer",
                  fontFamily: PX, fontSize: 8,
                  color: tab === t ? C.blue : C.muted,
                  letterSpacing: 1,
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>USERNAME</div>
              <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>PASSWORD</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>

            {error && (
              <div style={{ fontFamily: NU, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle className="w-3 h-3" />{error}
              </div>
            )}

            <button onClick={tab === "login" ? handleLogin : handleRegister}
              style={{ ...pixelBtn("primary"), width: "100%", marginTop: 4, letterSpacing: 1 }}>
              {tab === "login" ? "ENTER REALM" : "CREATE ACCOUNT"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontFamily: NU, fontSize: 11, color: C.muted }}>
          Data saved in your browser · Demo mode
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// CHAR SELECT
// ─────────────────────────────────────────────────

function CharSelectScreen({ session, characters, onSelect, onCreateNew, onLogout }: {
  session: { username: string; charIds: string[] };
  characters: Record<string, Character>;
  onSelect: (id: string) => void; onCreateNew: () => void; onLogout: () => void;
}) {
  const chars = session.charIds.map(id => characters[id]).filter(Boolean);
  const canCreate = chars.length < 5;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 37px,${C.blue} 38px),repeating-linear-gradient(90deg,transparent,transparent 37px,${C.blue} 38px)` }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: PX, fontSize: 12, color: C.blue, letterSpacing: 1, marginBottom: 6 }}>CHOOSE HERO</div>
            <div style={{ fontFamily: NU, fontSize: 13, color: C.muted }}>
              Welcome, <span style={{ color: C.text }}>{session.username}</span> · {chars.length}/5 characters
            </div>
          </div>
          <button onClick={onLogout} style={{ ...pixelBtn("ghost", true), display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut className="w-3 h-3" />OUT
          </button>
        </div>

        {/* Character list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          {chars.map(char => {
            const cfg = CLASS_CFG[char.class];
            return (
              <button key={char.id} onClick={() => onSelect(char.id)}
                style={{
                  ...panel, padding: "14px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", textAlign: "left",
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.blue;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = C.glowStrong;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = C.glow;
                }}>
                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, flexShrink: 0, overflow: "hidden",
                  border: `2px solid ${cfg.color}60`, position: "relative",
                }}>
                  {char.avatar
                    ? <img src={char.avatar} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: cfg.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{cfg.icon}</div>
                  }
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: PX, fontSize: 9, color: C.text }}>{char.name}</span>
                    <span style={{ fontFamily: NU, fontSize: 11, padding: "2px 6px", background: cfg.color + "25", color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                      {cfg.icon} {char.class}
                    </span>
                    <span style={{ fontFamily: MO, fontSize: 10, color: C.muted }}>Lv.{char.level}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Heart className="w-3 h-3" style={{ color: C.red }} />
                      <span style={{ fontFamily: MO, fontSize: 10, color: C.text }}>{char.hp}/{char.maxHp}</span>
                    </div>
                    <div style={{ flex: 1 }}><HpBar hp={char.hp} maxHp={char.maxHp} size="sm" /></div>
                    <GoldBadge amount={char.gold} />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: C.muted, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {canCreate ? (
          <button onClick={onCreateNew}
            style={{
              width: "100%", padding: "14px", cursor: "pointer",
              background: "transparent", border: `2px dashed ${C.border}`,
              color: C.muted, fontFamily: PX, fontSize: 8, letterSpacing: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue + "80"; (e.currentTarget as HTMLButtonElement).style.color = C.blue; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}>
            <Plus className="w-4 h-4" />CREATE NEW CHARACTER
          </button>
        ) : (
          <div style={{ textAlign: "center", fontFamily: NU, fontSize: 12, color: C.muted, padding: 12, border: `1px solid ${C.border}` }}>
            Maximum 5 characters per account reached.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// CHAR CREATE
// ─────────────────────────────────────────────────

function CharCreateScreen({ onCreated, onBack }: { onCreated: (c: Character) => void; onBack: () => void }) {
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

  const PRESETS = PIXEL_AVATARS;

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: C.card2, border: `2px solid ${C.border}`,
    color: C.text, fontFamily: NU, fontSize: 14, padding: "10px 12px", outline: "none",
  };

  const STEPS = ["basic", "class", "stats", "review"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ ...pixelBtn("ghost", true) }}>← BACK</button>
          <div style={{ fontFamily: PX, fontSize: 10, color: C.blue, letterSpacing: 1 }}>
            {step === "basic" ? "NAME YOUR HERO" : step === "class" ? "CHOOSE CLASS" : step === "stats" ? "BUILD YOUR HERO" : "REVIEW"}
          </div>
        </div>

        {/* Step indicator */}
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
                  {PRESETS.map((url, i) => (
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
              {/* Preview */}
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

            {/* Ability Scores */}
            <div style={{ fontFamily: PX, fontSize: 8, color: CLASS_CFG[cls].color, marginBottom: 4, letterSpacing: 1 }}>ABILITY SCORES</div>
            <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 14 }}>
              Distribute <span style={{ color: C.gold, fontWeight: 700 }}>{pointsLeft} points</span> remaining · Start at 10 · Min 8
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {(Object.keys(customStats) as (keyof Stats)[]).map(stat => {
                const base = customStats[stat];
                // Count how many selected proficiencies contribute to this stat
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

            {/* Points remaining */}
            <div style={{ textAlign: "center", fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 20 }}>
              {pointsLeft} POINT{pointsLeft !== 1 ? "S" : ""} REMAINING
            </div>

            {/* Proficiencies */}
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

            {/* Wizard spell choice */}
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

// ─────────────────────────────────────────────────
// WORLD MAP
// ─────────────────────────────────────────────────

function WorldMapScreen({ char, onEnterTown, onEnterDungeon, onLogout }: {
  char: Character; onEnterTown: () => void; onEnterDungeon: () => void; onLogout: () => void;
}) {
  const cfg = CLASS_CFG[char.class];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 37px,${C.blue} 38px),repeating-linear-gradient(90deg,transparent,transparent 37px,${C.blue} 38px)` }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(94,184,255,0.04) 0%, transparent 70%)` }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 10, borderBottom: `2px solid ${C.border}`, background: C.card, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: PX, fontSize: 12, color: C.blue, letterSpacing: 1 }}>🗺️ WORLD MAP</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: NU, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, overflow: "hidden", border: `2px solid ${cfg.color}`, flexShrink: 0 }}>
              {char.avatar ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: cfg.color + "30" }}>{cfg.icon}</div>}
            </div>
            <span style={{ color: C.text }}>{char.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.red }}>
            <Heart className="w-3 h-3" /><span style={{ fontFamily: MO }}>{char.hp}/{char.maxHp}</span>
          </div>
          <GoldBadge amount={char.gold} />
          <button onClick={onLogout} style={{ ...pixelBtn("ghost", true), display: "flex", alignItems: "center", gap: 4 }}>
            <LogOut className="w-3 h-3" />EXIT
          </button>
        </div>
      </div>

      {/* Map area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 10, padding: 32 }}>
        <div style={{ position: "relative", width: 640, height: 380 }}>
          {/* Map frame */}
          <div style={{ position: "absolute", inset: 0, background: "#0a1020", border: `3px solid ${C.border}`, boxShadow: C.glow }}>
            <PixelCorners color={C.blue} size={10} />
            {/* Decorative SVG */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 640 380">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.blue + "08"} strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="640" height="380" fill="url(#grid)" />
              {/* Path */}
              <path d="M 160 190 Q 320 140 480 190" stroke={C.blue + "25"} strokeWidth="3" fill="none" strokeDasharray="8,5" />
              {/* Mountains */}
              <polygon points="420,120 450,80 480,120" fill="#141828" stroke={C.border} strokeWidth="1" />
              <polygon points="450,130 475,95 500,130" fill="#141828" stroke={C.border} strokeWidth="1" />
              {/* Trees */}
              <circle cx="120" cy="155" r="10" fill="#1a3a1a" /><circle cx="140" cy="165" r="8" fill="#1e4a1e" /><circle cx="160" cy="150" r="9" fill="#1a3a1a" />
              {/* River */}
              <path d="M 200 360 Q 300 320 360 290 Q 400 265 440 295" stroke="#0a1840" strokeWidth="8" fill="none" opacity="0.7" />
            </svg>
          </div>

          {/* Town node */}
          <button onClick={onEnterTown}
            style={{ position: "absolute", left: "24%", top: "50%", transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget.querySelector(".node") as HTMLDivElement).style.boxShadow = `0 0 24px rgba(78,196,78,0.5)`; }}
            onMouseLeave={e => { (e.currentTarget.querySelector(".node") as HTMLDivElement).style.boxShadow = `0 0 14px rgba(78,196,78,0.2)`; }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="node" style={{
                width: 80, height: 80, background: "#0a1a0a",
                border: "3px solid #4ec44e",
                boxShadow: "0 0 14px rgba(78,196,78,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                transition: "box-shadow 0.2s",
                position: "relative",
              }}>
                <PixelCorners color="#4ec44e" size={8} />
                🏰
              </div>
              <div style={{ background: C.card, border: `2px solid #4ec44e40`, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 8, color: "#4ec44e", letterSpacing: 1 }}>MILLHAVEN</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>Town · Safe Zone</div>
              </div>
            </div>
          </button>

          {/* Dungeon node */}
          <button onClick={onEnterDungeon}
            style={{ position: "absolute", left: "75%", top: "46%", transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget.querySelector(".dnode") as HTMLDivElement).style.boxShadow = `0 0 24px rgba(229,57,53,0.5)`; }}
            onMouseLeave={e => { (e.currentTarget.querySelector(".dnode") as HTMLDivElement).style.boxShadow = `0 0 14px rgba(229,57,53,0.2)`; }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className="dnode" style={{
                width: 80, height: 80, background: "#1a0808",
                border: "3px solid #e53935",
                boxShadow: "0 0 14px rgba(229,57,53,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
                transition: "box-shadow 0.2s",
                position: "relative",
              }}>
                <PixelCorners color="#e53935" size={8} />
                💀
              </div>
              <div style={{ background: C.card, border: `2px solid #e5393540`, padding: "4px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 8, color: "#e57373", letterSpacing: 1 }}>DARKROOT</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>Dungeon · Dangerous</div>
              </div>
            </div>
          </button>

          {/* Legend */}
          <div style={{ position: "absolute", bottom: 8, right: 8, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "6px 10px" }}>
            <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
              <div>🏰 Safe town with shops &amp; quests</div>
              <div>💀 Monster-filled dungeon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// MAP TILES
// ─────────────────────────────────────────────────

function getTownTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#080c10", isWall: true };
  if (x >= 3 && x <= 7 && y >= 1 && y <= 4) return { bg: "#2d1a08", isWall: false }; // shop
  if (x >= 12 && x <= 16 && y >= 1 && y <= 4) return { bg: "#081428", isWall: false }; // quest
  if (x >= 9 && x <= 11 && y >= 6 && y <= 8) return { bg: "#081c30", isWall: false }; // fountain
  if (y === 7 || y === 8 || x === 10 || x === 11) return { bg: "#4a3a28", isWall: false }; // road
  if (y >= 12 && x >= 8 && x <= 12) return { bg: "#0a2010", isWall: false }; // gate
  const h = (x * 3 + y * 7) % 3;
  return { bg: h === 0 ? "#1a3a12" : h === 1 ? "#1e4216" : "#1c3e14", isWall: false }; // grass variation
}

function getDungeonTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#050410", isWall: true };
  const hash = (x * 7 + y * 13) % 11;
  if (hash === 0 && dist({ x, y }, DUNGEON_ENTER) > 4 && dist({ x, y }, DUNGEON_EXIT) > 4) return { bg: "#0a0818", isWall: true };
  const shade = (x * 3 + y * 5) % 3;
  return { bg: shade === 0 ? "#141228" : shade === 1 ? "#100e22" : "#16143a" + "aa", isWall: false };
}

// ─────────────────────────────────────────────────
// MAP GRID
// ─────────────────────────────────────────────────

interface MapGridProps {
  mode: "town" | "dungeon";
  char: Character; monsters: Monster[];
  combat: CombatState; fogRevealed: Set<string>;
  combatMode: CombatModeT; selectedSpell?: string;
  onTileClick: (x: number, y: number) => void;
  onMonsterClick: (id: string) => void;
  onAOECast?: (affectedMonsterIds: string[], tileX: number, tileY: number) => void;
  effects: VisualEffect[];
  dyingMonsters?: Set<string>;
  hitTokenIds?: Set<string>;
  onHealSelf?: () => void;
}

// Compute which grid tiles fall inside a cone pointing from player toward mouse
function getConeTiles(playerPos: { x: number; y: number }, mouseX: number, mouseY: number, length: number): Set<string> {
  const tiles = new Set<string>();
  const px = playerPos.x * CELL + CELL / 2;
  const py = playerPos.y * CELL + CELL / 2;
  const angle = Math.atan2(mouseY - py, mouseX - px);
  const halfAngle = Math.PI / 3.5; // ~51 degrees ⟹ ~103° wide cone
  for (let dy = -length; dy <= length; dy++) {
    for (let dx = -length; dx <= length; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tx = playerPos.x + dx, ty = playerPos.y + dy;
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
      if (Math.sqrt(dx * dx + dy * dy) > length) continue;
      const tileAngle = Math.atan2(ty * CELL + CELL / 2 - py, tx * CELL + CELL / 2 - px);
      let diff = Math.abs(angle - tileAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= halfAngle) tiles.add(`${tx},${ty}`);
    }
  }
  return tiles;
}

function MapGrid({ mode, char, monsters, combat, fogRevealed, combatMode, selectedSpell, onTileClick, onMonsterClick, onAOECast, effects, dyingMonsters, hitTokenIds, onHealSelf }: MapGridProps) {
  const pos = char.position;
  const [hoveredMonsterId, setHoveredMonsterId] = useState<string | null>(null);
  // Mouse position relative to the grid container for cone direction
  const [mouseGrid, setMouseGrid] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const visible = new Set<string>();
  if (mode === "dungeon") {
    for (let dy = -SIGHT; dy <= SIGHT; dy++)
      for (let dx = -SIGHT; dx <= SIGHT; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
          const fx = pos.x + dx, fy = pos.y + dy;
          if (fx >= 0 && fx < COLS && fy >= 0 && fy < ROWS) visible.add(`${fx},${fy}`);
        }
      }
  }

  const reachable = new Set<string>();
  if (combat.active && combatMode === "move") {
    const rem = MOVE_SQUARES - combat.movedSquares;
    for (let dy = -rem; dy <= rem; dy++)
      for (let dx = -rem; dx <= rem; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= rem) {
          const tx = pos.x + dx, ty = pos.y + dy;
          if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) reachable.add(`${tx},${ty}`);
        }
      }
  }

  const attackableM = new Set<string>();
  if (combat.active && combatMode === "attack" && char.equipment.weapon) {
    const rs = Math.ceil((char.equipment.weapon.range ?? 5) / 5);
    monsters.filter(m => m.hp > 0).forEach(m => { if (dist(pos, m.position) <= rs) attackableM.add(m.id); });
  }

  const spellableM = new Set<string>();
  // AOE tiles — circle for normal spells, cone for Burning Hands
  const aoeTiles = new Set<string>();
  const aoeHitMonsters = new Set<string>();
  const BOMB_AOE_DEF = { name: "Small Bomb", aoeRadius: 2, isCone: false, aoe: true };
  const isAoeSpell = selectedSpell && (WIZARD_SPELL_CHOICES.some(s => s.name === selectedSpell) || selectedSpell === "Small Bomb");
  const aoeSpellDef = isAoeSpell ? (WIZARD_SPELL_CHOICES.find(s => s.name === selectedSpell) ?? BOMB_AOE_DEF) : null;
  // Mouse tile (grid coordinates) for circle AOE center
  const mouseGridTile = {
    x: Math.min(COLS - 1, Math.max(0, Math.floor(mouseGrid.x / CELL))),
    y: Math.min(ROWS - 1, Math.max(0, Math.floor(mouseGrid.y / CELL))),
  };

  if (combatMode === "spell" && selectedSpell) {
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const wizChoices = char.class === "Wizard" ? WIZARD_SPELL_CHOICES.map(s => ({ name: s.name, range: 30 })) : [];
    const bombEntry = selectedSpell === "Small Bomb" ? [{ name: "Small Bomb", range: 30 }] : [];
    const spell = [...allSpells, ...wizChoices, ...bombEntry].find((s: { name: string }) => s.name === selectedSpell) as { name: string; range?: number } | undefined;
    if (spell) {
      const rangeSquares = Math.ceil((spell.range ?? 5) / 5);
      monsters.filter(m => m.hp > 0).forEach(m => {
        if (dist(pos, m.position) <= rangeSquares) spellableM.add(m.id);
      });
    }
    if (isAoeSpell && aoeSpellDef) {
      const aoeLen = aoeSpellDef.aoeRadius;
      if (aoeSpellDef.isCone) {
        // CONE: Burning Hands — emanates from player toward mouse
        const coneTiles = getConeTiles(pos, mouseGrid.x, mouseGrid.y, aoeLen);
        coneTiles.forEach(t => aoeTiles.add(t));
      } else {
        // CIRCLE: Sleep / Thunderwave — centered on mouse tile
        for (let dy = -aoeLen; dy <= aoeLen; dy++) {
          for (let dx = -aoeLen; dx <= aoeLen; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= aoeLen) {
              const tx = mouseGridTile.x + dx, ty = mouseGridTile.y + dy;
              if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) aoeTiles.add(`${tx},${ty}`);
            }
          }
        }
      }
      monsters.filter(m => m.hp > 0).forEach(m => {
        if (aoeTiles.has(`${m.position.x},${m.position.y}`)) aoeHitMonsters.add(m.id);
      });
    }
  }

  const isHealSpell = selectedSpell && (() => {
    const spells = CLASS_SPELLS[char.class] ?? [];
    const s = spells.find(sp => sp.name === selectedSpell);
    return s?.type === "heal" || (s?.type === "cantrip" && s?.heal);
  })();

  return (
    <>
      <style>{`
        @keyframes dnd-slash { 0%{opacity:0;transform:scale(0.3) rotate(-25deg)} 30%{opacity:1;transform:scale(1) rotate(-25deg)} 100%{opacity:0;transform:scale(1.6) rotate(-25deg)} }
        @keyframes dnd-float-up { 0%{opacity:1;transform:translateY(0)} 60%{opacity:1;transform:translateY(-22px)} 100%{opacity:0;transform:translateY(-44px)} }
        @keyframes dnd-fireball { 0%{opacity:0;transform:scale(0)} 35%{opacity:1;transform:scale(1.1)} 100%{opacity:0;transform:scale(2)} }
        @keyframes dnd-pulse-ring { 0%{opacity:0.9;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.5)} }
        @keyframes dnd-shake { 0%,100%{transform:translateX(0) translateY(0)} 20%{transform:translateX(-4px) translateY(-2px)} 40%{transform:translateX(4px) translateY(1px)} 60%{transform:translateX(-3px) translateY(-1px)} 80%{transform:translateX(2px)} }
        @keyframes dnd-sword-thrust { 0%{opacity:0;transform:rotate(var(--r,0deg)) scale(0.6)} 25%{opacity:1;transform:rotate(var(--r,0deg)) scale(1)} 65%{opacity:1;transform:rotate(var(--r,0deg)) scale(1.05)} 100%{opacity:0;transform:rotate(var(--r,0deg)) scale(1.1)} }
        @keyframes dnd-arrow-fly { 0%{clip-path:inset(0 100% 0 0);opacity:1} 75%{clip-path:inset(0 0% 0 0);opacity:1} 100%{clip-path:inset(0 0% 0 0);opacity:0} }
        @keyframes dnd-slash-trail { 0%{opacity:0} 35%{opacity:0.9} 100%{opacity:0} }
        @keyframes dnd-dissolve { 0%{opacity:1;filter:none;transform:scale(1)} 30%{opacity:0.8;filter:blur(0px) brightness(2);transform:scale(1.1)} 60%{opacity:0.4;filter:blur(2px) brightness(3);transform:scale(1.3)} 100%{opacity:0;filter:blur(6px) brightness(0);transform:scale(0.2)} }
        @keyframes dnd-aoe-pulse { 0%{opacity:0.3} 100%{opacity:0.7} }
      `}</style>
      <div ref={gridRef}
        onMouseMove={e => {
          if (!gridRef.current) return;
          const r = gridRef.current.getBoundingClientRect();
          setMouseGrid({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        style={{ position: "relative", width: COLS * CELL, height: ROWS * CELL, imageRendering: "pixelated" }}>
        {/* Tiles */}
        {Array.from({ length: ROWS }, (_, y) =>
          Array.from({ length: COLS }, (_, x) => {
            const key = `${x},${y}`;
            const td = mode === "town" ? getTownTile(x, y) : getDungeonTile(x, y);
            const special = mode === "town" ? TOWN_SPECIAL[key] : undefined;
            const isExit = mode === "dungeon" && x === DUNGEON_EXIT.x && y === DUNGEON_EXIT.y;
            const isEntrance = mode === "dungeon" && x === DUNGEON_ENTER.x && y === DUNGEON_ENTER.y;
            const isFogged = mode === "dungeon" && !visible.has(key) && !fogRevealed.has(key);
            const isDimmed = mode === "dungeon" && !visible.has(key) && fogRevealed.has(key);
            const isReachable = reachable.has(key);
            const isPlayer = x === pos.x && y === pos.y;

            const bg = special?.color ? special.color + "50" : td.bg;

            const inCone = aoeTiles.has(key);
            const isAoeCursor = inCone && isAoeSpell && combatMode === "spell";

            return (
              <div key={key}
                onClick={() => {
                  if (td.isWall || isFogged) return;
                  if (isAoeCursor) {
                    // Cast AOE at this tile — hit all monsters in cone
                    const hit = monsters.filter(m => m.hp > 0 && aoeTiles.has(`${m.position.x},${m.position.y}`)).map(m => m.id);
                    onAOECast?.(hit, x, y);
                  } else {
                    onTileClick(x, y);
                  }
                }}
                style={{
                  position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                  background: isFogged ? "#000" : bg,
                  opacity: isDimmed ? 0.4 : 1,
                  cursor: td.isWall || isFogged ? "default" : isAoeCursor ? "crosshair" : "pointer",
                  outline: isReachable ? `2px solid ${C.gold}` : "none",
                  outlineOffset: "-2px",
                  boxShadow: isReachable ? `inset 0 0 8px ${C.gold}20` : "none",
                }}>
                {/* Grid line */}
                <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(0,0,0,0.25)" }} />

                {/* Special tile icon */}
                {special && !isFogged && ["4,2", "13,2", "9,13"].includes(key) && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.8 }}>
                    {special.icon}
                  </div>
                )}
                {isExit && !isFogged && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚪</div>}
                {isEntrance && !isFogged && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.5 }}>⬇️</div>}
                {isReachable && !isPlayer && <div style={{ position: "absolute", inset: 0, background: `${C.gold}12` }} />}
                {/* Cone AOE per-tile highlight */}
                {isAoeCursor && !isFogged && (() => {
                  const monHere = monsters.find(m => m.hp > 0 && m.position.x === x && m.position.y === y);
                  const hasTarget = monHere ? aoeHitMonsters.has(monHere.id) : false;
                  return (
                    <div style={{
                      position: "absolute", inset: 0, pointerEvents: "none",
                      background: hasTarget ? "rgba(255,40,20,0.42)" : "rgba(255,90,60,0.20)",
                      border: `1px solid rgba(255,100,70,${hasTarget ? "0.8" : "0.4"})`,
                      animation: "dnd-aoe-pulse 0.6s ease-in-out infinite alternate",
                    }} />
                  );
                })()}
              </div>
            );
          })
        )}

        {/* Monster tokens */}
        {monsters.filter(m => m.hp > 0).map(m => {
          const key = `${m.position.x},${m.position.y}`;
          if (mode === "town") return null; // monsters never appear in town
          if (mode === "dungeon" && !visible.has(key)) return null;
          const isAttackable = attackableM.has(m.id);
          const isSpellable = spellableM.has(m.id);
          const isAoeTarget = aoeHitMonsters.has(m.id);
          const isHovered = hoveredMonsterId === m.id;
          const isCurrentTurn = combat.active && combat.turnOrder[combat.currentIndex]?.id === m.id;
          const isTargetable = isAttackable || isSpellable || isAoeTarget;
          const isShaking = hitTokenIds?.has(m.id);

          if (dyingMonsters?.has(m.id)) {
            return (
              <div key={m.id} style={{
                position: "absolute",
                left: m.position.x * CELL + 3, top: m.position.y * CELL + 3,
                width: CELL - 6, height: CELL - 6,
                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                animation: "dnd-dissolve 0.9s ease-out forwards",
                pointerEvents: "none",
              }}>🪵</div>
            );
          }

          return (
            <div key={m.id}
              onClick={() => { if (isTargetable) onMonsterClick(m.id); }}
              onMouseEnter={() => setHoveredMonsterId(m.id)}
              onMouseLeave={() => setHoveredMonsterId(null)}
              style={{
                position: "absolute",
                left: m.position.x * CELL + 3, top: m.position.y * CELL + 3,
                width: CELL - 6, height: CELL - 6,
                background: isCurrentTurn ? "#5a1010" : "#3a0a0a",
                border: `2px solid ${isTargetable ? C.red : isCurrentTurn ? "#ff8888" : "#8b1a1a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isTargetable ? "crosshair" : "default",
                boxShadow: isTargetable ? `0 0 10px ${C.red}` : "none",
                fontSize: 16, imageRendering: "pixelated",
                animation: isShaking ? "dnd-shake 0.35s ease-in-out" : undefined,
              }}>
              🪵
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#0a0a0a" }}>
                <div style={{ height: "100%", width: `${(m.hp / m.maxHp) * 100}%`, background: C.red }} />
              </div>
              {/* Targeting ring on hover */}
              {(isAttackable || isSpellable || isAoeTarget) && isHovered && (
                <div style={{
                  position: "absolute", inset: -4,
                  border: `3px solid ${C.red}`,
                  borderRadius: "50%", pointerEvents: "none",
                  animation: "dnd-pulse-ring 0.7s ease-out infinite",
                  boxShadow: `0 0 10px ${C.red}`,
                }} />
              )}
              {/* Subtle always-on ring for attackable monsters */}
              {isAttackable && !isHovered && (
                <div style={{
                  position: "absolute", inset: -3, border: `2px solid ${C.red}60`,
                  borderRadius: "50%", pointerEvents: "none",
                  animation: "dnd-pulse-ring 1s ease-out infinite",
                }} />
              )}
            </div>
          );
        })}

        {/* Player token */}
        <div onClick={() => isHealSpell && onHealSelf?.()}
          style={{
            position: "absolute",
            transform: `translate(${pos.x * CELL + 3}px, ${pos.y * CELL + 3}px)`,
            width: CELL - 6, height: CELL - 6,
            background: CLASS_CFG[char.class].color + "cc",
            border: `2px solid ${CLASS_CFG[char.class].color}`,
            boxShadow: `0 0 10px ${CLASS_CFG[char.class].color}70`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, zIndex: 10, overflow: "visible",
            transition: "transform 0.15s linear",
            animation: hitTokenIds?.has(char.id) ? "dnd-shake 0.35s ease-in-out" : undefined,
            cursor: isHealSpell ? "pointer" : "default",
          }}>
          {char.avatar
            ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : CLASS_CFG[char.class].icon
          }
          {isHealSpell && (
            <div style={{
              position: "absolute", inset: -5, border: "3px solid #4cdb70",
              borderRadius: "50%", pointerEvents: "none",
              animation: "dnd-pulse-ring 0.7s ease-out infinite",
              boxShadow: "0 0 10px #4cdb70",
            }} />
          )}
        </div>

        {/* Effects layer */}
        {effects.map(e => {
          const ex = e.gridX * CELL + CELL / 2;
          const ey = e.gridY * CELL + CELL / 2;
          if (e.type === "miss" || e.type === "number") {
            return (
              <div key={e.id} style={{
                position: "absolute", left: ex - 20, top: ey - 16,
                fontFamily: MO, fontSize: e.type === "miss" ? 10 : 13,
                fontWeight: "bold", pointerEvents: "none", zIndex: 50,
                color: e.type === "miss" ? C.muted : C.red,
                textShadow: "1px 1px 0 #000, -1px -1px 0 #000",
                animation: "dnd-float-up 0.8s ease-out forwards",
              }}>{e.value}</div>
            );
          }
          if (e.type === "slash") {
            return (
              <svg key={e.id} style={{ position: "absolute", left: ex - 22, top: ey - 22, width: 44, height: 44, pointerEvents: "none", zIndex: 50, animation: "dnd-slash 0.45s ease-out forwards" }} viewBox="0 0 44 44">
                <line x1="8" y1="36" x2="36" y2="8" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="14" y1="38" x2="42" y2="10" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="2" y1="30" x2="30" y2="2" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            );
          }
          if (e.type === "scratch") {
            return (
              <svg key={e.id} style={{ position: "absolute", left: ex - 22, top: ey - 22, width: 44, height: 44, pointerEvents: "none", zIndex: 50, animation: "dnd-slash 0.45s ease-out forwards" }} viewBox="0 0 44 44">
                <line x1="4" y1="14" x2="22" y2="4" stroke="#c8a060" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="8" y1="22" x2="30" y2="10" stroke="#c8a060" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="32" x2="38" y2="20" stroke="#8b6030" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            );
          }
          if (e.type === "fire_bolt") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 20, top: ey - 20, width: 40, height: 40, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, #fff8e0 0%, #ffcc00 30%, #ff6600 70%, transparent 100%)", animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "magic_missile") {
            return (
              <svg key={e.id} style={{ position: "absolute", left: ex - 24, top: ey - 24, width: 48, height: 48, pointerEvents: "none", zIndex: 50, animation: "dnd-fireball 0.6s ease-out forwards" }} viewBox="0 0 48 48">
                {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                  const r = ang * Math.PI / 180;
                  return <line key={i} x1="24" y1="24" x2={24 + Math.cos(r) * 18} y2={24 + Math.sin(r) * 18} stroke="#88aaff" strokeWidth="2.5" strokeLinecap="round" />;
                })}
                <circle cx="24" cy="24" r="5" fill="#ccddff" />
              </svg>
            );
          }
          if (e.type === "sacred_flame") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 20, top: ey - 20, width: 40, height: 40, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, #fff 0%, #ffee88 40%, #ffaa00 80%, transparent 100%)", boxShadow: "0 0 20px #ffcc00", animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "thunder") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 28, top: ey - 28, width: 56, height: 56, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, rgba(200,220,255,0.9) 0%, rgba(100,160,255,0.6) 50%, transparent 100%)", animation: "dnd-fireball 0.65s ease-out forwards" }} />
            );
          }
          if (e.type === "smite") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 20, top: ey - 20, width: 40, height: 40, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: `radial-gradient(circle, #fff 0%, ${C.purple} 50%, transparent 100%)`, boxShadow: `0 0 20px ${C.purple}`, animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "heal") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 16, top: ey - 16, fontFamily: MO, fontSize: 14, fontWeight: "bold", color: "#4cdb70", pointerEvents: "none", zIndex: 50, textShadow: "1px 1px 0 #000", animation: "dnd-float-up 1s ease-out forwards" }}>+{e.value}</div>
            );
          }
          if (e.type === "fire_aoe") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 30, top: ey - 30, width: 60, height: 60, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, rgba(255,200,50,0.8) 0%, rgba(255,80,0,0.6) 60%, transparent 100%)", animation: "dnd-fireball 0.7s ease-out forwards" }} />
            );
          }
          if (e.type === "sword_swing") {
            const fromX = (e.targetX ?? e.gridX - 1) * CELL + CELL / 2;
            const fromY = (e.targetY ?? e.gridY) * CELL + CELL / 2;
            const dx = ex - fromX;
            const dy = ey - fromY;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const SZ = CELL * 3;
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 55,
                left: fromX - SZ / 2, top: fromY - SZ / 2, width: SZ, height: SZ,
                transformOrigin: "center",
              }}>
                <style>{`
                  @keyframes epic-sword-slash-${e.id} {
                    0% { transform: rotate(${angle - 70}deg) translate(-10px, -10px) scale(0.5); opacity: 0; }
                    20% { transform: rotate(${angle - 40}deg) translate(0, 0) scale(1.2); opacity: 1; }
                    50% { transform: rotate(${angle + 60}deg) translate(${dist * 0.8}px, 0) scale(1.3); opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.8)); }
                    100% { transform: rotate(${angle + 80}deg) translate(${dist + 10}px, 0) scale(0.8); opacity: 0; }
                  }
                  @keyframes epic-wave-${e.id} {
                    0% { transform: rotate(${angle}deg) translate(${dist * 0.2}px, 0) scale(0.5); opacity: 0; }
                    30% { transform: rotate(${angle}deg) translate(${dist * 0.5}px, 0) scale(1.2); opacity: 1; }
                    100% { transform: rotate(${angle}deg) translate(${dist + 20}px, 0) scale(2); opacity: 0; }
                  }
                `}</style>
                <div style={{ position: "absolute", inset: 0, animation: `epic-sword-slash-${e.id} 0.4s cubic-bezier(0.1, 0.8, 0.2, 1) forwards` }}>
                  <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id={`sg${e.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff" />
                        <stop offset="50%" stopColor="#d8d8f8" />
                        <stop offset="100%" stopColor="#888" />
                      </linearGradient>
                    </defs>
                    {/* Blade pointing right: x from SZ*0.2 to SZ*0.9, y centered around SZ/2 */}
                    <polygon points={`${SZ*0.2},${SZ/2-4} ${SZ*0.2},${SZ/2+4} ${SZ*0.8},${SZ/2+6} ${SZ*0.9},${SZ/2} ${SZ*0.8},${SZ/2-6}`} fill={`url(#sg${e.id})`} />
                    {/* Crossguard */}
                    <rect x={SZ*0.2} y={SZ/2-15} width="6" height="30" fill="#c0a828" rx="2" />
                    {/* Handle */}
                    <rect x={SZ*0.05} y={SZ/2-3} width={SZ*0.15} height="6" fill="#553311" />
                  </svg>
                </div>
                <div style={{ position: "absolute", inset: 0, animation: `epic-wave-${e.id} 0.35s ease-out forwards`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ overflow: "visible" }}>
                    <path d={`M ${SZ*0.7} ${SZ*0.2} Q ${SZ*0.9} ${SZ*0.5} ${SZ*0.7} ${SZ*0.8}`} fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="6" style={{ filter: "drop-shadow(0 0 10px #fff)" }} strokeLinecap="round" />
                    <path d={`M ${SZ*0.65} ${SZ*0.3} Q ${SZ*0.8} ${SZ*0.5} ${SZ*0.65} ${SZ*0.7}`} fill="none" stroke="rgba(0, 255, 255, 0.6)" strokeWidth="10" strokeLinecap="round" style={{ filter: "blur(4px)" }} />
                  </svg>
                </div>
              </div>
            );
          }
          if (e.type === "arrow" && e.targetX !== undefined && e.targetY !== undefined) {
            const tx2 = e.targetX * CELL + CELL / 2;
            const ty2 = e.targetY * CELL + CELL / 2;
            const adx = tx2 - ex, ady = ty2 - ey;
            const alen = Math.sqrt(adx * adx + ady * ady);
            const aang = Math.atan2(ady, adx) * 180 / Math.PI;
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 55,
                left: ex, top: ey - 3,
                width: alen, height: 6,
                transform: `rotate(${aang}deg)`, transformOrigin: "0 50%",
                animation: "dnd-arrow-fly 0.36s ease-in forwards",
              }}>
                <svg width={alen} height={6} viewBox={`0 0 ${alen} 6`} style={{ overflow: "visible" }}>
                  <line x1="0" y1="3" x2={alen - 10} y2="3" stroke="#b89040" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="3" x2={alen * 0.3} y2="3" stroke="#7a5a20" strokeWidth="1" strokeDasharray="3,4" />
                  <polygon points={`${alen-10},0 ${alen},3 ${alen-10},6`} fill="#d0e0ff" />
                </svg>
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// DICE ROLL OVERLAY
// ─────────────────────────────────────────────────

function DiceRollOverlay({ rolls }: { rolls: DiceRollDisplay[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!rolls.some(r => r.phase === "rolling")) return;
    const iv = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(iv);
  }, [rolls]);

  if (rolls.length === 0) return null;
  const COLORS: Record<DiceRollDisplay["type"], { bg: string; border: string; col: string; label: string }> = {
    hit:    { bg: "linear-gradient(135deg, rgba(20,50,100,0.95), rgba(10,20,50,0.95))", border: C.blue,     col: C.blue,     label: "HIT ROLL" },
    save:   { bg: "linear-gradient(135deg, rgba(20,80,30,0.95), rgba(10,30,15,0.95))", border: "#4cdb70",  col: "#4cdb70",  label: "SAVE ROLL" },
    damage: { bg: "linear-gradient(135deg, rgba(100,20,10,0.95), rgba(40,10,5,0.95))", border: "#ff3333",  col: "#ffaa33",  label: "DAMAGE" },
  };

  return (
    <>
      <style>{`
        @keyframes dnd-dice-roll {
          0% { transform: translateY(-80px) rotate(-15deg) scale(0.5); opacity: 0; filter: blur(4px); }
          50% { transform: translateY(10px) rotate(5deg) scale(1.1); opacity: 1; filter: blur(0); }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes dnd-dice-slam {
          0% { transform: scale(1.4) skewX(-10deg); filter: brightness(2) drop-shadow(0 0 30px rgba(255,255,255,0.8)); }
          40% { transform: scale(0.9) skewX(2deg); filter: brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.3)); }
          100% { transform: scale(1) skewX(-5deg); filter: brightness(1) drop-shadow(0 0 20px rgba(0,0,0,0.8)); }
        }
        @keyframes dnd-dice-nums { 0%,100%{opacity:0.6; transform: scale(0.95)} 50%{opacity:1; transform: scale(1.05)} }
      `}</style>
      <div style={{ position: "fixed", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 9998, display: "flex", gap: 20, pointerEvents: "none" }}>
        {rolls.map(r => {
          const c = COLORS[r.type];
          const spinning = r.phase === "rolling";
          const dispVal = spinning ? ((tick * 13 + r.max * 7) % r.max) + 1 : r.value;
          return (
            <div key={r.id} style={{
              background: c.bg,
              borderLeft: `6px solid ${c.border}`,
              borderRight: `6px solid ${c.border}`,
              padding: "16px 28px", textAlign: "center", minWidth: 100,
              clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
              animation: spinning ? "dnd-dice-roll 0.4s cubic-bezier(0.2,0,0,1) forwards" : "dnd-dice-slam 0.5s cubic-bezier(0.1,0.9,0.2,1) forwards",
              position: "relative",
              transform: "skewX(-5deg)",
            }}>
              <div style={{ fontFamily: PX, fontSize: 11, color: "#fff", letterSpacing: 2, marginBottom: 6, opacity: 0.9, textShadow: "1px 1px 0 rgba(0,0,0,0.8)" }}>{c.label}</div>
              {/* The number */}
              <div style={{
                fontFamily: PX, fontSize: spinning ? 32 : 46, color: spinning ? "#fff" : c.col, lineHeight: 1,
                filter: spinning ? "blur(1px)" : "none",
                transition: "filter 0.1s, font-size 0.2s",
                animation: spinning ? "dnd-dice-nums 0.1s linear infinite" : "none",
                textShadow: spinning ? "none" : `2px 2px 0 rgba(0,0,0,0.8), 0 0 25px ${c.border}`,
              }}>{dispVal}</div>
              {/* Modifier line */}
              {r.phase === "done" && r.mod !== 0 && (
                <div style={{ fontFamily: PX, fontSize: 12, color: "#fff", marginTop: 8, textShadow: "1px 1px 0 rgba(0,0,0,0.8)" }}>
                  {r.mod > 0 ? `+${r.mod}` : r.mod} = <span style={{ color: c.border, fontSize: 18 }}>{r.total}</span>
                </div>
              )}
              {r.phase === "done" && r.mod === 0 && (
                <div style={{ fontFamily: PX, fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>{r.label}</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────
// COMBAT PANEL
// ─────────────────────────────────────────────────

function CombatPanel({ combat, char, monsters, combatMode, setCombatMode, selectedSpell, onEndTurn, onSelectSpell, onFlee }: {
  combat: CombatState; char: Character; monsters: Monster[];
  combatMode: CombatModeT; setCombatMode: (m: CombatModeT) => void;
  selectedSpell?: string;
  onEndTurn: () => void; onSelectSpell: (name: string | null) => void; onFlee: () => void;
}) {
  const current = combat.turnOrder[combat.currentIndex];
  const isPlayer = current?.type === "player";
  const hasSlots = char.spellSlots ? char.spellSlots.used < char.spellSlots.max : false;
  const moveLeft = MOVE_SQUARES - combat.movedSquares;
  const [showLog, setShowLog] = useState(true);
  const [actionTab, setActionTab] = useState<"none" | "attack" | "skill" | "item">("none");
  const [tooltip, setTooltip] = useState<{ name: string; desc: string } | null>(null);

  const baseSpells = CLASS_SPELLS[char.class] ?? [];
  const spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
    ? baseSpells.map(s => s.name === "Sleep"
        ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
        : s)
    : baseSpells;
  const usableItems = char.inventory.filter(i => i.type === "consumable" && !i.material);

  function handleActionTab(tab: typeof actionTab) {
    setActionTab(prev => prev === tab ? "none" : tab);
    if (tab !== "skill") onSelectSpell(null);
    if (tab !== "attack") setCombatMode("none");
  }

  const classColor = CLASS_CFG[char.class]?.color ?? C.blue;
  const turnColor = isPlayer ? classColor : C.red;

  // Left cards: slide from left
  const leftCard = (delay: number, extra?: React.CSSProperties): React.CSSProperties => ({
    position: "relative",
    clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%)",
    animation: `cp-from-left 0.35s cubic-bezier(0.2,0,0,1) ${delay}ms both`,
    ...extra,
  });

  // Right cards: slide from right, mirrored clip
  const rightCard = (delay: number, extra?: React.CSSProperties): React.CSSProperties => ({
    position: "relative",
    clipPath: "polygon(10px 0, 100% 0, 100% 100%, 0 100%)",
    animation: `cp-from-right 0.35s cubic-bezier(0.2,0,0,1) ${delay}ms both`,
    ...extra,
  });

  return (
    <>
      <style>{`
        @keyframes cp-from-left {
          0% { transform: translateX(-70px) skewX(-6deg); opacity: 0; }
          65% { transform: translateX(5px) skewX(-1deg); opacity: 1; }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
        @keyframes cp-from-right {
          0% { transform: translateX(70px) skewX(6deg); opacity: 0; }
          65% { transform: translateX(-5px) skewX(1deg); opacity: 1; }
          100% { transform: translateX(0) skewX(0); opacity: 1; }
        }
        @keyframes cp-turn-pulse {
          0%,100% { box-shadow: 0 0 10px ${turnColor}50; }
          50% { box-shadow: 0 0 24px ${turnColor}aa, inset 0 0 12px ${turnColor}22; }
        }
        .cp-left-btn {
          transition: transform 0.12s, filter 0.12s;
          cursor: pointer;
        }
        .cp-left-btn:hover { transform: translateX(5px); filter: brightness(1.25); }
        .cp-left-btn:active { transform: translateX(2px); }
        .cp-right-btn {
          transition: transform 0.12s, filter 0.12s;
          cursor: pointer;
        }
        .cp-right-btn:hover { transform: translateX(-5px); filter: brightness(1.25); }
        .cp-right-btn:active { transform: translateX(-2px); }
      `}</style>

      {/* ══ LEFT PANEL: Turn order + Combat Log ══ */}
      <div style={{ position: "absolute", left: 4, top: 4, zIndex: 20, display: "flex", flexDirection: "column", gap: 3, width: 180, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>

        {/* Turn Banner */}
        <div style={{
          ...leftCard(0),
          background: `linear-gradient(100deg, ${turnColor}dd, ${turnColor}66)`,
          padding: "9px 16px 9px 12px",
          animation: `cp-from-left 0.35s cubic-bezier(0.2,0,0,1) 0ms both, cp-turn-pulse 2s 0.4s ease-in-out infinite`,
        }}>
          <div style={{ fontFamily: PX, fontSize: 12, color: "#fff", letterSpacing: 3, textShadow: "2px 2px 0 rgba(0,0,0,0.6)" }}>
            {isPlayer ? "YOUR TURN" : "ENEMY"}
          </div>
          <div style={{ fontFamily: PX, fontSize: 7, color: "rgba(255,255,255,0.7)", letterSpacing: 2, marginTop: 2 }}>
            ROUND {combat.round}
          </div>
        </div>

        {/* Turn Order */}
        {combat.turnOrder.map((t, i) => {
          const dead = t.type === "monster" && monsters.find(m => m.id === t.id)?.hp === 0;
          if (dead) return null;
          const act = i === combat.currentIndex;
          const col = t.type === "player" ? classColor : C.red;
          return (
            <div key={t.id + i} style={{
              ...leftCard(60 + i * 35),
              background: act ? `${col}28` : "rgba(8,6,20,0.82)",
              borderRight: `3px solid ${act ? col : col + "35"}`,
              padding: "5px 14px 5px 10px",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <div style={{ width: 6, height: 6, background: act ? col : col + "55", flexShrink: 0, clipPath: "polygon(0 50%,50% 0,100% 50%,50% 100%)" }} />
              <span style={{ fontFamily: PX, fontSize: act ? 8 : 7, color: act ? "#fff" : "rgba(255,255,255,0.4)", letterSpacing: 1, flex: 1 }}>
                {t.name.slice(0, 12)}
              </span>
              <span style={{ fontFamily: MO, fontSize: 8, color: act ? col : "rgba(255,255,255,0.25)" }}>{t.initiative}</span>
            </div>
          );
        })}

        {/* Combat Log toggle */}
        <div style={{ marginTop: 4 }}>
          <button className="cp-left-btn" onClick={() => setShowLog(p => !p)} style={{
            ...leftCard(200),
            border: "none", padding: "5px 16px 5px 10px", width: "100%", textAlign: "left",
            background: "rgba(10,8,22,0.8)",
            color: "rgba(255,255,255,0.35)", fontFamily: PX, fontSize: 7, letterSpacing: 1,
          }}>
            {showLog ? "▲ HIDE LOG" : "▼ COMBAT LOG"}
          </button>
          {showLog && (
            <div style={{
              ...leftCard(220),
              padding: "8px 12px", background: "rgba(5,4,14,0.92)", maxHeight: 140, overflowY: "auto",
            }}>
              {combat.log.slice(-12).reverse().map((l, i) => (
                <div key={i} style={{ fontFamily: NU, fontSize: 10, color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: 2 }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL: Actions ══ */}
      {isPlayer && (
        <div style={{ position: "absolute", right: 4, top: 4, zIndex: 20, display: "flex", flexDirection: "column", gap: 3, width: 190, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>

          {/* MOVE */}
          <button className="cp-right-btn" onClick={() => { setCombatMode(combatMode === "move" ? "none" : "move"); setActionTab("none"); }}
            disabled={moveLeft === 0}
            style={{
              ...rightCard(0),
              border: "none", padding: "10px 14px 10px 20px", textAlign: "right",
              background: combatMode === "move"
                ? `linear-gradient(260deg, ${C.blue}cc, ${C.blue}55)`
                : "linear-gradient(260deg, rgba(20,30,60,0.95), rgba(10,15,35,0.95))",
              color: moveLeft === 0 ? "rgba(255,255,255,0.2)" : combatMode === "move" ? "#fff" : "rgba(255,255,255,0.8)",
              fontFamily: PX, fontSize: 9, letterSpacing: 2,
              boxShadow: combatMode === "move" ? `0 0 14px ${C.blue}60` : "none",
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
            }}>
            <span style={{ fontSize: 7, opacity: 0.65 }}>{moveLeft * 5}ft</span>
            MOVE ▶
          </button>

          {/* ACTION TABS */}
          {!combat.actionUsed ? (
            <>
              {[
                { id: "attack" as const, icon: "⚔", label: "ATTACK", col: C.red },
                { id: "skill" as const, icon: "✨", label: "SKILL", col: "#c97fff" },
                { id: "item" as const, icon: "💊", label: "ITEM", col: "#4cdb70" },
              ].map((btn, bi) => (
                <button key={btn.id} className="cp-right-btn"
                  onClick={() => handleActionTab(btn.id)}
                  style={{
                    ...rightCard(60 + bi * 50),
                    border: "none", padding: "10px 14px 10px 20px", textAlign: "right",
                    background: actionTab === btn.id
                      ? `linear-gradient(260deg, ${btn.col}cc, ${btn.col}44)`
                      : "linear-gradient(260deg, rgba(20,14,40,0.95), rgba(10,8,24,0.95))",
                    color: actionTab === btn.id ? "#fff" : "rgba(255,255,255,0.7)",
                    fontFamily: PX, fontSize: 9, letterSpacing: 2,
                    boxShadow: actionTab === btn.id ? `0 0 14px ${btn.col}50` : "none",
                    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
                  }}>
                  {btn.label}
                  <span style={{ fontSize: 15 }}>{btn.icon}</span>
                </button>
              ))}
            </>
          ) : (
            <div style={{ ...rightCard(60), padding: "9px 14px 9px 20px", background: "rgba(12,10,28,0.88)", textAlign: "right" }}>
              <span style={{ fontFamily: PX, fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: 2 }}>ACTION USED</span>
            </div>
          )}

          {/* ATTACK sub-panel */}
          {!combat.actionUsed && actionTab === "attack" && char.equipment.weapon && (
            <div style={{ ...rightCard(220), padding: "9px 14px 9px 20px", background: "linear-gradient(260deg, rgba(60,10,10,0.95), rgba(30,5,5,0.95))" }}>
              <button className="cp-right-btn"
                onClick={() => setCombatMode(combatMode === "attack" ? "none" : "attack")}
                style={{
                  background: "none", border: "none", width: "100%", padding: 0, cursor: "pointer",
                  color: combatMode === "attack" ? C.red : "rgba(255,255,255,0.85)",
                  fontFamily: PX, fontSize: 9, letterSpacing: 1,
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, textAlign: "right",
                }}>
                <span style={{ fontFamily: MO, fontSize: 9, color: C.red + "99" }}>{char.equipment.weapon.damage}</span>
                ⚔ {char.equipment.weapon.name.slice(0, 14)}
              </button>
              <div style={{ fontFamily: MO, fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4, textAlign: "right" }}>Click target on map</div>
            </div>
          )}

          {/* SKILL sub-panel */}
          {!combat.actionUsed && actionTab === "skill" && (
            <div style={{ position: "relative" }}>
              {spells.filter(s => s.level === 0 || hasSlots).map((spell, si) => {
                const isActive = combatMode === "spell" && selectedSpell === spell.name;
                return (
                  <button key={spell.name} className="cp-right-btn"
                    onClick={() => onSelectSpell(isActive ? null : spell.name)}
                    onMouseEnter={() => setTooltip({ name: spell.name, desc: spell.desc ?? "" })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      ...rightCard(220 + si * 40),
                      border: "none", padding: "9px 14px 9px 20px", width: "100%",
                      background: isActive
                        ? "linear-gradient(260deg, #6a22cc, #3a0a80)"
                        : "linear-gradient(260deg, rgba(40,14,70,0.95), rgba(20,8,40,0.95))",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                      fontFamily: PX, fontSize: 9, letterSpacing: 1,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
                      boxShadow: isActive ? "0 0 14px #7c3aed80" : "none",
                      marginBottom: 3, textAlign: "right",
                    }}>
                    {spell.level > 0 && <span style={{ fontFamily: MO, fontSize: 7, color: "#c97fff88" }}>SLOT</span>}
                    {spell.level === 0 && <span style={{ fontFamily: MO, fontSize: 7, color: "rgba(255,255,255,0.3)" }}>∞</span>}
                    {spell.name} ✨
                  </button>
                );
              })}
              {!hasSlots && <div style={{ fontFamily: MO, fontSize: 9, color: "rgba(255,80,80,0.7)", padding: "4px 14px", textAlign: "right" }}>No slots left</div>}
              {/* Tooltip - pops to left */}
              {tooltip && (
                <div style={{
                  position: "absolute", right: "calc(100% + 8px)", top: 0,
                  background: "rgba(12,8,28,0.97)", border: `2px solid #7c3aed`,
                  boxShadow: "0 0 20px #7c3aed50", padding: "10px 14px",
                  width: 200, zIndex: 100, pointerEvents: "none",
                  clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%)",
                }}>
                  <div style={{ fontFamily: PX, fontSize: 9, color: "#c97fff", marginBottom: 5 }}>{tooltip.name}</div>
                  <div style={{ fontFamily: NU, fontSize: 10, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>{tooltip.desc}</div>
                </div>
              )}
            </div>
          )}

          {/* ITEM sub-panel */}
          {!combat.actionUsed && actionTab === "item" && (
            usableItems.length === 0 ? (
              <div style={{ ...rightCard(220), padding: "9px 14px", background: "rgba(12,10,28,0.88)", textAlign: "right" }}>
                <span style={{ fontFamily: MO, fontSize: 10, color: "rgba(255,255,255,0.28)" }}>No items</span>
              </div>
            ) : usableItems.map((item, ii) => (
              <button key={item.id} className="cp-right-btn"
                style={{
                  ...rightCard(220 + ii * 40),
                  border: "none", padding: "9px 14px 9px 20px", width: "100%", textAlign: "right",
                  background: "linear-gradient(260deg, rgba(15,40,20,0.95), rgba(8,20,12,0.95))",
                  color: "rgba(255,255,255,0.8)", fontFamily: PX, fontSize: 9, letterSpacing: 1,
                  display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 3,
                }}>
                <span style={{ fontFamily: MO, fontSize: 9, color: "#4cdb7088" }}>USE</span>
                {item.name.slice(0, 16)} 💊
              </button>
            ))
          )}

          {/* END TURN */}
          <div style={{ height: 4 }} />
          <button className="cp-right-btn" onClick={onEndTurn}
            style={{
              ...rightCard(260),
              border: "none", padding: "12px 16px 12px 24px", textAlign: "right",
              background: `linear-gradient(260deg, ${classColor}ee, ${classColor}66)`,
              color: "#fff", fontFamily: PX, fontSize: 11, letterSpacing: 3,
              boxShadow: `0 0 22px ${classColor}55`,
            }}>
            END TURN ✓
          </button>

          {/* FLEE */}
          <button className="cp-right-btn" onClick={onFlee}
            style={{
              ...rightCard(300),
              border: "none", padding: "7px 14px 7px 20px", textAlign: "right",
              background: "linear-gradient(260deg, rgba(80,10,10,0.75), rgba(40,5,5,0.75))",
              color: "rgba(255,80,80,0.8)", fontFamily: PX, fontSize: 8, letterSpacing: 2,
            }}>
            FLEE ✗
          </button>
        </div>
      )}

      {/* Enemy turn: indicator on right */}
      {!isPlayer && (
        <div style={{ position: "absolute", right: 4, top: 4, zIndex: 20, filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${turnColor}aa)` }}>
          <div style={{
            ...rightCard(0),
            padding: "10px 14px 10px 20px", background: "linear-gradient(260deg, rgba(80,10,10,0.8), rgba(40,5,5,0.8))",
          }}>
            <div style={{ fontFamily: PX, fontSize: 8, color: "rgba(255,100,100,0.7)", letterSpacing: 2, textAlign: "right" }}>ENEMY</div>
            <div style={{ fontFamily: PX, fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textAlign: "right" }}>THINKING...</div>
          </div>
        </div>
      )}
    </>
  );
}



// ─────────────────────────────────────────────────
// SHOP MODAL
// ─────────────────────────────────────────────────

function ShopModal({ char, onBuy, onClose }: { char: Character; onBuy: (item: Item) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"weapon" | "armor" | "consumable" | "accessory">("weapon");
  const items = SHOP_ITEMS.filter(i => i.type === tab);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
      <div style={{ ...panel, width: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", position: "relative" }}>
        <PixelCorners color={C.gold} size={8} />
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: PX, fontSize: 10, color: C.gold }}>🏪 GENERAL STORE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GoldBadge amount={char.gold} />
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}` }}>
          {(["weapon", "armor", "consumable", "accessory"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "8px 4px", background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent",
              marginBottom: -2, cursor: "pointer",
              fontFamily: PX, fontSize: 7, letterSpacing: 0.5,
              color: tab === t ? C.gold : C.muted,
            }}>
              {t === "weapon" ? "⚔" : t === "armor" ? "🛡" : t === "consumable" ? "💊" : "💍"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.card2, border: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: PX, fontSize: 8, color: C.text }}>{item.name}</span>
                  {item.damage && <span style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{item.damage}</span>}
                  {item.ac && <span style={{ fontFamily: MO, fontSize: 9, color: C.blue }}>AC {item.ac}</span>}
                </div>
                <div style={{ fontFamily: NU, fontSize: 11, color: C.muted }}>{item.description}</div>
              </div>
              <button onClick={() => char.gold >= item.value && onBuy(item)} disabled={char.gold < item.value}
                style={{ ...pixelBtn("primary", true), flexShrink: 0, opacity: char.gold < item.value ? 0.4 : 1, display: "flex", alignItems: "center", gap: 4 }}>
                <Star className="w-2.5 h-2.5" style={{ fill: C.gold, color: C.gold }} />{item.value}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// QUEST MODAL
// ─────────────────────────────────────────────────

function QuestModal({ quests, partyQuests, party, onAccept, onClose, nextRefresh, onClaim, charInventory }: {
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
              // Gather quest progress
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

// ─────────────────────────────────────────────────
// ITEM CONTEXT MENU
// ─────────────────────────────────────────────────

function ItemMenu({ item, inInventory, onUse, onEquip, onDrop, onClose }: {
  item: Item; inInventory: boolean;
  onUse?: () => void; onEquip?: () => void; onDrop: () => void; onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ ...panel, width: 220, padding: 16, position: "relative" }} onClick={e => e.stopPropagation()}>
        <PixelCorners size={5} />
        <div style={{ fontFamily: PX, fontSize: 8, color: C.text, marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 12 }}>{item.description}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onUse && <button onClick={onUse} style={{ ...pixelBtn("primary", true) }}>USE ITEM</button>}
          {onEquip && inInventory && <button onClick={onEquip} style={{ ...pixelBtn("primary", true) }}>EQUIP</button>}
          <button onClick={onDrop} style={{ ...pixelBtn("danger", true) }}>DROP</button>
          <button onClick={onClose} style={{ ...pixelBtn("ghost", true) }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// BOTTOM HUD
// ─────────────────────────────────────────────────

function BottomHUD({ char, hudTab, setHudTab, hudOpen, setHudOpen, chatTab, setChatTab, globalChat, partyChat, onSendChat, onEquipItem, onUnequipWeapon, onUnequipArmor, onUnequipAcc, onDropItem, onUseItem, party, onCreateParty, onLeaveParty, partyQuests, onUseSkill, inCombat }: {
  char: Character; hudTab: HudTab; setHudTab: (t: HudTab) => void;
  hudOpen: boolean; setHudOpen: (o: boolean) => void;
  chatTab: "global" | "party"; setChatTab: (t: "global" | "party") => void;
  globalChat: GameState["globalChat"]; partyChat: GameState["partyChat"];
  onSendChat: (msg: string, ch: "global" | "party") => void;
  onEquipItem: (i: Item) => void; onUnequipWeapon: () => void; onUnequipArmor: () => void; onUnequipAcc: (i: number) => void;
  onDropItem: (id: string) => void; onUseItem: (i: Item) => void;
  party: Party | null; onCreateParty: (n: string) => void; onLeaveParty: () => void;
  partyQuests: Quest[];
  onUseSkill: (spellName: string) => void;
  inCombat: boolean;
}) {
  const [itemMenu, setItemMenu] = useState<Item | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [partyName, setPartyName] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [invCategory, setInvCategory] = useState<"usable" | "material" | "equip">("usable");

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

  return (
    <div style={{ background: C.card, borderTop: `2px solid ${C.border}`, flexShrink: 0, fontFamily: NU }}>
      {/* Tab bar */}
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
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 8, letterSpacing: 1 }}>ABILITY SCORES</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {(Object.entries(char.stats) as [keyof Stats, number][]).map(([k, v]) => <StatBox key={k} label={k} value={v} />)}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {/* HP */}
                  <div style={{ padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>HP</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Heart className="w-3 h-3" style={{ color: C.red }} />
                      <span style={{ fontFamily: MO, fontSize: 11, color: C.red }}>{char.hp}/{char.maxHp}</span>
                    </div>
                    <HpBar hp={char.hp} maxHp={char.maxHp} size="sm" />
                  </div>
                  {/* AC / Prof */}
                  <div style={{ padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: 1 }}>AC / PROF</div>
                    <span style={{ fontFamily: MO, fontSize: 14, color: C.blue }}>{char.ac}</span>
                    <span style={{ fontFamily: MO, fontSize: 10, color: C.muted }}> / +{char.profBonus}</span>
                  </div>
                  {/* Spell slots */}
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
                  {/* EXP / Gold */}
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
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {hudTab === "inv" && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <style>{`@keyframes item-detail-in { 0%{opacity:0;clip-path:polygon(0 0,100% 0,100% 0,0 0)} 100%{opacity:1;clip-path:polygon(0 0,100% 0,100% 100%,0 100%)} }`}</style>
              {/* Category tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {(["usable", "material", "equip"] as const).map(cat => (
                  <button key={cat} onClick={() => { setInvCategory(cat); setExpandedItem(null); }}
                    style={{
                      flex: 1, padding: "5px 4px", cursor: "pointer", border: "none",
                      background: invCategory === cat ? C.blue + "20" : "transparent",
                      borderBottom: invCategory === cat ? `2px solid ${C.blue}` : "2px solid transparent",
                      fontFamily: PX, fontSize: 6, letterSpacing: 0.3,
                      color: invCategory === cat ? C.blue : C.muted,
                      transition: "all 0.15s",
                    }}>
                    {cat === "usable" ? "💊 USE" : cat === "material" ? "🪵 MATS" : "⚔ EQUIP"}
                  </button>
                ))}
              </div>
              {/* Item grid */}
              <div style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
                {(() => {
                  const filtered = char.inventory.filter(i => {
                    if (invCategory === "usable") return i.type === "consumable" && !i.material;
                    if (invCategory === "material") return i.material;
                    return i.type === "weapon" || i.type === "armor" || i.type === "accessory";
                  });
                  if (filtered.length === 0) return <div style={{ color: C.muted, fontFamily: NU, fontSize: 11, textAlign: "center", paddingTop: 20 }}>Empty</div>;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                      {filtered.map(item => (
                        <div key={item.id}
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          style={{
                            cursor: "pointer", position: "relative",
                            border: `2px solid ${expandedItem === item.id ? C.blue : C.border}`,
                            background: expandedItem === item.id ? C.blue + "15" : C.card2,
                            padding: 6, display: "flex", flexDirection: "column", alignItems: "center",
                            transition: "border-color 0.15s, background 0.15s",
                          }}>
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
              {/* Expanded item detail */}
              {expandedItem && (() => {
                const item = char.inventory.find(i => i.id === expandedItem);
                if (!item) return null;
                return (
                  <div style={{
                    borderTop: `1px solid ${C.border}`, padding: "10px 12px",
                    background: C.card, flexShrink: 0,
                    animation: "item-detail-in 0.2s ease-out",
                  }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: PX, fontSize: 7, color: C.blue, flex: 1 }}>{item.name}</span>
                      <button onClick={() => setExpandedItem(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontFamily: MO, fontSize: 12 }}>×</button>
                    </div>
                    <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, marginBottom: 6 }}>{item.description}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {item.damage && <span style={{ fontFamily: MO, fontSize: 9, color: C.red, padding: "2px 5px", background: C.card2 }}>DMG: {item.damage}</span>}
                      {item.ac && <span style={{ fontFamily: MO, fontSize: 9, color: C.blue, padding: "2px 5px", background: C.card2 }}>AC: +{item.ac}</span>}
                      {item.healAmount && <span style={{ fontFamily: MO, fontSize: 9, color: C.green, padding: "2px 5px", background: C.card2 }}>HEAL: {item.healAmount}</span>}
                      {item.range && <span style={{ fontFamily: MO, fontSize: 9, color: C.muted, padding: "2px 5px", background: C.card2 }}>{item.range}ft</span>}
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
              {/* Weapon */}
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>WEAPON</div>
                <SlotBox item={char.equipment.weapon} onClick={char.equipment.weapon ? () => setItemMenu(char.equipment.weapon!) : undefined} />
                {char.equipment.weapon && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.equipment.weapon.name}</div>
                    <div style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{(() => {
                      const w = char.equipment.weapon;
                      const isR = (w.range ?? 5) > 5;
                      const sm = isR ? getMod(char.stats.dex) : getMod(char.stats.str);
                      return `${w.damage}${sm >= 0 ? "+" : ""}${sm}`;
                    })()}</div>
                    <button onClick={onUnequipWeapon} style={{ fontFamily: NU, fontSize: 10, color: C.red + "80", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>unequip</button>
                  </div>
                )}
              </div>
              <div style={{ width: 1, background: C.border }} />
              {/* Armor */}
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
              {/* Inventory equippables */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>IN BAG</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {char.inventory.filter(i => i.type === "weapon" || i.type === "armor").map(item => (
                    <div key={item.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => onEquipItem(item)} title={`Equip ${item.name}`}>
                      <SlotBox item={item} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", opacity: 0, transition: "opacity 0.15s", fontFamily: PX, fontSize: 6, color: C.blue }}
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

                // Add class-specific non-spell abilities
                const extraAbilities: Array<{ name: string; desc: string; color: string; level: number; type: string }> = [];
                if (char.class === "Fighter") extraAbilities.push({ name: "Second Wind", desc: `Regain 1d10+${char.level} HP (1/short rest)`, color: C.red, level: 0, type: "cantrip" });
                if (char.class === "Ranger") extraAbilities.push({ name: "Hunter's Mark", desc: "Mark a target. Deal extra 1d6 damage to it.", color: "#4cdb70", level: 0, type: "cantrip" });

                if (spells.length === 0 && extraAbilities.length === 0) return (
                  <div style={{ color: C.muted, fontFamily: NU, fontSize: 12, textAlign: "center", paddingTop: 30 }}>
                    No spells available for this class.
                  </div>
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
                            <span style={{ fontFamily: PX, fontSize: 7, color: spellColor, flex: 1, textAlign: "left" }}>{spell.name}</span>
                            <span style={{ fontFamily: MO, fontSize: 8, color: C.muted }}>{isCantrip ? "cantrip" : `lvl ${spell.level}`}</span>
                            <span style={{ fontFamily: MO, fontSize: 9, color: spellColor }}>{isExpanded ? "▲" : "▼"}</span>
                          </button>

                          {isExpanded && (
                            <div style={{
                              padding: "10px 12px", background: C.card,
                              animation: "skill-expand 0.22s ease-out",
                              transformOrigin: "top",
                            }}>
                              <div style={{
                                height: 2, marginBottom: 8,
                                background: `linear-gradient(90deg, transparent, ${spellColor}, transparent)`,
                                animation: "skill-sweep 1.5s ease-in-out infinite",
                                backgroundSize: "200% 100%",
                              }} />
                              <div style={{ fontFamily: NU, fontSize: 11, color: C.text + "c0", marginBottom: 6, lineHeight: 1.5 }}>{spell.desc}</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
                                {(spell as { damage?: string }).damage && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.red, background: C.card2, padding: "3px 6px" }}>
                                    DMG: {(spell as { damage?: string }).damage}
                                  </div>
                                )}
                                {(spell as { heal?: string }).heal && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: "#4cdb70", background: C.card2, padding: "3px 6px" }}>
                                    HEAL: {(spell as { heal?: string }).heal}
                                  </div>
                                )}
                                {(spell as { range?: number }).range !== undefined && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.blue, background: C.card2, padding: "3px 6px" }}>
                                    RANGE: {(spell as { range?: number }).range}ft
                                  </div>
                                )}
                                <div style={{ fontFamily: MO, fontSize: 9, color: C.gold, background: C.card2, padding: "3px 6px" }}>
                                  {attackType}
                                </div>
                                {(spell as { saveStat?: keyof Stats; saveDC?: number }).saveStat && (spell as { saveDC?: number }).saveDC && (
                                  <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, background: C.card2, padding: "3px 6px", gridColumn: "span 2" }}>
                                    {(spell as { saveStat?: string }).saveStat?.toUpperCase()} save DC {(spell as { saveDC?: number }).saveDC}
                                  </div>
                                )}
                              </div>
                              {!inCombat ? (
                                <button onClick={() => onUseSkill(spell.name)}
                                  style={{
                                    width: "100%", padding: "6px", cursor: "pointer",
                                    background: `linear-gradient(135deg, ${spellColor}30, ${spellColor}18)`,
                                    border: `2px solid ${spellColor}`,
                                    color: spellColor, fontFamily: PX, fontSize: 7,
                                    boxShadow: `0 0 8px ${spellColor}30`,
                                    transition: "box-shadow 0.2s",
                                  }}>
                                  ✨ USE SKILL
                                </button>
                              ) : (
                                <div style={{ fontFamily: NU, fontSize: 10, color: C.muted, textAlign: "center", padding: "4px 0" }}>
                                  ↑ Use via combat panel
                                </div>
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
                    borderBottom: chatTab === t ? `2px solid ${C.blue}` : "2px solid transparent",
                    marginBottom: -1,
                    fontFamily: PX, fontSize: 7, letterSpacing: 0.5,
                    color: chatTab === t ? C.blue : C.muted,
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

          {/* PARTY */}
          {hudTab === "party" && (
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }}>
              {party ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: PX, fontSize: 9, color: C.blue }}>{party.name}</div>
                      <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginTop: 2 }}>{party.memberIds.length} member · Quests: {party.questIds.length}/2</div>
                    </div>
                    <button onClick={onLeaveParty} style={{ ...pixelBtn("danger", true), fontSize: 7 }}>LEAVE</button>
                  </div>
                  <div>
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ACTIVE QUESTS</div>
                    {partyQuests.length === 0
                      ? <div style={{ fontFamily: NU, fontSize: 11, color: C.muted }}>No quests. Visit the Quest Board in town.</div>
                      : partyQuests.map(q => (
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

      {/* Item menu */}
      {itemMenu && (
        <ItemMenu
          item={itemMenu}
          inInventory={char.inventory.some(i => i.id === itemMenu.id)}
          onUse={itemMenu.type === "consumable" ? () => { onUseItem(itemMenu); setItemMenu(null); } : undefined}
          onEquip={["weapon", "armor", "accessory"].includes(itemMenu.type) && char.inventory.some(i => i.id === itemMenu.id)
            ? () => { onEquipItem(itemMenu); setItemMenu(null); } : undefined}
          onDrop={() => { onDropItem(itemMenu.id); setItemMenu(null); }}
          onClose={() => setItemMenu(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────

const INIT_COMBAT: CombatState = {
  active: false, round: 0, turnOrder: [], currentIndex: 0,
  actionUsed: false, bonusActionUsed: false, movedSquares: 0,
  log: [], engagedMonsterIds: [],
};

export default function App() {
  const [gs, setGs] = useState<GameState>(loadState);
  const [session, setSession] = useState<{ username: string; charIds: string[] } | null>(null);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const [creatingChar, setCreatingChar] = useState(false);
  const [combat, setCombat] = useState<CombatState>(INIT_COMBAT);
  const [fogRevealed, setFogRevealed] = useState<Set<string>>(new Set());
  const [combatMode, setCombatMode] = useState<CombatModeT>("none");
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [dyingMonsters, setDyingMonsters] = useState<Set<string>>(new Set());
  const [hitTokenIds, setHitTokenIds] = useState<Set<string>>(new Set());
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [pendingBombItemId, setPendingBombItemId] = useState<string | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRollDisplay[]>([]);
  const [battleStart, setBattleStart] = useState(false);
  const [hudTab, setHudTab] = useState<HudTab>("char");
  const [hudOpen, setHudOpen] = useState(true);
  const [chatTab, setChatTab] = useState<"global" | "party">("global");
  // Special tile dialog (replaces old moveConfirm)
  const [specialDialog, setSpecialDialog] = useState<{ x: number; y: number; tile: { label: string; type: string; icon: string; prompt: string; color: string } } | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [restAnim, setRestAnim] = useState<"short" | "long" | null>(null);
  const [zoom, setZoom] = useState(1.3);
  const [shopPurchaseAnim, setShopPurchaseAnim] = useState<string | null>(null);
  const [battleBanner, setBattleBanner] = useState(false);
  const monsterTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const char = activeCharId ? gs.characters[activeCharId] : null;

  useEffect(() => { persist(gs); }, [gs]);

  // NPC chat
  useEffect(() => {
    const iv = setInterval(() => {
      const npc = NPC_CHAT[Math.floor(Math.random() * NPC_CHAT.length)];
      setGs(prev => ({ ...prev, globalChat: [...prev.globalChat.slice(-49), { id: gid(), sender: npc.sender, text: npc.text, time: tnow() }] }));
    }, 25000 + Math.random() * 20000);
    return () => clearInterval(iv);
  }, []);

  // Quest refresh
  useEffect(() => {
    const iv = setInterval(() => {
      setGs(prev => Date.now() >= prev.questRefreshAt
        ? { ...prev, availableQuests: genQuests(10), questRefreshAt: Date.now() + 5 * 60 * 1000 }
        : prev);
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const addEffect = useCallback((e: Omit<VisualEffect, "id">) => {
    const effect = { ...e, id: gid() };
    setEffects(prev => [...prev, effect]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== effect.id)), 900);
  }, []);

  const addHit = useCallback((id: string) => {
    setHitTokenIds(prev => new Set([...prev, id]));
    setTimeout(() => setHitTokenIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 380);
  }, []);

  const addDiceRoll = useCallback((roll: Omit<DiceRollDisplay, "id" | "phase">) => {
    const r: DiceRollDisplay = { ...roll, id: gid(), phase: "rolling" };
    setDiceRolls(prev => [...prev.slice(-4), r]);
    setTimeout(() => setDiceRolls(prev => prev.map(d => d.id === r.id ? { ...d, phase: "done" } : d)), 520);
    setTimeout(() => setDiceRolls(prev => prev.filter(d => d.id !== r.id)), 3500);
  }, []);

  const updateChar = useCallback((id: string, upd: Partial<Character> | ((c: Character) => Partial<Character>)) => {
    setGs(prev => {
      const c = prev.characters[id];
      if (!c) return prev;
      const changes = typeof upd === "function" ? upd(c) : upd;
      return { ...prev, characters: { ...prev.characters, [id]: { ...c, ...changes } } };
    });
  }, []);

  // ── COMBAT ──

  // Win condition
  useEffect(() => {
    if (!combat.active) return;
    const alive = gs.dungeonMonsters.filter(m => m.hp > 0 && combat.engagedMonsterIds.includes(m.id));
    if (alive.length === 0) endCombat(combat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.dungeonMonsters, combat.active]);

  // Monster sight (dungeon only — town is a safe zone)
  useEffect(() => {
    if (screen !== "dungeon" || combat.active || !char) return;
    clearTimeout(monsterTimerRef.current);
    monsterTimerRef.current = setTimeout(() => {
      const triggered = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(char.position, m.position) <= m.sightRange);
      if (triggered.length > 0) startCombat(triggered.map(m => m.id));
    }, 300);
  }, [char?.position, screen, combat.active]);

  // Check for new monsters entering combat (when player moves toward them mid-combat)
  useEffect(() => {
    if (!combat.active || !char || screen !== "dungeon") return;
    const inSight = gs.dungeonMonsters.filter(m =>
      m.hp > 0 && dist(char.position, m.position) <= m.sightRange
    );
    // Pre-compute which are truly new using closure value (may be slightly stale — safe to read here)
    const newOnes = inSight.filter(m => !combat.engagedMonsterIds.includes(m.id));
    if (newOnes.length === 0) return;

    // Pre-compute initiatives outside setState to avoid side effects inside updater
    const additions = newOnes.map(m => ({ m, init: Math.min(19, d20()) }));

    setCombat(prev => {
      // Re-check inside prev to be safe against concurrent calls
      const engaged = new Set(prev.engagedMonsterIds);
      const realNew = additions.filter(a => !engaged.has(a.m.id));
      if (realNew.length === 0) return prev;
      return {
        ...prev,
        turnOrder: [...prev.turnOrder, ...realNew.map(a => ({ id: a.m.id, type: "monster" as const, name: a.m.name, initiative: a.init }))],
        engagedMonsterIds: [...prev.engagedMonsterIds, ...realNew.map(a => a.m.id)],
      };
    });

    if (newOnes.length > 0) {
      notify(`⚠️ ${newOnes.length} ${newOnes[0].name}(s) join the fight!`);
      setGs(prev => ({
        ...prev,
        dungeonMonsters: prev.dungeonMonsters.map(m =>
          newOnes.some(n => n.id === m.id) ? { ...m, alerted: true } : m
        ),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.active, char?.position, gs.dungeonMonsters]);

  // Combat turn loop (monster AI via effect)
  const doNextTurn = useCallback(() => {
    setCombat(prev => {
      // Guard: do nothing if combat ended or turn order is empty (prevents % 0 NaN crash)
      if (!prev.active || prev.turnOrder.length === 0) return prev;
      const aliveM = gs.dungeonMonsters.filter(m => m.hp > 0 && prev.engagedMonsterIds.includes(m.id));
      if (aliveM.length === 0) return prev; // endCombat handled by win-condition effect
      const nextIdx = (prev.currentIndex + 1) % prev.turnOrder.length;
      const isNew = nextIdx <= prev.currentIndex;
      return {
        ...prev, currentIndex: nextIdx,
        round: isNew ? prev.round + 1 : prev.round,
        actionUsed: false, bonusActionUsed: false, movedSquares: 0,
        log: isNew ? [...prev.log.slice(-30), `── Round ${prev.round + 1} ──`] : prev.log,
      };
    });
  }, [gs.dungeonMonsters]);

  function endPlayerTurn() { setCombatMode("none"); doNextTurn(); }

  useEffect(() => {
    if (!combat.active || !char) return;
    const current = combat.turnOrder[combat.currentIndex];
    if (!current || current.type !== "monster") return;
    const aliveM = gs.dungeonMonsters.filter(m => m.hp > 0 && combat.engagedMonsterIds.includes(m.id));
    if (aliveM.length === 0) { endCombat(combat); return; }
    const monster = gs.dungeonMonsters.find(m => m.id === current.id);
    if (!monster || monster.hp <= 0) { doNextTurn(); return; }

    const timer = setTimeout(() => {
      if (!combat.active) return; // guard: combat may have ended while we waited
      const newLog = [...combat.log.slice(-30)];
      const newMonsters = gs.dungeonMonsters.map(m => ({ ...m }));
      const mIdx = newMonsters.findIndex(m => m.id === monster.id);
      let charHp = char.hp;
      const d = dist(monster.position, char.position);
      let newPos = { ...monster.position };
      if (d > 1) {
        const dx = char.position.x - monster.position.x;
        const dy = char.position.y - monster.position.y;
        const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
        const sy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
        newPos = { x: Math.max(0, Math.min(COLS - 1, monster.position.x + sx)), y: Math.max(0, Math.min(ROWS - 1, monster.position.y + sy)) };
        newLog.push(`${monster.name} moves.`);
      }
      newMonsters[mIdx] = { ...newMonsters[mIdx], position: newPos };
      const nd = dist(newPos, char.position);
      if (nd <= Math.ceil((monster.range ?? 5) / 5)) {
        const atkRoll = d20() + monster.attackMod;
        newLog.push(`${monster.name} attacks ${char.name}: [${atkRoll}] vs AC ${char.ac}`);
        addDiceRoll({ type: "hit", value: atkRoll, total: atkRoll, mod: monster.attackMod, max: 20, label: `vs AC ${char.ac}` });
        if (atkRoll >= char.ac) {
          const dmg = rollDice(monster.damage);
          charHp = Math.max(0, charHp - dmg);
          newLog.push(`  Hit! ${char.name} takes ${dmg} dmg. (${charHp}/${char.maxHp})`);
          addDiceRoll({ type: "damage", value: dmg, total: dmg, mod: 0, max: dmg, label: monster.damage });
          addEffect({ type: "scratch", gridX: char.position.x, gridY: char.position.y });
          addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: `-${dmg}` });
          addHit(char.id);
        } else {
          newLog.push(`  Miss!`);
          addEffect({ type: "miss", gridX: char.position.x, gridY: char.position.y, value: "MISS" });
        }
      }
      setGs(prev => ({
        ...prev,
        dungeonMonsters: newMonsters,
        characters: { ...prev.characters, [char.id]: { ...prev.characters[char.id], hp: charHp } },
      }));
      setCombat(prev => ({ ...prev, log: newLog }));
      if (charHp <= 0) { notify("💀 Defeated!"); setCombat(INIT_COMBAT); setCombatMode("none"); return; }
      doNextTurn();
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.currentIndex, combat.active, combat.round]);

  function startCombat(monsterIds: string[]) {
    if (!char) return;
    setBattleStart(true);
    setTimeout(() => setBattleStart(false), 1800);
    // battleBanner removed — battleStart already shows BATTLE START animation
    const playerInit = 20 + getMod(char.stats.dex);
    const order: Combatant[] = [{ id: char.id, type: "player", name: char.name, initiative: playerInit }];
    const engaged = gs.dungeonMonsters.filter(m => monsterIds.includes(m.id) && m.hp > 0);
    engaged.forEach(m => {
      // Monsters roll normally but capped at 19 so player with DEX ≥ 0 always goes first
      const init = Math.min(19, d20());
      order.push({ id: m.id, type: "monster", name: m.name, initiative: init });
    });
    order.sort((a, b) => b.initiative - a.initiative);
    const log = [
      `⚔ Combat! Round 1`,
      `${char.name} initiative: ${playerInit} (20+DEX)`,
      ...engaged.map(m => `${m.name} initiative: ${order.find(o => o.id === m.id)?.initiative}`),
    ];
    setGs(prev => ({ ...prev, dungeonMonsters: prev.dungeonMonsters.map(m => monsterIds.includes(m.id) ? { ...m, alerted: true } : m) }));
    setCombat({ active: true, round: 1, turnOrder: order, currentIndex: 0, actionUsed: false, bonusActionUsed: false, movedSquares: 0, log, engagedMonsterIds: monsterIds });
    setCombatMode("none");
    // battleBanner removed — only battleStart used now
  }

  function endCombat(c: CombatState) {
    if (!char) return;
    const dead = gs.dungeonMonsters.filter(m => c.engagedMonsterIds.includes(m.id) && m.hp <= 0);
    let totalExp = 0;
    const drops: Item[] = [];
    dead.forEach(m => {
      totalExp += m.xp;
      if (Math.random() < 0.4) drops.push({ id: gid(), name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." });
      if (Math.random() < 0.5) drops.push({ id: gid(), ...BRANCH_ITEM });
      if (Math.random() < 0.6) updateChar(char.id, ch => ({ gold: ch.gold + 2 + Math.floor(Math.random() * 5) }));
    });
    let updatedPQ = gs.partyQuests.map(q => {
      if (q.killTarget?.monster === "Wooden Dummy") return { ...q, killTarget: { ...q.killTarget, current: Math.min(q.killTarget.current + dead.length, q.killTarget.count) } };
      return q;
    });
    updatedPQ = updatedPQ.map(q => {
      if (q.killTarget && q.killTarget.current >= q.killTarget.count && !q.readyToTurnIn && !q.completed) {
        notify(`📋 Quest complete: ${q.title}! Return to the Quest Board to claim your reward.`);
        return { ...q, readyToTurnIn: true };
      }
      return q;
    });
    updateChar(char.id, ch => ({ exp: ch.exp + totalExp, inventory: [...ch.inventory, ...drops] }));
    setGs(prev => ({ ...prev, partyQuests: updatedPQ }));
    notify(`⚔️ Victory! +${totalExp} EXP${drops.length > 0 ? `, ${drops.length} item(s)` : ""}`);
    setCombat(INIT_COMBAT); setCombatMode("none");
  }

  function handleSpellSelect(name: string | null) {
    if (!name) { setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null); return; }
    setCombatMode("spell");
    setSelectedSpell(name);
  }

  function handleCastSpellAtTile(spellName: string, center: { x: number; y: number }) {
    if (!char) return;
    const aoeSpell = WIZARD_SPELL_CHOICES.find(s => s.name === spellName);
    if (!aoeSpell) return;
    if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots!"); return; }
    updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));

    const effectTypeMap: Record<string, VisualEffect["type"]> = {
      "Sleep": "thunder", "Thunderwave": "thunder", "Burning Hands": "fire_aoe",
    };
    const effectType = effectTypeMap[spellName] ?? "thunder";
    const dmgDice = spellName === "Burning Hands" ? "3d6" : "2d8";
    const log = [...combat.log];
    const diedIds: string[] = [];
    let newMonsters = [...gs.dungeonMonsters];
    // Monsters hit: those alive and in the cone area (aoeRadius from center as fallback)
    const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(center, m.position) <= aoeSpell.aoeRadius);
    if (targets.length === 0) {
      notify(`${spellName} — no targets caught!`);
      setCombat(prev => ({ ...prev, actionUsed: true }));
      setCombatMode("none"); setSelectedSpell(null);
      return;
    }
    const spMod = getSpellcastingMod(char);
    targets.forEach(mt => {
      const saveRoll = d20();
      const saved = saveRoll >= 13;
      const rawDmg = rollDice(dmgDice);
      const finalDmg = saved ? Math.floor((rawDmg + spMod) / 2) : (rawDmg + spMod);
      log.push(`${spellName}: ${mt.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
      addEffect({ type: effectType, gridX: mt.position.x, gridY: mt.position.y });
      addEffect({ type: "number", gridX: mt.position.x, gridY: mt.position.y, value: String(finalDmg) });
      addHit(mt.id);
      newMonsters = newMonsters.map(m => {
        if (m.id !== mt.id) return m;
        const newHp = Math.max(0, m.hp - finalDmg);
        if (newHp <= 0) diedIds.push(m.id);
        return { ...m, hp: newHp };
      });
    });
    setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
    setCombat(prev => ({ ...prev, actionUsed: true, log }));
    diedIds.forEach(id => {
      setDyingMonsters(prev => new Set([...prev, id]));
      setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
    });
    setCombatMode("none"); setSelectedSpell(null);
    if (!combat.active && targets.length > 0) {
      setTimeout(() => startCombat(targets.map(m => m.id)), 600);
    }
  }

  // Execute a bomb: apply AOE damage, consume item, mark action used
  function executeBombEffect(bombItemId: string, targetIds: string[]) {
    if (!char) return;
    const bomb = char.inventory.find(i => i.id === bombItemId) ?? SHOP_ITEMS.find(i => i.id === "s13");
    if (!bomb) return;
    let newMonsters = [...gs.dungeonMonsters];
    const log = [...combat.log];
    const diedIds: string[] = [];
    targetIds.forEach(id => {
      const mt = gs.dungeonMonsters.find(m => m.id === id);
      if (!mt) return;
      const saveRoll = d20();
      const saved = saveRoll >= (bomb.saveDC ?? 15);
      const rawDmg = rollDice(bomb.damage ?? "3d6");
      const finalDmg = saved ? Math.floor(rawDmg / 2) : rawDmg;
      log.push(`${bomb.name}: ${mt.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
      addEffect({ type: "fire_aoe", gridX: mt.position.x, gridY: mt.position.y });
      addEffect({ type: "number", gridX: mt.position.x, gridY: mt.position.y, value: String(finalDmg) });
      addHit(id);
      newMonsters = newMonsters.map(m => {
        if (m.id !== id) return m;
        const newHp = Math.max(0, m.hp - finalDmg);
        if (newHp <= 0) diedIds.push(m.id);
        return { ...m, hp: newHp };
      });
    });
    setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
    if (combat.active) setCombat(prev => ({ ...prev, actionUsed: true, log }));
    // Remove the bomb from inventory
    updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== bombItemId) }));
    diedIds.forEach(id => {
      setDyingMonsters(prev => new Set([...prev, id]));
      setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
    });
    notify(`💣 Bomb explodes! ${targetIds.length > 0 ? `Hit ${targetIds.length} target(s).` : "No targets hit."}`);
    if (!combat.active && targetIds.length > 0) {
      setTimeout(() => startCombat(targetIds), 600);
    }
  }

  // Called from MapGrid when user clicks any tile in the AOE area
  function handleAOECastFromGrid(affectedMonsterIds: string[], tileX: number, tileY: number) {
    if (!char || !selectedSpell || combatMode !== "spell") return;
    const isBomb = selectedSpell === "Small Bomb";

    if (isBomb) {
      // Bomb AOE — works in and out of combat
      const bombId = pendingBombItemId ?? char.inventory.find(i => i.effect === "aoe_bomb")?.id;
      if (!bombId) { notify("No bomb available!"); setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null); return; }
      if (!combat.active && affectedMonsterIds.length > 0) {
        startCombat(affectedMonsterIds);
      }
      executeBombEffect(bombId, affectedMonsterIds);
      setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null);
      return;
    }

    if (!combat.active) {
      // Spell cast from outside combat
      if (affectedMonsterIds.length === 0) {
        notify("No targets in the area!");
        setCombatMode("none"); setSelectedSpell(null); return;
      }
      // Start combat with monsters in AOE, then cast spell (player used action on the preemptive cast)
      startCombat(affectedMonsterIds);
      handleCastSpellAtTile(selectedSpell, { x: tileX, y: tileY });
      return;
    }

    if (affectedMonsterIds.length === 0) {
      notify("No targets caught in the area!");
      return;
    }
    handleCastSpellAtTile(selectedSpell, { x: tileX, y: tileY });
  }

  function handleCastSpell(spellName: string, targetMonsterId: string) {
    if (!char) return;
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const wizAoe = WIZARD_SPELL_CHOICES.find(s => s.name === spellName);
    const spell = allSpells.find(s => s.name === spellName) as typeof allSpells[0] | undefined;

    // Use a spell slot for level > 0 spells
    const needsSlot = spell ? spell.level > 0 : true;
    if (needsSlot) {
      if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots remaining!"); return; }
      updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));
    }

    const target = gs.dungeonMonsters.find(m => m.id === targetMonsterId);
    const log = [...combat.log];

    // Determine effect type
    const effectTypeMap: Record<string, VisualEffect["type"]> = {
      "Fire Bolt": "fire_bolt", "Magic Missile": "magic_missile",
      "Sacred Flame": "sacred_flame", "Divine Smite": "smite",
      "Sleep": "thunder", "Thunderwave": "thunder", "Burning Hands": "fire_aoe",
      "Cure Wounds": "heal", "Lay on Hands": "heal",
    };
    const effectType = effectTypeMap[spellName] ?? "magic_missile";

    if (spell && ((spell.type === "heal" || spell.type === "cantrip") && spell.heal)) {
      // Healing spell - targets self
      const spMod = getSpellcastingMod(char);
      const healed = spell.heal === "5" ? 5 : rollDice(spell.heal) + spMod;
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
      log.push(`${char.name} casts ${spell.name}: +${healed} HP`);
      addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
      notify(`✨ Healed ${healed} HP!`);
    } else if (wizAoe && target) {
      // AOE wizard spell — all monsters within aoeRadius of target
      const aoeRadius = wizAoe.aoeRadius;
      const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(target.position, m.position) <= aoeRadius);
      let newMonsters = [...gs.dungeonMonsters];
      const diedInAoe: string[] = [];
      targets.forEach(mt => {
        const saveRoll = d20();
        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: "Save DC 13" });
        const saved = saveRoll >= 13;
        const dmgDice = spellName === "Burning Hands" ? "3d6" : "2d8";
        const rawDmg = rollDice(dmgDice);
        const finalDmg = saved ? Math.floor(rawDmg / 2) : rawDmg;
        addDiceRoll({ type: "damage", value: finalDmg, total: finalDmg, mod: 0, max: finalDmg, label: dmgDice });
        newMonsters = newMonsters.map(m => {
          if (m.id !== mt.id) return m;
          log.push(`${spellName}: ${m.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
          addEffect({ type: effectType, gridX: m.position.x, gridY: m.position.y });
          addEffect({ type: "number", gridX: m.position.x, gridY: m.position.y, value: String(finalDmg) });
          const newHp = Math.max(0, m.hp - finalDmg);
          if (newHp <= 0) diedInAoe.push(m.id);
          return { ...m, hp: newHp };
        });
      });
      setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
      diedInAoe.forEach(id => {
        setDyingMonsters(prev => new Set([...prev, id]));
        setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
      });
    } else if (spell && spell.damage && target) {
      const spMod = getSpellcastingMod(char);
      const rawDmg = rollDice(spell.damage);
      const dmg = Math.max(1, rawDmg + spMod);
      addDiceRoll({ type: "damage", value: rawDmg, total: dmg, mod: spMod, max: rawDmg, label: spell.damage + (spMod !== 0 ? `${spMod >= 0 ? "+" : ""}${spMod}` : "") });
      // Spells with save roll (Sacred Flame, etc.)
      if (spell.saveStat && spell.saveDC) {
        const saveRoll = d20();
        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: `Save DC ${spell.saveDC}` });
        if (saveRoll >= spell.saveDC) {
          log.push(`${char.name} casts ${spell.name}: ${target.name} saves! No damage.`);
          addEffect({ type: effectType, gridX: target.position.x, gridY: target.position.y });
          setCombat(prev => ({ ...prev, actionUsed: true, log }));
          setCombatMode("none"); setSelectedSpell(null); return;
        }
      }
      const newMonsters = gs.dungeonMonsters.map(m => {
        if (m.id !== target.id) return m;
        log.push(`${char.name} casts ${spell.name}: ${dmg} dmg to ${m.name} (${Math.max(0, m.hp - dmg)}/${m.maxHp})${spMod !== 0 ? ` [+${spMod} spell mod]` : ""}`);
        return { ...m, hp: Math.max(0, m.hp - dmg) };
      });
      addEffect({ type: effectType, gridX: target.position.x, gridY: target.position.y });
      addEffect({ type: "number", gridX: target.position.x, gridY: target.position.y, value: String(dmg) });
      setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
      const newHp = Math.max(0, target.hp - dmg);
      if (newHp <= 0) {
        setDyingMonsters(prev => new Set([...prev, target.id]));
        setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(target.id); return s; }), 1000);
      }
    } else if (target) {
      log.push(`${char.name} casts ${spellName}... no effect.`);
    }

    setCombat(prev => ({ ...prev, actionUsed: true, log }));
    setCombatMode("none");
    setSelectedSpell(null);
    if (!combat.active && target) {
      setTimeout(() => startCombat([target.id]), 600);
    }
  }

  function handleHealSelf() {
    if (!char || !selectedSpell) return;
    handleCastSpell(selectedSpell, "");
    setCombatMode("none"); setSelectedSpell(null);
  }

  function handleMonsterClick(monsterId: string) {
    if (combatMode === "attack") handleAttackMonster(monsterId);
    else if (combatMode === "spell" && selectedSpell) handleCastSpell(selectedSpell, monsterId);
  }

  function handleAttackMonster(monsterId: string) {
    if (!char || !combat.active || combat.actionUsed) return;
    const weapon = char.equipment.weapon;
    if (!weapon) return;
    const monster = gs.dungeonMonsters.find(m => m.id === monsterId);
    if (!monster || monster.hp <= 0) return;
    const isRanged = (weapon.range ?? 5) > 5;
    const mod = isRanged ? getMod(char.stats.dex) : getMod(char.stats.str);
    const roll = d20();
    const total = roll + mod + char.profBonus;

    // Show attack roll dice
    addDiceRoll({ type: "hit", value: roll, total, mod: mod + char.profBonus, max: 20, label: `vs AC ${monster.ac}` });

    const log = [...combat.log];
    log.push(`${char.name} attacks ${monster.name}: [${roll}+${mod + char.profBonus}=${total}] vs AC ${monster.ac}`);

    if (weapon.name === "Longsword") {
      // Sword impact effect centered on monster; targetX/Y = player (direction the sword comes FROM)
      addEffect({ type: "sword_swing", gridX: monster.position.x, gridY: monster.position.y, targetX: char.position.x, targetY: char.position.y });
    } else if (isRanged) {
      addEffect({ type: "arrow", gridX: char.position.x, gridY: char.position.y, targetX: monster.position.x, targetY: monster.position.y });
      // Small impact burst at monster after arrow lands
      setTimeout(() => addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y }), 320);
    }

    let newHp = monster.hp;
    if (total >= monster.ac) {
      const isSurprise = !monster.alerted;
      const dieRoll = rollDice(weapon.damage ?? "1d4");
      // DnD: melee adds STR mod, ranged adds DEX mod to damage
      const dmgMod = isRanged ? getMod(char.stats.dex) : getMod(char.stats.str);
      const withMod = Math.max(1, dieRoll + dmgMod);
      const finalDmg = isSurprise ? withMod * 2 : withMod;
      newHp = Math.max(0, monster.hp - finalDmg);
      const dmgLabel = `${weapon.damage}${dmgMod >= 0 ? "+" : ""}${dmgMod}`;

      addDiceRoll({ type: "damage", value: dieRoll, total: finalDmg, mod: dmgMod, max: dieRoll, label: dmgLabel });

      if (isSurprise) {
        log.push(`  💥 SURPRISE! ×2 dmg! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]×2=${finalDmg} → ${newHp}/${monster.maxHp} HP`);
        addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: `×2! ${finalDmg}` });
      } else {
        log.push(`  Hit! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]=${finalDmg} dmg → ${newHp}/${monster.maxHp} HP`);
        addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: String(finalDmg) });
      }
      if (newHp === 0) log.push(`  ${monster.name} destroyed!`);
      // Slash effect at monster + shake
      setTimeout(() => {
        addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y });
        addHit(monsterId);
      }, 180);
    } else {
      log.push(`  Miss!`);
      addEffect({ type: "miss", gridX: monster.position.x, gridY: monster.position.y, value: "MISS" });
    }
    setGs(prev => ({ ...prev, dungeonMonsters: prev.dungeonMonsters.map(m => m.id === monsterId ? { ...m, hp: newHp, alerted: true } : m) }));
    if (newHp <= 0) {
      setDyingMonsters(prev => new Set([...prev, monsterId]));
      setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(monsterId); return s; }), 1000);
    }
    setCombat(prev => ({ ...prev, actionUsed: true, log }));
    setCombatMode("none");
  }

  function revealFog(pos: { x: number; y: number }) {
    setFogRevealed(prev => {
      const next = new Set(prev);
      for (let dy = -SIGHT; dy <= SIGHT; dy++)
        for (let dx = -SIGHT; dx <= SIGHT; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
            const fx = pos.x + dx, fy = pos.y + dy;
            if (fx >= 0 && fx < COLS && fy >= 0 && fy < ROWS) next.add(`${fx},${fy}`);
          }
        }
      return next;
    });
  }

  // ── MOVEMENT ──

  function handleTileClick(x: number, y: number) {
    if (!char || specialDialog) return; // block movement while dialog is open

    // Combat movement mode
    if (combat.active && combatMode === "move") {
      const d = dist(char.position, { x, y });
      const rem = MOVE_SQUARES - combat.movedSquares;
      if (d > rem) { notify(`Can only move ${rem * 5}ft more this turn.`); return; }
      updateChar(char.id, { position: { x, y } });
      if (screen === "dungeon") revealFog({ x, y });
      setCombat(prev => ({ ...prev, movedSquares: prev.movedSquares + d }));
      if (d >= rem) setCombatMode("none");
      return;
    }
    if (combat.active) return;

    // Check for special tile
    const key = `${x},${y}`;
    if (screen === "town") {
      const special = TOWN_SPECIAL[key];
      if (special) { setSpecialDialog({ x, y, tile: special }); return; }
    }
    if (screen === "dungeon") {
      if (x === DUNGEON_ENTER.x && y === DUNGEON_ENTER.y) {
        setSpecialDialog({ x, y, tile: { label: "Exit Dungeon", type: "exit", icon: "⬆️", prompt: "Leave the dungeon via the entrance?", color: "#1a5a1a" } });
        return;
      }
      if (x === DUNGEON_EXIT.x && y === DUNGEON_EXIT.y) {
        setSpecialDialog({ x, y, tile: { label: "Dungeon Exit", type: "exit", icon: "🚪", prompt: "Leave the dungeon and return to the World Map?", color: "#1a5a1a" } });
        return;
      }
      revealFog({ x, y });
    }

    // Normal tile — move directly
    updateChar(char.id, { position: { x, y } });
  }

  // Keyboard movement (WASD / Arrows)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((screen !== "town" && screen !== "dungeon") || !char || specialDialog) return;

      let dx = 0, dy = 0;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") dy = -1;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") dy = 1;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") dx = -1;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") dx = 1;

      if (dx === 0 && dy === 0) return;

      if (combat.active) {
        if (combat.turnOrder[combat.currentIndex]?.id !== char.id) return;
        if (combatMode !== "move") {
          setCombatMode("move");
          return;
        }
      }

      const newX = Math.max(0, Math.min(COLS - 1, char.position.x + dx));
      const newY = Math.max(0, Math.min(ROWS - 1, char.position.y + dy));

      if (newX === char.position.x && newY === char.position.y) return;
      handleTileClick(newX, newY);
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, char, specialDialog, combat.active, combat.turnOrder, combat.currentIndex, combatMode]);

  function handleSpecialYes() {
    if (!char || !specialDialog) return;
    const { tile, x, y } = specialDialog;
    setSpecialDialog(null);

    if (tile.type === "exit") {
      setScreen("worldMap");
      updateChar(char.id, { position: { x: 10, y: 7 }, currentMap: "town" });
    } else if (tile.type === "shop") {
      updateChar(char.id, { position: { x, y } });
      setShowShop(true);
    } else if (tile.type === "quest") {
      updateChar(char.id, { position: { x, y } });
      setShowQuests(true);
    }
  }

  // ── ITEM / EQUIP ──

  function handleEquipItem(item: Item) {
    if (!char) return;
    updateChar(char.id, c => {
      const newInv = c.inventory.filter(i => i.id !== item.id);
      let eq = { ...c.equipment };
      if (item.type === "weapon") { const old = eq.weapon; eq.weapon = item; if (old) newInv.push(old); }
      else if (item.type === "armor") { const old = eq.armor; eq.armor = item; if (old) newInv.push(old); }
      else if (item.type === "accessory") {
        const idx = eq.accessories.findIndex(a => a === null);
        const i = idx >= 0 ? idx : 0;
        const old = eq.accessories[i];
        const newAcc: [Item | null, Item | null, Item | null] = [...eq.accessories] as [Item | null, Item | null, Item | null];
        newAcc[i] = item; eq.accessories = newAcc;
        if (old) newInv.push(old);
      }
      const updated = { ...c, inventory: newInv, equipment: eq };
      updated.ac = calcAC(updated); return updated;
    });
  }
  function handleUnequipWeapon() { if (!char?.equipment.weapon) return; const w = char.equipment.weapon; updateChar(char.id, c => ({ inventory: [...c.inventory, w], equipment: { ...c.equipment, weapon: null } })); }
  function handleUnequipArmor() {
    if (!char?.equipment.armor) return; const a = char.equipment.armor;
    updateChar(char.id, c => { const u = { ...c, inventory: [...c.inventory, a], equipment: { ...c.equipment, armor: null } }; u.ac = calcAC(u); return u; });
  }
  function handleUnequipAcc(i: number) {
    if (!char || !char.equipment.accessories[i]) return; const acc = char.equipment.accessories[i]!;
    updateChar(char.id, c => {
      const na: [Item | null, Item | null, Item | null] = [...c.equipment.accessories] as [Item | null, Item | null, Item | null]; na[i] = null;
      const u = { ...c, inventory: [...c.inventory, acc], equipment: { ...c.equipment, accessories: na } }; u.ac = calcAC(u); return u;
    });
  }
  function handleDropItem(id: string) { if (!char) return; updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== id) })); notify("Item dropped."); }
  function handleUseItem(item: Item) {
    if (!char) return;
    if (item.effect === "heal" && item.healAmount) {
      const healed = rollDice(item.healAmount);
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed), inventory: c.inventory.filter(i => i.id !== item.id) }));
      notify(`🧪 ${item.name}: +${healed} HP!`);
    } else if (item.effect === "aoe_bomb") {
      // Bombs use AOE targeting — enter spell mode so the map shows the circle
      setCombatMode("spell");
      setSelectedSpell("Small Bomb");
      setPendingBombItemId(item.id);
      notify("💣 Bomb ready — select target area on the map. Click Cancel to abort.");
    } else {
      notify(`Used ${item.name}.`);
      updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== item.id) }));
    }
  }
  function handleBuyItem(item: Item) {
    if (!char || char.gold < item.value) return;
    updateChar(char.id, c => ({ gold: c.gold - item.value, inventory: [...c.inventory, { ...item, id: gid() }] }));
    notify(`Bought ${item.name} for ${item.value}g`);
    setShopPurchaseAnim(item.name);
    setTimeout(() => setShopPurchaseAnim(null), 1200);
  }
  function handleAcceptQuest(qid: string) {
    if (!gs.party) { notify("Join or create a party first!"); return; }
    if (gs.party.questIds.length >= 2) { notify("Party already has 2 active quests."); return; }
    const q = gs.availableQuests.find(q => q.id === qid); if (!q) return;
    setGs(prev => ({ ...prev, availableQuests: prev.availableQuests.filter(q => q.id !== qid), partyQuests: [...prev.partyQuests, q], party: prev.party ? { ...prev.party, questIds: [...prev.party.questIds, qid] } : null }));
    notify(`Quest accepted: ${q.title}`);
  }
  function handleQuestClaim(questId: string) {
    if (!char) return;
    const q = gs.partyQuests.find(pq => pq.id === questId);
    if (!q) return;

    // Handle gather quests (branch collection etc.)
    if (q.gatherTarget) {
      const { itemName, count } = q.gatherTarget;
      const currentChar = gs.characters[char.id];
      const matchingItems = currentChar.inventory.filter(i => i.name === itemName);
      if (matchingItems.length < count) {
        notify(`Need ${count} ${itemName} (have ${matchingItems.length}). Collect more!`);
        return;
      }
      // Remove items and give rewards
      let removed = 0;
      updateChar(char.id, c => ({
        inventory: c.inventory.filter(i => {
          if (i.name === itemName && removed < count) { removed++; return false; }
          return true;
        }),
        exp: c.exp + q.reward.exp,
        gold: c.gold + q.reward.gold,
      }));
      setGs(prev => ({
        ...prev,
        partyQuests: prev.partyQuests.filter(pq => pq.id !== questId),
        party: prev.party ? { ...prev.party, questIds: prev.party.questIds.filter(id => id !== questId) } : null,
      }));
      notify(`✅ Quest Complete! +${q.reward.exp} EXP, +${q.reward.gold} gold`);
      return;
    }

    if (!q.readyToTurnIn && !q.completed) return;
    updateChar(char.id, ch => ({ exp: ch.exp + q.reward.exp, gold: ch.gold + q.reward.gold }));
    setGs(prev => ({
      ...prev,
      partyQuests: prev.partyQuests.filter(pq => pq.id !== questId),
      party: prev.party ? { ...prev.party, questIds: prev.party.questIds.filter(id => id !== questId) } : null,
    }));
    notify(`✅ Reward claimed: +${q.reward.exp} EXP, +${q.reward.gold} gold!`);
  }
  function handleSendChat(text: string, ch: "global" | "party") {
    if (!char) return;
    const msg = { id: gid(), sender: char.name, text, time: tnow() };
    if (ch === "global") setGs(prev => ({ ...prev, globalChat: [...prev.globalChat.slice(-49), msg] }));
    else setGs(prev => ({ ...prev, partyChat: [...prev.partyChat.slice(-49), msg] }));
  }
  function handleCreateParty(name: string) {
    if (!char) return;
    setGs(prev => ({ ...prev, party: { name, leaderId: char.id, memberIds: [char.id], questIds: [] } }));
    notify(`Party "${name}" created!`);
  }
  function handleLeaveParty() { setGs(prev => ({ ...prev, party: null, partyQuests: [] })); notify("Left party."); }

  function handleUseSkillFromHUD(spellName: string) {
    if (!char) return;
    if (spellName === "Second Wind") {
      const healed = rollDice("1d10") + char.level;
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
      notify(`⚔️ Second Wind! +${healed} HP`);
      return;
    }
    if (spellName === "Hunter's Mark") {
      notify("Hunter's Mark: Your next attack deals +1d6 damage.");
      return;
    }
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const spell = allSpells.find(s => s.name === spellName);
    if (!spell) return;

    if (spell.type === "heal" || (spell.type === "cantrip" && spell.heal)) {
      if (combat.active) {
        handleSpellSelect(spellName);
      } else {
        if (spell.level > 0) {
          if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots!"); return; }
          updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));
        }
        const spMod = getSpellcastingMod(char);
        const healed = spell.heal === "5" ? 5 : rollDice(spell.heal ?? "1d4") + spMod;
        updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
        addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
        notify(`✨ ${spell.name}: +${healed} HP`);
      }
      return;
    }

    // Attack spells: block in town safe zone
    if (screen === "town") { notify("Cannot use attack spells in a safe zone."); return; }
    // In combat or dungeon: enter targeting mode
    handleSpellSelect(spellName);
    if (!combat.active) {
      notify(`${spellName} ready — select a target on the map!`);
    }
  }

  // ── NAVIGATION ──

  function handleLogin(u: string, ids: string[], newGs: GameState) { setGs(newGs); setSession({ username: u, charIds: ids }); setScreen("charSelect"); }
  function handleSelectChar(id: string) { setActiveCharId(id); setScreen("worldMap"); }
  function handleCreateChar(c: Character) {
    setGs(prev => {
      const newChars = { ...prev.characters, [c.id]: c };
      const newAccs = prev.accounts.map(a => a.username === session?.username ? { ...a, charIds: [...a.charIds, c.id] } : a);
      return { ...prev, characters: newChars, accounts: newAccs };
    });
    setSession(prev => prev ? { ...prev, charIds: [...prev.charIds, c.id] } : null);
    setCreatingChar(false); setActiveCharId(c.id); setScreen("worldMap");
  }
  function handleLogout() { setSession(null); setActiveCharId(null); setScreen("auth"); setCombat(INIT_COMBAT); }
  function enterTown() { if (!char) return; updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" }); setScreen("town"); setCombat(INIT_COMBAT); }
  function enterDungeon() {
    if (!char) return;
    updateChar(char.id, { position: DUNGEON_ENTER, currentMap: "dungeon" }); setScreen("dungeon"); setCombat(INIT_COMBAT);
    setFogRevealed(new Set([`${DUNGEON_ENTER.x},${DUNGEON_ENTER.y}`, `${DUNGEON_ENTER.x},${DUNGEON_ENTER.y - 1}`, `${DUNGEON_ENTER.x - 1},${DUNGEON_ENTER.y}`]));
    setGs(prev => ({ ...prev, dungeonMonsters: genMonsters() }));
    notify("Entered Darkroot Depths. Monsters lurk in the dark...");
  }

  // ── RENDER ──

  if (screen === "auth") return <AuthScreen onLogin={handleLogin} />;
  if (screen === "charSelect") {
    if (creatingChar) return <CharCreateScreen onCreated={handleCreateChar} onBack={() => setCreatingChar(false)} />;
    return <CharSelectScreen session={session!} characters={gs.characters} onSelect={handleSelectChar} onCreateNew={() => setCreatingChar(true)} onLogout={handleLogout} />;
  }
  if (screen === "worldMap" && char) return <WorldMapScreen char={char} onEnterTown={enterTown} onEnterDungeon={enterDungeon} onLogout={handleLogout} />;

  if ((screen === "town" || screen === "dungeon") && char) {
    const cfg = CLASS_CFG[char.class];
    const locationLabel = screen === "town" ? "🏰 MILLHAVEN" : "💀 DARKROOT DEPTHS";

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: NU, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: C.card, borderBottom: `2px solid ${C.border}`, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {screen === "dungeon" ? (
              gs.dungeonMonsters.every(m => m.hp <= 0) ? (
                <button onClick={() => { setScreen("worldMap"); updateChar(char.id, { position: { x: 10, y: 7 }, currentMap: "town" }); }} style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>← MAP</button>
              ) : (
                <span style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>DUNGEON ACTIVE</span>
              )
            ) : (
              <button onClick={() => setScreen("worldMap")} style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>← MAP</button>
            )}
            <div style={{ fontFamily: PX, fontSize: 9, color: C.blue, letterSpacing: 1 }}>{locationLabel}</div>
            {screen === "town" && <span style={{ fontFamily: PX, fontSize: 7, padding: "2px 8px", background: C.green + "20", color: C.green, border: `1px solid ${C.green}40` }}>✅ SAFE ZONE</span>}
            {combat.active && <span style={{ fontFamily: PX, fontSize: 7, padding: "2px 8px", background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, animation: "pulse 1s infinite" }}>⚔️ COMBAT</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Mini portrait */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, overflow: "hidden", border: `2px solid ${cfg.color}`, flexShrink: 0 }}>
                {char.avatar ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: cfg.color + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{cfg.icon}</div>}
              </div>
              <div>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.text }}>{char.name}</div>
                <div style={{ fontFamily: NU, fontSize: 10, color: cfg.color }}>{cfg.icon} {char.class} Lv.{char.level}</div>
              </div>
            </div>
            {/* HP */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Heart className="w-3 h-3" style={{ color: C.red }} />
              <div>
                <div style={{ fontFamily: MO, fontSize: 10, color: C.red }}>{char.hp}/{char.maxHp}</div>
                <div style={{ width: 60 }}><HpBar hp={char.hp} maxHp={char.maxHp} size="sm" /></div>
              </div>
            </div>
            {char.spellSlots && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Zap className="w-3 h-3" style={{ color: C.purple }} />
                <span style={{ fontFamily: MO, fontSize: 10, color: C.purple }}>{char.spellSlots.max - char.spellSlots.used}/{char.spellSlots.max}</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Shield className="w-3 h-3" style={{ color: C.blue }} />
              <span style={{ fontFamily: MO, fontSize: 10, color: C.blue }}>{char.ac}</span>
            </div>
            <GoldBadge amount={char.gold} />
          </div>
        </div>

        {/* Map area - Camera Follow Mode */}
        <div 
          onWheel={(e) => {
            if (e.deltaY < 0) setZoom(z => Math.min(2.5, z + 0.1));
            else setZoom(z => Math.max(0.6, z - 0.1));
          }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", background: screen === "dungeon" ? "#040310" : "#080e04" }}>
          {/* Zoom in slightly and translate map inversely to player position to keep player centered */}
          {(() => {
             const mapScale = zoom;
             const charX = char.position.x * 38 + 19; // 38 is CELL size, 19 is half
             const charY = char.position.y * 38 + 19;
             const centerX = (20 * 38) / 2;
             const centerY = (15 * 38) / 2;
             const offsetX = centerX - charX;
             const offsetY = centerY - charY;
             return (
               <div style={{ 
                 transform: `scale(${mapScale}) translate(${offsetX}px, ${offsetY}px)`, 
                 transformOrigin: "center", 
                 transition: "transform 0.15s linear" 
               }}>
                 <div style={{ position: "relative" }}>
                   <MapGrid mode={screen} char={char} monsters={gs.dungeonMonsters}
                     combat={combat} fogRevealed={fogRevealed} combatMode={combatMode}
                     selectedSpell={selectedSpell ?? undefined}
                     onTileClick={handleTileClick} onMonsterClick={handleMonsterClick}
                     onAOECast={handleAOECastFromGrid}
                     effects={effects}
                     dyingMonsters={dyingMonsters}
                     hitTokenIds={hitTokenIds}
                     onHealSelf={handleHealSelf} />
                 </div>
               </div>
             );
          })()}


              {/* Combat panel */}
              {combat.active && (
                <CombatPanel combat={combat} char={char} monsters={gs.dungeonMonsters}
                  combatMode={combatMode} setCombatMode={setCombatMode}
                  selectedSpell={selectedSpell ?? undefined}
                  onEndTurn={endPlayerTurn} onSelectSpell={handleSpellSelect}
                  onFlee={() => { setCombat(INIT_COMBAT); setCombatMode("none"); setSelectedSpell(null); notify("Fled from combat!"); }} />
              )}

              {/* Rest buttons (out of combat, has used slots) */}
              {!combat.active && char.spellSlots && char.spellSlots.used > 0 && (
                <div style={{ position: "absolute", top: 4, left: 4, display: "flex", gap: 6, alignItems: "center" }}>
                  <style>{`
                    @keyframes rest-pulse { 0%,100%{box-shadow:0 0 8px rgba(76,219,112,0.3)} 50%{box-shadow:0 0 16px rgba(76,219,112,0.7)} }
                    @keyframes engage-burst { 0%{transform:scale(0) rotate(-180deg);opacity:0} 55%{transform:scale(1.15) rotate(4deg);opacity:1} 75%{transform:scale(0.96)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
                    @keyframes engage-aura { 0%,100%{box-shadow:0 0 8px #f44336,0 0 16px #c0392b40} 50%{box-shadow:0 0 14px #f44336,0 0 28px #c0392b70} }
                  `}</style>
                  <button onClick={() => {
                    updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: Math.max(0, c.spellSlots!.used - 1) } }));
                    notify("Short rest: 1 slot recovered.");
                    setRestAnim("short"); setTimeout(() => setRestAnim(null), 600);
                  }}
                    style={{
                      ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4,
                      animation: restAnim === "short" ? "rest-pulse 0.6s ease-out" : "none",
                      boxShadow: restAnim === "short" ? "0 0 12px rgba(76,219,112,0.6)" : undefined,
                    }}>
                    <RotateCcw className="w-2.5 h-2.5" />SHORT
                  </button>
                  <button onClick={() => {
                    updateChar(char.id, c => ({ hp: c.maxHp, spellSlots: c.spellSlots ? { ...c.spellSlots, used: 0 } : undefined }));
                    notify("Long rest: Full recovery!");
                    setRestAnim("long"); setTimeout(() => setRestAnim(null), 600);
                  }}
                    style={{
                      ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4,
                      animation: restAnim === "long" ? "rest-pulse 0.6s ease-out" : "none",
                      boxShadow: restAnim === "long" ? "0 0 12px rgba(76,219,112,0.6)" : undefined,
                    }}>
                    <BookOpen className="w-2.5 h-2.5" />LONG
                  </button>
                </div>
              )}

              {/* Engage First button — appears when enemies are nearby (Persona-style) */}
              {screen === "dungeon" && !combat.active && (() => {
                const nearbyM = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(char.position, m.position) <= m.sightRange + 2);
                if (nearbyM.length === 0) return null;
                return (
                  <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
                    <style>{`
                      @keyframes engage-persona-in {
                        0% { transform: translateX(-120px) skewX(-12deg) scaleX(0.3); opacity: 0; }
                        50% { transform: translateX(8px) skewX(-4deg) scaleX(1.05); opacity: 1; }
                        70% { transform: translateX(-2px) skewX(-2deg) scaleX(1); }
                        100% { transform: translateX(0) skewX(0deg) scaleX(1); opacity: 1; }
                      }
                      @keyframes engage-persona-pulse {
                        0%,100% { box-shadow: 0 0 20px rgba(220,30,30,0.7), 0 0 50px rgba(220,30,30,0.3); }
                        50% { box-shadow: 0 0 35px rgba(255,60,60,0.9), 0 0 80px rgba(220,30,30,0.5), inset 0 0 20px rgba(255,100,100,0.15); }
                      }
                    `}</style>
                    <button onClick={() => startCombat(nearbyM.map(m => m.id))}
                      style={{
                        background: "linear-gradient(105deg, #cc0000, #880000)",
                        border: "none",
                        color: "#fff",
                        fontFamily: PX,
                        fontSize: 18,
                        padding: "12px 32px",
                        letterSpacing: 4,
                        clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 100%, 16px 100%)",
                        cursor: "pointer",
                        animation: "engage-persona-in 0.5s cubic-bezier(0.2,0,0,1) forwards, engage-persona-pulse 1.5s 0.5s ease-in-out infinite",
                        textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                      <span style={{ fontSize: 22 }}>⚔</span>
                      ENGAGE!
                    </button>
                  </div>
                );
              })()}

              {/* Cancel targeting mode (outside combat) */}
              {combatMode !== "none" && !combat.active && (
                <div style={{
                  position: "absolute", top: 4, right: 4, zIndex: 25,
                  display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4,
                }}>
                  <div style={{
                    fontFamily: PX, fontSize: 7, color: C.blue, padding: "4px 8px",
                    background: C.card + "ee", border: `1px solid ${C.blue}60`,
                    boxShadow: `0 0 8px ${C.blue}40`,
                  }}>
                    {selectedSpell === "Small Bomb" ? "💣 SELECT BOMB TARGET" : "✨ SELECT SPELL TARGET"}
                  </div>
                  <button onClick={() => { setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null); }}
                    style={{ ...pixelBtn("ghost", true), fontSize: 7 }}>
                    ✕ CANCEL
                  </button>
                </div>
              )}

              {/* Tips */}
              {screen === "town" && !combat.active && (
                <div style={{ position: "absolute", bottom: 4, left: 4, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "4px 8px", fontFamily: NU, fontSize: 10, color: C.muted }}>
                  Click to move · 🏪 Shop · 📋 Quests · 🗺️ Exit
                </div>
              )}
              {screen === "dungeon" && !combat.active && (
                <div style={{ position: "absolute", bottom: 4, left: 4, background: C.card + "cc", border: `1px solid ${C.border}`, padding: "4px 8px", fontFamily: NU, fontSize: 10, color: C.muted }}>
                  🚪 Reach north exit · Avoid monsters or fight!
                </div>
              )}
        </div>

        {/* HUD */}
        <BottomHUD char={char} hudTab={hudTab} setHudTab={setHudTab} hudOpen={hudOpen} setHudOpen={setHudOpen}
          chatTab={chatTab} setChatTab={setChatTab} globalChat={gs.globalChat} partyChat={gs.partyChat}
          onSendChat={handleSendChat} onEquipItem={handleEquipItem} onUnequipWeapon={handleUnequipWeapon}
          onUnequipArmor={handleUnequipArmor} onUnequipAcc={handleUnequipAcc}
          onDropItem={handleDropItem} onUseItem={handleUseItem}
          party={gs.party} onCreateParty={handleCreateParty} onLeaveParty={handleLeaveParty} partyQuests={gs.partyQuests}
          onUseSkill={handleUseSkillFromHUD}
          inCombat={combat.active} />

        {/* Modals */}
        {showShop && <ShopModal char={char} onBuy={handleBuyItem} onClose={() => setShowShop(false)} />}
        {showQuests && <QuestModal quests={gs.availableQuests} partyQuests={gs.partyQuests} party={gs.party} onAccept={handleAcceptQuest} onClose={() => setShowQuests(false)} nextRefresh={gs.questRefreshAt} onClaim={handleQuestClaim} charInventory={char.inventory} />}

        {/* ★ Centered special tile dialog (blocks movement while open) */}
        {specialDialog && (
          <AnimeDialog
            icon={specialDialog.tile.icon}
            title={specialDialog.tile.label.toUpperCase()}
            message={specialDialog.tile.prompt}
            onYes={handleSpecialYes}
            onNo={() => setSpecialDialog(null)}
          />
        )}

        {/* Dice roll overlay */}
        <DiceRollOverlay rolls={diceRolls} />

        {/* Toast notification */}
        {notification && (
          <div style={{
            position: "fixed", bottom: 120, left: "50%", transform: "translateX(-50%)",
            zIndex: 9990, background: C.card, border: `2px solid ${C.blue}`,
            boxShadow: C.glowStrong, padding: "10px 20px",
            fontFamily: PX, fontSize: 8, color: C.text, letterSpacing: 0.5,
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            {notification}
          </div>
        )}

        {/* battleBanner COMBAT! overlay removed — battleStart (BATTLE START!) is used instead */}

        {/* Shop purchase flash */}
        {shopPurchaseAnim && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9994, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <style>{`@keyframes shop-flash { 0%{opacity:0;transform:scale(0.5) translateY(20px)} 20%{opacity:1;transform:scale(1.1) translateY(0)} 70%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.9) translateY(-10px)} }`}</style>
            <div style={{
              fontFamily: PX, fontSize: 14, color: C.gold,
              textShadow: `0 0 20px ${C.gold}, 2px 2px 0 #000`,
              animation: "shop-flash 1.2s ease-out forwards",
              background: C.card, border: `2px solid ${C.gold}`,
              padding: "12px 24px",
              boxShadow: `0 0 30px ${C.gold}50`,
            }}>⭐ PURCHASED: {shopPurchaseAnim}</div>
          </div>
        )}

        {/* BATTLE START animation overlay */}
        {battleStart && (
          <>
            <style>{`
              @keyframes epic-flash { 0%{background:rgba(255,255,255,0.85)} 15%{background:rgba(0,0,0,0.85)} 100%{background:rgba(0,0,0,0)} }
              @keyframes epic-shake { 0%,100%{transform:translate(0,0)} 10%,30%,50%,70%,90%{transform:translate(-10px, 8px)} 20%,40%,60%,80%{transform:translate(10px, -8px)} }
              @keyframes epic-fly-left { 
                0%{transform:translateX(-100vw) scale(1.5);opacity:0;filter:blur(10px)} 
                20%{transform:translateX(10px) scale(1);opacity:1;filter:blur(0);text-shadow:0 0 100px red, 8px 8px 0 #000} 
                25%{transform:translateX(0) scale(1.1)} 
                80%{transform:translateX(0) scale(1);opacity:1} 
                100%{transform:translateX(-100vw) scale(0.5);opacity:0;filter:blur(5px)} 
              }
              @keyframes epic-fly-right { 
                0%{transform:translateX(100vw) scale(1.5);opacity:0;filter:blur(10px)} 
                20%{transform:translateX(-10px) scale(1);opacity:1;filter:blur(0);text-shadow:0 0 100px red, 8px 8px 0 #000} 
                25%{transform:translateX(0) scale(1.1)} 
                80%{transform:translateX(0) scale(1);opacity:1} 
                100%{transform:translateX(100vw) scale(0.5);opacity:0;filter:blur(5px)} 
              }
            `}</style>
            <div style={{
              position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none", animation: "epic-flash 1.8s ease-out forwards",
            }}>
              <div style={{ animation: "epic-shake 0.5s ease-in-out", display: "flex", gap: 16 }}>
                <div style={{
                  fontFamily: PX, fontSize: 64, color: "#fff", fontStyle: "italic", letterSpacing: 8,
                  textShadow: `0 0 50px ${C.red}, 0 0 80px #800000, 6px 6px 0 #000, -3px -3px 0 #000`,
                  animation: "epic-fly-left 1.8s cubic-bezier(0.1, 0, 0.2, 1) forwards",
                  whiteSpace: "nowrap",
                }}>
                  ⚔ BATTLE
                </div>
                <div style={{
                  fontFamily: PX, fontSize: 64, color: "#fff", fontStyle: "italic", letterSpacing: 8,
                  textShadow: `0 0 50px ${C.red}, 0 0 80px #800000, 6px 6px 0 #000, -3px -3px 0 #000`,
                  animation: "epic-fly-right 1.8s cubic-bezier(0.1, 0, 0.2, 1) forwards",
                  whiteSpace: "nowrap",
                }}>
                  START! ⚔
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
