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
// 
// Monsters:
// 1 = Slime, 2 = Wolf, 3 = Goblin Scout, 4 = Vine, B = Treant Sapling (Boss)
// L = Landmark (Sacred Tree, 4x4 area centered around this point)
export const MAP_LAYOUT = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.......................................TTTTTTTTTTTTTTTTTTT",
  "T.....X...................R................TTTTTTTTTTTTTTTTT",
  "T..........................................TTTTT......TTTTTT",
  "T.........B........................2.......TTTTT...1..TTTTTT",
  "T..........................................TTTT........TTTTT",
  "T.........................TTTTTTTT...H..........T......TTTTT",
  "T...R............T........TTTTTTTT..............T.......TTTT",
  "T................T........TTTTTTTT........H.....TT......TTTT",
  "TT...................T....TTTTTTTT......................TTTT",
  "TTTT......................TTTTTTTT.................1....TTTT",
  "TTTTTTT..........H........TTTTTTTT...R............T.....TTTT",
  "TTTTTTTTTT........1.......TTTTTTTT................T....TTTTT",
  "TTTTTTTTTT...R..........TTTTTTTTTTTTTTTTTT......TTT....TTTTT",
  "TTTTTTT.................TTTTTTTTTTTTTTTTTT......TTT...TTTTTT",
  "TTTTTT........T.........TTTTT......TTTTTTTT...TTTTT...TTTTTT",
  "TTTTTT........T.......................TTTTT...TTTTTTTTTTTTTT",
  "TTTTTT.................................TTTT.......TTTTTTTTTT",
  "TTTTTT.................................TTT..V..........TTTTT",
  "TTTTTT......L..................3.......TT.......3......TTTTT",
  "TTTTTTT........................TTTT....................TTTTT",
  "TTTTTTTTT..........T...........TTTT....T..........R....TTTTT",
  "TTTTTTTTTTT......TTT.......W...TTTT....TTT.............TTTTT",
  "TTTTTTTTTT.......TT...4....W...TTTT.....TTT........H...TTTTT",
  "TTTTTTTTT...H.....T.......WW...TTTT....................TTTTT",
  "TTTTTTTTT.........T.......WW.....TTT..........1........TTTTT",
  "TTTTTTTTT....2............WWWW.........................TTTTT",
  "TTTTTTTTT.........T.........WWWW................V......TTTTT",
  "TTTTTTTTT.........TT..........WWWW.....................TTTTT",
  "TTTTTTTTTT.......TTTTT..........WWWW...................TTTTT",
  "TTTTTTTTTTT.....TTTTTTT.4.........WWWWW.....R..........TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT..............WWWW..............TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT...............WWWWW.....TTTT...TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT...H.............WWWW....TTTT...TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT...................WW....TTTT...TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT.........................TT....TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT.........................TTT...TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTT..........................TTT..TTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT...R...........................TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT.................................TTTTTT",
  "TTTTTTTTTTTTTTTTTTT.......................T...H.......TTTTTT",
  "TTTTTTTTTTTTTTTTT....................T....T...........TTTTTT",
  "TTTTTTTTTTTTTTTT.....................T....T...........TTTTTT",
  "TTTTTTTTTTTTTTTT.................R...T....T......E....TTTTTT",
  "TTTTTTTTTTTTTTTTTTT...................................TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT.........H.......................TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT...............................TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTT.............................TTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

export function parseWhisperingForest() {
  const obstacles = new Set<string>();
  const lowObstacles = new Set<string>();
  const covers = new Set<string>();
  const water = new Set<string>();
  const monsters: Monster[] = [];
  const rocks: {x: number, y: number}[] = [];
  const logs: {x: number, y: number, type: "H" | "V" | "F"}[] = [];
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
      } else if (char === 'X') {
        exit = { x, y };
      } else if (char === 'L') {
        landmark = { x, y };
      } else if (char === '1') {
        monsters.push({
          id: gid(), name: "Slime", hp: 10, maxHp: 10, ac: 8,
          position: { x, y }, damage: "1d4", damageType: "Bludgeoning", range: 1,
          attackMod: 2, initiative: 1, xp: 15, sightRange: 2, speed: 2, alerted: false,
          insightDC: 8, aiState: "idle", personality: "aggressive", visionType: "360", facing: "S", image: "monster_slime"
        });
      } else if (char === '2') {
        monsters.push({
          id: gid(), name: "Wolf", hp: 16, maxHp: 16, ac: 12,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 1,
          attackMod: 4, initiative: 4, xp: 25, sightRange: 5, speed: 4, alerted: false,
          insightDC: 10, aiState: "idle", personality: "aggressive", visionType: "180", facing: "S", image: "monster_wolf"
        });
      } else if (char === '3') {
        monsters.push({
          id: gid(), name: "Goblin Scout", hp: 18, maxHp: 18, ac: 13,
          position: { x, y }, damage: "1d6+2", damageType: "Piercing", range: 6, // 30ft
          attackMod: 5, initiative: 3, xp: 35, sightRange: 7, speed: 4, alerted: false,
          insightDC: 13, aiState: "idle", personality: "cautious", visionType: "cone", facing: "S", image: "monster_goblin"
        });
      } else if (char === '4') {
        monsters.push({
          id: gid(), name: "Walking Vine", hp: 22, maxHp: 22, ac: 10,
          position: { x, y }, damage: "1d8", damageType: "Bludgeoning", range: 2,
          attackMod: 3, initiative: 2, xp: 30, sightRange: 3, speed: 1, alerted: false,
          weaknesses: ["Fire"],
          insightDC: 12, aiState: "idle", personality: "territorial", visionType: "short_360", facing: "S", image: "monster_vine"
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
          insightDC: 16, aiState: "idle", personality: "boss", visionType: "180", facing: "S", image: "monster_treant" as const
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
    logs
  };
}
