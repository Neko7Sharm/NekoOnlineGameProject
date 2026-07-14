// ─────────────────────────────────────────────────
// GRID / MAP CONSTANTS
// ─────────────────────────────────────────────────

export const COLS = 20;
export const ROWS = 15;
export const CELL = 38;
export const MOVE_SQUARES = 4;
export const SIGHT = 6;

// Entry / exit positions
export const TOWN_ENTER = { x: 10, y: 13 };
export const DUNGEON_ENTER = { x: 10, y: 13 };
export const DUNGEON_EXIT = { x: 9, y: 0 };

// Town special tiles
export const TOWN_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string }> = {
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

  // --- 🏨 Hearthstone Inn ---
  "2,8": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },
  "3,8": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },
  "2,9": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },
  "3,9": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },

  // --- ⛪ Sacred Shrine ---
  "16,8": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Enter the Sacred Shrine?", color: "#D4AF37" },
  "17,8": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Enter the Sacred Shrine?", color: "#D4AF37" },
  "16,9": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Enter the Sacred Shrine?", color: "#D4AF37" },
  "17,9": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Enter the Sacred Shrine?", color: "#D4AF37" },

  // --- 🗺️ Town Gate (Exit) ---
  "9,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
  "10,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
  "11,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
};

// ─────────────────────────────────────────────────
// TILE GENERATORS
// ─────────────────────────────────────────────────

export function getTownTile(x: number, y: number): { bg: string; isWall: boolean } {
  // Edge of map is always a wall
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "transparent", isWall: true };
  
  // Define building obstacles (walls) - leave the TOWN_SPECIAL interaction tiles walkable
  // Shop is around [4-6, 2-3], block the back of it
  if (x >= 4 && x <= 6 && y === 1) return { bg: "transparent", isWall: true };
  
  // Quest Board is around [13-15, 2-3]
  if (x >= 13 && x <= 15 && y === 1) return { bg: "transparent", isWall: true };
  
  // Inn is around [2-3, 8-9]
  if (x >= 1 && x <= 4 && y >= 5 && y <= 7) return { bg: "transparent", isWall: true };
  
  // Shrine is around [16-17, 8-9]
  if (x >= 15 && x <= 18 && y >= 5 && y <= 7) return { bg: "transparent", isWall: true };
  
  // Decorative trees/borders
  if ((x < 3 || x > 16) && y > 11) return { bg: "transparent", isWall: true };

  return { bg: "transparent", isWall: false };
}

export function getDungeonTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#050410", isWall: true };
  const hash = (x * 7 + y * 13) % 11;
  if (hash === 0 && Math.abs(x - DUNGEON_ENTER.x) + Math.abs(y - DUNGEON_ENTER.y) > 4 && Math.abs(x - DUNGEON_EXIT.x) + Math.abs(y - DUNGEON_EXIT.y) > 4) return { bg: "#0a0818", isWall: true };
  const shade = (x * 3 + y * 5) % 3;
  return { bg: shade === 0 ? "#141228" : shade === 1 ? "#100e22" : "#16143a" + "aa", isWall: false };
}
