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
  "9,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
  "10,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
  "11,13": { label: "Town Gate", type: "exit", icon: "🗺️", prompt: "Leave Millhaven and return to the World Map?", color: "#1a5a1a" },
};

// ─────────────────────────────────────────────────
// TILE GENERATORS
// ─────────────────────────────────────────────────

export function getTownTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#080c10", isWall: true };
  if (x >= 3 && x <= 7 && y >= 1 && y <= 4) return { bg: "#2d1a08", isWall: false };
  if (x >= 12 && x <= 16 && y >= 1 && y <= 4) return { bg: "#081428", isWall: false };
  if (x >= 9 && x <= 11 && y >= 6 && y <= 8) return { bg: "#081c30", isWall: false };
  if (y === 7 || y === 8 || x === 10 || x === 11) return { bg: "#4a3a28", isWall: false };
  if (y >= 12 && x >= 8 && x <= 12) return { bg: "#0a2010", isWall: false };
  const h = (x * 3 + y * 7) % 3;
  return { bg: h === 0 ? "#1a3a12" : h === 1 ? "#1e4216" : "#1c3e14", isWall: false };
}

export function getDungeonTile(x: number, y: number): { bg: string; isWall: boolean } {
  if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return { bg: "#050410", isWall: true };
  const hash = (x * 7 + y * 13) % 11;
  if (hash === 0 && Math.abs(x - DUNGEON_ENTER.x) + Math.abs(y - DUNGEON_ENTER.y) > 4 && Math.abs(x - DUNGEON_EXIT.x) + Math.abs(y - DUNGEON_EXIT.y) > 4) return { bg: "#0a0818", isWall: true };
  const shade = (x * 3 + y * 5) % 3;
  return { bg: shade === 0 ? "#141228" : shade === 1 ? "#100e22" : "#16143a" + "aa", isWall: false };
}
