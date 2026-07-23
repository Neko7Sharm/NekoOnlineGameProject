import { Monster } from "../types/game";
import { gid } from "../utils/dice";

// Map Legend:
// . = Grass (Walkable)
// T = Tree (Obstacle, blocks sight)
// R = Rock (Obstacle, blocks sight, cover)
// H = Horizontal Log (Occupies 2x1, blocks sight, cover)
// V = Vertical Log (Occupies 1x2, blocks sight, cover)
// W = Water (Obstacle, does not block sight)
// E = Entrance (Spawn point)
// X = Exit
// G = Glowing Tree (Safe Zone marker)
// 
// Monsters:
// 1 = Slime, 2 = Wolf, 3 = Goblin Scout, 4 = Vine, B = Treant Sapling (Boss)
// L = Landmark (Sacred Tree, 4x4 area centered around this point)
export const MAP_LAYOUT = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........h....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..h.......4.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT....4.............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...............h...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.............4....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT....R...........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.h...TTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTTTTTTTTTTT.....TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTT...TTTTTTTTT.......TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTT....TTTTTTTTTTTTTTTT.....TTTTTTTTTTTTT....TTTTTTTT........TTTTT",
  "TTTTTTTTTT...TTTTTTTTTTTTTT.....TTTTTTTTTTTTTT......TTTTTTTTTTTTT.....TTTT............TTTT",
  "TTTTTTTTT....TTTTTTTTTTTTT......TTTTTTTTTTTT.........TTTTTTTTTTT......TTT...O.......R.TTTT",
  "TTTTTTTTT.....TTTTTTTT.......R...TTTTTTTTT...........TTTTTTT...........T...............TTT",
  "TTTTTT...........................T1TTTTTTT.............................T...............TTT",
  "TTTTT...................1.........TTTTTTTT..............................T...............TT",
  "TTTTTT..R.......................1.TTTTTTT...............................T................T",
  "TTTTTT...................h...............................................................T",
  "TTTTE...........................................R................LG.............B........T",
  "TTTT..............TTT.....................................T..............................T",
  "TTT......V........TT.........h..1................W.......................................T",
  "TTT.............TTTT......1..............................T...............................T",
  "TTTT...........TTTTT...............TTTTT................TT...............................T",
  "TTTTTT..TTT...TTTTTTT.............TTTTTT..............TTTTT.............................TT",
  "TTTTTTTTTTTT..TTTTTTTT...........TTTTTTTT.............TTTTTT....TTT.........R.......R..TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT.....T...TTTTTTTTTTTTT.......TTTTTTTTTTTTTTT...T...............TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTT......TTTTTTTTTTTTTTTTTTTTT...TTTT.....TTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT......TTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT....TTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT......TTTTTTTTTTTTTTTTT.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT.........TTTTTTTTTTTTTT......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT..........TTTTTTTTTT..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTT............TTTTTTTT............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT.............TTTTTTT.............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTT...O....R.......TTTT....3...........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTT............O....TTT.........F.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT.........O......TTTT..........3.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT..O..........TTTTTTT.....3...C...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT............TTTTTTTT............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT..........TTTTTTTTTT..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT......TTTTTTTTTTTTTT...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTT............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT...2...2...2.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTT.......V.........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT.............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT.........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

