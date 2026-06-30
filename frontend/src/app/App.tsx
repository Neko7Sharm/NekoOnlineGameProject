import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
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
type HudTab = "char" | "inv" | "equip" | "acc" | "chat" | "party";
type CombatModeT = "none" | "move" | "attack" | "spell";

interface Stats { str: number; dex: number; con: number; int: number; wis: number; cha: number }
interface Item {
  id: string; name: string; type: ItemType; description: string; value: number;
  damage?: string; damageType?: string; range?: number;
  ac?: number; healAmount?: string; effect?: string; stat?: keyof Stats; bonus?: number;
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
  type: "slash" | "scratch" | "fire_bolt" | "magic_missile" | "sacred_flame" | "thunder" | "fire_aoe" | "smite" | "heal" | "miss" | "number";
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
  reward: { exp: number; gold: number };
  completed?: boolean;
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
  { name: "Sleep", aoe: true, aoeRadius: 4, desc: "Magical slumber in 20ft area. CON save DC 13 or incapacitated." },
  { name: "Thunderwave", aoe: true, aoeRadius: 3, desc: "15ft thunder burst. DEX save DC 13 or 2d8 thunder + push." },
  { name: "Burning Hands", aoe: true, aoeRadius: 3, desc: "15ft fire cone. DEX save DC 13 or 3d6 fire damage." },
];

const BRANCH_ITEM: Omit<Item, "id"> = {
  name: "Branch", type: "consumable", value: 1,
  description: "A rough wooden branch. Dropped by training dummies.",
};

// DiceBear pixel-art avatar presets (anime pixel style)
const PIXEL_AVATARS = [
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=warrior&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=mage&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=ranger&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=cleric&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=paladin&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=rogue&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=bard&backgroundColor=1a1a2e&scale=85",
  "https://api.dicebear.com/8.x/pixel-art/svg?seed=druid&backgroundColor=1a1a2e&scale=85",
];

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
];

const QUEST_TEMPLATES = [
  { title: "Pest Control", desc: "Clear {n} Wooden Dummies from the dungeon.", n: 3, exp: 60, gold: 15 },
  { title: "Training Exercise", desc: "Destroy {n} training dummies.", n: 5, exp: 100, gold: 25 },
  { title: "Quick Skirmish", desc: "Defeat {n} Wooden Dummies.", n: 2, exp: 40, gold: 10 },
  { title: "Dungeon Sweep", desc: "Eliminate {n} Wooden Dummies.", n: 4, exp: 80, gold: 20 },
  { title: "The Big Cull", desc: "Slay {n} Wooden Dummies for a bounty.", n: 6, exp: 120, gold: 30 },
  { title: "Rookie Hunt", desc: "Kill {n} Wooden Dummies to prove worth.", n: 2, exp: 40, gold: 12 },
  { title: "Exterminator", desc: "Wipe out {n} Wooden Dummies below.", n: 5, exp: 95, gold: 22 },
  { title: "Combat Trial", desc: "Face and destroy {n} Wooden Dummies.", n: 3, exp: 65, gold: 16 },
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
  const stats = customStats ?? { ...cfg.stats };
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
  return [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, n).map(t => ({
    id: gid(), title: t.title, description: t.desc.replace("{n}", String(t.n)),
    killTarget: { monster: "Wooden Dummy", count: t.n, current: 0 },
    reward: { exp: t.exp, gold: t.gold },
  }));
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
                const val = customStats[stat];
                const mod = getMod(val);
                const desc = STAT_DESCRIPTIONS[stat];
                return (
                  <div key={stat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: C.card2, border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: MO, fontSize: 10, color: C.text, textTransform: "uppercase", marginBottom: 2 }}>{desc.label}</div>
                      <div style={{ fontFamily: NU, fontSize: 10, color: C.muted }}>{desc.effect}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => adjustStat(stat, -1)} disabled={val <= 8}
                        style={{ ...pixelBtn("ghost", true), padding: "4px 8px", opacity: val <= 8 ? 0.4 : 1, fontFamily: MO, fontSize: 12 }}>−</button>
                      <div style={{ textAlign: "center", minWidth: 48 }}>
                        <div style={{ fontFamily: MO, fontSize: 14, color: C.blue, fontWeight: 700 }}>{val}</div>
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
                    <div style={{ fontFamily: MO, fontSize: 9, color: sel ? C.blue : C.text, marginBottom: 2 }}>{prof.name}</div>
                    <div style={{ fontFamily: NU, fontSize: 9, color: C.muted }}>{prof.stat.toUpperCase()} · {prof.effect.split("—")[1]?.trim() ?? ""}</div>
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
  effects: VisualEffect[];
  aoeHoverTile?: { x: number; y: number } | null;
  onAOEHover?: (tile: { x: number; y: number } | null) => void;
  onAOEClick?: (x: number, y: number) => void;
  dyingMonsters?: Set<string>;
}

