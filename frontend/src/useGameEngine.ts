import { useState, useEffect, useRef, useCallback } from "react";
import type {
  GameState, Character, Item, CombatState, CombatModeT, VisualEffect, DiceRollDisplay, Screen, Stats, Quest
} from "./types/game";
import { C } from "./constants/theme";
import { CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES, PROFICIENCY_LIST } from "./constants/classes";
import { SKILL_DICTIONARY } from "./constants/skills";
import { SHOP_ITEMS, STARTING_ITEMS, BRANCH_ITEM, MONSTER_DROPS } from "./constants/items";
import { NPC_CHAT } from "./constants/quests";
import {
  getMapRows, getMapCols, TOWN_ENTER, DUNGEON_ENTER, DUNGEON_EXIT,
  TOWN_SPECIAL, SANCTUARY_SPECIAL, DUNGEON_SPECIAL, isWalkable, SIGHT, MOVE_SQUARES
} from "./constants/map";
import { gid, d20, getMod, dist, distToEntity, tnow, rollDice, getSpellcastingMod, calcAC, getWeaponStat, getEffectiveDamage } from "./utils/dice";
import { loadState, persist } from "./storage";
import { genMonsters, genQuests } from "./game/character";
import { parseWhisperingForest } from "./maps/whispering_forest";
const wfMap = parseWhisperingForest();