export function parseWhisperingForest() {
  const obstacles = new Set<string>();
  const lowObstacles = new Set<string>();
  const covers = new Set<string>();
  const water = new Set<string>();
  const monsters: Monster[] = [];
  const rocks: {x: number, y: number}[] = [];
  const logs: {x: number, y: number, type: "H" | "V" | "F"}[] = [];
  const glowingTrees: {x: number, y: number, range: number}[] = [];
  const chests: { id: string, position: {x: number, y: number}, opened: boolean }[] = [];
  const objects: { id: string, type: "ore" | "herb", position: {x: number, y: number}, state: "active" }[] = [];
  let entrance = { x: 50, y: 45 };
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
        lowObstacles.add(pos);
        logs.push({ x, y, type: "F" });
      } else if (char === 'H') {
        obstacles.add(pos);
        covers.add(pos);
        lowObstacles.add(pos);
        obstacles.add(`${x+1},${y}`);
        covers.add(`${x+1},${y}`);
        lowObstacles.add(`${x+1},${y}`);
        logs.push({ x, y, type: "H" });
      } else if (char === 'V') {
        obstacles.add(pos);
        covers.add(pos);
        lowObstacles.add(pos);
        obstacles.add(`${x},${y+1}`);
        covers.add(`${x},${y+1}`);
        lowObstacles.add(`${x},${y+1}`);
        logs.push({ x, y, type: "V" });
      } else if (char === 'W') {
        obstacles.add(pos);
        water.add(pos);
      } else if (char === 'E') {
        entrance = { x, y };
      } else if (char === 'G') {
        obstacles.add(pos);
        covers.add(pos);
        glowingTrees.push({ x, y, range: 6 });
      } else if (char === 'L') {
        landmark = { x, y };
      } else if (char === '1') {
        monsters.push({
          id: gid(), name: "Slime", hp: 10, maxHp: 10, ac: 8,
          position: { x, y }, damage: "1d4", damageType: "Bludgeoning", range: 1,
          attackMod: 2, initiative: 1, xp: 15, sightRange: 5, speed: 2, alerted: false,
          insightDC: 8, aiState: "idle", personality: "aggressive", visionType: "short_360", facing: "S", image: "monster_slime"
        });
      } else if (char === '2') {
        monsters.push({
          id: gid(), name: "Wolf", hp: 16, maxHp: 16, ac: 12,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 1,
          attackMod: 4, initiative: 4, xp: 25, sightRange: 7, speed: 4, alerted: false,
          insightDC: 10, aiState: "idle", personality: "aggressive", visionType: "360", facing: "S", image: "monster_wolf"
        });
      } else if (char === '3') {
        monsters.push({
          id: gid(), name: "Goblin Scout", hp: 18, maxHp: 18, ac: 13,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 6, // 30ft
          attackMod: 5, initiative: 3, xp: 35, sightRange: 8, speed: 4, alerted: false,
          insightDC: 13, aiState: "idle", personality: "cautious", visionType: "360", facing: "S", image: "monster_goblin"
        });
      } else if (char === '4') {
        monsters.push({
          id: gid(), name: "Walking Vine", hp: 22, maxHp: 22, ac: 10,
          position: { x, y }, damage: "1d8", damageType: "Bludgeoning", range: 2,
          attackMod: 3, initiative: 2, xp: 30, sightRange: 5, speed: 1, alerted: false,
          weaknesses: ["Fire"],
          insightDC: 12, aiState: "idle", personality: "territorial", visionType: "short_360", facing: "S", image: "monster_vine"
        });
      } else if (char === 'B') {
        monsters.push({
          id: gid(), name: "Ancient Treant Sapling", hp: 80, maxHp: 80, ac: 15,
          position: { x, y }, damage: "2d6+3", damageType: "Bludgeoning", range: 1,
          attackMod: 6, initiative: 5, xp: 200, sightRange: 10, speed: 1, alerted: false,
          resistances: ["Piercing"], weaknesses: ["Fire"],
          drops: ["Ancient Bark", "Treant Core", "Wooden Greatshield (Rare)"],
          bossSkillsUsed: {},
          size: 3,
          insightDC: 16, aiState: "idle", personality: "boss", visionType: "360", facing: "S", image: "monster_treant" as const
        });
      } else if (char === 'C') {
        chests.push({ id: gid(), position: { x, y }, opened: false });
        objects.push({ id: gid(), type: "chest", subType: "Wooden Chest", position: { x, y }, state: "active", turnsRequired: 2, turnsProgress: 0, noiseLevel: 2 });
        obstacles.add(pos);
      } else if (char === 'O') {
        const isIron = Math.random() > 0.4;
        objects.push({ id: gid(), type: "ore", subType: isIron ? "Iron Ore" : "Copper Ore", position: { x, y }, state: "active", turnsRequired: 3, turnsProgress: 0, noiseLevel: 3 });
        obstacles.add(pos);
      } else if (char === 'h') {
        const isMoon = Math.random() > 0.6;
        objects.push({ id: gid(), type: "herb", subType: isMoon ? "Moon Hydrangea" : "Healing Herb", position: { x, y }, state: "active", turnsRequired: 1, turnsProgress: 0, noiseLevel: 1 });
        obstacles.add(pos);
      }
    }
  }

  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      obstacles.add(`${landmark.x + dx},${landmark.y + dy}`);
      covers.add(`${landmark.x + dx},${landmark.y + dy}`);
    }
  }

  return {
    obstacles,
    lowObstacles,
    covers,
    water,
    monsters,
    entrance,
    exit,
    landmark,
    rocks,
    logs,
    glowingTrees,
    chests,
    objects
  };
}
