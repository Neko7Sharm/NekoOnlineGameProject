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

// Calculates Manhattan distance from point `a` to a multi-tile entity anchored at center `b`
export const distToEntity = (a: { x: number; y: number }, b: { x: number; y: number }, size: number = 1) => {
  if (size <= 1) return dist(a, b);
  const radius = Math.floor(size / 2);
  const minX = b.x - radius, maxX = b.x + radius;
  const minY = b.y - radius, maxY = b.y + radius;
  
  let dx = 0;
  if (a.x < minX) dx = minX - a.x;
  else if (a.x > maxX) dx = a.x - maxX;
  
  let dy = 0;
  if (a.y < minY) dy = minY - a.y;
  else if (a.y > maxY) dy = a.y - maxY;
  
  return dx + dy;
};

export const tnow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─────────────────────────────────────────────────
// DICE ROLLING
// ─────────────────────────────────────────────────

import { PROFICIENCY_LIST } from "../constants/classes";

export function rollSkillCheck(char: Character, skillName: string): { roll: number; mod: number; prof: number; total: number } {
  const roll = d20();
  const profDef = PROFICIENCY_LIST.find(p => p.name === skillName);
  const stat = profDef ? profDef.stat : "int"; // fallback
  const mod = getMod(char.stats[stat]);
  const prof = char.skills?.includes(skillName) ? 2 : 0;
  return { roll, mod, prof, total: roll + mod + prof };
}

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

/** Returns an exact breakdown of AC components matching calcAC exactly. */
export function calcACBreakdown(char: Character): {
  armorLabel: string; armorValue: number;
  dexLabel: string | null; dexValue: number;
  shieldValue: number;
  otherValue: number;
  total: number;
} {
  const dexMod = getMod(char.stats.dex);
  const armor = char.equipment.armor;
  const armorName = armor?.name ?? "";
  const noArmor = !armor;
  // Base AC: no armor = 10+DEX (DEX already baked in), with armor = armor.ac
  const armorValue = noArmor ? 10 : (armor!.ac ?? 10);
  const addDex = noArmor || ["Leather Armor", "Mage Robes"].includes(armorName);
  const dexValue = addDex ? dexMod : 0;
  const shieldValue = char.equipment.offHand?.effect === "guard" ? 2 : 0;
  const accAC = char.equipment.accessories.reduce((s, a) => s + (a?.ac ?? 0), 0);
  const skillAC = char.gameSkills?.reduce((s, skillId) => s + (SKILL_DICTIONARY[skillId]?.acBonus ?? 0), 0) ?? 0;
  const otherValue = accAC + skillAC;
  const total = armorValue + dexValue + shieldValue + otherValue;
  return {
    armorLabel: noArmor ? "No Armor" : armorName,
    armorValue,
    dexLabel: addDex ? "Dexterity Modifier" : null,
    dexValue,
    shieldValue,
    otherValue,
    total,
  };
}


export function getWeaponStat(char: Character, weapon: import("../types/game").Item): { stat: keyof Stats; mod: number } {
  const strMod = getMod(char.stats.str);
  const dexMod = getMod(char.stats.dex);
  // Finesse: always choose highest
  if (weapon.properties?.includes("finesse")) {
    return dexMod >= strMod ? { stat: "dex", mod: dexMod } : { stat: "str", mod: strMod };
  }
  // Ranged weapons / thrown: DEX
  if ((weapon.range ?? 5) > 5 || weapon.name.includes("Bow") || weapon.name.includes("Crossbow") || weapon.properties?.includes("thrown")) {
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

// ─────────────────────────────────────────────────
// WEAPON PROPERTY HELPERS
// ─────────────────────────────────────────────────

/**
 * Returns the effective damage dice for a weapon.
 * Versatile weapons use 2H damage automatically when off-hand is empty.
 */
export function getEffectiveDamage(weapon: import("../types/game").Item, offHandEmpty: boolean): string {
  if (weapon.properties?.includes("versatile") && offHandEmpty) {
    return getVersatileDamage2H(weapon.damage ?? "1d4");
  }
  return weapon.damage ?? "1d4";
}

/**
 * Upgrades a versatile weapon's damage die to its 2-handed equivalent:
 * 1d4→1d6, 1d6→1d8, 1d8→1d10, 1d10→1d12
 */
export function getVersatileDamage2H(damage: string): string {
  const upgrades: Record<string, string> = {
    "1d4": "1d6",
    "1d6": "1d8",
    "1d8": "1d10",
    "1d10": "1d12",
    "1d12": "1d12", // max
  };
  // Match base die like "1d8" ignoring modifiers
  const base = damage.match(/^\d+d\d+/)?.[0];
  if (base && upgrades[base]) {
    return damage.replace(base, upgrades[base]);
  }
  return damage;
}

/** Returns true if this weapon has the Reach property (range > 5 for melee) */
export function isReachWeapon(weapon: import("../types/game").Item): boolean {
  return !!weapon.properties?.includes("reach") && (weapon.range ?? 5) <= 60 && weapon.damage !== "0";
}
