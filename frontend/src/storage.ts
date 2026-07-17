import type { GameState } from "./types/game";
import { gid, tnow, dist } from "./utils/dice";
import { genMonsters, genQuests } from "./game/character";

// ─────────────────────────────────────────────────
// LOCAL STORAGE PERSISTENCE
// ─────────────────────────────────────────────────

export const SAVE_KEY = "dnd_online_v2";

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    accounts: [], characters: {},
    globalChat: [
      { id: gid(), sender: "System", text: "Welcome to DnD Online! Your adventure begins.", time: tnow() },
      { id: gid(), sender: "Tavern Master", text: "Ale and steel! The dungeon won't explore itself~", time: tnow() },
    ],
    partyChat: [], party: null, // Keep for backward compatibility with older saves if needed
    dungeonMonsters: genMonsters(),
    dungeonChests: [],
    dungeonSecrets: [],
    availableQuests: genQuests(10),
    questRefreshAt: Date.now() + 5 * 60 * 1000,
  } as GameState;
}

export function persist(gs: GameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(gs));
}
