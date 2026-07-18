// ─────────────────────────────────────────────────
// GRID / MAP CONSTANTS
// ─────────────────────────────────────────────────

export const CELL = 80;
export const MOVE_SQUARES = 4;
export const SIGHT = 11; // +5 for morning forest player sight

export function getMapCols(mode: string) {
  if (mode === "sanctuary") return 27;
  if (mode === "town") return 29;
  return 50;
}

export function getMapRows(mode: string) {
  if (mode === "sanctuary") return 19;
  if (mode === "town") return 21;
  return 40;
}

// Entry / exit positions
export const TOWN_ENTER = { x: 15, y: 10 }; // Start in the middle of the central path
export const DUNGEON_ENTER = { x: 45, y: 35 }; // Entrance safe zone bottom right
export const DUNGEON_EXIT = { x: 5, y: 5 }; // Boss room top left

// Town special tiles (Interactive zones moved 1 tile into the path)
export const TOWN_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string }> = {
  // --- 🏨 Hearthstone Inn ---
  "8,6": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },
  "9,6": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },

  // --- 📋 Quest Board ---
  "20,6": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },
  "21,6": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },

  // --- 🏪 General Store ---
  "14,14": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },
  "15,14": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },

  // --- ⛪ Selenia Statue ---
  "4,11": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Pray at the Statue?", color: "#FFD700" },

  // --- 🚪 Old Locked Door (Interaction Check) ---
  "12,10": { label: "Old Cellar Door", type: "check", icon: "🚪", prompt: "The door is heavily padlocked and covered in rust.", color: "#666", requiredSkill: "Investigation", dc: 12, successText: "You found a loose hinge and popped the door open. (Found 20g)", failText: "The lock is too complex. You couldn't open it." },

  // --- 🗺️ Town Exit ---
  "22,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" },
  "23,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" },
  "24,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" }
};

export const SANCTUARY_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string; requiredSkill?: string; dc?: number; successText?: string; failText?: string }> = {
  "15,8": { label: "Selenia", type: "selenia", icon: "✨", prompt: "Speak with Selenia?", color: "#c492d6" },
  "14,8": { label: "Selenia", type: "selenia", icon: "✨", prompt: "Speak with Selenia?", color: "#c492d6" },
  "16,8": { label: "Selenia", type: "selenia", icon: "✨", prompt: "Speak with Selenia?", color: "#c492d6" },
};

// Dungeon special tiles
export const DUNGEON_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string; requiredSkill?: string; dc?: number; successText?: string; failText?: string }> = {
  // --- 🪤 Vine Trap ---
  "30,30": { label: "Suspicious Vines", type: "check", icon: "🌿", prompt: "The vines on the floor look strangely arranged...", color: "#2e8b57", requiredSkill: "Perception", dc: 14, successText: "You carefully step over the hidden snare trap.", failText: "You step directly into the snare! (Take 1d4 damage)" },
  
  // --- 📦 Old Chest ---
  "10,12": { label: "Ancient Chest", type: "check", icon: "📦", prompt: "An old chest with Elven markings.", color: "#8B5A2B", requiredSkill: "History", dc: 13, successText: "You recognize the Elven mechanism and safely open it! (Found Potion of Healing)", failText: "You force it open, damaging some contents. (Found 5g)" },
};

// ─────────────────────────────────────────────────
// TILE GENERATORS
// ─────────────────────────────────────────────────

export function getTownTile(x: number, y: number): { bg: string; isWall: boolean, type: "grass" | "path" | "fence" | "none" } {
  const cols = getMapCols("town");
  const rows = getMapRows("town");
  if (x >= cols || y >= rows) return { bg: "#000", isWall: true, type: "none" };

  // Map Boundaries
  if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
    if (x >= 20 && x <= 24 && y === rows - 1) return { bg: "transparent", isWall: false, type: "path" }; // Exit path
    return { bg: "transparent", isWall: true, type: "fence" };
  }
  
  // --- BUILDINGS (Walls) ---
  // Inn (Top-Left Rectangle)
  if (x >= 2 && x <= 12 && y >= 1 && y <= 5) return { bg: "transparent", isWall: true, type: "grass" };

  // Quest (Top-Right Rectangle)
  if (x >= 18 && x <= 28 && y >= 1 && y <= 5) return { bg: "transparent", isWall: true, type: "grass" };

  // Shop (Bottom-Left Rectangle)
  if (x >= 2 && x <= 18 && y >= 15 && y <= 19) return { bg: "transparent", isWall: true, type: "grass" };

  // Statue (Middle-Left)
  if (x >= 1 && x <= 3 && y >= 10 && y <= 12) return { bg: "transparent", isWall: true, type: "grass" };

  // --- PATHS ---
  // Main central block
  if (x >= 6 && x <= 24 && y >= 6 && y <= 14) return { bg: "transparent", isWall: false, type: "path" };
  
  // Path extending down (exit)
  if (x >= 20 && x <= 24 && y >= 15 && y <= 19) return { bg: "transparent", isWall: false, type: "path" };
  
  // Path extending left to Statue
  if (x >= 4 && x <= 5 && y >= 10 && y <= 12) return { bg: "transparent", isWall: false, type: "path" };

  return { bg: "transparent", isWall: false, type: "grass" };
}

