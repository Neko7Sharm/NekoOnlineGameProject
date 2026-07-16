import type { Item } from "../types/game";

// ─────────────────────────────────────────────────
// SHOP ITEMS
// ─────────────────────────────────────────────────

export const SHOP_ITEMS: Item[] = [
  { id: "s1", name: "Dagger", type: "weapon", hands: 1, damage: "1d4", damageType: "piercing", properties: ["finesse", "light", "thrown"], range: 5, value: 2, description: "Light and quick blade." },
  { id: "s2", name: "Longsword", type: "weapon", hands: 1, damage: "1d8", damageType: "slashing", properties: ["versatile"], range: 5, value: 15, description: "Classic straight blade." },
  { id: "s3", name: "Greatsword", type: "weapon", hands: 2, damage: "2d6", damageType: "slashing", properties: ["heavy", "two-handed"], range: 5, value: 50, description: "A massive, heavy blade." },
  { id: "s4", name: "Halberd", type: "weapon", hands: 2, damage: "1d10", damageType: "slashing", properties: ["heavy", "two-handed", "reach"], range: 10, value: 20, description: "Polearm with a long reach." },
  { id: "s5", name: "Rapier", type: "weapon", hands: 1, damage: "1d8", damageType: "piercing", properties: ["finesse"], range: 5, value: 25, description: "Elegant piercing blade." },
  { id: "s6", name: "Spear", type: "weapon", hands: 1, damage: "1d6", damageType: "piercing", properties: ["versatile", "thrown"], range: 5, value: 1, description: "Simple thrusting weapon." },
  { id: "s7", name: "Light Crossbow", type: "weapon", hands: 2, damage: "1d8", damageType: "piercing", properties: ["two-handed", "loading"], range: 40, value: 25, description: "Ranged weapon needing reload." },
  { id: "s8", name: "Leather Armor", type: "armor", ac: 13, value: 10, description: "Supple leather. AC 13." },
  { id: "s9", name: "Chain Mail", type: "armor", ac: 16, value: 75, description: "Interlocked rings. AC 16." },
  { id: "s10", name: "Shield", type: "weapon", hands: 1, range: 0, damage: "0", effect: "guard", value: 10, description: "Wooden shield. Use [EXTRA] to Guard (1d4+CON dmg reduction)." },
  { id: "s11", name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." },
  { id: "s12", name: "Ring of Protection", type: "accessory", ac: 1, value: 100, description: "+1 AC." },
  { id: "s13", name: "Amulet of Vigor", type: "accessory", stat: "con", bonus: 2, value: 80, description: "+2 CON." },
  { id: "s14", name: "Cloak of Elvenkind", type: "accessory", stat: "dex", bonus: 2, value: 80, description: "+2 DEX." },
  { id: "s15", name: "Gauntlets of Strength", type: "accessory", stat: "str", bonus: 2, value: 80, description: "+2 STR." },
  { id: "s16", name: "Small Bomb", type: "consumable", damage: "3d6", effect: "aoe_bomb", saveStat: "dex", saveDC: 15, aoeRadius: 2, value: 60, description: "3d6 explosion, DEX save DC 15. Half damage on save. Circle AOE." },
];

// ─────────────────────────────────────────────────
// MATERIAL / DROP ITEMS
// ─────────────────────────────────────────────────

export const BRANCH_ITEM: Omit<Item, "id"> = {
  name: "Branch", type: "consumable", value: 1, material: true,
  description: "Rough wooden branch from a training dummy. Used as crafting material.",
};
