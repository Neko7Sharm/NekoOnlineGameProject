// ─────────────────────────────────────────────────
// SELestia HORIZON - TAG-BASED ALCHEMY ENGINE
// ─────────────────────────────────────────────────

import type { Item } from "../types/game";
import { SHOP_ITEMS } from "./items";

export interface TagRecipeRule {
  id: string;
  name: string;
  resultItemName: string;
  requiredTags: string[];
  stars: number; // 1 to 4 difficulty rating
  description: string;
}

export const TAG_RECIPE_DATABASE: TagRecipeRule[] = [
  {
    id: "rec_health_potion",
    name: "Health Potion",
    resultItemName: "Healing Potion",
    requiredTags: ["Healing", "Water"],
    stars: 1,
    description: "Combines restorative herbal sap with pure water matrix."
  },
  {
    id: "rec_greater_potion",
    name: "Greater Health Potion",
    resultItemName: "Minor Healing Potion",
    requiredTags: ["Healing", "Magic"],
    stars: 2,
    description: "Infuses healing herbs with arcane magic for heightened potency."
  },
  {
    id: "rec_mana_potion",
    name: "Moon Mana Potion",
    resultItemName: "Moon Hydrangea",
    requiredTags: ["Moon", "Magic"],
    stars: 2,
    description: "Concentrates lunar reflections to restore spell slots."
  },
  {
    id: "rec_poison_flask",
    name: "Poison Flask",
    resultItemName: "Small Bomb",
    requiredTags: ["Poison", "Water"],
    stars: 2,
    description: "Distills venomous extracts into a corrosive throwable flask."
  },
  {
    id: "rec_fire_bomb",
    name: "Fire Bomb",
    resultItemName: "Small Bomb",
    requiredTags: ["Plant", "Fire"],
    stars: 2,
    description: "Combines volatile plant fibers with explosive spark."
  },
  {
    id: "rec_moon_essence",
    name: "Moon Essence Catalyst",
    resultItemName: "Nature Crystal",
    requiredTags: ["Magic", "Crystal"],
    stars: 3,
    description: "Crystallizes raw mana into a brilliant luminescent gem."
  },
  {
    id: "rec_upgrade_stone",
    name: "Enhancement Stone",
    resultItemName: "Equipment Enhancement Stone",
    requiredTags: ["Beast", "Metal"],
    stars: 3,
    description: "Forges beast bone density with refined metal ores."
  }
];

export interface CraftResult {
  success: boolean;
  recipe?: TagRecipeRule;
  resultItem?: Item;
  quality?: number;
  message: string;
}

/**
 * Perform Tag-Based Alchemy Combination
 */
export function craftTagAlchemy(ing1: Item, ing2: Item, catalyst?: Item): CraftResult {
  const combinedTags = new Set<string>();
  (ing1.tags || []).forEach(t => combinedTags.add(t));
  (ing2.tags || []).forEach(t => combinedTags.add(t));
  if (catalyst?.tags) {
    catalyst.tags.forEach(t => combinedTags.add(t));
  }

  // Find matching recipe by tags
  const matchedRecipe = TAG_RECIPE_DATABASE.find(rule => 
    rule.requiredTags.every(tag => combinedTags.has(tag))
  );

  if (!matchedRecipe) {
    return {
      success: false,
      message: "The ingredients fizzled out into inert sludge... No valid Tag synergy found!"
    };
  }

  // Find or create result item
  const baseItem = SHOP_ITEMS.find(i => i.name === matchedRecipe.resultItemName) || {
    id: "crafted_" + Date.now(),
    name: matchedRecipe.resultItemName,
    type: "consumable" as const,
    value: 40,
    rarity: "uncommon" as const,
    description: matchedRecipe.description,
    tags: matchedRecipe.requiredTags
  };

  // Calculate Quality (1 - 100)
  const baseVal = (ing1.value || 5) + (ing2.value || 5);
  const catBonus = catalyst ? (catalyst.value || 10) * 1.5 : 0;
  const quality = Math.min(100, Math.max(10, Math.floor((baseVal + catBonus) * 1.3)));

  const resultItem: Item = {
    ...baseItem,
    id: `crafted_${matchedRecipe.id}_${Date.now()}`,
    description: `${baseItem.description} (Alchemy Quality: ${quality}%)`
  };

  return {
    success: true,
    recipe: matchedRecipe,
    resultItem,
    quality,
    message: `✨ Successfully synthesized ${resultItem.name}! (Quality: ${quality}%)`
  };
}
