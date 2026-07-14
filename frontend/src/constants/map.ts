// ─────────────────────────────────────────────────
// GRID / MAP CONSTANTS
// ─────────────────────────────────────────────────

export const COLS = 30;
export const ROWS = 20;
export const CELL = 38;
export const MOVE_SQUARES = 4;
export const SIGHT = 6;

// Entry / exit positions
export const TOWN_ENTER = { x: 15, y: 10 }; // Start in the middle of the central path
export const DUNGEON_ENTER = { x: 22, y: 19 }; // Bottom exit
export const DUNGEON_EXIT = { x: 22, y: 0 };

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

  // --- 🚪 Exit ---
  "22,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" },
  "23,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" },
  "24,19": { label: "Town Exit", type: "exit", icon: "🚪", prompt: "Leave Town and enter the Dungeon?", color: "#4caf50" }
};

// ─────────────────────────────────────────────────
// TILE GENERATORS
// ─────────────────────────────────────────────────

export function getTownTile(x: number, y: number): { bg: string; isWall: boolean, type: "grass" | "path" | "fence" } {
  // Map Boundaries
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) {
    if (x >= 20 && x <= 24 && y === 19) return { bg: "transparent", isWall: false, type: "path" }; // Exit path
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
