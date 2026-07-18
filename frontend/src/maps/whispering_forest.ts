import { Monster } from "../types/game";
import { gid } from "../utils/dice";

// Map Legend:
// . = Grass (Walkable)
// T = Tree (Obstacle, blocks sight)
// R = Rock (Obstacle, blocks sight, cover)
// F = Fallen Log (Obstacle, blocks sight, cover)
// W = Water (Obstacle, does not block sight)
// E = Entrance (Spawn point)
// X = Exit
// 
// Monsters:
// 1 = Slime, 2 = Wolf, 3 = Goblin Scout, 4 = Vine, B = Treant Sapling (Boss)
// L = Landmark (Sacred Tree, 4x4 area centered around this point)
export const MAP_LAYOUT = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.....................TTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "T......................TTTTTTTTTTT..T...T.T.TTTTTT",
  "T........................TTTTTTTT...1.......TTTTTT",
  "T...........B............TTTTTTT.......1....TTTTTT",
  "T........................TTTTTT..............TTTTT",
  "T..X.....................TTTTTT...F.....T....TTTTT",
  "T........................TTTTTT.....T.......TTTTTT",
  "T..........R.............TTTTTTT.......2....TTTTTT",
  "TT.........................TTTTTT..T........TTTTTT",
  "TTTT..........T......F.....TTTTTTTTTT....TTTTTTTTT",
  "TTTTTTT......R.............TTTTTTTTTT.2..TTTTTTTTT",
  "TTTTTTTTTT......TTTTTTTT...TTTTTTTTTT....TTTTTTTTT",
  "TTTTTTTTTT........TTTTTTT...TTTTTTTTT....TTTTTTTTT",
  "TTTTTTT.............TTTTT...................TTTTTT",
  "TTTTTT......L........TTT....................TTTTTT",
  "TTTTTT..........................WWWWWW......TTTTTT",
  "TTTTTT.......R...................WWWWW..3...TTTTTT",
  "TTTTTTT....................4.....WWWW.......TTTTTT",
  "TTTTTTTTT.........T...............WWW.......TTTTTT",
  "TTTTTTTTTTT.....TTT...............WW........TTTTTT",
  "TTTTTTTTTT.......TT....4.........WW.........TTTTTT",
  "TTTTTTTTT...R.....T..............W...3......TTTTTT",
  "TTTTTTTTT.........T......F..................TTTTTT",
  "TTTTTTTTT....2................F...W.........TTTTTT",
  "TTTTTTTTT.........T..............WW.........TTTTTT",
  "TTTTTTTTT..F......TT............WWW...T.....TTTTTT",
  "TTTTTTTTTT.......TTTTT........WWWWW.........TTTTTT",
  "TTTTTTTTTTT.....TTTTTTTT....WWWWWWWT........TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTT....T...TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTT........TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTT.....1...TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTT...T.....TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT..TTTT...........TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTT..TT.............TTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTT......T......T....TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTT..................TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTT...........E.......TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.................TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

export function parseWhisperingForest() {
  const obstacles = new Set<string>();
  const covers = new Set<string>();
  const water = new Set<string>();
  const monsters: Monster[] = [];
  const rocks: {x: number, y: number}[] = [];
  const logs: {x: number, y: number}[] = [];
  let entrance = { x: 45, y: 35 };
  let exit = { x: 5, y: 5 };
  let landmark = { x: 12, y: 15 };

  for (let y = 0; y < MAP_LAYOUT.length; y++) {
    const row = MAP_LAYOUT[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const pos = `${x},${y}`;

      if (char === 'T') {
        obstacles.add(pos);
        covers.add(pos);
      } else if (char === 'R') {
        obstacles.add(pos);
        covers.add(pos);
        rocks.push({ x, y });
      } else if (char === 'F') {
        obstacles.add(pos);
        covers.add(pos);
        logs.push({ x, y });
      } else if (char === 'W') {
        obstacles.add(pos);
        water.add(pos);
      } else if (char === 'E') {
        entrance = { x, y };
      } else if (char === 'X') {
        exit = { x, y };
      } else if (char === 'L') {
        landmark = { x, y };
      } else if (char === '1') {
        monsters.push({
          id: gid(), name: "Slime", hp: 10, maxHp: 10, ac: 8,
          position: { x, y }, damage: "1d4", damageType: "Bludgeoning", range: 1,
          attackMod: 2, initiative: 1, xp: 15, sightRange: 2, speed: 2, alerted: false,
          insightDC: 8, state: "idle", image: "monster_slime"
        });
      } else if (char === '2') {
        monsters.push({
          id: gid(), name: "Wolf", hp: 16, maxHp: 16, ac: 12,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 1,
          attackMod: 4, initiative: 4, xp: 25, sightRange: 5, speed: 4, alerted: false,
          insightDC: 10, state: "idle", image: "monster_wolf"
        });
      } else if (char === '3') {
        monsters.push({
          id: gid(), name: "Goblin Scout", hp: 18, maxHp: 18, ac: 13,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 6, // 30ft
          attackMod: 5, initiative: 3, xp: 35, sightRange: 7, speed: 4, alerted: false,
          insightDC: 13, state: "idle", image: "monster_goblin"
        });
      } else if (char === '4') {
        monsters.push({
          id: gid(), name: "Walking Vine", hp: 22, maxHp: 22, ac: 10,
          position: { x, y }, damage: "1d8", damageType: "Bludgeoning", range: 2,
          attackMod: 3, initiative: 2, xp: 30, sightRange: 3, speed: 1, alerted: false,
          weaknesses: ["Fire"],
          insightDC: 12, state: "idle", image: "monster_vine"
        });
      } else if (char === 'B') {
        monsters.push({
          id: gid(), name: "Ancient Treant Sapling", hp: 80, maxHp: 80, ac: 15,
          position: { x, y }, damage: "2d6+3", damageType: "Bludgeoning", range: 1,
          attackMod: 6, initiative: 5, xp: 200, sightRange: 20, speed: 1, alerted: false,
          resistances: ["Piercing"], weaknesses: ["Fire"],
          drops: ["Ancient Bark", "Treant Core", "Wooden Greatshield (Rare)"],
          bossSkillsUsed: {},
          size: 3,
          insightDC: 16, state: "idle", image: "monster_treant" as const
        });
      }
    }
  }

  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      obstacles.add(`${landmark.x + dx},${landmark.y + dy}`);
      covers.add(`${landmark.x + dx},${landmark.y + dy}`);
    }
  }

  return { obstacles, covers, water, monsters, entrance, exit, landmark, rocks, logs };
}
