// ─────────────────────────────────────────────────
// GRID / MAP CONSTANTS
// ─────────────────────────────────────────────────

export const COLS = 30;
export const ROWS = 20;
export const CELL = 38;
export const MOVE_SQUARES = 4;
export const SIGHT = 6;

// Entry / exit positions
export const TOWN_ENTER = { x: 15, y: 10 }; // Start in the middle
export const DUNGEON_ENTER = { x: 15, y: 19 };
export const DUNGEON_EXIT = { x: 14, y: 0 };

// Town special tiles
export const TOWN_SPECIAL: Record<string, { label: string; type: string; icon: string; prompt: string; color: string }> = {
  // --- 🏪 General Store (Top-Left) ---
  "6,7": { label: "General Store", type: "shop", icon: "🏪", prompt: "Enter the General Store?", color: "#c45000" },

  // --- 📋 Quest Board (Top-Right) ---
  "23,7": { label: "Quest Board", type: "quest", icon: "📋", prompt: "Check the Quest Board?", color: "#1e4aaa" },

  // --- 🏨 Hearthstone Inn (Bottom-Left) ---
  "6,13": { label: "Hearthstone Inn", type: "inn", icon: "🏨", prompt: "Enter the Hearthstone Inn?", color: "#8B5A2B" },

  // --- ⛪ Sacred Shrine (Bottom-Right) ---
  "23,13": { label: "Sacred Shrine", type: "shrine", icon: "⛪", prompt: "Enter the Sacred Shrine?", color: "#D4AF37" },

  // --- 🗺️ Town Gate (Exit) ---
  "14,19": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
  "15,19": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
  "16,19": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven?", color: "#1a5a1a" },
};

// ─────────────────────────────────────────────────
// TILE GENERATORS
// ─────────────────────────────────────────────────

export function getTownTile(x: number, y: number): { bg: string; isWall: boolean } {
  // Edge of map is always a wall, except the exit gate at bottom
  if ((x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) && y !== 19) return { bg: "transparent", isWall: true };
  
  // Define building obstacles (walls) - leave the TOWN_SPECIAL interaction tiles walkable
  
  // Shop is [2-9, 1-6]
  if (x >= 2 && x <= 9 && y >= 1 && y <= 6) return { bg: "transparent", isWall: true };
  
  // Quest Guild is [20-27, 1-6]
  if (x >= 20 && x <= 27 && y >= 1 && y <= 6) return { bg: "transparent", isWall: true };
  
  // Inn is [2-9, 14-18]
  if (x >= 2 && x <= 9 && y >= 14 && y <= 18) return { bg: "transparent", isWall: true };
  
  // Shrine is [20-27, 14-18]
  if (x >= 20 && x <= 27 && y >= 14 && y <= 18) return { bg: "transparent", isWall: true };
  
  return { bg: "transparent", isWall: false };
}

export function getDungeonTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#050410", isWall: true };
  const hash = (x * 7 + y * 13) % 11;
  if (hash === 0 && Math.abs(x - DUNGEON_ENTER.x) + Math.abs(y - DUNGEON_ENTER.y) > 4 && Math.abs(x - DUNGEON_EXIT.x) + Math.abs(y - DUNGEON_EXIT.y) > 4) return { bg: "#0a0818", isWall: true };
  const shade = (x * 3 + y * 5) % 3;
  return { bg: shade === 0 ? "#141228" : shade === 1 ? "#100e22" : "#16143a" + "aa", isWall: false };
}

export function isWalkable(mode: "town" | "dungeon", x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  if (mode === "town") return !getTownTile(x, y).isWall;
  if (mode === "dungeon") return !getDungeonTile(x, y).isWall;
  return true;
}