export function checkLineOfSight(x0: number, y0: number, x1: number, y1: number, obstacles: Set<string>, covers?: Set<string>, ignoreCover: boolean = false): boolean {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = (x0 < x1) ? 1 : -1;
  let sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  while(true) {
    if (x0 === x1 && y0 === y1) return true; // Reached target
    if (obstacles.has(`${x0},${y0}`) && !wfMap.lowObstacles.has(`${x0},${y0}`)) return false; // Blocked by wall
    if (!ignoreCover && covers && covers.has(`${x0},${y0}`)) return false; // Blocked by cover (unless ignored)
    
    let e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// ── HYBRID FOV VISION CHECK ──
export function checkMonsterVision(
  monster: import("./types/game").Monster,
  targetX: number, targetY: number,
  obstacles: Set<string>, covers: Set<string>,
  stealthMode: boolean = false
): boolean {
  // 1. Line of Sight check (Cover blocks vision during exploration)
  if (!checkLineOfSight(monster.position.x, monster.position.y, targetX, targetY, obstacles, covers, false)) {
    return false;
  }
  
  const dist = Math.max(Math.abs(monster.position.x - targetX), Math.abs(monster.position.y - targetY));
  
  // 2. Range check
  const vType = monster.visionType || "360";
  let maxRange = monster.sightRange;
  if (vType === "short_360") maxRange = Math.min(3, maxRange);
  if (dist > maxRange) return false;

  // 3. Directional/Cone check
  const dx = targetX - monster.position.x;
  const dy = targetY - monster.position.y;
  
  // They can always sense you if you're right next to them (1 tile 360 vision)
  if (dist <= 1 && !stealthMode) return true;
  if (dist <= 1 && stealthMode) {
     // If stealthed, maybe give a chance? For now, let's say they still see you if you're right next to them
     // unless you are perfectly hidden. Let's just return true.
     return true;
  }
  
  // Angle relative to monster. 0 is Right(E), PI/2 is Down(S), PI is Left(W), -PI/2 is Up(N).
  const angleToTarget = Math.atan2(dy, dx); 
  
  let facingAngle = 0;
  switch (monster.facing || "S") {
    case "N": facingAngle = -Math.PI/2; break;
    case "E": facingAngle = 0; break;
    case "S": facingAngle = Math.PI/2; break;
    case "W": facingAngle = Math.PI; break;
  }
  
  // Normalize angle diff to [-PI, PI]
  let angleDiff = angleToTarget - facingAngle;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  angleDiff = Math.abs(angleDiff);

  let inVision = false;
  let isPeripheral = false;

  if (vType === "360" || vType === "short_360") {
    inVision = true;
  } else if (vType === "180") { // 180 degrees (PI radians) => +/- 90 deg (PI/2)
    if (angleDiff <= Math.PI / 2 + 0.1) inVision = true;
    if (angleDiff > Math.PI / 4 && angleDiff <= Math.PI / 2 + 0.1) isPeripheral = true;
  } else if (vType === "cone" || vType === "90") { // 90 degrees => +/- 45 deg (PI/4)
    if (angleDiff <= Math.PI / 4 + 0.1) inVision = true;
    if (angleDiff > Math.PI / 8 && angleDiff <= Math.PI / 4 + 0.1) isPeripheral = true;
  }

  if (!inVision) return false;

  // 4. Stealth check interaction
  // We no longer arbitrarily reduce vision range here. The actual stealth roll
  // happens in the AI loop when seesPlayer is true.

  return true;
}

const INIT_COMBAT: CombatState = {
  active: false, round: 0, turnOrder: [], currentIndex: 0,
  actionUsed: false, extraActionUsed: false, movedSquares: 0,
  extraMainActions: 0, log: [], engagedMonsterIds: [], activeBuffs: [],
  warnings: []
};

function consumeMainAction(prev: CombatState): Partial<CombatState> {
  if (prev.extraMainActions && prev.extraMainActions > 0) {
    return { extraMainActions: prev.extraMainActions - 1 };
  }
  return { actionUsed: true };
}

export function useGameEngine() {
  const [gs, setGs] = useState<GameState>(loadState);
  const [session, setSession] = useState<{ username: string; charIds: string[] } | null>(null);
  const [hoveredMonsterId, setHoveredMonsterId] = useState<string | null>(null);
  const [seleniaDialogTree, setSeleniaDialogTree] = useState<Record<string, import("./types/game").DialogNode> | null>(null);
  const [seleniaPopup, setSeleniaPopup] = useState<{ emotion: string; text: string } | null>(null);
  const [seleniaTalkCount, setSeleniaTalkCount] = useState(0);

  const showSeleniaPopup = useCallback((emotion: string, texts: string[]) => {
    const text = texts[Math.floor(Math.random() * texts.length)];
    setSeleniaPopup({ emotion, text });
    setTimeout(() => setSeleniaPopup(null), 5000); // Increased to 5s
  }, []);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const [creatingChar, setCreatingChar] = useState(false);
  const [combat, setCombat] = useState<CombatState>(INIT_COMBAT);
  const [fogRevealed, setFogRevealed] = useState<Set<string>>(new Set());
  const [combatMode, setCombatMode] = useState<CombatModeT>("none");
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [dyingMonsters, setDyingMonsters] = useState<Set<string>>(new Set());
  const [hitTokenIds, setHitTokenIds] = useState<Set<string>>(new Set());
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [movingPath, setMovingPath] = useState<{x:number, y:number}[]>([]);
  const [pendingBombItemId, setPendingBombItemId] = useState<string | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRollDisplay[]>([]);
  const [battleStart, setBattleStart] = useState(false);
  const [hudTab, setHudTab] = useState<"char" | "inv" | "equip" | "acc" | "chat" | "party" | "skills">("char");
  const [hudOpen, setHudOpen] = useState(true);
  const [chatTab, setChatTab] = useState<"global" | "party">("global");
  const [specialDialog, setSpecialDialog] = useState<{ x: number; y: number; tile: { label: string; type: string; icon: string; prompt: string; color: string }; confirmed?: boolean } | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [skillObtained, setSkillObtained] = useState<{ id: string; name: string; icon: string; desc: string } | null>(null);
  const [actionText, setActionText] = useState<{ text: string; color: string } | null>(null);
  const [restAnim, setRestAnim] = useState<"short" | "long" | null>(null);
  const [zooms, setZooms] = useState<Record<string, number>>({
    town: 0.4,
    sanctuary: 0.5,
    dungeon: 0.5,
    tutorial: 0.7,
    worldMap: 1.0
  });
  const zoom = zooms[screen] ?? 1.0;
  const setZoom = useCallback((valOrFn: React.SetStateAction<number>) => {
    setZooms(prev => {
      const current = prev[screen] ?? 1.0;
      const next = typeof valOrFn === "function" ? (valOrFn as any)(current) : valOrFn;
      return { ...prev, [screen]: next };
    });
  }, [screen]);
  const [shopPurchaseAnim, setShopPurchaseAnim] = useState<string | null>(null);
  
  // Exploration System States
  const [insightCooldown, setInsightCooldown] = useState<number>(0);
  const [insightVisionTiles, setInsightVisionTiles] = useState<Set<string>>(new Set());
  const insightRevealedIdsRef = useRef<Set<string>>(new Set());
  const lsAttackFlipRef = useRef<boolean>(false);
  const insightActiveUntilRef = useRef<number>(0);
  const [stealthActive, setStealthActive] = useState(false);
  const stealthedMonstersRef = useRef<Set<string>>(new Set());
  // Synchronous gate so tutorials never fire twice even when React state hasn't flushed yet
  const tutorialsSeenRef = useRef<Set<string>>(new Set());
  const [stealthCasting, setStealthCasting] = useState(false);

  const monsterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const char = activeCharId ? gs.characters[activeCharId] : null;
  const charRef = useRef<Character | null>(char);
  useEffect(() => { charRef.current = char; }, [char]);

  useEffect(() => { persist(gs); }, [gs]);

  // Sync tutorialsSeenRef from persisted char state on login / char switch
  useEffect(() => {
    if (char?.tutorialsSeen) {
      char.tutorialsSeen.forEach(id => tutorialsSeenRef.current.add(id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharId]);

  // NPC chat
  useEffect(() => {
    const iv = setInterval(() => {
      const npc = NPC_CHAT[Math.floor(Math.random() * NPC_CHAT.length)];
      setGs(prev => ({ ...prev, globalChat: [...prev.globalChat.slice(-49), { id: gid(), sender: npc.sender, text: npc.text, time: tnow() }] }));
    }, 25000 + Math.random() * 20000);
    return () => clearInterval(iv);
  }, []);

  // Quest refresh
  useEffect(() => {
    const iv = setInterval(() => {
      setGs(prev => Date.now() >= prev.questRefreshAt
        ? { ...prev, availableQuests: genQuests(10), questRefreshAt: Date.now() + 5 * 60 * 1000 }
        : prev);
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const notify = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const notifySkill = useCallback((id: string, name: string, icon: string, desc: string) => {
    setSkillObtained({ id, name, icon, desc });
    setTimeout(() => setSkillObtained(null), 5000);
  }, []);

  const addEffect = useCallback((e: Omit<VisualEffect, "id">) => {
    const effect = { ...e, id: gid() };
    setEffects(prev => [...prev, effect]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== effect.id)), 900);
  }, []);

  const addHit = useCallback((id: string) => {
    setHitTokenIds(prev => new Set([...prev, id]));
    setTimeout(() => setHitTokenIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 380);
  }, []);

  const addDiceRoll = useCallback((roll: Omit<DiceRollDisplay, "id" | "phase">) => {
    const r: DiceRollDisplay = { ...roll, id: gid(), phase: "rolling" };
    setDiceRolls(prev => [...prev.slice(-4), r]);
    setTimeout(() => setDiceRolls(prev => prev.map(d => d.id === r.id ? { ...d, phase: "done" } : d)), 520);
    setTimeout(() => setDiceRolls(prev => prev.filter(d => d.id !== r.id)), 3500);
  }, []);

  const updateChar = useCallback((id: string, upd: Partial<Character> | ((c: Character) => Partial<Character>)) => {
    setGs(prev => {
      const c = prev.characters[id];
      if (!c) return prev;
      const changes = typeof upd === "function" ? upd(c) : upd;
      return { ...prev, characters: { ...prev.characters, [id]: { ...c, ...changes } } };
    });
  }, []);

  const isQuestReadyToTurnIn = useCallback((quest: Quest | undefined, inventory: Item[] = char?.inventory ?? []) => {
    if (!quest) return false;
    if (quest.readyToTurnIn || quest.completed) return true;
    if (quest.gatherTarget) {
      const count = inventory.filter(i => i.name === quest.gatherTarget!.itemName).length;
      return count >= quest.gatherTarget.count;
    }
    if (quest.killTarget) {
      return (quest.killTarget.current ?? 0) >= quest.killTarget.count;
    }
    return false;
  }, [char?.inventory]);

  // ── COMBAT ──

  const startCombat = useCallback((monsterIds: string[]) => {
    if (!char) return;
    setStealthActive(false);
    stealthedMonstersRef.current.clear();
    setStealthCasting(false);
    setTimeout(() => setActionText(null), 1500);
    setBattleStart(true);
    setTimeout(() => setBattleStart(false), 1800);
    const playerInit = 20 + getMod(char.stats.dex);
    const order: CombatState["turnOrder"] = [{ id: char.id, type: "player" as const, name: char.name, initiative: playerInit }];
    const engaged = gs.dungeonMonsters.filter(m => monsterIds.includes(m.id) && m.hp > 0);
    engaged.forEach(m => {
      const init = Math.min(19, d20());
      order.push({ id: m.id, type: "monster" as const, name: m.name, initiative: init });
    });
    order.sort((a, b) => b.initiative - a.initiative);
    const log = [
      `⚔ Combat! Round 1`,
      `${char.name} initiative: ${playerInit} (20+DEX)`,
      ...engaged.map(m => `${m.name} initiative: ${order.find(o => o.id === m.id)?.initiative}`),
    ];
    setGs(prev => ({ ...prev, dungeonMonsters: prev.dungeonMonsters.map(m => monsterIds.includes(m.id) ? { ...m, alerted: true } : m) }));
    setCombat({ active: true, round: 1, turnOrder: order, currentIndex: 0, actionUsed: false, extraActionUsed: false, extraMainActions: 0, movedSquares: 0, log, engagedMonsterIds: monsterIds, activeBuffs: [] });
    setCombatMode("none");
  }, [char, gs.dungeonMonsters]);

  const endCombat = useCallback((c: CombatState) => {
    if (!char) return;
    const dead = gs.dungeonMonsters.filter(m => c.engagedMonsterIds.includes(m.id) && m.hp <= 0);
    let baseExp = 0;
    const drops: Item[] = [];
    dead.forEach(m => {
      baseExp += m.xp;
      
      const tryDrop = (itemName: string, chance: number) => {
        if (Math.random() < chance) {
          const itemDef = MONSTER_DROPS.find(i => i.name === itemName);
          if (itemDef) drops.push({ id: gid(), ...itemDef });
        }
      };

      if (m.name === "Slime") {
        updateChar(char.id, ch => ({ gold: ch.gold + 3 + Math.floor(Math.random() * 6) })); // 3-8
        tryDrop("Slime Gel", 0.80);
        tryDrop("Slime Core", 0.25);
        tryDrop("Sticky Residue", 0.10);
        tryDrop("Pure Slime Core", 0.01);
        tryDrop("Rusty Dagger", 0.005);
      } else if (m.name === "Wolf") {
        updateChar(char.id, ch => ({ gold: ch.gold + 5 + Math.floor(Math.random() * 8) })); // 5-12
        tryDrop("Wolf Fang", 0.75);
        tryDrop("Wolf Fur", 0.65);
        tryDrop("Tough Leather", 0.25);
        tryDrop("Sharp Claw", 0.15);
        tryDrop("Alpha Fang", 0.02);
        tryDrop("Leather Boots", 0.01);
      } else if (m.name === "Walking Vine") {
        updateChar(char.id, ch => ({ gold: ch.gold + 5 + Math.floor(Math.random() * 6) })); // 5-10
        tryDrop("Vine Fiber", 0.80);
        tryDrop("Green Sap", 0.45);
        tryDrop("Living Vine", 0.12);
        tryDrop("Ancient Vine", 0.02);
      } else if (m.name === "Goblin Scout") {
        updateChar(char.id, ch => ({ gold: ch.gold + 8 + Math.floor(Math.random() * 11) })); // 8-18
        tryDrop("Broken Arrow", 0.70);
        tryDrop("Goblin Ear", 0.60);
        tryDrop("Scout Cloak", 0.06);
        tryDrop("Scout Badge", 0.02);
        tryDrop("Hunter Bow", 0.01);
      } else if (m.name === "Ancient Treant") {
        updateChar(char.id, ch => ({ gold: ch.gold + 100 + Math.floor(Math.random() * 51) })); // 100-150
        tryDrop("Ancient Bark", 1.00);
        tryDrop("Treant Heartwood", 0.70);
        tryDrop("Nature Crystal", 0.30);
        tryDrop("Treant Core", 0.10);
        tryDrop("Treant Seed", 0.05);
        tryDrop("Woodland Shield", 0.03);
      } else {
        // Fallback for tutorial dummy etc
        if (Math.random() < 0.4) drops.push({ id: gid(), name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." });
        if (Math.random() < 0.5) drops.push({ id: gid(), ...BRANCH_ITEM });
        if (Math.random() < 0.6) updateChar(char.id, ch => ({ gold: ch.gold + 2 + Math.floor(Math.random() * 5) }));
      }
    });
    let updatedAQ = (char.activeQuests || []).map(q => {
      if (q.killTarget) {
        const targetMonster = q.killTarget.monster;
        const matchingDeadCount = dead.filter(m => m.name === targetMonster || m.name.includes(targetMonster)).length;
        if (matchingDeadCount > 0) {
          const nextCurrent = Math.min((q.killTarget.current ?? 0) + matchingDeadCount, q.killTarget.count);
          return { ...q, killTarget: { ...q.killTarget, current: nextCurrent } };
        }
      }
      return q;
    });
    updatedAQ = updatedAQ.map(q => {
      if (isQuestReadyToTurnIn(q, char.inventory) && !q.readyToTurnIn && !q.completed) {
        notify(`📋 Quest complete: ${q.title}! Return to the Quest Board to claim your reward.`);
        return { ...q, readyToTurnIn: true };
      }
      return q;
    });
    let isTutorialClear = false;
    dead.forEach(m => {
      if (m.name === "Training Dummy") isTutorialClear = true;
    });
    
    const totalExp = char.tutorialCompleted ? Math.floor(baseExp * 1.02) : baseExp;

    if (isTutorialClear) {
      const alreadyCompleted = char.tutorialCompleted;

      if (!alreadyCompleted) {
        updateChar(char.id, ch => ({
          ...ch,
          exp: ch.exp + totalExp,
          inventory: [...ch.inventory, ...drops],
          activeQuests: updatedAQ,
          tutorialCompleted: true,
          maxHp: ch.maxHp + 5,
          hp: ch.hp + 5,
          position: { x: 15, y: 15 },
          currentMap: "sanctuary"
        }));
      } else {
        updateChar(char.id, ch => ({
          ...ch,
          exp: ch.exp + totalExp,
          inventory: [...ch.inventory, ...drops],
          activeQuests: updatedAQ,
          position: { x: 15, y: 15 },
          currentMap: "sanctuary"
        }));
      }
      setScreen("sanctuary");
      
      // Start Tutorial Clear Dialog
      setTimeout(() => {
        if (!alreadyCompleted) {
          setSeleniaDialogTree({
            start: {
              emotion: "happy",
              text: "Excellent work, Traveler!",
              next: "mod2"
            },
            mod2: {
              emotion: "normal",
              text: "Combat may seem complicated at first, but you'll become stronger with every battle.",
              next: "mod3"
            },
            mod3: {
              emotion: "gentle",
              text: "Whenever you encounter something new, I'll be here to help explain it. So don't be afraid to explore, experiment, and enjoy your adventure.",
              next: "blessing"
            },
            blessing: {
              emotion: "gentle",
              text: "Before you go, allow me to bestow a small blessing upon you. May it protect you on your path.",
              next: "farewell"
            },
            farewell: {
              emotion: "happy",
              text: "Now... Selestia Horizon is waiting for you. Good luck! ✨",
              next: () => {
                setSeleniaDialogTree(null);
                updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" });
                setScreen("town");
                notifySkill("selenia_blessing", "Blessing of Selenia", "✨", "Permanent +2% EXP Gain");
              }
            }
          });
        } else {
          setSeleniaDialogTree({
            start: {
              emotion: "playful",
              text: "Fufu, as skilled as ever.",
              next: "farewell"
            },
            farewell: {
              emotion: "gentle",
              text: "No matter how far you wander, remember that this Sanctuary will always be a place of rest for you. Have a safe journey.",
              next: () => {
                setSeleniaDialogTree(null);
                updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" });
                setScreen("town");
              }
            }
          });
        }
      }, 500);

    } else {
      updateChar(char.id, ch => ({ exp: ch.exp + totalExp, inventory: [...ch.inventory, ...drops], activeQuests: updatedAQ }));
      if (char.tutorialCompleted && baseExp > 0 && totalExp > baseExp) {
        notify(`✨ Blessing of Selenia active!`);
      }
      notify(`⚔️ Victory! +${totalExp} EXP${drops.length > 0 ? `, ${drops.length} item(s)` : ""}`);
    }

    setCombat(INIT_COMBAT); setCombatMode("none");
  }, [char, gs.dungeonMonsters, notify, updateChar, isQuestReadyToTurnIn]);

  // Win condition
  useEffect(() => {
    if (!combat.active) return;
    const alive = gs.dungeonMonsters.filter(m => m.hp > 0 && combat.engagedMonsterIds.includes(m.id));
    if (alive.length === 0) endCombat(combat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.dungeonMonsters, combat.active]);


  // New monsters joining
  useEffect(() => {
    if (!combat.active || !char || screen !== "dungeon") return;
    const inSight = gs.dungeonMonsters.filter(m => 
      m.hp > 0 && 
      distToEntity(char.position, m.position, m.size) <= m.sightRange &&
      checkLineOfSight(m.position.x, m.position.y, char.position.x, char.position.y, wfMap.obstacles)
    );
    const newOnes = inSight.filter(m => !combat.engagedMonsterIds.includes(m.id));
    if (newOnes.length === 0) return;

    const additions = newOnes.map(m => ({ m, init: Math.min(19, d20()) }));

    setCombat(prev => {
      const engaged = new Set(prev.engagedMonsterIds);
      const realNew = additions.filter(a => !engaged.has(a.m.id));
      if (realNew.length === 0) return prev;
      return {
        ...prev,
        turnOrder: [...prev.turnOrder, ...realNew.map(a => ({ id: a.m.id, type: "monster" as const, name: a.m.name, initiative: a.init }))],
        engagedMonsterIds: [...prev.engagedMonsterIds, ...realNew.map(a => a.m.id)],
      };
    });

    if (newOnes.length > 0) {
      notify(`⚠️ ${newOnes.length} ${newOnes[0].name}(s) join the fight!`);
      setGs(prev => ({
        ...prev,
        dungeonMonsters: prev.dungeonMonsters.map(m =>
          newOnes.some(n => n.id === m.id) ? { ...m, alerted: true } : m
        ),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.active, char?.position, gs.dungeonMonsters]);

  const doNextTurn = useCallback(() => {
    setCombat(prev => {
      if (!prev.active || prev.turnOrder.length === 0) return prev;
      const aliveM = gs.dungeonMonsters.filter(m => m.hp > 0 && prev.engagedMonsterIds.includes(m.id));
      if (aliveM.length === 0) return prev;
      const nextIdx = (prev.currentIndex + 1) % prev.turnOrder.length;
      const isNew = nextIdx <= prev.currentIndex;
      const nextActor = prev.turnOrder[nextIdx];
      const currentActor = prev.turnOrder[prev.currentIndex];
      const isPlayerTurn = nextActor?.type === "player";
      const isPlayerTurnEnding = currentActor?.type === "player";
      
      let newBuffs = prev.activeBuffs || [];
      if (isPlayerTurnEnding) {
        newBuffs = newBuffs.filter(b => b !== "rooted");
      }

      return {
        ...prev, currentIndex: nextIdx,
        round: isNew ? prev.round + 1 : prev.round,
        activeBuffs: newBuffs,
        actionUsed: false, extraActionUsed: false, extraMainActions: 0, movedSquares: 0,
        guardAmount: isPlayerTurn ? 0 : prev.guardAmount,
        log: isNew ? [...prev.log.slice(-30), `── Round ${prev.round + 1} ──`] : prev.log,
      };
    });
  }, [gs.dungeonMonsters]);

  const endPlayerTurn = useCallback(() => { setCombatMode("none"); doNextTurn(); }, [doNextTurn]);

  // Monster AI turn
  useEffect(() => {
    if (!combat.active || !char) return;
    const current = combat.turnOrder[combat.currentIndex];
    if (!current || current.type !== "monster") return;
    const aliveM = gs.dungeonMonsters.filter(m => m.hp > 0 && combat.engagedMonsterIds.includes(m.id));
    if (aliveM.length === 0) { endCombat(combat); return; }
    const monster = gs.dungeonMonsters.find(m => m.id === current.id);
    if (!monster || monster.hp <= 0) { doNextTurn(); return; }

    const timer = setTimeout(() => {
      if (!combat.active) return;
      const newLog = [...combat.log.slice(-30)];
      const newMonsters = gs.dungeonMonsters.map(m => ({ ...m }));
      const mIdx = newMonsters.findIndex(m => m.id === monster.id);
      let charHp = char.hp;
      const d = distToEntity(char.position, monster.position, monster.size);
      let newPos = { ...monster.position };
      let maxDist = Math.ceil((monster.range ?? 5) / 5);
      let steps = monster.speed ?? 1;

      // Boss Skills check BEFORE movement
      let bossSkillUsedThisTurn = false;
      if (monster.name === "Ancient Treant Sapling") {
          bossSkillUsedThisTurn = true;
          const bState = { ...(monster.bossSkillsUsed || {}) };
          const isPhase2 = (monster.hp / monster.maxHp) <= 0.5;
          
          if (isPhase2 && !bState["phase2"]) {
              newLog.push(`🌲 ${monster.name} uproots itself! It can now move!`);
              bState["phase2"] = 1;
              newMonsters[mIdx].speed = 1;
          }

          if (bState["prep_GroundSlam"]) {
              newLog.push(`💥 ${monster.name} unleashes Ground Slam!`);
              const hit = combat.warnings?.some(w => w.x === char.position.x && w.y === char.position.y);
              if (hit) {
                  let dmg = rollDice("3d6+4");
                  charHp -= dmg;
                  newLog.push(`  You take ${dmg} Bludgeoning damage!`);
              } else {
                  newLog.push(`  You avoided the Ground Slam!`);
              }
              delete bState["prep_GroundSlam"];
              setCombat(prev => ({ ...prev, warnings: [] }));
          } else if (bState["prep_Wrath"]) {
              newLog.push(`🌪️ ${monster.name} unleashes Wrath of the Ancient Forest!`);
              const hit = combat.warnings?.some(w => w.x === char.position.x && w.y === char.position.y);
              if (hit) {
                  let dmg = rollDice("4d8+5");
                  charHp -= dmg;
                  newLog.push(`  You take ${dmg} massive damage!`);
              } else {
                  newLog.push(`  You escaped the Wrath!`);
              }
              delete bState["prep_Wrath"];
              setCombat(prev => ({ ...prev, warnings: [] }));
              newMonsters[mIdx].ac -= 5;
              bState["wrath_recovery"] = 2;
          } else {
              if (bState["wrath_recovery"]) {
                  bState["wrath_recovery"] -= 1;
                  if (bState["wrath_recovery"] <= 0) {
                      delete bState["wrath_recovery"];
                      newMonsters[mIdx].ac += 5;
                      newLog.push(`🌲 ${monster.name} recovers its defenses.`);
                  } else {
                      newLog.push(`  ${monster.name} is recovering and takes no action.`);
                  }
              } else {
                  const d = distToEntity(char.position, monster.position, monster.size);
                  
                  // Proficiency check helper
                  const checkProf = (skills: string[]) => {
                      let best = -1;
                      for (const s of skills) {
                          if (!char.skills?.includes(s)) continue;
                          const profDef = PROFICIENCY_LIST.find(p => p.name === s);
                          if (!profDef) continue;
                          const score = getMod(char.stats[profDef.stat]) + 2;
                          if (score > best) best = score;
                      }
                      return best === -1 ? 0 : best >= 5 ? 2 : 1;
                  };
                  
                  if (isPhase2 && combat.round >= 6 && !bState["used_Wrath"]) {
                      const lvl = checkProf(["Arcana", "History", "Nature"]);
                      if (lvl === 0) newLog.push(`⚠ Something magical is happening...`);
                      else if (lvl === 1) newLog.push(`⚠ ${monster.name} is gathering massive magical energy!`);
                      else newLog.push(`⚠ ${monster.name} awakens the forest! (Wrath of Ancient Forest, Range: 9x9)`);
                      
                      bState["prep_Wrath"] = 1;
                      bState["used_Wrath"] = 1;
                      const warns = [];
                      for(let dy = -4; dy <= 4; dy++) {
                          for(let dx = -4; dx <= 4; dx++) {
                              warns.push({ x: monster.position.x + dx, y: monster.position.y + dy, type: 'wrath', level: lvl });
                          }
                      }
                      setCombat(prev => ({ ...prev, warnings: warns }));
                  } else if (d <= 1 && d20() > 10) {
                      newLog.push(`🪵 ${monster.name} uses Root Strike!`);
                      let atk = d20() + monster.attackMod;
                      if (atk >= char.ac) {
                          let dmg = rollDice("1d10+4");
                          charHp -= dmg;
                          newLog.push(`  Hits for ${dmg} Physical damage!`);
                          if (d20() < 10) {
                              setCombat(prev => ({ ...prev, activeBuffs: [...(prev.activeBuffs||[]), "rooted"] }));
                              newLog.push(`  You are Rooted!`);
                              notify("You are Rooted!");
                          }
                      } else {
                          newLog.push(`  Missed!`);
                      }
                  } else if ((d <= 2 && Object.keys(bState).filter(k => k.startsWith("prep_")).length === 0) || (isPhase2 && d <= 1 && d20() > 10)) {
                      const lvl = checkProf(["Perception", "Survival"]);
                      if (lvl === 0) newLog.push(`⚠ Something feels dangerous...`);
                      else if (lvl === 1) newLog.push(`⚠ Large physical attack incoming!`);
                      else newLog.push(`⚠ The ground shakes! (Ground Slam, Range: 5x5)`);
                      
                      bState["prep_GroundSlam"] = 1;
                      const warns = [];
                      for(let dy = -2; dy <= 2; dy++) {
                          for(let dx = -2; dx <= 2; dx++) {
                              warns.push({ x: monster.position.x + dx, y: monster.position.y + dy, type: 'slam', level: lvl });
                          }
                      }
                      setCombat(prev => ({ ...prev, warnings: warns }));
                  } else if (d > 2 && d <= 6 && d20() > 8) {
                      newLog.push(`🌿 ${monster.name} uses Vine Lash!`);
                      let atk = d20() + monster.attackMod;
                      if (atk >= char.ac) {
                          let dmg = rollDice("1d8+2");
                          charHp -= dmg;
                          newLog.push(`  Hits for ${dmg} damage!`);
                      } else {
                          newLog.push(`  Missed!`);
                      }
                  } else {
                      if (isPhase2) {
                          bossSkillUsedThisTurn = false; // standard AI handles move/attack
                      } else {
                          if (combat.round % 3 === 0) {
                              newLog.push(`🌿 ${monster.name} regenerates 10 HP!`);
                              newMonsters[mIdx].hp = Math.min(newMonsters[mIdx].maxHp, newMonsters[mIdx].hp + 10);
                          } else {
                              newLog.push(`🌲 ${monster.name} watches menacingly.`);
                          }
                      }
                  }
              }
          }
          newMonsters[mIdx].bossSkillsUsed = bState;
      }

      if (!bossSkillUsedThisTurn) {
          if (monster.personality === "territorial") {
              // Territorial: Does not move, just waits for player to enter range
          } else if (monster.personality === "cautious") {
              // Cautious: Find cover that has LoS to player. If HP < 40%, try to move away.
              let hpPercent = monster.hp / monster.maxHp;
              if (hpPercent < 0.4 && d <= 3) {
                  // Retreat
                  const dx = newPos.x - char.position.x;
                  const dy = newPos.y - char.position.y;
                  const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
                  const sy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
                  for (let i = 0; i < steps; i++) {
                      let nx = newPos.x + sx;
                      let ny = newPos.y + sy;
                      if (isWalkable("dungeon", nx, ny)) newPos = { x: nx, y: ny };
                      else break;
                  }
              } else {
                  // Find cover in range that has LoS to player
                  let bestCoverPos = null;
                  let minD = 999;
                  for(let dy = -steps; dy <= steps; dy++) {
                      for(let dx = -steps; dx <= steps; dx++) {
                          if (Math.abs(dx) + Math.abs(dy) <= steps) {
                              const tx = newPos.x + dx;
                              const ty = newPos.y + dy;
                              if (isWalkable("dungeon", tx, ty)) {
                                  if (wfMap.covers.has(`${tx},${ty}`)) {
                                      if (checkLineOfSight(tx, ty, char.position.x, char.position.y, wfMap.obstacles)) {
                                          const dToChar = distToEntity(char.position, {x:tx,y:ty}, monster.size);
                                          if (dToChar <= maxDist && dToChar < minD) {
                                              minD = dToChar;
                                              bestCoverPos = {x:tx, y:ty};
                                          }
                                      }
                                  }
                              }
                          }
                      }
                  }
                  if (bestCoverPos) {
                      newPos = bestCoverPos;
                  } else {
                      // Fallback: Chase if no cover found
                      for (let i = 0; i < steps; i++) {
                          const d = distToEntity(char.position, newPos, monster.size);
                          if (d <= maxDist && checkLineOfSight(newPos.x, newPos.y, char.position.x, char.position.y, wfMap.obstacles)) break;
                          const dx = char.position.x - newPos.x;
                          const dy = char.position.y - newPos.y;
                          const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
                          const sy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
                          let nx = newPos.x + sx;
                          let ny = newPos.y + sy;
                          if (isWalkable("dungeon", nx, ny)) newPos = { x: nx, y: ny };
                          else break;
                      }
                  }
              }
          } else {
              // Aggressive / Default: Chase directly
              for (let i = 0; i < steps; i++) {
                  const d = distToEntity(char.position, newPos, monster.size);
                  if (d <= maxDist && checkLineOfSight(newPos.x, newPos.y, char.position.x, char.position.y, wfMap.obstacles)) break;
                  
                  // Simple A* towards player would be better, but we use dumb chase for aggressive
                  const dx = char.position.x - newPos.x;
                  const dy = char.position.y - newPos.y;
                  let sx = 0, sy = 0;
                  
                  if (Math.abs(dx) > Math.abs(dy)) {
                      sx = Math.sign(dx);
                  } else {
                      sy = Math.sign(dy);
                  }
                  
                  let nx = newPos.x + sx;
                  let ny = newPos.y + sy;
                  
                  if (isWalkable("dungeon", nx, ny)) {
                      newPos = { x: nx, y: ny };
                  } else {
                      // Try alternative axis
                      if (sx !== 0 && isWalkable("dungeon", newPos.x, newPos.y + Math.sign(dy))) {
                          newPos = { x: newPos.x, y: newPos.y + Math.sign(dy) };
                      } else if (sy !== 0 && isWalkable("dungeon", newPos.x + Math.sign(dx), newPos.y)) {
                          newPos = { x: newPos.x + Math.sign(dx), y: newPos.y };
                      } else {
                          break;
                      }
                  }
              }
          }
          
          if (newPos.x !== monster.position.x || newPos.y !== monster.position.y) {
              newLog.push(`${monster.name} moves.`);
          }
      }
      
      newMonsters[mIdx] = { ...newMonsters[mIdx], position: newPos };

      setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));

      const nd = distToEntity(char.position, newPos, monster.size);
      const hasLineOfSight = checkLineOfSight(newPos.x, newPos.y, char.position.x, char.position.y, wfMap.obstacles, wfMap.covers, false);
      if (nd <= Math.ceil((monster.range ?? 5) / 5) && hasLineOfSight) {
        let atkRoll1 = d20();
        let atkRoll2 = d20();
        
        // Protector Subclass: impose disadvantage
        let hasDisadvantage = char.subclass === "protector" && nd <= 1;
        let atkRollBase = hasDisadvantage ? Math.min(atkRoll1, atkRoll2) : atkRoll1;
        
        let packHunterBonus = 0;
        if (monster.name === "Wolf") {
            const hasAdjacentWolf = gs.dungeonMonsters.some(m => m.name === "Wolf" && m.id !== monster.id && m.hp > 0 && distToEntity(char.position, m.position, m.size) <= 1);
            if (hasAdjacentWolf) packHunterBonus = 2;
        }
        
        let atkRoll = atkRollBase + monster.attackMod + packHunterBonus;

        // Cover check (if ranged attack)
        let hasCover = false;
        if (nd > 1) {
          const adjs = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [-1,-1], [1,-1], [-1,1]];
          for (let [dx, dy] of adjs) {
            if (wfMap.covers.has(`${char.position.x + dx},${char.position.y + dy}`)) {
              hasCover = true;
              break;
            }
          }
        }

        // Reaction: Wizard Shield
        let effectiveAC = char.ac;
        if (hasCover) effectiveAC += 2; // +2 AC for half cover
        
        let usedShield = false;
        if (atkRoll >= char.ac && atkRoll < char.ac + 5 && char.gameSkills?.includes("wizard_shield_spell")) {
          effectiveAC += 5;
          usedShield = true;
          addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: "REACT!" });
        }

        // Shield Wall Buff
        if ((combat.activeBuffs || []).includes("fighter_shield_wall")) {
          effectiveAC += 2;
        }

        const coverLabel = hasCover ? " (Cover +2 AC)" : "";
        const packLabel = packHunterBonus > 0 ? " (Pack Hunter +2)" : "";
        const disadvLabel = hasDisadvantage ? "(Disadv) " : "";
        const logEntry = `${monster.name} attacks ${char.name}: ${disadvLabel}[${atkRollBase}+${monster.attackMod}${packLabel}=${atkRoll}] vs AC ${effectiveAC}${coverLabel}${usedShield ? " (Shield Spell!)" : ""}`;

        addDiceRoll({ 
          type: "hit", 
          value: atkRollBase, 
          total: atkRoll, 
          mod: monster.attackMod + packHunterBonus, 
          max: 20, 
          label: `${disadvLabel}vs AC ${effectiveAC}${coverLabel}`,
          advValues: hasDisadvantage ? [atkRoll1, atkRoll2] : undefined,
          advType: hasDisadvantage ? "dis" : undefined
        });
        setTimeout(() => {
          if (!combat.active) return;
          if (atkRoll >= effectiveAC) {
            setActionText({ text: "HIT!", color: C.red });
            setTimeout(() => setActionText(null), 1000);

            setTimeout(() => {
              if (!combat.active) return;
              let dmg = rollDice(monster.damage);
              let blocked = 0;
              
              if (combat.guardAmount && combat.guardAmount > 0) {
                blocked += combat.guardAmount;
              }
              
              // Reaction: Paladin Shield Block
              if (char.gameSkills?.includes("paladin_shield_block")) {
                blocked += rollDice("1d10") + getMod(char.stats.str);
                addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: "REACT!" });
              }

              // Berserker Rage Resistance (Halve physical damage)
              if ((combat.activeBuffs || []).includes("fighter_berserker_rage")) {
                dmg = Math.floor(dmg / 2);
              }
              
              dmg = Math.max(0, dmg - blocked);
              
              let actualNewHp = Math.max(0, char.hp - dmg);
              const cMaxHp = char.maxHp;
              let isTutorialDeath = false;
              let currentTutorialDeaths = char.tutorialDeaths ?? 0;

              if (char.currentMap === "tutorial" && actualNewHp <= 0) {
                isTutorialDeath = true;
                actualNewHp = cMaxHp;
                currentTutorialDeaths += 1;
              }

              // Update HP in state
              setGs(prevGs => {
                const c = prevGs.characters[char.id];
                if (!c) return prevGs;
                return { ...prevGs, characters: { ...prevGs.characters, [char.id]: { ...c, hp: actualNewHp, tutorialDeaths: currentTutorialDeaths } } };
              });

              addDiceRoll({ type: "damage", value: dmg, total: dmg, mod: 0, max: dmg, label: monster.damage });
              let atkFx: "scratch" | "arrow" | "whip" | "rootslam" = "scratch";
              if (monster.name === "Goblin Scout") atkFx = "arrow";
              else if (monster.name === "Vine") atkFx = "whip";
              else if (monster.name === "Treant Sapling") atkFx = "rootslam";
              
              addEffect({ type: atkFx, gridX: char.position.x, gridY: char.position.y, targetX: monster.position.x, targetY: monster.position.y });
              addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: `-${dmg}` });
              addHit(char.id);

              setCombat(prevC => ({
                ...prevC,
                log: [...newLog, logEntry, `  Hit! ${char.name} takes ${dmg} dmg.${blocked > 0 ? ` (${blocked} blocked)` : ""} (${actualNewHp}/${cMaxHp})`]
              }));

              if (isTutorialDeath) {
                if (currentTutorialDeaths === 1) {
                  setSeleniaDialogTree({
                    start: { emotion: "shocked", text: "Are you okay?! Good thing we are here in the Sanctuary's projection... I've fully healed you. Try again!", next: () => setSeleniaDialogTree(null) }
                  });
                } else if (currentTutorialDeaths === 2) {
                  setSeleniaDialogTree({
                    start: { emotion: "gentle", text: "Traveler, you must be careful... Let me heal you again. You can do this!", next: () => setSeleniaDialogTree(null) }
                  });
                } else {
                  setSeleniaDialogTree({
                    start: {
                      emotion: "wondering",
                      text: "You keep falling to the Training Dummy... Are you doing this on purpose?",
                      choices: [
                        { label: "I'm fighting with all my might! Let me try again.", next: "try_hard" },
                        { label: "Yes, I just wanted to spend more time with you.", next: "longer" }
                      ]
                    },
                    try_hard: { emotion: "gentle", text: "I know you are... Just focus and strike true! I believe in you.", next: () => setSeleniaDialogTree(null) },
                    longer: { emotion: "blushing", text: "O-oh... that's... sweet of you. But really, you can always visit me in the Sanctuary anyway...", next: () => setSeleniaDialogTree(null) }
                  });
                }
                doNextTurn();
              } else if (actualNewHp <= 0) {
                notify("💀 Defeated!");
                setCombat(INIT_COMBAT);
                setCombatMode("none");
              } else {
                if (char.currentMap === "tutorial") {
                  setTimeout(() => {
                    showSeleniaPopup("shocked", [
                      "Does it hurt? Let's try again.",
                      "Are you okay? Maybe we should give it another go.",
                      "Ouch! Let's try that one more time."
                    ]);
                  }, 800);
                }
                doNextTurn();
              }
            }, 500);
          } else {
            setActionText({ text: "MISS!", color: C.muted });
            setTimeout(() => setActionText(null), 1000);
            addEffect({ type: "miss", gridX: char.position.x, gridY: char.position.y, value: "MISS" });
            setCombat(prevC => ({ ...prevC, log: [...newLog, logEntry, `  Miss!`] }));
            if (char.currentMap === "tutorial") {
              setTimeout(() => {
                showSeleniaPopup("happy", ["Ah, you're better at dodging than I thought!", "Nice footwork! Keep it up.", "That was close! Good job evading."]);
              }, 800);
            }
            
            setTimeout(() => {
              if (char.gameSkills.includes("fighter_counter_attack") && nd <= 1) {
                notify("⚔️ Counter Attack!");
                addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: "REACT!" });
                handleAttackMonster(monster.id, false, true);
                setTimeout(doNextTurn, 1500);
              } else {
                doNextTurn();
              }
            }, 500);
          }
        }, 600);
      } else {
        setCombat(prev => ({ ...prev, log: newLog }));
        doNextTurn();
      }
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.currentIndex, combat.active, combat.round]);

  // ── EXPLORATION SKILLS ──
  const handleInsight = useCallback(() => {
    if (combat.active || screen !== "dungeon" || !char) return;
    const now = Date.now();
    if (now < insightCooldown) {
      notify(`Insight is on cooldown. Wait ${Math.ceil((insightCooldown - now) / 1000)}s.`);
      return;
    }
    const roll = d20();
    const wisMod = getMod(char.stats.wis);
    const total = roll + wisMod;
    addDiceRoll({ type: "skill", value: roll, total, mod: wisMod, max: 20, label: "Insight Check" });
    
    let successCount = 0;
    const revealedIds = new Set<string>();
    const newTiles = new Set<string>();
    gs.dungeonMonsters.forEach(m => {
      if (m.hp > 0 && distToEntity(char.position, m.position, m.size) <= 15) {
        if (total >= (m.insightDC ?? 10)) {
          successCount++;
          revealedIds.add(m.id);
          // Calc initial vision
          const range = m.aiState === "alert" ? m.sightRange + 3 : m.sightRange;
          for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const vx = m.position.x + dx;
                const vy = m.position.y + dy;
                if (checkMonsterVision(m, vx, vy, wfMap.obstacles, wfMap.covers)) {
                  newTiles.add(`${vx},${vy}`);
                }
            }
          }
        }
      }
    });

    if (successCount > 0) {
      notify("Insight check successful!");
      insightRevealedIdsRef.current = revealedIds;
      insightActiveUntilRef.current = now + 30000;
      setInsightVisionTiles(newTiles);
      // The real-time AI loop will take over updating it, and clear it when time expires
    } else {
      notify("You fail to read the surroundings.");
    }
    setInsightCooldown(now + 60000); // 60s cooldown
  }, [char, combat.active, screen, insightCooldown, gs.dungeonMonsters, notify, addDiceRoll]);

  const handleStealth = useCallback(() => {
    if (combat.active || screen !== "dungeon" || !char || stealthCasting) return;
    
    if (stealthActive) {
      setStealthActive(false);
      stealthedMonstersRef.current.clear();
      notify("You exit Stealth Mode.");
      return;
    }

    setStealthCasting(true);
    setActionText({ text: "HIDING...", color: C.muted });
    notify("Attempting to hide... (takes 2 seconds)");
    
    setTimeout(() => {
      setStealthCasting(prev => {
        if (!prev) return false; // Was interrupted
        setStealthActive(true);
        stealthedMonstersRef.current.clear();
        notify(`You enter Stealth Mode. Move carefully.`);
        setActionText(null);
        return false;
      });
    }, 2000);
  }, [char, combat.active, screen, stealthCasting, stealthActive, notify, addDiceRoll]);

  // ── SPELL / BOMB / ATTACK ──

  const handleSpellSelect = useCallback((name: string | null) => {
    if (!name) { setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null); return; }
    setCombatMode("spell");
    setSelectedSpell(name);
  }, []);

  const handleCastSpellAtTile = useCallback((spellName: string, center: { x: number; y: number }) => {
    if (!char) return;
    const aoeSpell = WIZARD_SPELL_CHOICES.find(s => s.name === spellName);
    if (!aoeSpell) return;
    if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots!"); return; }
    updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));

    const effectTypeMap: Record<string, VisualEffect["type"]> = {
      "Sleep": "thunder", "Thunderwave": "thunder", "Burning Hands": "fire_aoe",
    };
    const effectType = effectTypeMap[spellName] ?? "thunder";
    const dmgDice = spellName === "Burning Hands" ? "3d6" : "2d8";
    const log = [...combat.log];
    const diedIds: string[] = [];
    let newMonsters = [...gs.dungeonMonsters];
    const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && distToEntity(center, m.position, m.size) <= aoeSpell.aoeRadius);
    if (targets.length === 0) {
      notify(`${spellName} — no targets caught!`);
      setCombat(prev => ({ ...prev, ...consumeMainAction(prev) }));
      setCombatMode("none"); setSelectedSpell(null);
      return;
    }
    const spMod = getSpellcastingMod(char);
    targets.forEach(mt => {
      const saveRoll = d20();
      const saved = saveRoll >= 13;
      const rawDmg = rollDice(dmgDice);
      const finalDmg = saved ? Math.floor((rawDmg + spMod) / 2) : (rawDmg + spMod);
      log.push(`${spellName}: ${mt.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
      addEffect({ type: effectType, gridX: mt.position.x, gridY: mt.position.y });
      addEffect({ type: "number", gridX: mt.position.x, gridY: mt.position.y, value: String(finalDmg) });
      addHit(mt.id);
      newMonsters = newMonsters.map(m => {
        if (m.id !== mt.id) return m;
        const newHp = Math.max(0, m.hp - finalDmg);
        if (newHp <= 0) diedIds.push(m.id);
        return { ...m, hp: newHp };
      });
    });
    setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
    setCombat(prev => ({ ...prev, log, ...consumeMainAction(prev) }));
    diedIds.forEach(id => {
      setDyingMonsters(prev => new Set([...prev, id]));
      setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
    });
    setCombatMode("none"); setSelectedSpell(null);
    if (!combat.active && targets.length > 0) {
      setTimeout(() => startCombat(targets.map(m => m.id)), 600);
    }
  }, [char, combat.log, combat.active, gs.dungeonMonsters, notify, addEffect, addHit, startCombat, updateChar]);

  const executeBombEffect = useCallback((bombItemId: string, targetIds: string[]) => {
    if (!char) return;
    const bomb = char.inventory.find(i => i.id === bombItemId) ?? SHOP_ITEMS.find(i => i.id === "s13");
    if (!bomb) return;
    let newMonsters = [...gs.dungeonMonsters];
    const log = [...combat.log];
    const diedIds: string[] = [];
    targetIds.forEach(id => {
      const mt = gs.dungeonMonsters.find(m => m.id === id);
      if (!mt) return;
      const saveRoll = d20();
      const saved = saveRoll >= (bomb.saveDC ?? 15);
      const rawDmg = rollDice(bomb.damage ?? "3d6");
      const finalDmg = saved ? Math.floor(rawDmg / 2) : rawDmg;
      log.push(`${bomb.name}: ${mt.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
      addEffect({ type: "fire_aoe", gridX: mt.position.x, gridY: mt.position.y });
      addEffect({ type: "number", gridX: mt.position.x, gridY: mt.position.y, value: String(finalDmg) });
      addHit(id);
      newMonsters = newMonsters.map(m => {
        if (m.id !== id) return m;
        const newHp = Math.max(0, m.hp - finalDmg);
        if (newHp <= 0) diedIds.push(m.id);
        return { ...m, hp: newHp };
      });
    });
    setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
    if (combat.active) setCombat(prev => ({ ...prev, log, ...consumeMainAction(prev) }));
    updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== bombItemId) }));
    diedIds.forEach(id => {
      setDyingMonsters(prev => new Set([...prev, id]));
      setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
    });
    notify(`💣 Bomb explodes! ${targetIds.length > 0 ? `Hit ${targetIds.length} target(s).` : "No targets hit."}`);
    if (!combat.active && targetIds.length > 0) {
      setTimeout(() => startCombat(targetIds), 600);
    }
  }, [char, combat.log, combat.active, gs.dungeonMonsters, notify, addEffect, addHit, startCombat, updateChar]);

  const handleAOECastFromGrid = useCallback((affectedMonsterIds: string[], tileX: number, tileY: number) => {
    if (!char || !selectedSpell || combatMode !== "spell") return;
    const isBomb = selectedSpell === "Small Bomb";

    if (isBomb) {
      const bombId = pendingBombItemId ?? char.inventory.find(i => i.effect === "aoe_bomb")?.id;
      if (!bombId) { notify("No bomb available!"); setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null); return; }
      if (!combat.active && affectedMonsterIds.length > 0) {
        startCombat(affectedMonsterIds);
      }
      executeBombEffect(bombId, affectedMonsterIds);
      setCombatMode("none"); setSelectedSpell(null); setPendingBombItemId(null);
      return;
    }

    if (!combat.active) {
      if (affectedMonsterIds.length === 0) {
        notify("No targets in the area!");
        setCombatMode("none"); setSelectedSpell(null); return;
      }
      startCombat(affectedMonsterIds);
      handleCastSpellAtTile(selectedSpell, { x: tileX, y: tileY });
      return;
    }

    if (affectedMonsterIds.length === 0) {
      notify("No targets caught in the area!");
      return;
    }
    handleCastSpellAtTile(selectedSpell, { x: tileX, y: tileY });
  }, [char, selectedSpell, combatMode, combat.active, pendingBombItemId, notify, startCombat, executeBombEffect, handleCastSpellAtTile]);

  const handleCastSpell = useCallback((spellName: string, targetMonsterId: string) => {
    if (!char) return;
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const wizAoe = WIZARD_SPELL_CHOICES.find(s => s.name === spellName);
    const spell = allSpells.find(s => s.name === spellName) as typeof allSpells[0] | undefined;
    
    // Also check SKILL_DICTIONARY
    const gameSkill = SKILL_DICTIONARY[spellName];
    const isGameSkill = !!gameSkill;

    if (isGameSkill && gameSkill.maxUses) {
      const used = char.skillUsages?.[spellName] || 0;
      if (used >= gameSkill.maxUses) {
        notify(`No uses remaining for ${gameSkill.name}!`);
        return;
      }
      updateChar(char.id, c => ({
        skillUsages: { ...c.skillUsages, [spellName]: used + 1 }
      }));
    }

    const needsSlot = spell ? spell.level > 0 : false;
    if (needsSlot) {
      if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots remaining!"); return; }
      updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));
    }

    const target = gs.dungeonMonsters.find(m => m.id === targetMonsterId);
    const log = [...combat.log];

    const effectTypeMap: Record<string, VisualEffect["type"]> = {
      "Fire Bolt": "fire_bolt", "Magic Missile": "magic_missile",
      "Sacred Flame": "sacred_flame", "Divine Smite": "smite",
      "Sleep": "thunder", "Thunderwave": "thunder", "Burning Hands": "fire_aoe",
      "Cure Wounds": "heal", "Lay on Hands": "heal",
      "fighter_second_wind": "heal", "cleric_healing_word": "heal"
    };
    const effectType = effectTypeMap[spellName] ?? "magic_missile";

    // Handle Healing (Spells and GameSkills)
    const healValue = spell?.heal ?? gameSkill?.healAmount;
    if (healValue) {
      const isExtra = isGameSkill ? gameSkill.cost === "extra" : !!spell?.isBonus;
      setCombat(prev => {
        if (isExtra) return { ...prev, extraActionUsed: true };
        return { ...prev, ...consumeMainAction(prev) };
      });
      const spMod = getSpellcastingMod(char);
      let healed = healValue === "5" ? 5 : rollDice(healValue) + (isGameSkill && char.class !== "Cleric" ? 0 : spMod);
      if (spellName === "fighter_second_wind") {
        healed += (char.level * 2);
      }
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
      log.push(`${char.name} uses ${gameSkill?.name ?? spell?.name}: +${healed} HP`);
      addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
      notify(`✨ Healed ${healed} HP!`);
      setCombatMode("none");
      setSelectedSpell(null);
    } else if (wizAoe && target) {
      setCombat(prev => ({ ...prev, ...consumeMainAction(prev) }));
      setCombatMode("none");
      setSelectedSpell(null);
      const aoeRadius = wizAoe.aoeRadius;
      const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && distToEntity(target.position, m.position, m.size) <= aoeRadius);
      let newMonsters = [...gs.dungeonMonsters];
      const diedInAoe: string[] = [];
      targets.forEach(mt => {
        const saveRoll = d20();
        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: "Save DC 13" });
        const saved = saveRoll >= 13;
        const dmgDice = spellName === "Burning Hands" ? "3d6" : "2d8";
        const rawDmg = rollDice(dmgDice);
        let dmgType = spellName === "Burning Hands" ? "Fire" : "Force";
        let resMul = 1;
        let effectText = "";
        if (mt.weaknesses?.includes(dmgType)) { resMul = 2; effectText = " (Weakness!)"; }
        if (mt.resistances?.includes(dmgType)) { resMul = 0.5; effectText = " (Resisted)"; }

        const finalDmg = Math.floor((saved ? Math.floor(rawDmg / 2) : rawDmg) * resMul);
        addDiceRoll({ type: "damage", value: finalDmg, total: finalDmg, mod: 0, max: finalDmg, label: dmgDice });
        newMonsters = newMonsters.map(m => {
          if (m.id !== mt.id) return m;
          log.push(`${spellName}: ${m.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg${effectText}`);
          addEffect({ type: effectType, gridX: m.position.x, gridY: m.position.y });
          addEffect({ type: "number", gridX: m.position.x, gridY: m.position.y, value: String(finalDmg) });
          const newHp = Math.max(0, m.hp - finalDmg);
          if (newHp <= 0) diedInAoe.push(m.id);
          return { ...m, hp: newHp };
        });
      });
      setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));
      diedInAoe.forEach(id => {
        setDyingMonsters(prev => new Set([...prev, id]));
        setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(id); return s; }), 1000);
      });
    } else if (spellName === "fighter_action_surge") {
      setCombat(prev => ({ 
        ...prev, 
        extraMainActions: (prev.extraMainActions || 0) + 1,
        extraActionUsed: true 
      }));
      log.push(`${char.name} uses Action Surge! Gain an additional Main Action.`);
      notify("💥 Action Surge! Main Action gained.");
      setCombatMode("none");
      setSelectedSpell(null);
    } else if (["fighter_shield_wall", "fighter_warrior_focus", "fighter_samurai_focus", "fighter_berserker_rage"].includes(spellName)) {
      setCombat(prev => ({ ...prev, activeBuffs: [...(prev.activeBuffs || []), spellName], ...consumeMainAction(prev) }));
      log.push(`${char.name} uses ${gameSkill?.name}!`);
      notify(`✨ ${gameSkill?.name} activated!`);
      setCombatMode("none");
      setSelectedSpell(null);
    } else if ((spell?.damage || gameSkill?.damage) && target) {
      const spMod = getSpellcastingMod(char);
      const rawDmg = rollDice(spell?.damage ?? gameSkill!.damage!);
      const baseDmg = Math.max(1, rawDmg + (isGameSkill ? 0 : spMod));
      const dmgLabel = (spell?.damage ?? gameSkill!.damage!) + (spMod !== 0 && !isGameSkill ? `${spMod >= 0 ? "+" : ""}${spMod}` : "");

      let dmgType = spellName.includes("Fire") ? "Fire" : "Force";
      let resMul = 1;
      let effectText = "";
      if (target.weaknesses?.includes(dmgType)) { resMul = 2; effectText = " (Weakness!)"; }
      if (target.resistances?.includes(dmgType)) { resMul = 0.5; effectText = " (Resisted)"; }

      const dmg = Math.floor(baseDmg * resMul);

      const isExtra = isGameSkill ? gameSkill.cost === "extra" : !!spell?.isBonus;
      setCombat(prev => {
        if (isExtra) return { ...prev, extraActionUsed: true };
        return { ...prev, ...consumeMainAction(prev) };
      });
      setCombatMode("none");
      setSelectedSpell(null);

      const saveStat = spell?.saveStat ?? gameSkill?.saveStat;
      const saveDC = spell?.saveDC ?? gameSkill?.saveDC;
      if (saveStat && saveDC) {
        const saveRoll = d20();
        const saved = saveRoll >= saveDC;
        const spellOrSkillName = spell?.name ?? gameSkill!.name;
        const logEntry = `${char.name} uses ${spellOrSkillName}: Save roll [${saveRoll}] vs DC ${saveDC}`;

        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: `Save DC ${saveDC}` });

        setTimeout(() => {
          if (saved) {
            setActionText({ text: "SAVE!", color: C.muted });
            setTimeout(() => setActionText(null), 1000);

            addEffect({ type: effectType, gridX: target.position.x, gridY: target.position.y });
            setCombat(prevC => ({ ...prevC, log: [...prevC.log, logEntry, `  ${target.name} saves! No damage.`] }));

            if (!combat.active) setTimeout(() => startCombat([target.id]), 600);
          } else {
            setActionText({ text: "HIT!", color: C.red });
            setTimeout(() => setActionText(null), 1000);

            setTimeout(() => {
              let newHp = 0;
              setGs(prevGs => {
                const m = prevGs.dungeonMonsters.find(mm => mm.id === target.id);
                if (!m) return prevGs;
                newHp = Math.max(0, m.hp - dmg);
                return { ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === target.id ? { ...mm, hp: newHp, alerted: true } : mm) };
              });

              addDiceRoll({ type: "damage", value: rawDmg, total: dmg, mod: spMod, max: rawDmg, label: dmgLabel });

              setCombat(prevC => ({ ...prevC, log: [...prevC.log, logEntry, `  ${target.name} fails save! ${dmg} dmg${effectText} → ${newHp}/${target.maxHp}`] }));

              addEffect({ type: effectType, gridX: target.position.x, gridY: target.position.y });
              addEffect({ type: "number", gridX: target.position.x, gridY: target.position.y, value: String(dmg) });

              if (newHp <= 0) {
                setDyingMonsters(prev => new Set([...prev, target.id]));
                setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(target.id); return s; }), 1000);
              }

              if (char.currentMap === "tutorial") {
                setTimeout(() => {
                  showSeleniaPopup("happy", [
                    "Oh, a direct hit!", "Nice strike! Keep it up.", "Right on target!", "That was a solid blow!"
                  ]);
                }, 800);
              }

              if (!combat.active) setTimeout(() => startCombat([target.id]), 600);
            }, 500);
          }

          triggerContextualTutorial("tut_first_save_spell", {
            start: {
              emotion: "gentle",
              text: "Ah, this spell is a little different, Traveler.",
              next: "mod2"
            },
            mod2: {
              emotion: "normal",
              text: "Not every spell needs to strike its target directly. Some challenge the enemy to resist your magic instead.",
              next: "mod3"
            },
            mod3: {
              emotion: "wondering",
              text: "If they fail to resist, they'll suffer the spell's full effect. If they succeed... they may escape unharmed, or only take part of the damage. You can always check the Battle Log to see what happened!",
              choices: [{ label: "Continue", next: () => setSeleniaDialogTree(null) }]
            }
          });

        }, 600);
      } else {
        setActionText({ text: "HIT!", color: C.red });
        setTimeout(() => setActionText(null), 1000);

        setTimeout(() => {
          let newHp = 0;
          setGs(prevGs => {
            const m = prevGs.dungeonMonsters.find(mm => mm.id === target.id);
            if (!m) return prevGs;
            newHp = Math.max(0, m.hp - dmg);
            return { ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === target.id ? { ...mm, hp: newHp, alerted: true } : mm) };
          });

          addDiceRoll({ type: "damage", value: rawDmg, total: dmg, mod: spMod, max: rawDmg, label: dmgLabel });

          setCombat(prevC => ({ ...prevC, log: [...prevC.log, `${char.name} casts ${spell?.name ?? gameSkill?.name}: ${dmg} dmg${effectText} to ${target.name} (${newHp}/${target.maxHp})${spMod !== 0 && !isGameSkill ? ` [+${spMod} spell mod]` : ""}`] }));

          addEffect({ type: effectType, gridX: target.position.x, gridY: target.position.y });
          addEffect({ type: "number", gridX: target.position.x, gridY: target.position.y, value: String(dmg) });

          if (newHp <= 0) {
            setDyingMonsters(prev => new Set([...prev, target.id]));
            setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(target.id); return s; }), 1000);
          }

          if (char.currentMap === "tutorial") {
            setTimeout(() => {
              showSeleniaPopup("happy", [
                "Oh, a direct hit!", "Nice strike! Keep it up.", "Right on target!", "That was a solid blow!"
              ]);
            }, 800);
          }

          if (!combat.active) setTimeout(() => startCombat([target.id]), 600);

          triggerContextualTutorial("tut_first_spell_attack", {
            start: {
              emotion: "happy",
              text: "Wait a moment, Traveler! Magic may look different from a sword, but it follows many of the same rules.",
              next: "mod2"
            },
            mod2: {
              emotion: "normal",
              text: "When you cast a spell that targets an enemy directly, your magical accuracy determines whether it hits. Your magical talent helps guide the spell toward its target.",
              next: "mod3"
            },
            mod3: {
              emotion: "gentle",
              text: "If your spell connects, its power is calculated automatically. Different spells may behave in different ways, but don't worry—I’ll explain them as you discover them.",
              choices: [{ label: "Continue", next: () => setSeleniaDialogTree(null) }]
            }
          });

        }, 500);
      }
      return;
    } else if (target) {
      log.push(`${char.name} casts ${spellName}... no effect.`);
    }

    setCombat(prev => ({ ...prev, log, ...consumeMainAction(prev) }));
    setCombatMode("none");
    setSelectedSpell(null);
    if (!combat.active && target) {
      setTimeout(() => startCombat([target.id]), 600);
    }
  }, [char, combat.log, combat.active, gs.dungeonMonsters, notify, addEffect, addHit, addDiceRoll, startCombat, updateChar]);

  const handleHealSelf = useCallback(() => {
    if (!char || !selectedSpell) return;
    handleCastSpell(selectedSpell, "");
    setCombatMode("none"); setSelectedSpell(null);
  }, [char, selectedSpell, handleCastSpell]);

  const handleGuard = useCallback(() => {
    if (!char || !combat.active || combat.extraActionUsed) return;
    const conMod = getMod(char.stats.con);
    const roll = rollDice("1d4");
    const totalGuard = Math.max(1, roll + conMod);
    setCombat(prev => ({ 
      ...prev, 
      extraActionUsed: true, 
      guardAmount: (prev.guardAmount || 0) + totalGuard,
      log: [...prev.log, `${char.name} uses Guard! Deflects up to ${totalGuard} damage.`]
    }));
    notify(`🛡️ Guard Active: -${totalGuard} incoming DMG`);
    addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: `Guard ${totalGuard}` });
    setCombatMode("none");
  }, [char, combat.active, combat.extraActionUsed, notify, addEffect]);

  const handleMonsterClick = (monsterId: string) => {
    if (combatMode === "attack") handleAttackMonster(monsterId, false);
    else if (combatMode === "attack_offhand") handleAttackMonster(monsterId, true);
    else if (combatMode === "spell" && selectedSpell) handleCastSpell(selectedSpell, monsterId);
  };

  function handleAttackMonster(monsterId: string, isOffHand: boolean = false, isReaction: boolean = false, skipTutorial: boolean = false) {
    if (!char || !combat.active) { notify(`Debug: char or combat not active`); return; }
    if (!isReaction) {
      if (isOffHand && combat.extraActionUsed) { notify(`Debug: offhand used`); return; }
      if (!isOffHand && combat.actionUsed && !combat.extraMainActions) {
        notify(`Debug: main action used`); return;
      }
    }

    // Intercept for First Attack Tutorial — check ref (sync) OR state (async) so stale state can't re-trigger
    const seen = char.tutorialsSeen || [];
    const alreadySeenAttackTut = tutorialsSeenRef.current.has("tut_before_first_attack") || seen.includes("tut_before_first_attack");
    if (!skipTutorial && !alreadySeenAttackTut) {
      const triggered = triggerContextualTutorial("tut_before_first_attack", {
        start: {
          emotion: "gentle",
          text: "Wait just a moment, Traveler! Before your first battle, there's something I'd like to show you.",
          next: "mod2"
        },
        mod2: {
          emotion: "normal",
          text: "Whenever you attack an enemy, the outcome isn't based on strength alone. Your abilities, your equipment, and a little bit of luck all come together to decide whether your attack connects.",
          next: "mod3"
        },
        mod3: {
          emotion: "normal",
          text: "If your attack hits, your weapon's power will determine how much damage you deal, and your abilities may make it even stronger.",
          next: "mod4"
        },
        mod4: {
          emotion: "happy",
          text: "Don't worry about memorizing everything right now. The Battle Log will show you exactly what happened after each action, and I'll be here to guide you whenever you discover something new.",
          next: "mod5"
        },
        mod5: {
          emotion: "happy",
          text: "Now then... take a deep breath, and show me your very first attack!",
          choices: [{ label: "I'm ready!", next: () => { 
            setSeleniaDialogTree(null); 
            setTimeout(() => handleAttackMonster(monsterId, isOffHand, isReaction, true), 100);
          }}]
        }
      });
      if (triggered) return;
    }
    
    const weapon = isOffHand ? char.equipment.offHand : char.equipment.mainHand;
    if (!weapon || weapon.type !== "weapon") { notify(`Debug: no weapon`); return; }
    
    if (char.hp <= 0) return;
    if (stealthActive) {
      setStealthActive(false);
      stealthedMonstersRef.current.clear();
      notify("Your stealth is broken by attacking!");
    }
    const monster = gs.dungeonMonsters.find(m => m.id === monsterId);
    if (!monster || monster.hp <= 0) { notify(`Debug: monster dead or not found`); return; }
    
    // Weapon Properties check
    const isRanged = (weapon.range ?? 5) > 5;
    const isFinesse = weapon.properties?.includes("finesse");
    const isTwoHanded = weapon.properties?.includes("two-handed");
    const isLight = weapon.properties?.includes("light");
    const isVersatile = weapon.properties?.includes("versatile");
    const isMelee = !isRanged;

    // Finesse auto-picks highest stat; ranged uses DEX
    const { mod } = getWeaponStat(char, weapon);

    // Samurai Focus Advantage
    const hasSamuraiFocus = (combat.activeBuffs || []).includes("fighter_samurai_focus");
    let roll1 = d20();
    let roll2 = d20();
    let roll = hasSamuraiFocus ? Math.max(roll1, roll2) : roll1;
    const isCrit = roll === 20;

    // Hit Buffs & Subclass
    let extraHitBonus = 0;
    if ((combat.activeBuffs || []).includes("fighter_warrior_focus")) extraHitBonus += rollDice("1d4") + char.profBonus;
    
    if (char.subclass === "archer" && isRanged) extraHitBonus += 2;
    if (char.subclass === "duelwield" && char.equipment.mainHand && char.equipment.offHand && isLight) extraHitBonus += 1;
    if (char.subclass === "berserker" && isMelee && isTwoHanded) extraHitBonus += 2;
    if (char.subclass === "samurai" && isMelee) extraHitBonus += 2;

    const total = roll + mod + char.profBonus + extraHitBonus;

    if (!isReaction) {
      if (!isOffHand) {
        setCombat(prev => ({ ...prev, ...consumeMainAction(prev) }));
        
        // Auto Extra Attack for Fighter Lv 5+
        if (char.class === "Fighter" && char.level >= 5) {
          setTimeout(() => {
            handleAttackMonster(monsterId, false, true);
          }, 500);
        }
      } else {
        setCombat(prev => ({ ...prev, extraActionUsed: true }));
      }
    }

    // Remove Samurai Focus buff after use
    if (hasSamuraiFocus) {
      setCombat(prev => ({ ...prev, activeBuffs: (prev.activeBuffs || []).filter(b => b !== "fighter_samurai_focus") }));
    }

    setCombatMode("none");

    const advLabel = hasSamuraiFocus ? "(Adv) " : "";
    const extraLabel = extraHitBonus > 0 ? `+${extraHitBonus}` : "";
    addDiceRoll({ 
      type: "hit", 
      value: roll, 
      total, 
      mod: mod + char.profBonus + extraHitBonus, 
      max: 20, 
      label: `${advLabel}vs AC ${monster.ac}`,
      advValues: hasSamuraiFocus ? [roll1, roll2] : undefined,
      advType: hasSamuraiFocus ? "adv" : undefined
    });
    let currentFlip = false;
    let effectScale = 1;
    if (weapon.properties?.includes("heavy") || weapon.properties?.includes("two-handed")) effectScale = 1.3;
    else if (weapon.properties?.includes("light")) effectScale = 0.7;

    if (weapon.damageType === "slashing") {
      currentFlip = lsAttackFlipRef.current;
      lsAttackFlipRef.current = !currentFlip;
      addEffect({ type: "ls_slash", gridX: monster.position.x, gridY: monster.position.y, targetX: char.position.x, targetY: char.position.y, flip: currentFlip, scale: effectScale });
    } else if (isRanged) {
      addEffect({ type: "arrow", gridX: char.position.x, gridY: char.position.y, targetX: monster.position.x, targetY: monster.position.y });
      setTimeout(() => addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y }), 320);
    }

    setTimeout(() => {
      const isHit = isCrit || total >= monster.ac;
      const isSurprise = !monster.alerted;
      const critPrefix = isCrit ? "⭐ CRITICAL HIT! ⭐ " : "";
      const logEntry = `${critPrefix}${char.name} attacks ${monster.name}${isOffHand ? " (Off-Hand)" : ""}: [${roll}+${mod + char.profBonus}${extraLabel}=${total}] vs AC ${monster.ac}`;

      if (isHit) {
        setActionText({ text: isSurprise ? "AMBUSH!" : "HIT!", color: C.blue });
        setTimeout(() => setActionText(null), 1000);

        setTimeout(() => {
          // Versatile: auto 2H damage when off-hand is empty
          const offHandEmpty = !char.equipment.offHand;
          const effectiveDamage = getEffectiveDamage(weapon, offHandEmpty && isVersatile);
          
          let dieRoll = 0;
          let dieRollStr = effectiveDamage;
          if (isCrit) {
            const match = effectiveDamage.match(/^(\d+)d(\d+)$/);
            if (match) {
              const num = parseInt(match[1]) * 2;
              const faces = match[2];
              dieRollStr = `${num}d${faces}`;
              dieRoll = rollDice(dieRollStr);
            } else {
              dieRoll = rollDice(effectiveDamage) * 2;
            }
          } else {
            dieRoll = rollDice(effectiveDamage);
          }

          // dmgMod uses same stat as hit roll (Finesse auto-resolved)
          const { mod: _dmgModBase } = getWeaponStat(char, weapon);
          let dmgMod = _dmgModBase;
          
          if (weapon.name === "Shortbow") {
            const distance = distToEntity(char.position, monster.position, monster.size);
            dmgMod = Math.max(-5, dmgMod - distance);
          }

          let extraRawDmg = 0;
          let extraLogStr = "";
          let extraUiStr = "";

          if ((combat.activeBuffs || []).includes("fighter_berserker_rage") && isMelee) {
            const rageDmg = rollDice("1d6");
            extraRawDmg += rageDmg;
            extraLogStr += `+1d6(${rageDmg})`;
            extraUiStr += `+1d6`;
          }

          const withMod = Math.max(1, dieRoll + dmgMod);
          const baseDmg = (isSurprise ? withMod * 2 : withMod) + extraRawDmg;

          // Damage type from weapon data (fallback to name heuristic)
          let dmgType = weapon.damageType ? weapon.damageType.charAt(0).toUpperCase() + weapon.damageType.slice(1) : "Piercing";
          if (!weapon.damageType) {
            if (weapon.name.includes("sword") || weapon.name.includes("Axe")) dmgType = "Slashing";
            else if (weapon.name.includes("Hammer") || weapon.name.includes("Club")) dmgType = "Bludgeoning";
          }

          let resMul = 1;
          let effectText = "";
          if (monster.weaknesses?.includes(dmgType)) { resMul = 2; effectText = " (Weakness!)"; }
          if (monster.resistances?.includes(dmgType)) { resMul = 0.5; effectText = " (Resisted)"; }

          const finalDmg = Math.floor(baseDmg * resMul);

          let newHp = 0;
          setGs(prevGs => {
            const m = prevGs.dungeonMonsters.find(mm => mm.id === monsterId);
            if (!m) return prevGs;
            newHp = Math.max(0, m.hp - finalDmg);
            return { ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === monsterId ? { ...mm, hp: newHp, alerted: true } : mm) };
          });

          const dmgLabel = `${effectiveDamage}${dmgMod >= 0 ? "+" : ""}${dmgMod}${extraUiStr}${isVersatile && offHandEmpty ? " (2H)" : ""}`;
          addDiceRoll({ type: "damage", value: dieRoll, total: finalDmg, mod: dmgMod, max: dieRoll, label: dmgLabel });

          setCombat(prevC => {
            const newLog = [...prevC.log, logEntry];
            if (isSurprise) {
              newLog.push(`  💥 SURPRISE! ×2 dmg! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]×2${extraLogStr}=${baseDmg}${effectText} → ${newHp}/${monster.maxHp} HP`);
            } else {
              newLog.push(`  Hit! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]${extraLogStr}=${baseDmg}${effectText} → ${finalDmg} dmg → ${newHp}/${monster.maxHp} HP`);
            }
            if (newHp === 0) newLog.push(`  ${monster.name} destroyed!`);
            return { ...prevC, log: newLog };
          });

          if (isSurprise) {
            addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: `×2! ${finalDmg}` });
          } else {
            addEffect({ type: "number", gridX: monster.position.x, gridY: monster.position.y, value: String(finalDmg) });
          }

          setTimeout(() => {
            if (weapon.damageType === "slashing") {
              addEffect({ type: "ls_hit", gridX: monster.position.x, gridY: monster.position.y, targetX: char.position.x, targetY: char.position.y, flip: currentFlip, scale: effectScale });
            } else {
              // addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y });
            }
            addHit(monsterId);
          }, 100);

          if (newHp <= 0) {
            setDyingMonsters(prev => new Set([...prev, monsterId]));
            setTimeout(() => setDyingMonsters(prev => { const s = new Set(prev); s.delete(monsterId); return s; }), 1000);
          }

          if (char.currentMap === "tutorial") {
            setTimeout(() => {
              showSeleniaPopup("happy", [
                "Oh, a direct hit!", "Nice strike! Keep it up.", "Right on target!", "That was a solid blow!"
              ]);
            }, 800);
          }

        }, 500);
      } else {
        setActionText({ text: "MISS!", color: C.muted });
        setTimeout(() => setActionText(null), 1000);

        addEffect({ type: "miss", gridX: monster.position.x, gridY: monster.position.y, value: "MISS" });
        setCombat(prevC => ({ ...prevC, log: [...prevC.log, logEntry, `  Miss!`] }));
        
        let newHp = 0; // need to declare so it doesn't break scope from above if removed
        setGs(prevGs => ({ ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === monsterId ? { ...mm, alerted: true } : mm) }));

        if (char.currentMap === "tutorial") {
          setTimeout(() => {
            showSeleniaPopup("wondering", [
              "Oh no, you missed! Don't worry, try again.",
              "Almost! Keep your focus.",
              "It dodged! Try another angle!"
            ]);
          }, 800);
        }
      }

      // Trigger Contextual Tutorials after attack resolves
      if (isCrit) {
        triggerContextualTutorial("tut_first_crit", {
          start: {
            emotion: "happy",
            text: "Amazing, Traveler! That was a Critical Hit! ✨",
            next: "mod2"
          },
          mod2: {
            emotion: "normal",
            text: "Moments like these are rare, but incredibly powerful. When fate smiles upon you, your weapon unleashes far greater damage than usual.",
            next: "mod3"
          },
          mod3: {
            emotion: "happy",
            text: "If you ever see that golden flash again... enjoy it! It can completely change the outcome of a battle.",
            choices: [{ label: "Continue", next: () => setSeleniaDialogTree(null) }]
          }
        });
      } else if (isHit) {
        triggerContextualTutorial("tut_first_hit", {
          start: {
            emotion: "happy",
            text: "Wonderful! You landed your attack!",
            next: "mod2"
          },
          mod2: {
            emotion: "normal",
            text: "Take a look at the Battle Log. It records every important detail—from your attack roll to the damage you dealt. Whenever you're curious about what happened, you'll find the answer there.",
            next: "mod3"
          },
          mod3: {
            emotion: "gentle",
            text: "As you continue your journey, you'll naturally learn how each part of combat works.",
            choices: [{ label: "Continue", next: () => setSeleniaDialogTree(null) }]
          }
        });
      } else {
        triggerContextualTutorial("tut_first_miss", {
          start: {
            emotion: "wondering",
            text: "Oh! It missed... but don't be discouraged, Traveler.",
            next: "mod2"
          },
          mod2: {
            emotion: "normal",
            text: "Even the greatest adventurers can't land every attack. Sometimes your opponent is simply quick enough to avoid the blow.",
            next: "mod3"
          },
          mod3: {
            emotion: "gentle",
            text: "Keep trying, and remember—every battle is another chance to learn.",
            choices: [{ label: "Continue", next: () => setSeleniaDialogTree(null) }]
          }
        });
      }

    }, 600);
  }

  function revealFog(pos: { x: number; y: number }) {
    setFogRevealed(prev => {
      const next = new Set(prev);
      for (let dy = -SIGHT; dy <= SIGHT; dy++)
        for (let dx = -SIGHT; dx <= SIGHT; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
            const fx = pos.x + dx, fy = pos.y + dy;
            if (fx >= 0 && fx < getMapCols(screen) && fy >= 0 && fy < getMapRows(screen)) next.add(`${fx},${fy}`);
          }
        }
      return next;
    });
  }

  const moveCooldownRef = useRef<number>(0);

  function handleTileClick(x: number, y: number) {
    if (!char || specialDialog) return;
    
    // Prevent spamming movement
    const now = Date.now();
    const moveDelay = stealthActive ? 300 : 120;
    if (now - moveCooldownRef.current < moveDelay) return;
    moveCooldownRef.current = now;

    if ((combat.activeBuffs || []).includes("rooted")) {
      notify("You are Rooted and cannot move!");
      return;
    }

    if (combat.active && combatMode === "move") {
      const d = dist(char.position, { x, y });
      const rem = MOVE_SQUARES - combat.movedSquares;
      if (d > rem) { notify(`Can only move ${rem} tiles more this turn.`); return; }
      updateChar(char.id, { position: { x, y } });
      if (screen === "dungeon") revealFog({ x, y });
      setCombat(prev => ({ ...prev, movedSquares: prev.movedSquares + d }));
      if (d >= rem) setCombatMode("none");
      return;
    }
    if (combat.active) return;
    
    const key = `${x},${y}`;

    // Click pathfinding
    const start = char.position;
    const end = { x, y };
    const queue = [[start]];
    const visited = new Set([`${start.x},${start.y}`]);
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    let foundPath: {x:number, y:number}[] = [];
    
    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];
      if (curr.x === end.x && curr.y === end.y) {
        foundPath = path.slice(1);
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;
        if (!visited.has(nKey) && isWalkable(screen as any, nx, ny)) {
          visited.add(nKey);
          queue.push([...path, {x: nx, y: ny}]);
        }
      }
    }
    
    if (foundPath.length > 0) {
      setMovingPath(foundPath);
    }
  }

  // Path execution
  useEffect(() => {
    if (movingPath.length > 0 && !combat.active && char) {
      const timer = setTimeout(() => {
        const nextPos = movingPath[0];
        
        // Check triggers
        if (screen === "town") {
          const special = TOWN_SPECIAL[`${nextPos.x},${nextPos.y}`];
          if (special) {
            setSpecialDialog({ x: nextPos.x, y: nextPos.y, tile: special });
            setMovingPath([]);
            return;
          }
        } else if (screen === "sanctuary") {
          const special = SANCTUARY_SPECIAL[`${nextPos.x},${nextPos.y}`];
          if (special) {
            setSpecialDialog({ x: nextPos.x, y: nextPos.y, tile: special });
            setMovingPath([]);
            return;
          }
        } else if (screen === "dungeon") {
          const special = DUNGEON_SPECIAL[`${nextPos.x},${nextPos.y}`];
          if (special) {
            setSpecialDialog({ x: nextPos.x, y: nextPos.y, tile: special });
            setMovingPath([]);
            return;
          }
          if (nextPos.x === DUNGEON_ENTER.x && nextPos.y === DUNGEON_ENTER.y) {
            setSpecialDialog({ x: nextPos.x, y: nextPos.y, tile: { label: "Exit Dungeon", type: "exit", icon: "⬆️", prompt: "Leave the dungeon via the entrance?", color: "#1a5a1a" } });
            setMovingPath([]);
            return;
          }
          if (nextPos.x === DUNGEON_EXIT.x && nextPos.y === DUNGEON_EXIT.y) {
            setSpecialDialog({ x: nextPos.x, y: nextPos.y, tile: { label: "Dungeon Exit", type: "exit", icon: "🚪", prompt: "Leave the dungeon and return to the World Map?", color: "#1a5a1a" } });
            setMovingPath([]);
            return;
          }
        }

        updateChar(char.id, { position: nextPos });
        if (screen === "dungeon") revealFog(nextPos);
        setMovingPath(prev => prev.slice(1));
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [movingPath, combat.active, screen, char?.id]);

  // Keyboard movement
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((screen !== "town" && screen !== "dungeon" && screen !== "sanctuary" && screen !== "tutorial") || !char || specialDialog) return;

      let dx = 0, dy = 0;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") dy = -1;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") dy = 1;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") dx = -1;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") dx = 1;

      if (dx === 0 && dy === 0) return;

      const now = Date.now();
      const moveDelay = stealthActive ? 300 : 120;
      if (now - moveCooldownRef.current < moveDelay) return;
      moveCooldownRef.current = now;

      if (combat.active) {
        if (combat.turnOrder[combat.currentIndex]?.id !== char.id) return;
        if (combatMode !== "move") {
          setCombatMode("move");
          return;
        }
        if (combat.movedSquares >= MOVE_SQUARES) {
          notify(`You can only move ${MOVE_SQUARES} squares per turn!`);
          return;
        }
      }

      const newX = Math.max(0, Math.min(getMapCols(screen) - 1, char.position.x + dx));
      const newY = Math.max(0, Math.min(getMapRows(screen) - 1, char.position.y + dy));

      if (newX === char.position.x && newY === char.position.y) return;
      if (!isWalkable(screen as any, newX, newY)) return; // WASD collision check

      setMovingPath([]); // Cancel click path if WASD used

      // Check special triggers
      if (screen === "town") {
        const special = TOWN_SPECIAL[`${newX},${newY}`];
        if (special) {
          setSpecialDialog({ x: newX, y: newY, tile: special });
          return;
        }
      } else if (screen === "sanctuary") {
        const special = SANCTUARY_SPECIAL[`${newX},${newY}`];
        if (special) {
          setSpecialDialog({ x: newX, y: newY, tile: special });
          return;
        }
      } else if (screen === "dungeon") {
        const special = DUNGEON_SPECIAL[`${newX},${newY}`];
        if (special) {
          setSpecialDialog({ x: newX, y: newY, tile: special });
          return;
        }
        if (newX === DUNGEON_ENTER.x && newY === DUNGEON_ENTER.y) {
          setSpecialDialog({ x: newX, y: newY, tile: { label: "Exit Dungeon", type: "exit", icon: "⬆️", prompt: "Leave the dungeon via the entrance?", color: "#1a5a1a" } });
          return;
        }
        if (newX === DUNGEON_EXIT.x && newY === DUNGEON_EXIT.y) {
          setSpecialDialog({ x: newX, y: newY, tile: { label: "Dungeon Exit", type: "exit", icon: "🚪", prompt: "Leave the dungeon and return to the World Map?", color: "#1a5a1a" } });
          return;
        }
      }

      updateChar(char.id, { position: { x: newX, y: newY } });
      if (screen === "dungeon") revealFog({ x: newX, y: newY });
      if (combat.active) {
        setCombat(prev => ({ ...prev, movedSquares: prev.movedSquares + 1 }));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, char, specialDialog, combat.active, combat.turnOrder, combat.currentIndex, combatMode]);

  function handleSpecialYes() {
    if (!char || !specialDialog) return;
    const { tile, x, y } = specialDialog;
    setSpecialDialog(null);

    if (tile.type === "exit") {
      setScreen("worldMap");
      updateChar(char.id, { position: { x: 10, y: 7 }, currentMap: "town" });
    } else if (tile.type === "shop") {
      updateChar(char.id, { position: { x, y } });
      setShowShop(true);
    } else if (tile.type === "quest") {
      updateChar(char.id, { position: { x, y } });
      setShowQuests(true);
    }
  }

  // ── ITEM / EQUIP ──

  function canChangeEquipment(): boolean {
    if (!combat.active) return true;
    if (combat.turnOrder[combat.currentIndex]?.id !== char?.id) {
      notify("You can only change equipment on your turn during combat!");
      return false;
    }
    if (combat.extraActionUsed) {
      notify("You already used your extra action this turn!");
      return false;
    }
    setCombat(prev => ({ ...prev, extraActionUsed: true, log: [...prev.log, `${char?.name} changed equipment (used extra action).`] }));
    return true;
  }

  function handleEquipItem(item: Item) {
    if (!char) return;
    if (!canChangeEquipment()) return;
    updateChar(char.id, c => {
      const newInv = c.inventory.filter(i => i.id !== item.id);
      let eq = { ...c.equipment };
      if (item.type === "weapon") { 
        if (item.hands === 2) {
          const oldM = eq.mainHand; const oldO = eq.offHand;
          eq.mainHand = item; eq.offHand = null;
          if (oldM) newInv.push(oldM); if (oldO) newInv.push(oldO);
        } else {
          if (!eq.mainHand) { eq.mainHand = item; }
          else if (!eq.offHand && eq.mainHand.hands !== 2) { eq.offHand = item; }
          else {
            const oldM = eq.mainHand; eq.mainHand = item; eq.offHand = null;
            if (oldM) newInv.push(oldM);
          }
        }
      }
      else if (item.type === "armor") { const old = eq.armor; eq.armor = item; if (old) newInv.push(old); }
      else if (item.type === "accessory") {
        const idx = eq.accessories.findIndex(a => a === null);
        const i = idx >= 0 ? idx : 0;
        const old = eq.accessories[i];
        const newAcc: [Item | null, Item | null, Item | null] = [...eq.accessories] as [Item | null, Item | null, Item | null];
        newAcc[i] = item; eq.accessories = newAcc;
        if (old) newInv.push(old);
      }
      const updated = { ...c, inventory: newInv, equipment: eq };
      updated.ac = calcAC(updated); return updated;
    });
  }
  function handleUnequipMainHand() { if (!char?.equipment.mainHand || !canChangeEquipment()) return; const w = char.equipment.mainHand; updateChar(char.id, c => ({ inventory: [...c.inventory, w], equipment: { ...c.equipment, mainHand: null } })); }
  function handleUnequipOffHand() { if (!char?.equipment.offHand || !canChangeEquipment()) return; const w = char.equipment.offHand; updateChar(char.id, c => ({ inventory: [...c.inventory, w], equipment: { ...c.equipment, offHand: null } })); }
  function handleUnequipArmor() {
    if (!char?.equipment.armor || !canChangeEquipment()) return; const a = char.equipment.armor;
    updateChar(char.id, c => { const u = { ...c, inventory: [...c.inventory, a], equipment: { ...c.equipment, armor: null } }; u.ac = calcAC(u); return u; });
  }
  function handleUnequipAcc(i: number) {
    if (!char || !char.equipment.accessories[i] || !canChangeEquipment()) return; const acc = char.equipment.accessories[i]!;
    updateChar(char.id, c => {
      const na: [Item | null, Item | null, Item | null] = [...c.equipment.accessories] as [Item | null, Item | null, Item | null]; na[i] = null;
      const u = { ...c, inventory: [...c.inventory, acc], equipment: { ...c.equipment, accessories: na } }; u.ac = calcAC(u); return u;
    });
  }
  function handleDropItem(id: string) { if (!char) return; updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== id) })); notify("Item dropped."); }
  function handleUseItem(item: Item) {
    if (!char) return;
    const isCombat = combat.active && combat.turnOrder[combat.currentIndex]?.id === char.id;
    
    if (item.effect === "heal" && item.healAmount) {
      if (isCombat) setCombat(c => ({ ...c, extraActionUsed: true }));
      const healed = rollDice(item.healAmount);
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed), inventory: c.inventory.filter(i => i.id !== item.id) }));
      notify(`🧪 ${item.name}: +${healed} HP!`);
    } else if (item.effect === "aoe_bomb") {
      // Bombs are thrown using Main Action. The action is deducted when the bomb actually explodes (in handleMapClick -> spell).
      setCombatMode("spell");
      setSelectedSpell("Small Bomb");
      setPendingBombItemId(item.id);
      notify("💣 Bomb ready — select target area on the map. Click Cancel to abort.");
    } else {
      if (isCombat) setCombat(c => ({ ...c, extraActionUsed: true }));
      notify(`Used ${item.name}.`);
      updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== item.id) }));
    }
  }

  function handleObjectClick(id: string, type: "chest" | "secret") {
    if (!char) return;
    if (type === "chest") {
      const chest = gs.dungeonChests?.find(c => c.id === id);
      if (chest && !chest.opened) {
        setGs(prev => ({ ...prev, dungeonChests: prev.dungeonChests.map(c => c.id === id ? { ...c, opened: true } : c) }));
        const roll = Math.random();
        let itemName = "Minor Healing Potion";
        if (roll < 0.35) itemName = "Minor Healing Potion";
        else if (roll < 0.65) {
          updateChar(char.id, ch => ({ gold: ch.gold + 50 }));
          notify(`🎁 Opened chest! Found 50 Gold.`);
          return;
        } else if (roll < 0.80) {
          const equips = ["Rusty Dagger", "Leather Boots", "Hunter Bow", "Scout Cloak"];
          itemName = equips[Math.floor(Math.random() * equips.length)];
        } else if (roll < 0.90) {
          const rares = ["Pure Slime Core", "Alpha Fang", "Ancient Vine", "Scout Badge"];
          itemName = rares[Math.floor(Math.random() * rares.length)];
        } else if (roll < 0.95) itemName = "Equipment Enhancement Stone";
        else itemName = "Treasure Map Fragment";
        
        const itemDef = MONSTER_DROPS.find(i => i.name === itemName) || SHOP_ITEMS.find(i => i.name === itemName);
        if (itemDef) {
          updateChar(char.id, ch => ({ inventory: [...ch.inventory, { ...itemDef, id: gid() }] }));
          notify(`🎁 Opened chest! Found ${itemName}.`);
        }
      }
    } else if (type === "secret") {
      const secret = gs.dungeonSecrets?.find(s => s.id === id);
      if (secret && !secret.found) {
        setGs(prev => ({ ...prev, dungeonSecrets: prev.dungeonSecrets.map(s => s.id === id ? { ...s, found: true } : s) }));
        const itemDef = MONSTER_DROPS.find(i => i.name === "Selenia's Flower");
        if (itemDef) {
          updateChar(char.id, ch => ({ inventory: [...ch.inventory, { ...itemDef, id: gid() }] }));
          notify(`🌸 You found a glowing flower... You feel a gentle warmth.`);
        }
      }
    }
  }
  function handleBuyItem(item: Item) {
    if (!char || char.gold < item.value) return;
    updateChar(char.id, c => ({ gold: c.gold - item.value, inventory: [...c.inventory, { ...item, id: gid() }] }));
    notify(`Bought ${item.name} for ${item.value}g`);
    setShopPurchaseAnim(item.name);
    setTimeout(() => setShopPurchaseAnim(null), 1200);
  }

  function handleCheckResult(success: boolean, tile: any) {
    if (!char || !specialDialog) return;
    if (success) {
      notify(tile.successText || "Check passed!");
      if (tile.successText?.includes("20g")) {
        updateChar(char.id, (c: any) => ({ gold: c.gold + 20 }));
      }
      if (tile.successText?.includes("Potion")) {
        updateChar(char.id, (c: any) => ({ inventory: [...c.inventory, { id: gid(), ...SHOP_ITEMS[0] }] }));
      }
    } else {
      notify(tile.failText || "Check failed!");
      if (tile.failText?.includes("1d4 damage")) {
        const dmg = rollDice("1d4");
        updateChar(char.id, (c: any) => ({ hp: Math.max(1, c.hp - dmg) }));
        notify(`You took ${dmg} damage from the trap!`);
      }
      if (tile.failText?.includes("5g")) {
        updateChar(char.id, (c: any) => ({ gold: c.gold + 5 }));
      }
    }
    setSpecialDialog({ ...specialDialog, confirmed: true });
    setTimeout(() => { setSpecialDialog(null); }, 1500);
  }
  function handleAcceptQuest(qid: string) {
    if (!char) return;
    const activeQuests = char.activeQuests || [];
    if (activeQuests.length >= 2) { notify("You already have 2 active quests."); return; }
    const q = gs.availableQuests.find(q => q.id === qid); if (!q) return;
    updateChar(char.id, c => ({ activeQuests: [...(c.activeQuests || []), q] }));
    setGs(prev => ({
      ...prev,
      availableQuests: prev.availableQuests.filter(q => q.id !== qid),
    }));
    notify(`Quest accepted: ${q.title}`);
  }
  function handleQuestClaim(questId: string) {
    if (!char || !char.activeQuests) return;
    const q = char.activeQuests.find(pq => pq.id === questId);
    if (!q) return;

    if (!isQuestReadyToTurnIn(q, char.inventory)) {
      notify("Quest is not complete yet.");
      return;
    }

    if (q.gatherTarget) {
      const { itemName, count } = q.gatherTarget;
      const matchingItems = char.inventory.filter(i => i.name === itemName);
      if (matchingItems.length < count) {
        notify(`Need ${count} ${itemName} (have ${matchingItems.length}). Collect more!`);
        return;
      }
      let removed = 0;
      const finalExp = char.tutorialCompleted ? Math.floor(q.reward.exp * 1.02) : q.reward.exp;
      updateChar(char.id, c => ({
        inventory: c.inventory.filter(i => {
          if (i.name === itemName && removed < count) { removed++; return false; }
          return true;
        }),
        exp: c.exp + finalExp,
        gold: c.gold + q.reward.gold,
        activeQuests: (c.activeQuests || []).filter(pq => pq.id !== questId)
      }));
      if (char.tutorialCompleted && finalExp > q.reward.exp) notify(`✨ Blessing of Selenia: Bonus EXP!`);
      notify(`✅ Quest Complete! +${finalExp} EXP, +${q.reward.gold} gold`);
      return;
    }

    const finalExp = char.tutorialCompleted ? Math.floor(q.reward.exp * 1.02) : q.reward.exp;
    updateChar(char.id, ch => ({ 
      exp: ch.exp + finalExp, 
      gold: ch.gold + q.reward.gold,
      activeQuests: (ch.activeQuests || []).filter(pq => pq.id !== questId)
    }));
    if (char.tutorialCompleted && finalExp > q.reward.exp) notify(`✨ Blessing of Selenia: Bonus EXP!`);
    notify(`✅ Reward claimed: +${finalExp} EXP, +${q.reward.gold} gold!`);
  }
  function handleSendChat(text: string, ch: "global" | "party") {
    if (!char) return;
    const msg = { id: gid(), sender: char.name, text, time: tnow() };
    if (ch === "global") setGs(prev => ({ ...prev, globalChat: [...prev.globalChat.slice(-49), msg] }));
    else setGs(prev => ({ ...prev, partyChat: [...prev.partyChat.slice(-49), msg] }));
  }
  function handleCreateParty(name: string) {
    if (!char) return;
    setGs(prev => ({ ...prev, party: { name, leaderId: char.id, memberIds: [char.id], questIds: [] } }));
    notify(`Party "${name}" created!`);
  }
  function handleLeaveParty() { setGs(prev => ({ ...prev, party: null, partyQuests: [] })); notify("Left party."); }

  function handleUseSkillFromHUD(spellName: string) {
    if (!char) return;
    
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const spell = allSpells.find(s => s.name === spellName);
    const gameSkill = SKILL_DICTIONARY[spellName];

    if (!spell && !gameSkill) return;

    const isHeal = spell?.type === "heal" || (spell?.type === "cantrip" && spell.heal) || gameSkill?.healAmount;

    if (isHeal) {
      if (combat.active) {
        handleSpellSelect(spellName);
      } else {
        if (spell && spell.level > 0) {
          if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots!"); return; }
          updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));
        }
        const spMod = getSpellcastingMod(char);
        let healed = 0;
        if (spell?.heal) {
          healed = spell.heal === "5" ? 5 : rollDice(spell.heal ?? "1d4") + spMod;
        } else if (gameSkill?.healAmount) {
          healed = rollDice(gameSkill.healAmount) + (spellName === "fighter_second_wind" ? char.level * 2 : 0);
        }
        updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
        addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
        notify(`✨ ${spell?.name ?? gameSkill?.name}: +${healed} HP`);
      }
      return;
    }

    if (screen === "town") { notify("Cannot use attack skills in a safe zone."); return; }
    
    // For non-heal active skills that require combat
    handleSpellSelect(spellName);
    if (!combat.active) {
      notify(`${spell?.name ?? gameSkill?.name} ready — select a target!`);
    }
  }

  // ── NAVIGATION ──

  function handleLogin(u: string, ids: string[], newGs: GameState) { setGs(newGs); setSession({ username: u, charIds: ids }); setScreen("charSelect"); }
  function handleSelectChar(id: string) { setActiveCharId(id); setScreen("worldMap"); }
  function handleCreateChar(c: Character) {
    setGs(prev => {
      const newChars = { ...prev.characters, [c.id]: c };
      const newAccs = prev.accounts.map(a => a.username === session?.username ? { ...a, charIds: [...a.charIds, c.id] } : a);
      return { ...prev, characters: newChars, accounts: newAccs };
    });
    setSession(prev => prev ? { ...prev, charIds: [...prev.charIds, c.id] } : null);
    setCreatingChar(false); 
    setActiveCharId(c.id);
    
    // Initial Spawn: Sanctuary, facing Selenia
    c.position = { x: 15, y: 16 };
    c.currentMap = "sanctuary";
    setScreen("sanctuary");

    // Start New Character Dialog
    setTimeout(() => {
      setSeleniaDialogTree({
        start: {
          emotion: "gentle",
          text: "I'm so glad we finally meet, Traveler.",
          next: "intro1"
        },
        intro1: {
          emotion: "normal",
          text: "I am Selenia, the watcher of stars... and everyone's journey.",
          next: "intro2"
        },
        intro2: {
          emotion: "gentle",
          text: "Before I let you go, would you like me to guide you a bit about this world?",
          choices: [
            { label: "Learn the basics (Tutorial)", next: () => {
                setSeleniaDialogTree(null);
                enterTutorial(c);
              }
            },
            { label: "I'm ready to depart (Skip)", next: "skip_intro" }
          ]
        },
        skip_intro: {
          emotion: "playful",
          text: "In a hurry, aren't we? I understand. But whenever you're in doubt... just pray at my statue. I'll always be waiting.",
          next: () => {
            setSeleniaDialogTree(null);
            const char = c;
            if (!char) return;
            updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" });
            setScreen("town");
          }
        }
      });
    }, 500);
  }
  function handleLogout() { setSession(null); setActiveCharId(null); setScreen("auth"); setCombat(INIT_COMBAT); }
  function handleDeleteChar(id: string) {
    if (!confirm("Are you sure you want to delete this hero?")) return;
    setGs(prev => {
      const newChars = { ...prev.characters };
      delete newChars[id];
      const newAccs = prev.accounts.map(a => a.username === session?.username ? { ...a, charIds: a.charIds.filter(cid => cid !== id) } : a);
      return { ...prev, characters: newChars, accounts: newAccs };
    });
    setSession(prev => prev ? { ...prev, charIds: prev.charIds.filter(cid => cid !== id) } : null);
  }
  function enterTown() { if (!char) return; updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" }); setScreen("town"); setCombat(INIT_COMBAT); setSeleniaTalkCount(0); }
  function enterDungeon() { 
    if (!char) return; 
    setSeleniaTalkCount(0);updateChar(char.id, { position: DUNGEON_ENTER, currentMap: "dungeon" }); setScreen("dungeon"); setCombat(INIT_COMBAT);
    setFogRevealed(new Set([`${DUNGEON_ENTER.x},${DUNGEON_ENTER.y}`, `${DUNGEON_ENTER.x},${DUNGEON_ENTER.y - 1}`, `${DUNGEON_ENTER.x - 1},${DUNGEON_ENTER.y}`]));
    
    const getRandomWalkableTile = () => {
      let rx, ry;
      let attempts = 0;
      do {
        rx = Math.floor(Math.random() * 50);
        ry = Math.floor(Math.random() * 40);
        attempts++;
      } while (!isWalkable("dungeon", rx, ry) && attempts < 100);
      return { x: rx, y: ry };
    };

    const chests = [];
    if (Math.random() < 0.20) {
      chests.push({ id: gid(), position: getRandomWalkableTile(), opened: false });
    }
    const secrets = [];
    if (Math.random() < 0.15) {
      secrets.push({ id: gid(), position: getRandomWalkableTile(), found: false, type: "selenias_flower" });
    }

    setGs(prev => ({ 
      ...prev, 
      dungeonMonsters: parseWhisperingForest().monsters,
      dungeonChests: chests,
      dungeonSecrets: secrets
    }));
    notify("Entered Darkroot Depths. Monsters lurk in the dark...", 3000);
  }
  function enterSanctuary() { if (!char) return; updateChar(char.id, { position: { x: 15, y: 16 }, currentMap: "sanctuary" }); setScreen("sanctuary"); setCombat(INIT_COMBAT); }
  
  function handleSpeakWithSelenia() {
    if (!char) return;
    const CURRENT_VERSION = "0.5.0"; 
    
    let greetingText = "Welcome back, Traveler.";
    let greetingEmotion: import("./types/game").Emotion = "gentle";

    if (char.lastSeenVersion !== CURRENT_VERSION) {
      greetingText = "Oh! The world has changed a little since you last visited... I hope you like the new updates!";
      greetingEmotion = "shocked";
      updateChar(char.id, { lastSeenVersion: CURRENT_VERSION });
    } else if (char.lastLoginTime && (Date.now() - char.lastLoginTime > 1000 * 60 * 60 * 24 * 7)) { // 7 days
      greetingText = "It has been so long... I was starting to worry. I'm glad you're safe.";
      greetingEmotion = "blushing";
      updateChar(char.id, { lastLoginTime: Date.now() });
    } else {
      if (seleniaTalkCount === 1) {
        greetingText = "Are you really this free, Traveler? ...Or should I post more quests?";
        greetingEmotion = "wondering";
      } else if (seleniaTalkCount === 2) {
        greetingText = "You caught me! I actually change my greetings slightly when you visit often.";
        greetingEmotion = "shocked";
      } else if (seleniaTalkCount >= 3) {
        greetingText = "...I don't even know what to say anymore. But... I'm really happy to see you.";
        greetingEmotion = "blushing";
      }
    }
    setSeleniaTalkCount(prev => prev + 1);

    const hasFlower = char.inventory.some(i => i.name === "Selenia's Flower");

    setSeleniaDialogTree({
      start: {
        emotion: greetingEmotion,
        text: greetingText,
        next: "options"
      },
      options: {
        emotion: "normal",
        text: "Is there something you'd like to talk about?",
        choices: [
          ...(hasFlower ? [{ label: "I found this flower for you...", next: "give_flower" }] : []),
          { label: "Learn the basics again", next: "tutorial_ask" },
          { label: "I have a question about the world", next: "questions_menu" },
          { label: "Send a message to the Creator", next: "feedback_ask" },
          { label: "I want another blessing", next: "more_blessing" },
          { label: "I just missed you", next: "miss_you" },
          { label: "Just passing by", next: "accidental" },
          { label: "I should get going", next: () => setSeleniaDialogTree(null) }
        ]
      },
      give_flower: {
        emotion: "shocked",
        text: "W-what...? This is... a Moonbloom? Where did you find this? They only grow in places with deep, ancient magic...",
        next: "give_flower2"
      },
      give_flower2: {
        emotion: "blushing",
        text: "You really brought this back... just for me? Thank you, Traveler. I... I will treasure it always.",
        choices: [
          { label: "You're welcome.", next: () => {
              updateChar(char.id, ch => ({ inventory: ch.inventory.filter(i => i.name !== "Selenia's Flower") }));
              setSeleniaDialogTree(null);
            }
          }
        ]
      },
      questions_menu: {
        emotion: "gentle",
        text: "Of course. What would you like to know?",
        choices: [
          { label: "Explain Stats (STR, DEX, CON...)", next: "q_stats" },
          { label: "What is a Modifier?", next: "q_modifier" },
          { label: "What is a Hit Roll?", next: "q_hitroll" },
          { label: "What is AC?", next: "q_ac" },
          { label: "How is Damage calculated?", next: "q_damage" },
          { label: "What is a Saving Throw?", next: "q_save" },
          { label: "Long Rest vs Short Rest?", next: "q_rest" },
          { label: "What stats should I upgrade?", next: "q_upgrade" },
          { label: "Tell me about the Classes", next: "q_classes" },
          { label: "How do Skills work?", next: "q_skills" },
          { label: "How does Equipment work?", next: "q_equip" },
          { label: "Actually, never mind", next: "options" }
        ]
      },
      q_stats: { emotion: "normal", text: "There are six core attributes: Strength (STR) for raw power, Dexterity (DEX) for agility, Constitution (CON) for health, Intelligence (INT) for arcane magic, Wisdom (WIS) for divine magic, and Charisma (CHA) for presence.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_modifier: { emotion: "gentle", text: "When your stats grow, you gain a bonus called a Modifier. A stat of 10 gives a +0 Modifier, while 12 gives +1, 14 gives +2, and so on. This bonus is added to your dice rolls to ensure your success!", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_hitroll: { emotion: "normal", text: "When you attack, you roll a 20-sided die (d20). Then, we add your weapon's stat Modifier and your Proficiency Bonus. This total is your Hit Roll. If it equals or beats the enemy's Armor Class (AC), you hit!", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_ac: { emotion: "wondering", text: "AC stands for Armor Class. It represents how hard it is to land a solid blow on you. It's calculated based on the armor you wear, plus your Dexterity Modifier if your armor is light enough.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_damage: { emotion: "normal", text: "If your Hit Roll succeeds, you deal damage! The damage is determined by your weapon's dice—like 1d8 for a Longsword—plus your stat Modifier. Some spells have fixed damage dice without modifiers.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_save: { emotion: "gentle", text: "Sometimes an enemy casts a spell or sets a trap. Instead of rolling to hit your AC, they force you to make a Saving Throw. You roll a d20 and add the relevant Modifier. If you roll high enough, you resist the effect!", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_rest: { emotion: "normal", text: "Resting is vital! A Short Rest at a campfire takes a few hours and heals a bit of HP. A Long Rest at the Inn costs 10g but fully restores your HP and all your Skill uses for the day.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_upgrade: { emotion: "happy", text: "Focus on your class's primary stat! Fighters rely on Strength or Dexterity. Wizards need Intelligence. Clerics and Paladins use Wisdom or Charisma. And everyone benefits from Constitution for extra health!", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_classes: { emotion: "normal", text: "Fighters master weapons and armor. Wizards study arcane spells and unleash area damage. Clerics channel divine magic to heal and smite. Paladins blend martial prowess with holy auras.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_skills: { emotion: "wondering", text: "As you level up, you will unlock Skills. Some can be used infinitely, but many powerful Skills can only be used once before you must take a Long Rest to recover your stamina or magic slots.", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      q_equip: { emotion: "gentle", text: "You can equip a weapon in your Main Hand, a shield or another weapon in your Off Hand, Armor on your body, and magical Accessories. Better gear significantly improves your combat potential!", choices: [{ label: "I have another question", next: "questions_menu" }, { label: "That's all for now", next: "options" }] },
      tutorial_ask: {
        emotion: "wondering",
        text: "Why would you like to review the tutorial?",
        choices: [
          { label: "I forgot how combat works.", next: "tut_reason_forgot" },
          { label: "I want to learn again.", next: "tut_reason_learn" },
          { label: "I want to see you again.", next: "tut_reason_see" },
          { label: "Just checking something.", next: "tut_reason_check" },
          { label: "Never mind.", next: "options" },
        ]
      },
      tut_reason_forgot: {
        emotion: "gentle",
        text: "I understand. There's a lot to take in! Let's start over.",
        next: () => { setSeleniaDialogTree(null); enterTutorial(); }
      },
      tut_reason_learn: (() => {
        const replayCount = char.tutorialReplayCount ?? 0;
        const hasFlower = char.inventory.some(i => i.name === "Selenia's Flower");
        if (hasFlower) return {
          emotion: "gentle",
          text: "Oh... you're still carrying the flower I gave you. Thank you, Traveler. That makes me happier than you know. Now, shall we review the basics together?",
          next: "tut_begin_confirm"
        };
        if (replayCount >= 10) return {
          emotion: "blushing",
          text: "At this rate... I'm starting to think you're coming here to see me more than to review the tutorial. Hehe... I suppose I don't mind. 😊",
          next: "tut_begin_confirm"
        };
        if (replayCount >= 4) return {
          emotion: "blushing",
          text: "Traveler... this is becoming a habit, isn't it? Not that I'm complaining. It's always nice spending a little more time together. Now then, let's begin once again!",
          next: "tut_begin_confirm"
        };
        if (char.level >= 5) return {
          emotion: "happy",
          text: "You've already grown so much since we first met. Even so, there's nothing wrong with reviewing the fundamentals. Great adventurers never stop learning.",
          next: "tut_begin_confirm"
        };
        if (replayCount === 2) return {
          emotion: "playful",
          text: "Back again? Hehe... I don't mind at all. Even experienced adventurers revisit the basics from time to time. Let's make sure you're ready for whatever lies ahead!",
          next: "tut_begin_confirm"
        };
        if (replayCount === 1) return {
          emotion: "happy",
          text: "Welcome back, Traveler! Did you forget something, or were you simply hoping to see me again? Hehe... Either way, I'd be happy to go through the basics with you once more. Everyone learns at their own pace.",
          next: "tut_begin_confirm"
        };
        return {
          emotion: "gentle",
          text: "Of course! I'll walk you through everything once more.",
          next: "tut_begin_confirm"
        };
      })(),
      tut_reason_see: {
        emotion: "blushing",
        text: "...Eh? You're going to make me smile, Traveler. Hehe... Very well. I'll gladly accompany you once more.",
        next: "tut_begin_confirm"
      },
      tut_reason_check: {
        emotion: "gentle",
        text: "Of course. Let's review everything together.",
        next: "tut_begin_confirm"
      },
      tut_begin_confirm: {
        emotion: "happy",
        text: "Shall we begin?",
        choices: [
          { label: "Yes, let's go!", next: () => { setSeleniaDialogTree(null); enterTutorial(); } },
          { label: "Actually, maybe later.", next: "options" }
        ]
      },
      accidental: {
        emotion: "playful",
        text: "Fufu, I'll just take that as a warm greeting then.",
        next: "options"
      },
      more_blessing: {
        emotion: "playful",
        text: "A little greedy, aren't we? But... I can only give you this blessing once.",
        next: "options"
      },
      miss_you: {
        emotion: "gentle",
        text: "...Thank you. Hearing that makes a Goddess like me very happy too.",
        next: "options"
      },
      feedback_ask: {
        emotion: "gentle",
        text: "Is there anything you'd like to tell the Creator of this world? I'll deliver your message.",
        choices: [
          { label: "Send message", next: () => {
              const msg = window.prompt("Tell Selenia your thoughts:");
              if (msg) {
                setSeleniaDialogTree({
                  feedback_done: {
                    emotion: "gentle",
                    text: "Done! I hope the Creator gets to read your message very soon.",
                    next: "feedback_extra"
                  },
                  feedback_extra: {
                    emotion: "happy",
                    text: "...If it's a compliment, I bet they'll be smiling all day long.",
                    next: "options"
                  }
                });
              } else {
                setSeleniaDialogTree(prev => prev ? { ...prev, start: prev.options } : null);
              }
            }
          },
          { label: "Nevermind", next: "options" }
        ]
      }
    });
  }

  function enterTutorial(targetChar?: Character) {
    const c = targetChar || char;
    if (!c) return; 
    setSeleniaTalkCount(0);
    
    // Clear combat-specific tutorial IDs so they fire again on replay
    const COMBAT_TUTORIAL_IDS = [
      "tut_before_first_attack",
      "tut_first_hit",
      "tut_first_miss",
      "tut_first_crit",
      "tut_first_spell_attack",
      "tut_first_save_spell",
    ];
    const clearedSeen = (c.tutorialsSeen || []).filter(id => !COMBAT_TUTORIAL_IDS.includes(id));
    const newReplayCount = (c.tutorialReplayCount ?? 0) + (c.tutorialCompleted ? 1 : 0);
    
    // Clear the synchronous ref too — must mirror the state clear
    COMBAT_TUTORIAL_IDS.forEach(id => tutorialsSeenRef.current.delete(id));
    
    updateChar(c.id, { 
      position: { x: 15, y: 15 }, 
      currentMap: "tutorial",
      tutorialsSeen: clearedSeen,
      tutorialReplayCount: newReplayCount,
    });
    setScreen("tutorial"); 
    
    const dummyId = gid();
    setGs(prev => ({
      ...prev,
      dungeonMonsters: [{
        id: dummyId,
        name: "Training Dummy",
        hp: 30,
        maxHp: 30,
        ac: 8,
        xp: 10,
        attackMod: 2,
        damage: "1d4",
        range: 5,
        sightRange: 10,
        position: { x: 15, y: 11 },
        alerted: true
      }]
    }));

    const playerInit = 20; // Player always first in tutorial
    const order: CombatState["turnOrder"] = [
      { id: c.id, type: "player" as const, name: c.name, initiative: playerInit },
      { id: dummyId, type: "monster" as const, name: "Training Dummy", initiative: 10 }
    ];
    
    setCombat({ 
      active: true, round: 1, turnOrder: order, currentIndex: 0, 
      actionUsed: false, extraActionUsed: false, extraMainActions: 0, movedSquares: 0, 
      log: ["⚔ Tutorial Combat Started!"], engagedMonsterIds: [dummyId] 
    });
    setCombatMode("none");

    setTimeout(() => showSeleniaPopup("gentle", ["Try walking around using WASD or the arrow keys.", "Take a few steps! The world is yours to explore.", "Don't be shy, take a walk!", "Movement is the first step of any grand adventure."]), 1000);
    setTimeout(() => showSeleniaPopup("happy", ["See? It's not that hard.", "You're getting the hang of it!", "That's it! Just take it one step at a time.", "Perfect! You move quite gracefully."]), 7000);

    setTimeout(() => showSeleniaPopup("wondering", ["The menu is very important... Many adventurers forget how to open it on their first day.", "Don't forget to check your menu! It's easy to get lost without it.", "Your equipment and stats are all in the menu. Don't forget about them!", "Some heroes wander for days without ever opening their inventory... don't be one of them."]), 35000);
  }

  const triggerContextualTutorial = useCallback((tutorialId: string, tree: any) => {
    if (!char) return false;
    // Only show tutorial dialogs if the player is in the tutorial area
    if (char.currentMap !== "tutorial") return false;
    
    // Synchronous ref check — prevents double-fire before React re-renders
    if (tutorialsSeenRef.current.has(tutorialId)) return false;
    const seen = char.tutorialsSeen || [];
    if (seen.includes(tutorialId)) return false;
    
    // Mark synchronously in ref immediately so no second call can slip through
    tutorialsSeenRef.current.add(tutorialId);
    // Also persist to character state (async, for next session)
    updateChar(char.id, { tutorialsSeen: [...seen, tutorialId] });
    
    // Defer showing the dialog slightly so the action (e.g. log output) can render first
    setTimeout(() => {
      setSeleniaDialogTree(tree);
    }, 100);
    return true;
  }, [char, updateChar]);

  // ── REAL-TIME EXPLORATION AI ──
  useEffect(() => {
    if (screen !== "dungeon" || combat.active) return;
    
    const interval = setInterval(() => {
      const currentChar = charRef.current;
      if (!currentChar || currentChar.hp <= 0) return;

      setGs(prev => {
        const newMonsters = [...prev.dungeonMonsters];
        let alertTriggered = false;
        let engagingMonsters: string[] = [];

        for (let i = 0; i < newMonsters.length; i++) {
          const m = newMonsters[i];
          if (m.hp <= 0) continue;

          // Stealth clearing if too far
          if (stealthedMonstersRef.current.has(m.id)) {
            const d = distToEntity(currentChar.position, m.position, m.size);
            if (d > 20) stealthedMonstersRef.current.delete(m.id);
          }

          // 1. Vision Check
          const seesPlayer = checkMonsterVision(m, currentChar.position.x, currentChar.position.y, wfMap.obstacles, wfMap.covers, stealthActive || stealthCasting);
          
          if (seesPlayer && m.aiState !== "alert" && !stealthCasting) {
             let detected = true;
             if (stealthActive) {
                if (stealthedMonstersRef.current.has(m.id)) {
                   detected = false;
                } else {
                   const dexMod = getMod(currentChar.stats.dex);
                   const roll = d20();
                   const total = roll + dexMod;
                   const perceptionRoll = d20() + Math.floor((m.insightDC ?? 10) / 2);
                   
                   if (total >= perceptionRoll) {
                      detected = false;
                      stealthedMonstersRef.current.add(m.id);
                      addDiceRoll({ type: "skill", value: roll, total, mod: dexMod, max: 20, label: `Stealth vs ${m.name}` });
                      notify(`🥷 Evaded ${m.name}! (Stealth ${total} vs Perception ${perceptionRoll})`);
                   } else {
                      setStealthActive(false);
                      stealthedMonstersRef.current.clear();
                      addDiceRoll({ type: "skill", value: roll, total, mod: dexMod, max: 20, label: `Stealth Failed` });
                      notify(`⚠️ ${m.name} spotted you! (Perception ${perceptionRoll} vs Stealth ${total})`);
                   }
                }
             }

             if (detected) {
                // Spot player! Go to Alert state.
                newMonsters[i] = { ...m, aiState: "alert", alerted: true, lastSeenCharPos: { ...currentChar.position } };
                if (!stealthActive) notify(`⚠️ ${m.name} spotted you!`);
                continue; // Wait one tick
             }
          }

          if (m.aiState === "alert") {
             // Already alert, now entering combat
             alertTriggered = true;
             engagingMonsters.push(m.id);
             continue;
          }

          // 2. Exploration Movement / Behavior
          if (!seesPlayer || (seesPlayer && stealthActive && stealthedMonstersRef.current.has(m.id))) {
             // Idle Behavior
             if (m.personality === "aggressive" && (m.name === "Slime" || m.name === "Wolf")) {
                // Slimes and Wolves just wander randomly occasionally
                if (Math.random() < 0.4) {
                   const dirs: import("./types/game").Monster["facing"][] = ["N", "E", "S", "W"];
                   const newFacing = dirs[Math.floor(Math.random()*dirs.length)];
                   
                   // Move 1 step randomly
                   const adjs = [{dx:0, dy:-1, f:"N"}, {dx:1, dy:0, f:"E"}, {dx:0, dy:1, f:"S"}, {dx:-1, dy:0, f:"W"}];
                   const move = adjs[Math.floor(Math.random() * 4)];
                   const nx = m.position.x + move.dx;
                   const ny = m.position.y + move.dy;
                   if (isWalkable("dungeon", nx, ny) && !newMonsters.some(other => other.id !== m.id && other.hp > 0 && other.position.x === nx && other.position.y === ny)) {
                     newMonsters[i] = { ...m, position: { x: nx, y: ny }, facing: move.f as import("./types/game").Monster["facing"] };
                   } else {
                     newMonsters[i] = { ...m, facing: newFacing };
                   }
                }
             } else if (m.personality === "cautious" && m.name === "Goblin Scout") {
                // Goblin Scout patrols / looks around
                if (Math.random() < 0.3) {
                   // Just turn head
                   const dirs: import("./types/game").Monster["facing"][] = ["N", "E", "S", "W"];
                   newMonsters[i] = { ...m, facing: dirs[Math.floor(Math.random()*dirs.length)] };
                } else if (Math.random() < 0.5) {
                   // Move forward in facing direction
                   let dx=0, dy=0;
                   if (m.facing === "N") dy = -1;
                   if (m.facing === "E") dx = 1;
                   if (m.facing === "S") dy = 1;
                   if (m.facing === "W") dx = -1;
                   const nx = m.position.x + dx;
                   const ny = m.position.y + dy;
                   if (isWalkable("dungeon", nx, ny) && !newMonsters.some(other => other.id !== m.id && other.hp > 0 && other.position.x === nx && other.position.y === ny)) {
                     newMonsters[i] = { ...m, position: { x: nx, y: ny } };
                   } else {
                     // Hit wall, turn around
                     const opposite: Record<string, import("./types/game").Monster["facing"]> = { "N":"S", "S":"N", "E":"W", "W":"E" };
                     newMonsters[i] = { ...m, facing: opposite[m.facing || "S"] };
                   }
                }
             }
             // Vine (Territorial) and Boss stay still
          }
        }
        
        // --- Real-time Insight Vision Update ---
        const now = Date.now();
        if (insightRevealedIdsRef.current.size > 0) {
          if (now < insightActiveUntilRef.current) {
            const rtTiles = new Set<string>();
            newMonsters.forEach(m => {
              if (insightRevealedIdsRef.current.has(m.id) && m.hp > 0) {
                const range = m.aiState === "alert" ? m.sightRange + 3 : m.sightRange;
                for (let dy = -range; dy <= range; dy++) {
                  for (let dx = -range; dx <= range; dx++) {
                      const vx = m.position.x + dx;
                      const vy = m.position.y + dy;
                      if (checkMonsterVision(m, vx, vy, wfMap.obstacles, wfMap.covers)) {
                        rtTiles.add(`${vx},${vy}`);
                      }
                  }
                }
              }
            });
            setInsightVisionTiles(rtTiles);
          } else {
            insightRevealedIdsRef.current.clear();
            setInsightVisionTiles(new Set());
          }
        }
        
        if (alertTriggered && engagingMonsters.length > 0) {
           // We can't safely call startCombat directly from inside setGs reducer, 
           // so we use a setTimeout trick to schedule it outside the render cycle.
           setTimeout(() => {
             startCombat(engagingMonsters);
           }, 0);
        }

        return { ...prev, dungeonMonsters: newMonsters };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, combat.active, stealthActive, stealthCasting, startCombat, notify, addDiceRoll]);

  const handleLongRest = useCallback(() => {
    if (!char) return;
    if (char.gold < 100) {
      notify("Not enough gold for a Long Rest. You need 100g.");
      return;
    }
    updateChar(char.id, c => ({
      gold: c.gold - 100,
      hp: c.maxHp,
    }));
    notify("You feel fully restored after a good night's sleep!");
  }, [char, notify, updateChar]);

  const handleShortRest = useCallback(() => {
    if (!char || combat.active) return;
    const now = Date.now();
    if (char.lastShortRestTime && now - (char.lastShortRestTime ?? 0) < 5 * 60 * 1000) {
      const wait = Math.ceil((5 * 60 * 1000 - (now - (char.lastShortRestTime ?? 0))) / 60000);
      notify(`You must wait ${wait} minutes before taking another short rest.`);
      return;
    }
    const heal = Math.floor(char.maxHp / 2);
    updateChar(char.id, c => ({
      hp: Math.min(c.maxHp, c.hp + heal),
      lastShortRestTime: now
    }));
    setRestAnim("short");
    notify(`You took a short rest and recovered ${heal} HP.`);
    setTimeout(() => setRestAnim(null), 2000);
  }, [char, combat.active, updateChar, notify]);

  const handleCancelQuest = useCallback((questId: string) => {
    if (!char) return;
    const cancelFee = 10; // Match QUEST_CANCEL_COST
    if (char.gold < cancelFee) {
      notify(`Not enough gold to cancel the quest. Fee is ${cancelFee}g.`);
      return;
    }

    const quest = (char.activeQuests || []).find(q => q.id === questId);
    if (!quest) return;

    updateChar(char.id, c => ({ 
      gold: c.gold - cancelFee,
      activeQuests: (c.activeQuests || []).filter(q => q.id !== questId)
    }));
    notify(`Quest canceled. ${cancelFee}g fee deducted.`);
  }, [char, notify, updateChar]);

  return {
    // state
    gs, session, activeCharId, screen, creatingChar, combat, fogRevealed, combatMode,
    effects, dyingMonsters, hitTokenIds, selectedSpell, diceRolls, battleStart,
    hudTab, hudOpen, chatTab, specialDialog, showShop, showQuests, notification,
    skillObtained,
    actionText, restAnim, zoom, shopPurchaseAnim,
    char,
    // setters
    setHudTab, setHudOpen, setChatTab, setZoom, setCombatMode, setCreatingChar, setScreen,
    setActiveCharId, setSelectedSpell, setPendingBombItemId, setShowShop, setShowQuests, setSpecialDialog, setCombat,
    updateChar,
    // combat
    startCombat, endCombat, endPlayerTurn, handleSpellSelect, handleCastSpellAtTile,
    handleCastSpell, handleHealSelf, handleGuard, handleMonsterClick, handleObjectClick, handleAttackMonster,
    executeBombEffect, handleAOECastFromGrid,
    handleFlee: () => {}, // unused
    handleShortRest, handleLongRest,
    handleInsight, handleStealth,
    insightCooldown, insightVisionTiles, stealthActive, stealthCasting,
    // movement
    handleTileClick,
    // items
    handleEquipItem, handleUnequipMainHand, handleUnequipOffHand, handleUnequipArmor, handleUnequipAcc,
    handleDropItem, handleUseItem, handleBuyItem,
    // quests/party/chat
    handleAcceptQuest, handleQuestClaim,
    seleniaDialogTree, setSeleniaDialogTree, seleniaPopup,
    handleSendChat, handleUseSkillFromHUD,
    // navigation
    handleLogin, handleSelectChar, handleCreateChar, handleLogout, handleDeleteChar,
    enterTown, enterDungeon, enterSanctuary, enterTutorial, handleSpecialYes, handleSpeakWithSelenia, handleCheckResult,
    // ui helpers
    notify, notifySkill, setSkillObtained,
    setRestAnim,
    handleCancelQuest,
    INIT_COMBAT,
  };
}

void CLASS_CFG;
void ({} as Stats);
