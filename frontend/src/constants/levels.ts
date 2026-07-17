// ─────────────────────────────────────────────────
// LEVEL UP EXPERIENCE REQUIREMENTS
// ─────────────────────────────────────────────────
// Lv1 → Lv2: 500, Lv2 → Lv3: 1000, etc.

export const EXP_REQUIREMENTS: Record<number, number> = {
  1: 500,
  2: 1000,
  3: 2000,
  4: 4000,
  5: 8000,
  6: 16000,
  7: 32000,
  8: 64000,
  9: 128000,
};

// Get cumulative EXP needed to reach a level
export function getTotalExpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += EXP_REQUIREMENTS[i] || 128000;
  }
  return total;
}

// Get EXP needed to next level
export function getExpToNextLevel(currentLevel: number, currentExp: number): number {
  const nextLevel = Math.min(currentLevel + 1, 10);
  const totalExpNeeded = getTotalExpForLevel(nextLevel);
  return Math.max(0, totalExpNeeded - currentExp);
}

// Get progress to next level (0-1)
export function getLevelProgress(level: number, exp: number): number {
  if (level >= 10) return 1;
  const currentLevelExp = getTotalExpForLevel(level);
  const nextLevelExp = getTotalExpForLevel(level + 1);
  const progress = (exp - currentLevelExp) / (nextLevelExp - currentLevelExp);
  return Math.max(0, Math.min(1, progress));
}

// ─────────────────────────────────────────────────
// REST COOLDOWN CONSTANTS
// ─────────────────────────────────────────────────

export const SHORT_REST_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
export const LONG_REST_COST = 10; // gold
export const QUEST_CANCEL_COST = 10; // gold
