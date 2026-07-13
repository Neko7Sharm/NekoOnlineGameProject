import type { Character, CharClass, Monster, Quest, Stats, Item } from "../types/game";
import { CLASS_CFG, PROFICIENCY_LIST } from "../constants/classes";
import { QUEST_TEMPLATES } from "../constants/quests";
import { DUNGEON_ENTER } from "../constants/map";
import { gid, getMod, calcAC, dist } from "../utils/dice";

// ─────────────────────────────────────────────────
// CHARACTER CREATION
// ─────────────────────────────────────────────────

export function createCharacter(
  name: string, avatar: string, cls: CharClass,
  customStats?: Stats, selectedSkills?: string[], spellChoice?: string
): Character {
  const cfg = CLASS_CFG[cls];
  const stats: Stats = { ...(customStats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }) };
  if (selectedSkills) {
    selectedSkills.forEach(sk => {
      const prof = PROFICIENCY_LIST.find(p => p.name === sk);
      if (prof) (stats[prof.stat] as number) += 1;
    });
  }
  const conMod = getMod(stats.con);
  const maxHp = cfg.hpBase + conMod;
  const weapon: Item = { ...cfg.weapon, id: gid() };
  const armor: Item = { ...cfg.armor, id: gid() };
  const extra: Item[] = (cfg.extra ?? []).map(e => ({ ...e, id: gid() }));
  const char: Character = {
    id: gid(), name, avatar, class: cls,
    level: 1, exp: 0, gold: 10,
    stats, hp: maxHp, maxHp, ac: cfg.acBase,
    profBonus: 2, skills: cfg.skills, savingThrows: cfg.saves,
    spellSlots: cfg.spellMax ? { used: 0, max: cfg.spellMax } : undefined,
    spellChoice,
    customSkills: selectedSkills ?? cfg.skills,
    inventory: extra,
    equipment: { weapon, armor, accessories: [null, null, null] },
    position: { x: 10, y: 7 }, currentMap: "town",
  };
  char.ac = calcAC(char);
  return char;
}

// ─────────────────────────────────────────────────
// MONSTER SPAWNING
// ─────────────────────────────────────────────────

export function genMonsters(): Monster[] {
  const count = 3 + Math.floor(Math.random() * 3);
  const monsters: Monster[] = [];
  const used = new Set<string>();
  while (monsters.length < count) {
    const x = 2 + Math.floor(Math.random() * 16);
    const y = 2 + Math.floor(Math.random() * 8);
    const key = `${x},${y}`;
    if (used.has(key) || dist({ x, y }, DUNGEON_ENTER) < 5) continue;
    used.add(key);
    monsters.push({
      id: gid(), name: "Wooden Dummy", hp: 10, maxHp: 10, ac: 5,
      position: { x, y }, damage: "1d4", range: 5,
      attackMod: 0, initiative: 0, xp: 15, sightRange: 4, alerted: false,
    });
  }
  return monsters;
}

// ─────────────────────────────────────────────────
// QUEST GENERATION
// ─────────────────────────────────────────────────

export function genQuests(n = 10): Quest[] {
  return [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, n).map(t => {
    if (t.gather) {
      return {
        id: gid(), title: t.title, description: t.desc.replace("{n}", String(t.n)),
        gatherTarget: { itemName: t.gather, count: t.n },
        reward: { exp: t.exp, gold: t.gold },
      };
    }
    return {
      id: gid(), title: t.title, description: t.desc.replace("{n}", String(t.n)),
      killTarget: { monster: "Wooden Dummy", count: t.n, current: 0 },
      reward: { exp: t.exp, gold: t.gold },
    };
  });
}

