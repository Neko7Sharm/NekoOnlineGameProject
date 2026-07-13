import { ReactNode } from "react";

// ─────────────────────────────────────────────────
// SCREEN & MODE TYPES
// ─────────────────────────────────────────────────

export type Screen = "auth" | "charSelect" | "charCreate" | "worldMap" | "town" | "dungeon";
export type CharClass = "Fighter" | "Cleric" | "Paladin" | "Ranger" | "Wizard";
export type ItemType = "weapon" | "armor" | "accessory" | "consumable";
export type HudTab = "char" | "inv" | "equip" | "acc" | "chat" | "party" | "skills";
export type CombatModeT = "none" | "move" | "attack" | "spell";

// ─────────────────────────────────────────────────
// CORE GAME TYPES
// ─────────────────────────────────────────────────

export interface Stats {
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
}

export interface Item {
  id: string; name: string; type: ItemType; description: string; value: number;
  damage?: string; damageType?: string; range?: number;
  ac?: number; healAmount?: string; effect?: string; stat?: keyof Stats; bonus?: number;
  material?: boolean;
  saveStat?: keyof Stats;
  saveDC?: number;
  aoeRadius?: number;
}

export interface Equipment {
  weapon: Item | null; armor: Item | null;
  accessories: [Item | null, Item | null, Item | null];
}

export interface Character {
  id: string; name: string; avatar: string; class: CharClass;
  level: number; exp: number; gold: number; stats: Stats;
  hp: number; maxHp: number; ac: number; profBonus: number;
  skills: string[]; savingThrows: string[];
  spellSlots?: { used: number; max: number };
  spellChoice?: string;
  customSkills?: string[];
  inventory: Item[]; equipment: Equipment;
  position: { x: number; y: number }; currentMap: "town" | "dungeon";
}

export interface Monster {
  id: string; name: string; hp: number; maxHp: number; ac: number;
  position: { x: number; y: number }; damage: string; range: number;
  attackMod: number; initiative: number; xp: number; sightRange: number; alerted: boolean;
}

export interface Combatant { id: string; type: "player" | "monster"; name: string; initiative: number }

export interface CombatState {
  active: boolean; round: number;
  turnOrder: Combatant[]; currentIndex: number;
  actionUsed: boolean; bonusActionUsed: boolean; movedSquares: number;
  log: string[]; engagedMonsterIds: string[];
}

export interface VisualEffect {
  id: string;
  type: "slash" | "scratch" | "fire_bolt" | "magic_missile" | "sacred_flame" | "thunder" | "fire_aoe" | "smite" | "heal" | "miss" | "number" | "sword_swing" | "arrow";
  targetX?: number; targetY?: number;
  gridX: number; gridY: number;
  value?: string;
}

export interface DiceRollDisplay {
  id: string;
  type: "hit" | "save" | "damage";
  value: number;
  total: number;
  mod: number;
  max: number;
  label: string;
  phase: "rolling" | "done";
}

export interface Quest {
  id: string; title: string; description: string;
  killTarget?: { monster: string; count: number; current: number };
  gatherTarget?: { itemName: string; count: number };
  reward: { exp: number; gold: number };
  completed?: boolean;
  readyToTurnIn?: boolean;
}

export interface Party {
  name: string; leaderId: string; memberIds: string[]; questIds: string[];
}

export interface GameState {
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
// COMPONENT PROP TYPES
// ─────────────────────────────────────────────────

export interface MapGridProps {
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
