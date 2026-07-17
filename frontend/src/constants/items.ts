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

export const MONSTER_DROPS: Omit<Item, "id">[] = [
  // Slime
  { name: "Slime Gel", type: "consumable", value: 2, material: true, rarity: "common", tags: ["Gel", "Water"], description: "Jiggly substance used in alchemy." },
  { name: "Slime Core", type: "consumable", value: 8, material: true, rarity: "uncommon", tags: ["Core", "Magic"], description: "A faintly glowing core." },
  { name: "Sticky Residue", type: "consumable", value: 5, material: true, rarity: "uncommon", tags: ["Resin"], description: "Very sticky, good for crafting." },
  { name: "Pure Slime Core", type: "consumable", value: 25, material: true, rarity: "rare", tags: ["Core", "Rare"], description: "A perfectly clear slime core." },
  { name: "Rusty Dagger", type: "weapon", hands: 1, damage: "1d4-1", damageType: "piercing", properties: ["light"], range: 5, value: 1, rarity: "common", description: "Old and rusted dagger." },
  // Wolf
  { name: "Wolf Fang", type: "consumable", value: 3, material: true, rarity: "common", tags: ["Beast", "Bone"], description: "Sharp fang." },
  { name: "Wolf Fur", type: "consumable", value: 3, material: true, rarity: "common", tags: ["Beast", "Fur"], description: "Warm wolf fur." },
  { name: "Tough Leather", type: "consumable", value: 10, material: true, rarity: "uncommon", tags: ["Leather"], description: "Durable leather piece." },
  { name: "Sharp Claw", type: "consumable", value: 8, material: true, rarity: "uncommon", tags: ["Beast"], description: "A very sharp claw." },
  { name: "Alpha Fang", type: "consumable", value: 30, material: true, rarity: "rare", tags: ["Beast", "Rare"], description: "Fang from an alpha wolf." },
  { name: "Leather Boots", type: "armor", ac: 1, value: 15, rarity: "uncommon", description: "Basic leather boots. (+1 AC)" }, // Treating as armor for now
  // Vine
  { name: "Vine Fiber", type: "consumable", value: 2, material: true, rarity: "common", tags: ["Nature", "Fiber"], description: "Strong fiber." },
  { name: "Green Sap", type: "consumable", value: 5, material: true, rarity: "uncommon", tags: ["Nature", "Resin"], description: "Sticky green sap." },
  { name: "Living Vine", type: "consumable", value: 10, material: true, rarity: "uncommon", tags: ["Nature"], description: "A vine that still twitches." },
  { name: "Ancient Vine", type: "consumable", value: 40, material: true, rarity: "rare", tags: ["Nature", "Rare"], description: "Thick, ancient vine." },
  // Goblin
  { name: "Broken Arrow", type: "consumable", value: 1, material: true, rarity: "common", tags: ["Wood"], description: "Unusable arrow." },
  { name: "Goblin Ear", type: "consumable", value: 2, material: true, rarity: "common", tags: ["Humanoid"], description: "Proof of a goblin kill." },
  { name: "Scout Cloak", type: "armor", ac: 1, value: 20, rarity: "uncommon", tags: ["Cloth"], description: "Camouflaged cloak. (+1 AC)" },
  { name: "Scout Badge", type: "consumable", value: 50, material: true, rarity: "rare", tags: ["Rare"], description: "Proof of defeating an elite scout." },
  { name: "Hunter Bow", type: "weapon", hands: 2, damage: "1d6", damageType: "piercing", properties: ["two-handed", "loading"], range: 60, value: 20, rarity: "uncommon", description: "A decent hunting bow." },
  // Treant
  { name: "Ancient Bark", type: "consumable", value: 15, material: true, rarity: "boss_material", tags: ["Wood"], description: "Extremely tough bark." },
  { name: "Treant Heartwood", type: "consumable", value: 35, material: true, rarity: "boss_material", tags: ["Wood", "Magic"], description: "Magical wood from the core." },
  { name: "Nature Crystal", type: "consumable", value: 50, material: true, rarity: "boss_material", tags: ["Crystal"], description: "Concentrated nature magic." },
  { name: "Treant Core", type: "consumable", value: 80, material: true, rarity: "boss_material", tags: ["Boss Material"], description: "The life force of a Treant." },
  { name: "Treant Seed", type: "consumable", value: 100, material: true, rarity: "boss_material", tags: ["Seed", "Divine"], description: "A seed pulsating with life." },
  { name: "Woodland Shield", type: "weapon", hands: 1, range: 0, damage: "0", effect: "guard", value: 60, rarity: "rare", description: "Sturdy wooden shield. Use [EXTRA] to Guard." },
  // Chests & Secrets
  { name: "Minor Healing Potion", type: "consumable", healAmount: "1d4+1", effect: "heal", value: 25, rarity: "common", description: "Restores 1d4+1 HP." },
  { name: "Equipment Enhancement Stone", type: "consumable", value: 150, material: true, rarity: "rare", tags: ["Upgrade"], description: "Used to upgrade equipment." },
  { name: "Treasure Map Fragment", type: "consumable", value: 20, material: true, rarity: "rare", tags: ["Map"], description: "A piece of a larger treasure map." },
  { name: "Gold Pouch", type: "consumable", effect: "gold_pouch", value: 50, rarity: "uncommon", description: "A small pouch of gold." },
  { name: "Selenia's Flower", type: "consumable", value: 0, material: true, rarity: "rare", tags: ["Divine", "Nature"], description: "A glowing, ethereal flower." }
];
