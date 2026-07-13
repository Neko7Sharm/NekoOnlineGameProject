import type { Item } from "../types/game";

// ─────────────────────────────────────────────────
// SHOP ITEMS
// ─────────────────────────────────────────────────

export const SHOP_ITEMS: Item[] = [
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

// ─────────────────────────────────────────────────
// MATERIAL / DROP ITEMS
// ─────────────────────────────────────────────────

export const BRANCH_ITEM: Omit<Item, "id"> = {
  name: "Branch", type: "consumable", value: 1, material: true,
  description: "Rough wooden branch from a training dummy. Used as crafting material.",
};