import { parseWhisperingForest } from "../maps/whispering_forest";
const wfMap = parseWhisperingForest();

export function getDungeonTile(x: number, y: number): { bg: string; isWall: boolean, isWater?: boolean, isLow?: boolean } {
  const cols = getMapCols("dungeon");
  const rows = getMapRows("dungeon");
  if (x < 0 || y < 0 || x >= cols || y >= rows) return { bg: "#050410", isWall: true };
  const key = `${x},${y}`;
  if (wfMap.obstacles.has(key)) {
     if (wfMap.water.has(key)) return { bg: "#2a4b8d", isWall: true, isWater: true }; 
     return { bg: "transparent", isWall: true, isLow: wfMap.lowObstacles.has(key) };
  }
  if (wfMap.water.has(key)) return { bg: "#2a4b8d", isWall: true, isWater: true }; 
  
  // Grass floor
  const shade = (x * 3 + y * 5) % 3;
  return { bg: shade === 0 ? "#1a2a1a" : shade === 1 ? "#152515" : "#1f2f1f", isWall: false };
}

export function getSanctuaryTile(x: number, y: number): { bg: string; isWall: boolean } {
  const cols = getMapCols("sanctuary");
  const rows = getMapRows("sanctuary");
  if (x >= cols || y >= rows) return { bg: "#000", isWall: true };
  if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return { bg: "#ffffff", isWall: true }; // white wall boundaries
  const isCenterPath = (x >= 12 && x <= 17 && y >= 5 && y <= 15);
  return { bg: isCenterPath ? "#f2e6ff" : "#fdfbfe", isWall: false }; // lavender center, soft white elsewhere
}

export function getTutorialTile(x: number, y: number): { bg: string; isWall: boolean } {
  const cols = getMapCols("tutorial");
  const rows = getMapRows("tutorial");
  if (x >= cols || y >= rows) return { bg: "#000", isWall: true };
  if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return { bg: "#2a2b36", isWall: true };
  const shade = (x * 2 + y * 7) % 2;
  return { bg: shade === 0 ? "#3b3d4f" : "#444659", isWall: false }; // basic training ground tiles
}

export function isWalkable(mode: "town" | "dungeon" | "sanctuary" | "tutorial", x: number, y: number): boolean {
  if (x < 0 || x >= getMapCols(mode) || y < 0 || y >= getMapRows(mode)) return false;
  if (mode === "town") return !getTownTile(x, y).isWall;
  if (mode === "dungeon") return !getDungeonTile(x, y).isWall;
  if (mode === "sanctuary") return !getSanctuaryTile(x, y).isWall;
  if (mode === "tutorial") return !getTutorialTile(x, y).isWall;
  return true;
}

export function blocksVision(mode: "town" | "dungeon" | "sanctuary" | "tutorial", x: number, y: number): boolean {
  if (x < 0 || x >= getMapCols(mode) || y < 0 || y >= getMapRows(mode)) return true;
  if (mode === "town") return getTownTile(x, y).isWall;
  if (mode === "dungeon") {
    const tile = getDungeonTile(x, y);
    return tile.isWall && !tile.isWater && !tile.isLow; // water and low covers don't block vision
  }
  if (mode === "sanctuary") return getSanctuaryTile(x, y).isWall;
  if (mode === "tutorial") return getTutorialTile(x, y).isWall;
  return false;
}

export function hasLineOfSight(mode: "town" | "dungeon" | "sanctuary" | "tutorial", startX: number, startY: number, targetX: number, targetY: number): boolean {
  let x0 = startX;
  let y0 = startY;
  const x1 = targetX;
  const y1 = targetY;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (x0 === x1 && y0 === y1) return true;
    if (blocksVision(mode, x0, y0)) return false; // hit a wall
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}
