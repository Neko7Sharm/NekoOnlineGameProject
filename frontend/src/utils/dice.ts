import type { Character, Stats } from "../types/game";

// ─────────────────────────────────────────────────
// BASIC UTILITIES
// ─────────────────────────────────────────────────

export const gid = () => Math.random().toString(36).slice(2, 9);
export const d20 = () => Math.floor(Math.random() * 20) + 1;
export const getMod = (s: number) => Math.floor((s - 10) / 2);
export const modStr = (s: number) => { const m = getMod(s); return m >= 0 ? `+${m}` : `${m}`; };
export const formatMod = (m: number) => m >= 0 ? `+${m}` : `${m}`;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const tnow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─────────────────────────────────────────────────
// DICE ROLLING
// ─────────────────────────────────────────────────

export function rollDice(notation: string): number {
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

// ─────────────────────────────────────────────────
// CHARACTER CALCULATIONS
// ─────────────────────────────────────────────────

export function getSpellcastingMod(char: Character): number {
  switch (char.class) {
    case "Wizard": return getMod(char.stats.int);
    case "Cleric": return getMod(char.stats.wis);
    case "Paladin": return getMod(char.stats.cha);
    default: return 0;
  }
}

import { SKILL_DICTIONARY } from "../constants/skills";

export function calcAC(char: Character): number {
  const dexMod = getMod(char.stats.dex);
  const armorName = char.equipment.armor?.name ?? "";
  const armorAC = char.equipment.armor?.ac ?? (10 + dexMod);
  const addDex = ["Leather Armor", "Mage Robes"].includes(armorName);
  const accAC = char.equipment.accessories.reduce((s, a) => s + (a?.ac ?? 0), 0);
  
  const skillAC = char.gameSkills?.reduce((s, skillId) => s + (SKILL_DICTIONARY[skillId]?.acBonus ?? 0), 0) ?? 0;
  
  return armorAC + (addDex ? dexMod : 0) + accAC + skillAC;
}

export function getWeaponStat(char: Character, weapon: import("../types/game").Item): { stat: keyof Stats; mod: number } {
  const strMod = getMod(char.stats.str);
  const dexMod = getMod(char.stats.dex);
  if (weapon.properties?.includes("finesse") && dexMod > strMod) {
    return { stat: "dex", mod: dexMod };
  }
  if (weapon.properties?.includes("thrown") || weapon.name.includes("Bow") || weapon.name.includes("Crossbow")) {
    return { stat: "dex", mod: dexMod };
  }
  return { stat: "str", mod: strMod };
}

export function getWeaponHitBonus(char: Character, weapon: import("../types/game").Item): { total: number; statName: string; statMod: number; prof: number; weaponBonus: number } {
  const { stat, mod } = getWeaponStat(char, weapon);
  const prof = char.profBonus;
  const weaponBonus = 0; // Simplified for now
  return { total: mod + prof + weaponBonus, statName: stat.toUpperCase(), statMod: mod, prof, weaponBonus };
}