function MapGrid({ mode, char, monsters, combat, fogRevealed, combatMode, selectedSpell, onTileClick, onMonsterClick, effects, aoeHoverTile, onAOEHover, onAOEClick, dyingMonsters }: MapGridProps) {
  const pos = char.position;
  const [hoveredMonsterId, setHoveredMonsterId] = useState<string | null>(null);

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
  if (combat.active && combatMode === "spell" && selectedSpell) {
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const wizChoices = char.class === "Wizard" ? WIZARD_SPELL_CHOICES.map(s => ({ name: s.name, range: 30 })) : [];
    const spell = [...allSpells, ...wizChoices].find((s: { name: string }) => s.name === selectedSpell) as { name: string; range?: number } | undefined;
    if (spell) {
      const rangeSquares = Math.ceil(((spell.range ?? 5)) / 5);
      monsters.filter(m => m.hp > 0).forEach(m => {
        if (dist(pos, m.position) <= rangeSquares) spellableM.add(m.id);
      });
    }
  }

  // Compute AOE area tiles
  const aoeTiles = new Set<string>();
  const aoeHitMonsters = new Set<string>();
  const isAoeSpell = selectedSpell && WIZARD_SPELL_CHOICES.some(s => s.name === selectedSpell);
  if (isAoeSpell && aoeHoverTile && combatMode === "spell") {
    const aoeSpell = WIZARD_SPELL_CHOICES.find(s => s.name === selectedSpell);
    const aoeR = aoeSpell?.aoeRadius ?? 3;
    for (let dy2 = -aoeR; dy2 <= aoeR; dy2++)
      for (let dx2 = -aoeR; dx2 <= aoeR; dx2++) {
        if (Math.abs(dx2) + Math.abs(dy2) <= aoeR) {
          const tx = aoeHoverTile.x + dx2, ty = aoeHoverTile.y + dy2;
          if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) aoeTiles.add(`${tx},${ty}`);
        }
      }
    monsters.filter(m => m.hp > 0).forEach(m => {
      if (dist(aoeHoverTile, m.position) <= (WIZARD_SPELL_CHOICES.find(s => s.name === selectedSpell)?.aoeRadius ?? 3)) aoeHitMonsters.add(m.id);
    });
  }

  return (
    <>
      <style>{`
        @keyframes dnd-slash { 0%{opacity:0;transform:scale(0.3) rotate(-25deg)} 30%{opacity:1;transform:scale(1) rotate(-25deg)} 100%{opacity:0;transform:scale(1.6) rotate(-25deg)} }
        @keyframes dnd-float-up { 0%{opacity:1;transform:translateY(0)} 60%{opacity:1;transform:translateY(-22px)} 100%{opacity:0;transform:translateY(-44px)} }
        @keyframes dnd-fireball { 0%{opacity:0;transform:scale(0)} 35%{opacity:1;transform:scale(1.1)} 100%{opacity:0;transform:scale(2)} }
        @keyframes dnd-pulse-ring { 0%{opacity:0.9;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.5)} }
        @keyframes dnd-dissolve { 0%{opacity:1;filter:none;transform:scale(1)} 30%{opacity:0.8;filter:blur(0px) brightness(2);transform:scale(1.1)} 60%{opacity:0.4;filter:blur(2px) brightness(3);transform:scale(1.3)} 100%{opacity:0;filter:blur(6px) brightness(0);transform:scale(0.2)} }
        @keyframes dnd-aoe-pulse { 0%{opacity:0.3} 100%{opacity:0.7} }
      `}</style>
      <div style={{ position: "relative", width: COLS * CELL, height: ROWS * CELL, imageRendering: "pixelated" }}>
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

            return (
              <div key={key}
                onClick={() => {
                  if (!td.isWall && !isFogged) {
                    if (isAoeSpell && combatMode === "spell") { onAOEClick?.(x, y); }
                    else { onTileClick(x, y); }
                  }
                }}
                onMouseEnter={() => isAoeSpell && onAOEHover?.({ x, y })}
                onMouseLeave={() => isAoeSpell && onAOEHover?.(null)}
                style={{
                  position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                  background: isFogged ? "#000" : bg,
                  opacity: isDimmed ? 0.4 : 1,
                  cursor: td.isWall || isFogged ? "default" : "pointer",
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
                {aoeTiles.has(key) && !isFogged && (
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "rgba(255, 60, 60, 0.25)",
                    animation: "dnd-aoe-pulse 0.6s ease-in-out infinite alternate",
                    border: "1px solid rgba(255, 80, 80, 0.5)",
                  }} />
                )}
              </div>
            );
          })
        )}

        {/* Monster tokens */}
        {monsters.filter(m => m.hp > 0).map(m => {
          const key = `${m.position.x},${m.position.y}`;
          if (mode === "dungeon" && !visible.has(key)) return null;
          const isAttackable = attackableM.has(m.id);
          const isSpellable = spellableM.has(m.id);
          const isAoeTarget = aoeHitMonsters.has(m.id);
          const isHovered = hoveredMonsterId === m.id;
          const isCurrentTurn = combat.active && combat.turnOrder[combat.currentIndex]?.id === m.id;
          const isTargetable = isAttackable || isSpellable;

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
              onClick={() => {
                if (isAoeTarget && combatMode === "spell" && isAoeSpell) { onMonsterClick(m.id); }
                else if (isTargetable) { onMonsterClick(m.id); }
              }}
              onMouseEnter={() => setHoveredMonsterId(m.id)}
              onMouseLeave={() => setHoveredMonsterId(null)}
              style={{
                position: "absolute",
                left: m.position.x * CELL + 3, top: m.position.y * CELL + 3,
                width: CELL - 6, height: CELL - 6,
                background: isCurrentTurn ? "#5a1010" : "#3a0a0a",
                border: `2px solid ${isTargetable || isAoeTarget ? C.red : isCurrentTurn ? "#ff8888" : "#8b1a1a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isTargetable || isAoeTarget ? "crosshair" : "default",
                boxShadow: isTargetable || isAoeTarget ? `0 0 10px ${C.red}` : "none",
                fontSize: 16, imageRendering: "pixelated",
              }}>
              🪵
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#0a0a0a" }}>
                <div style={{ height: "100%", width: `${(m.hp / m.maxHp) * 100}%`, background: C.red }} />
              </div>
              {/* Spell targeting ring */}
              {(isSpellable || isAoeTarget) && isHovered && (
                <div style={{
                  position: "absolute", inset: -4, border: `3px solid ${C.red}`,
                  borderRadius: "50%", pointerEvents: "none",
                  animation: "dnd-pulse-ring 0.7s ease-out infinite",
                }} />
              )}
            </div>
          );
        })}

        {/* Player token */}
        <div style={{
          position: "absolute",
          left: pos.x * CELL + 3, top: pos.y * CELL + 3,
          width: CELL - 6, height: CELL - 6,
          background: CLASS_CFG[char.class].color + "cc",
          border: `2px solid ${CLASS_CFG[char.class].color}`,
          boxShadow: `0 0 10px ${CLASS_CFG[char.class].color}70`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, zIndex: 10, overflow: "hidden",
          transition: "left 0.15s, top 0.15s",
        }}>
          {char.avatar
            ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : CLASS_CFG[char.class].icon
          }
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
    const iv = setInterval(() => setTick(t => t + 1), 65);
    return () => clearInterval(iv);
  }, [rolls]);

  if (rolls.length === 0) return null;
  const COLORS: Record<DiceRollDisplay["type"], { bg: string; border: string; col: string; label: string }> = {
    hit:    { bg: "#0a1a3a", border: C.blue,     col: C.blue,     label: "HIT ROLL" },
    save:   { bg: "#0a2a0a", border: "#4cdb70",  col: "#4cdb70",  label: "SAVE ROLL" },
    damage: { bg: "#2a0a00", border: "#ff8c00",  col: "#ff8c00",  label: "DAMAGE" },
  };

  return (
    <>
      <style>{`
        @keyframes dnd-dice-in { 0%{opacity:0;transform:translateY(-50px) rotate(-180deg) scale(0.3)} 60%{opacity:1;transform:translateY(6px) rotate(12deg) scale(1.08)} 80%{transform:translateY(-3px) rotate(-4deg) scale(0.96)} 100%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)} }
        @keyframes dnd-dice-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.6) translateY(-18px)} }
        @keyframes dnd-dice-spin { 0%{transform:rotateX(0deg)} 100%{transform:rotateX(360deg)} }
        @keyframes dnd-dice-nums { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
      <div style={{ position: "fixed", top: 74, left: "50%", transform: "translateX(-50%)", zIndex: 9998, display: "flex", gap: 10, pointerEvents: "none" }}>
        {rolls.map(r => {
          const c = COLORS[r.type];
          const spinning = r.phase === "rolling";
          const dispVal = spinning ? ((tick * 13 + r.max * 7) % r.max) + 1 : r.value;
          return (
            <div key={r.id} style={{
              background: c.bg, border: `2px solid ${c.border}`,
              boxShadow: `0 0 18px ${c.border}70, 0 0 36px ${c.border}30`,
              padding: "10px 14px", textAlign: "center", minWidth: 68,
              animation: spinning ? "dnd-dice-in 0.4s cubic-bezier(0.22,1,0.36,1) both" : "none",
              position: "relative",
            }}>
              <PixelCorners color={c.border} size={5} />
              <div style={{ fontFamily: MO, fontSize: 7, color: c.col, letterSpacing: 1, marginBottom: 5, opacity: 0.8 }}>{c.label}</div>
              {/* The number */}
              <div style={{
                fontFamily: PX, fontSize: spinning ? 20 : 26, color: c.col, lineHeight: 1,
                filter: spinning ? "blur(1.5px)" : "none",
                transition: "filter 0.3s, font-size 0.2s",
                animation: spinning ? "dnd-dice-nums 0.12s linear infinite" : "none",
              }}>{dispVal}</div>
              {/* Modifier line */}
              {r.phase === "done" && r.mod !== 0 && (
                <div style={{ fontFamily: MO, fontSize: 7, color: c.col + "80", marginTop: 4 }}>
                  {r.mod > 0 ? `+${r.mod}` : r.mod} = <span style={{ color: c.col }}>{r.total}</span>
                </div>
              )}
              {r.phase === "done" && r.mod === 0 && (
                <div style={{ fontFamily: MO, fontSize: 7, color: c.col + "60", marginTop: 3 }}>{r.label}</div>
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
  const [showLog, setShowLog] = useState(false);
  const [actionTab, setActionTab] = useState<"none" | "attack" | "skill" | "item">("none");
  const [tooltip, setTooltip] = useState<{ name: string; desc: string; y: number } | null>(null);

  // Build spell list using spellChoice for Wizard
  const baseSpells = CLASS_SPELLS[char.class] ?? [];
  const spells = char.class === "Wizard" && char.spellChoice && char.spellChoice !== "Sleep"
    ? baseSpells.map(s => s.name === "Sleep"
        ? { ...s, name: char.spellChoice!, desc: WIZARD_SPELL_CHOICES.find(w => w.name === char.spellChoice)?.desc ?? s.desc }
        : s)
    : baseSpells;

  // Usable items from inventory
  const usableItems = char.inventory.filter(i => i.type === "consumable");

  function handleActionTab(tab: typeof actionTab) {
    setActionTab(prev => prev === tab ? "none" : tab);
    if (tab !== "skill") onSelectSpell(null);
    if (tab !== "attack") setCombatMode("none");
  }

  return (
    <>
      <style>{`
        .cp-btn {
          position: relative; overflow: hidden;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .cp-btn::before {
          content: ''; position: absolute; top: 0; left: -110%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(94,184,255,0.22), transparent);
          pointer-events: none;
          transition: left 0.35s ease;
        }
        .cp-btn:hover::before { left: 150%; }
        .cp-btn:hover { border-color: rgba(94,184,255,0.55) !important; }
        .cp-btn-red:hover { border-color: rgba(244,67,54,0.55) !important; }
        .cp-btn-red::before { background: linear-gradient(90deg, transparent, rgba(244,67,54,0.18), transparent); }
        .cp-btn-gold:hover { border-color: rgba(255,213,79,0.55) !important; }
        .cp-btn-gold::before { background: linear-gradient(90deg, transparent, rgba(255,213,79,0.18), transparent); }
      `}</style>

      <div style={{ position: "absolute", right: 4, top: 4, zIndex: 20, width: 210, display: "flex", flexDirection: "column", gap: 5 }}>

        {/* Turn order */}
        <div style={{ ...panel, padding: "10px 12px", position: "relative" }}>
          <PixelCorners color={isPlayer ? CLASS_CFG[char.class].color : C.red} size={5} />
          <div style={{ fontFamily: PX, fontSize: 7, color: isPlayer ? C.blue : C.red, marginBottom: 8, letterSpacing: 1 }}>
            ⚔ R{combat.round} · {isPlayer ? "YOUR TURN" : "ENEMY"}
          </div>
          <div style={{ maxHeight: 80, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
            {combat.turnOrder.map((t, i) => {
              const dead = t.type === "monster" && monsters.find(m => m.id === t.id)?.hp === 0;
              if (dead) return null;
              const act = i === combat.currentIndex;
              return (
                <div key={t.id + i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px", background: act ? C.blue + "18" : "transparent" }}>
                  <div style={{ width: 6, height: 6, background: t.type === "player" ? CLASS_CFG[char.class].color : C.red, opacity: act ? 1 : 0.4, flexShrink: 0 }} />
                  <span style={{ fontFamily: PX, fontSize: 6, color: act ? C.blue : C.muted + "90", letterSpacing: 0.3, flex: 1 }}>{t.name.slice(0, 11)}</span>
                  <span style={{ fontFamily: MO, fontSize: 7, color: C.muted + "60" }}>{t.initiative}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player actions */}
        {isPlayer && (
          <div style={{ ...panel, padding: "10px 12px", position: "relative" }}>
            <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ACTIONS</div>

            {/* MOVE — always visible */}
            <button className="cp-btn" onClick={() => { setCombatMode(combatMode === "move" ? "none" : "move"); setActionTab("none"); }}
              disabled={moveLeft === 0}
              style={{
                width: "100%", padding: "7px 10px", marginBottom: 4, cursor: moveLeft === 0 ? "not-allowed" : "pointer",
                background: combatMode === "move" ? `linear-gradient(180deg, #1a3a6a, #0a2040)` : C.card2,
                border: `2px solid ${combatMode === "move" ? C.blue : C.border}`,
                color: moveLeft === 0 ? C.muted + "50" : combatMode === "move" ? C.blue : C.text,
                fontFamily: PX, fontSize: 7, textAlign: "left", letterSpacing: 0.5,
                boxShadow: combatMode === "move" ? `0 0 8px ${C.blue}40` : "none",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              ▶ MOVE ({moveLeft * 5}ft left)
            </button>

            {/* ACTION sub-menu toggle buttons */}
            {!combat.actionUsed && (
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[
                  { id: "attack" as const, icon: "⚔", label: "ATTACK", col: C.red },
                  { id: "skill" as const, icon: "✨", label: "SKILL", col: C.purple },
                  { id: "item" as const, icon: "💊", label: "ITEM", col: "#4cdb70" },
                ].map(btn => (
                  <button key={btn.id} className={`cp-btn ${btn.id === "attack" ? "cp-btn-red" : ""}`}
                    onClick={() => handleActionTab(btn.id)}
                    style={{
                      flex: 1, padding: "6px 2px", cursor: "pointer",
                      background: actionTab === btn.id ? btn.col + "25" : C.card2,
                      border: `2px solid ${actionTab === btn.id ? btn.col : C.border}`,
                      color: actionTab === btn.id ? btn.col : C.muted,
                      fontFamily: PX, fontSize: 6, textAlign: "center", letterSpacing: 0.3,
                      boxShadow: actionTab === btn.id ? `0 0 8px ${btn.col}40` : "none",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}>
                    <span style={{ fontSize: 14 }}>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ATTACK sub-panel */}
            {!combat.actionUsed && actionTab === "attack" && char.equipment.weapon && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4, paddingLeft: 4, borderLeft: `2px solid ${C.red}40` }}>
                <div style={{ fontFamily: MO, fontSize: 8, color: C.muted + "80", marginBottom: 2 }}>
                  Select target on map
                </div>
                <button className="cp-btn cp-btn-red"
                  onClick={() => setCombatMode(combatMode === "attack" ? "none" : "attack")}
                  style={{
                    width: "100%", padding: "7px 10px", cursor: "pointer",
                    background: combatMode === "attack" ? `linear-gradient(180deg, #3a0a0a, #1a0505)` : C.card2,
                    border: `2px solid ${combatMode === "attack" ? C.red : C.border}`,
                    color: combatMode === "attack" ? C.red : C.text,
                    fontFamily: PX, fontSize: 7, textAlign: "left", letterSpacing: 0.3,
                    display: "flex", alignItems: "center", gap: 6,
                    boxShadow: combatMode === "attack" ? `0 0 8px ${C.red}40` : "none",
                  }}>
                  ⚔ {char.equipment.weapon.name.slice(0, 14)}
                  <span style={{ fontFamily: MO, fontSize: 8, color: C.muted, marginLeft: "auto" }}>{char.equipment.weapon.damage}</span>
                </button>
              </div>
            )}

            {/* SKILL sub-panel */}
            {!combat.actionUsed && actionTab === "skill" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4, paddingLeft: 4, borderLeft: `2px solid ${C.purple}40`, position: "relative" }}>
                <div style={{ fontFamily: MO, fontSize: 8, color: C.muted + "80", marginBottom: 2 }}>
                  {hasSlots ? `${char.spellSlots!.max - char.spellSlots!.used}/${char.spellSlots!.max} slots` : "Cantrips only"}
                </div>
                {spells.filter(s => s.level === 0 || hasSlots).map((spell, si) => {
                  const isActive = combatMode === "spell" && selectedSpell === spell.name;
                  return (
                    <button key={spell.name} className="cp-btn"
                      onClick={() => onSelectSpell(isActive ? null : spell.name)}
                      onMouseEnter={e => {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setTooltip({ name: spell.name, desc: spell.desc ?? "", y: si });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: "100%", padding: "7px 10px", cursor: "pointer",
                        background: isActive ? `linear-gradient(180deg, #1a0a3a, #0d0520)` : C.card2,
                        border: `2px solid ${isActive ? C.purple : C.border}`,
                        color: isActive ? C.purple : C.text,
                        fontFamily: PX, fontSize: 6, textAlign: "left", letterSpacing: 0.3,
                        boxShadow: isActive ? `0 0 8px ${C.purple}40` : "none",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                      <span>✨</span>
                      <span>{spell.name}</span>
                      {spell.level > 0 && <span style={{ marginLeft: "auto", fontFamily: MO, fontSize: 7, color: C.purple + "80" }}>slot</span>}
                      {spell.level === 0 && <span style={{ marginLeft: "auto", fontFamily: MO, fontSize: 7, color: C.muted }}>∞</span>}
                    </button>
                  );
                })}

                {/* Tooltip */}
                {tooltip && (
                  <div style={{
                    position: "absolute", right: "calc(100% + 8px)", top: 0,
                    background: C.card, border: `2px solid ${C.purple}`,
                    boxShadow: `0 0 18px ${C.purple}50`, padding: "10px 12px",
                    width: 190, zIndex: 100, pointerEvents: "none",
                  }}>
                    <PixelCorners color={C.purple} size={5} />
                    <div style={{ fontFamily: PX, fontSize: 7, color: C.purple, marginBottom: 6 }}>{tooltip.name}</div>
                    <div style={{ fontFamily: NU, fontSize: 11, color: C.text + "cc", lineHeight: 1.5 }}>{tooltip.desc}</div>
                  </div>
                )}
              </div>
            )}

            {/* ITEM sub-panel */}
            {!combat.actionUsed && actionTab === "item" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 4, paddingLeft: 4, borderLeft: `2px solid #4cdb7040` }}>
                {usableItems.length === 0 ? (
                  <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, padding: "4px 6px" }}>No usable items.</div>
                ) : usableItems.map(item => (
                  <button key={item.id} className="cp-btn cp-btn-gold"
                    onClick={() => {/* handled via HUD — emit event to parent */}}
                    style={{
                      width: "100%", padding: "7px 10px", cursor: "pointer",
                      background: C.card2, border: `2px solid ${C.border}`,
                      color: C.text, fontFamily: PX, fontSize: 6, textAlign: "left", letterSpacing: 0.3,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    💊 {item.name.slice(0, 14)}
                    <span style={{ marginLeft: "auto", fontFamily: MO, fontSize: 7, color: C.gold }}>use</span>
                  </button>
                ))}
              </div>
            )}

            {/* Cancel spell */}
            {combatMode === "spell" && (
              <button className="cp-btn cp-btn-red" onClick={() => { onSelectSpell(null); setActionTab("none"); }}
                style={{
                  width: "100%", padding: "5px 10px", marginBottom: 4, cursor: "pointer",
                  background: C.card2, border: `2px solid ${C.red}40`,
                  color: C.red + "90", fontFamily: PX, fontSize: 6, letterSpacing: 0.5,
                }}>✗ CANCEL SPELL</button>
            )}

            <div style={{ height: 1, background: C.border, margin: "2px 0 4px" }} />
            <button className="cp-btn" onClick={onEndTurn}
              style={{
                ...pixelBtn("primary", true), width: "100%", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              ✓ END TURN
            </button>
          </div>
        )}

        <button className="cp-btn" onClick={() => setShowLog(p => !p)} style={{ ...pixelBtn("ghost", true), fontSize: 6 }}>
          {showLog ? "▲ HIDE LOG" : "▼ SHOW LOG"}
        </button>
        <button className="cp-btn cp-btn-red" onClick={onFlee} style={{ ...pixelBtn("ghost", true), fontSize: 6, color: C.red + "80", borderColor: C.red + "30" }}>
          ✗ FLEE
        </button>

        {showLog && (
          <div style={{ ...panel, padding: 8, maxHeight: 130, overflowY: "auto" }}>
            {combat.log.slice(-15).map((l, i) => (
              <div key={i} style={{ fontFamily: NU, fontSize: 10, color: C.muted, lineHeight: 1.4, borderBottom: `1px solid ${C.border}20`, paddingBottom: 2, marginBottom: 2 }}>{l}</div>
            ))}
          </div>
        )}
      </div>
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

function QuestModal({ quests, partyQuests, party, onAccept, onClose, nextRefresh, onClaim }: {
  quests: Quest[]; partyQuests: Quest[]; party: Party | null;
  onAccept: (id: string) => void; onClose: () => void; nextRefresh: number;
  onClaim?: (id: string) => void;
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
            {partyQuests.map(q => (
              <div key={q.id} style={{ padding: "8px 10px", background: q.completed ? C.green + "12" : C.blue + "12", border: `1px solid ${q.completed ? C.green + "60" : C.blue + "30"}`, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: PX, fontSize: 8, color: q.completed ? C.green : C.blue }}>{q.title}</span>
                  {q.completed ? (
                    <button onClick={() => onClaim?.(q.id)}
                      style={{ ...pixelBtn("primary", true), fontSize: 7, background: `linear-gradient(180deg, #2a7a2a 0%, #1a5a1a 100%)`, border: `2px solid ${C.green}` }}>
                      CLAIM
                    </button>
                  ) : (
                    <span style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{q.killTarget?.current}/{q.killTarget?.count}</span>
                  )}
                </div>
                {q.completed ? (
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.green }}>✅ COMPLETE — Claim at Board</div>
                ) : (
                  <div style={{ height: 4, background: C.card2 }}>
                    <div style={{ height: "100%", width: `${((q.killTarget?.current ?? 0) / (q.killTarget?.count ?? 1)) * 100}%`, background: C.blue }} />
                  </div>
                )}
              </div>
            ))}
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

function BottomHUD({ char, hudTab, setHudTab, hudOpen, setHudOpen, chatTab, setChatTab, globalChat, partyChat, onSendChat, onEquipItem, onUnequipWeapon, onUnequipArmor, onUnequipAcc, onDropItem, onUseItem, party, onCreateParty, onLeaveParty, partyQuests }: {
  char: Character; hudTab: HudTab; setHudTab: (t: HudTab) => void;
  hudOpen: boolean; setHudOpen: (o: boolean) => void;
  chatTab: "global" | "party"; setChatTab: (t: "global" | "party") => void;
  globalChat: GameState["globalChat"]; partyChat: GameState["partyChat"];
  onSendChat: (msg: string, ch: "global" | "party") => void;
  onEquipItem: (i: Item) => void; onUnequipWeapon: () => void; onUnequipArmor: () => void; onUnequipAcc: (i: number) => void;
  onDropItem: (id: string) => void; onUseItem: (i: Item) => void;
  party: Party | null; onCreateParty: (n: string) => void; onLeaveParty: () => void;
  partyQuests: Quest[];
}) {
  const [itemMenu, setItemMenu] = useState<Item | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [partyName, setPartyName] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

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
            <div style={{ height: "100%", padding: "10px 14px", overflowY: "auto" }}>
              {char.inventory.length === 0
                ? <div style={{ textAlign: "center", color: C.muted, fontFamily: NU, fontSize: 12, paddingTop: 40 }}>Inventory is empty</div>
                : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 40px)", gap: 6 }}>
                    {char.inventory.map(item => (
                      <div key={item.id} style={{ position: "relative" }} title={item.name}>
                        <SlotBox item={item} onClick={() => setItemMenu(item)} />
                        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, textAlign: "center", fontFamily: PX, fontSize: 5, color: C.muted, overflow: "hidden", whiteSpace: "nowrap" }}>
                          {item.name.slice(0, 5)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
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
                    <div style={{ fontFamily: MO, fontSize: 9, color: C.muted }}>{char.equipment.weapon.damage}</div>
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
  const [aoeHoverTile, setAoeHoverTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRollDisplay[]>([]);
  const [hudTab, setHudTab] = useState<HudTab>("char");
  const [hudOpen, setHudOpen] = useState(true);
  const [chatTab, setChatTab] = useState<"global" | "party">("global");
  // Special tile dialog (replaces old moveConfirm)
  const [specialDialog, setSpecialDialog] = useState<{ x: number; y: number; tile: { label: string; type: string; icon: string; prompt: string; color: string } } | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
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

  const addDiceRoll = useCallback((roll: Omit<DiceRollDisplay, "id" | "phase">) => {
    const r: DiceRollDisplay = { ...roll, id: gid(), phase: "rolling" };
    setDiceRolls(prev => [...prev.slice(-4), r]);
    setTimeout(() => setDiceRolls(prev => prev.map(d => d.id === r.id ? { ...d, phase: "done" } : d)), 520);
    setTimeout(() => setDiceRolls(prev => prev.filter(d => d.id !== r.id)), 2800);
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

  // Check for new monsters joining combat
  useEffect(() => {
    if (!combat.active || !char || screen !== "dungeon") return;
    const newEntrants = gs.dungeonMonsters.filter(m =>
      m.hp > 0 &&
      !combat.engagedMonsterIds.includes(m.id) &&
      dist(char.position, m.position) <= m.sightRange
    );
    if (newEntrants.length === 0) return;
    setCombat(prev => {
      const newOrder = [...prev.turnOrder];
      const newEngaged = [...prev.engagedMonsterIds];
      newEntrants.forEach(m => {
        if (newEngaged.includes(m.id)) return;
        const init = d20();
        newOrder.push({ id: m.id, type: "monster", name: m.name, initiative: init });
        newEngaged.push(m.id);
      });
      return { ...prev, turnOrder: newOrder, engagedMonsterIds: newEngaged };
    });
    notify(`⚠️ ${newEntrants.length} more ${newEntrants[0].name}(s) join the fight!`);
    setGs(prev => ({
      ...prev,
      dungeonMonsters: prev.dungeonMonsters.map(m =>
        newEntrants.some(e => e.id === m.id) ? { ...m, alerted: true } : m
      ),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.active, char?.position, gs.dungeonMonsters]);

  // Combat turn loop (monster AI via effect)
  const doNextTurn = useCallback(() => {
    setCombat(prev => {
      const aliveM = gs.dungeonMonsters.filter(m => m.hp > 0 && prev.engagedMonsterIds.includes(m.id));
      if (aliveM.length === 0) return prev;
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
    const playerInit = d20() + getMod(char.stats.dex);
    const order: Combatant[] = [{ id: char.id, type: "player", name: char.name, initiative: playerInit }];
    const engaged = gs.dungeonMonsters.filter(m => monsterIds.includes(m.id) && m.hp > 0);
    engaged.forEach(m => { const init = d20(); order.push({ id: m.id, type: "monster", name: m.name, initiative: init }); });
    order.sort((a, b) => b.initiative - a.initiative);
    const log = [`⚔ Combat! Round 1`, `${char.name} initiative: ${playerInit}`, ...engaged.map(m => `${m.name} initiative: ${order.find(o => o.id === m.id)?.initiative}`)];
    setGs(prev => ({ ...prev, dungeonMonsters: prev.dungeonMonsters.map(m => monsterIds.includes(m.id) ? { ...m, alerted: true } : m) }));
    setCombat({ active: true, round: 1, turnOrder: order, currentIndex: 0, actionUsed: false, bonusActionUsed: false, movedSquares: 0, log, engagedMonsterIds: monsterIds });
    setCombatMode("none");
    notify("⚔️ Combat started!");
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
      if (q.killTarget && q.killTarget.current >= q.killTarget.count && !q.completed) {
        notify(`📋 Quest ready: ${q.title}! Return to Quest Board to claim reward.`);
        return { ...q, completed: true };
      }
      return q;
    });
    updateChar(char.id, ch => ({ exp: ch.exp + totalExp, inventory: [...ch.inventory, ...drops] }));
    setGs(prev => ({ ...prev, partyQuests: updatedPQ }));
    notify(`⚔️ Victory! +${totalExp} EXP${drops.length > 0 ? `, ${drops.length} item(s)` : ""}`);
    setCombat(INIT_COMBAT); setCombatMode("none");
  }

  function handleSpellSelect(name: string | null) {
    if (!name) { setCombatMode("none"); setSelectedSpell(null); return; }
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

    gs.dungeonMonsters.filter(m => m.hp > 0 && dist(center, m.position) <= aoeSpell.aoeRadius).forEach(mt => {
      const saveRoll = d20();
      const saved = saveRoll >= 13;
      const rawDmg = rollDice(dmgDice);
      const finalDmg = saved ? Math.floor(rawDmg / 2) : rawDmg;
      log.push(`${spellName} at (${center.x},${center.y}): ${mt.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
      addEffect({ type: effectType, gridX: mt.position.x, gridY: mt.position.y });
      addEffect({ type: "number", gridX: mt.position.x, gridY: mt.position.y, value: String(finalDmg) });
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
    setCombatMode("none"); setSelectedSpell(null); setAoeHoverTile(null);
  }

  function handleAOEClick(x: number, y: number) {
    if (!char || !selectedSpell || combatMode !== "spell") return;
    const aoeSpell = WIZARD_SPELL_CHOICES.find(s => s.name === selectedSpell);
    if (!aoeSpell) return;
    const nearestInArea = gs.dungeonMonsters.filter(m => m.hp > 0 && dist({ x, y }, m.position) <= aoeSpell.aoeRadius);
    if (nearestInArea.length === 0) { notify("No targets in area!"); return; }
    handleCastSpellAtTile(selectedSpell, { x, y });
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
      const healed = rollDice(spell.heal) + (spell.type === "heal" ? getMod(char.stats.wis) : 0);
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
      const dmg = rollDice(spell.damage);
      addDiceRoll({ type: "damage", value: dmg, total: dmg, mod: 0, max: dmg, label: spell.damage });
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
        log.push(`${char.name} casts ${spell.name}: ${dmg} dmg to ${m.name} (${Math.max(0, m.hp - dmg)}/${m.maxHp})`);
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

    let newHp = monster.hp;
    if (total >= monster.ac) {
      const isSurprise = !monster.alerted;
      const rawDmg = rollDice(weapon.damage ?? "1d4");
      const finalDmg = isSurprise ? rawDmg * 2 : rawDmg;
      newHp = Math.max(0, monster.hp - finalDmg);

      // Show damage dice
      addDiceRoll({ type: "damage", value: finalDmg, total: finalDmg, mod: isSurprise ? rawDmg : 0, max: finalDmg, label: weapon.damage ?? "1d4" });

      if (isSurprise) {
        log.push(`  💥 SURPRISE ATTACK! ×2 damage! ${rawDmg}×2 = ${finalDmg} dmg → ${newHp}/${monster.maxHp} HP`);
        addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: `×2! ${finalDmg}` });
      } else {
        log.push(`  Hit! ${finalDmg} dmg → ${newHp}/${monster.maxHp} HP`);
        addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: String(finalDmg) });
      }
      if (newHp === 0) log.push(`  ${monster.name} destroyed!`);
      addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y });
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
    if (!char || item.effect !== "heal" || !item.healAmount) return;
    const healed = rollDice(item.healAmount);
    updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed), inventory: c.inventory.filter(i => i.id !== item.id) }));
    notify(`🧪 ${item.name}: +${healed} HP!`);
  }
  function handleBuyItem(item: Item) {
    if (!char || char.gold < item.value) return;
    updateChar(char.id, c => ({ gold: c.gold - item.value, inventory: [...c.inventory, { ...item, id: gid() }] }));
    notify(`Bought ${item.name} for ${item.value}g`);
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
    if (!q || !q.completed) return;
    updateChar(char.id, ch => ({ exp: ch.exp + q.reward.exp, gold: ch.gold + q.reward.gold }));
    setGs(prev => ({
      ...prev,
      partyQuests: prev.partyQuests.filter(pq => pq.id !== questId),
      party: prev.party ? { ...prev.party, questIds: prev.party.questIds.filter(id => id !== questId) } : null,
    }));
    notify(`✅ Quest claimed: ${q.title}! +${q.reward.exp}EXP +${q.reward.gold}g`);
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

        {/* Map area */}
        <div style={{ flex: 1, overflow: "auto", position: "relative", background: screen === "dungeon" ? "#040310" : "#080e04" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 12, minHeight: "100%" }}>
            <div style={{ position: "relative" }}>
              <MapGrid mode={screen} char={char} monsters={gs.dungeonMonsters}
                combat={combat} fogRevealed={fogRevealed} combatMode={combatMode}
                selectedSpell={selectedSpell ?? undefined}
                onTileClick={handleTileClick} onMonsterClick={handleMonsterClick}
                effects={effects}
                aoeHoverTile={aoeHoverTile}
                onAOEHover={setAoeHoverTile}
                onAOEClick={handleAOEClick}
                dyingMonsters={dyingMonsters} />

              {/* Pre-emptive attack bar — shows when in dungeon, not in combat, monsters nearby */}
              {screen === "dungeon" && !combat.active && (() => {
                const nearbyMonsters = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(char.position, m.position) <= m.sightRange + 1);
                if (nearbyMonsters.length === 0) return null;
                return (
                  <div style={{
                    position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
                    zIndex: 30, display: "flex", alignItems: "center", gap: 8,
                    background: C.card, border: `2px solid ${C.red}60`,
                    boxShadow: `0 0 14px ${C.red}40`, padding: "8px 14px",
                  }}>
                    <span style={{ fontFamily: PX, fontSize: 7, color: C.red }}>⚠ {nearbyMonsters.length} ENEMY NEAR</span>
                    <button
                      onClick={() => startCombat(nearbyMonsters.map(m => m.id))}
                      style={{ ...pixelBtn("danger", true), fontSize: 7 }}>
                      ⚔ ENGAGE FIRST
                    </button>
                    {char.equipment.weapon && nearbyMonsters.some(m => dist(char.position, m.position) <= Math.ceil((char.equipment.weapon!.range ?? 5) / 5)) && (
                      <button
                        onClick={() => {
                          startCombat(nearbyMonsters.map(m => m.id));
                          setTimeout(() => {
                            const closest = nearbyMonsters.sort((a, b) => dist(char.position, a.position) - dist(char.position, b.position))[0];
                            if (closest) handleAttackMonster(closest.id);
                          }, 100);
                        }}
                        style={{ ...pixelBtn("danger", true), fontSize: 7 }}>
                        ⚔ STRIKE FIRST
                      </button>
                    )}
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
                <div style={{ position: "absolute", top: 4, left: 4, display: "flex", gap: 6 }}>
                  <button onClick={() => { updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: Math.max(0, c.spellSlots!.used - 1) } })); notify("Short rest: 1 slot recovered."); }}
                    style={{ ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4 }}>
                    <RotateCcw className="w-2.5 h-2.5" />SHORT REST
                  </button>
                  <button onClick={() => { updateChar(char.id, c => ({ hp: c.maxHp, spellSlots: c.spellSlots ? { ...c.spellSlots, used: 0 } : undefined })); notify("Long rest: Full recovery!"); }}
                    style={{ ...pixelBtn("ghost", true), fontSize: 7, display: "flex", alignItems: "center", gap: 4 }}>
                    <BookOpen className="w-2.5 h-2.5" />LONG REST
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
          </div>
        </div>

        {/* HUD */}
        <BottomHUD char={char} hudTab={hudTab} setHudTab={setHudTab} hudOpen={hudOpen} setHudOpen={setHudOpen}
          chatTab={chatTab} setChatTab={setChatTab} globalChat={gs.globalChat} partyChat={gs.partyChat}
          onSendChat={handleSendChat} onEquipItem={handleEquipItem} onUnequipWeapon={handleUnequipWeapon}
          onUnequipArmor={handleUnequipArmor} onUnequipAcc={handleUnequipAcc}
          onDropItem={handleDropItem} onUseItem={handleUseItem}
          party={gs.party} onCreateParty={handleCreateParty} onLeaveParty={handleLeaveParty} partyQuests={gs.partyQuests} />

        {/* Modals */}
        {showShop && <ShopModal char={char} onBuy={handleBuyItem} onClose={() => setShowShop(false)} />}
        {showQuests && <QuestModal quests={gs.availableQuests} partyQuests={gs.partyQuests} party={gs.party} onAccept={handleAcceptQuest} onClose={() => setShowQuests(false)} nextRefresh={gs.questRefreshAt} onClaim={handleQuestClaim} />}

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
            position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
            zIndex: 9990, background: C.card, border: `2px solid ${C.blue}`,
            boxShadow: C.glowStrong, padding: "10px 20px",
            fontFamily: PX, fontSize: 8, color: C.text, letterSpacing: 0.5,
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            {notification}
          </div>
        )}
      </div>
    );
  }

  return null;
}
