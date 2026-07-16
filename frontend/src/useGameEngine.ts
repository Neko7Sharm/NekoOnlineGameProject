import { useState, useEffect, useRef, useCallback } from "react";
import type {
  GameState, Character, Item, CombatState, CombatModeT, VisualEffect, DiceRollDisplay, Screen, Stats, Quest
} from "./types/game";
import { C } from "./constants/theme";
import { CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "./constants/classes";
import { SKILL_DICTIONARY } from "./constants/skills";
import { SHOP_ITEMS, BRANCH_ITEM } from "./constants/items";
import { NPC_CHAT } from "./constants/quests";
import {
  COLS, ROWS, MOVE_SQUARES, SIGHT, DUNGEON_ENTER, DUNGEON_EXIT, TOWN_ENTER,
  TOWN_SPECIAL, SANCTUARY_SPECIAL, isWalkable
} from "./constants/map";
import { gid, d20, getMod, dist, tnow, rollDice, getSpellcastingMod, calcAC } from "./utils/dice";
import { loadState, persist } from "./storage";
import { genMonsters, genQuests } from "./game/character";

const INIT_COMBAT: CombatState = {
  active: false, round: 1, turnOrder: [], currentIndex: 0,
  actionUsed: false, extraActionUsed: false, movedSquares: 0,
  log: [], engagedMonsterIds: [], activeBuffs: []
};

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
  const [actionText, setActionText] = useState<{ text: string; color: string } | null>(null);
  const [restAnim, setRestAnim] = useState<"short" | "long" | null>(null);
  const [zoom, setZoom] = useState(1.3);
  const [shopPurchaseAnim, setShopPurchaseAnim] = useState<string | null>(null);
  const monsterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const char = activeCharId ? gs.characters[activeCharId] : null;

  useEffect(() => { persist(gs); }, [gs]);

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
    setCombat({ active: true, round: 1, turnOrder: order, currentIndex: 0, actionUsed: false, extraActionUsed: false, movedSquares: 0, log, engagedMonsterIds: monsterIds });
    setCombatMode("none");
  }, [char, gs.dungeonMonsters]);

  const endCombat = useCallback((c: CombatState) => {
    if (!char) return;
    const dead = gs.dungeonMonsters.filter(m => c.engagedMonsterIds.includes(m.id) && m.hp <= 0);
    let baseExp = 0;
    const drops: Item[] = [];
    dead.forEach(m => {
      baseExp += m.xp;
      if (Math.random() < 0.4) drops.push({ id: gid(), name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." });
      if (Math.random() < 0.5) drops.push({ id: gid(), ...BRANCH_ITEM });
      if (Math.random() < 0.6) updateChar(char.id, ch => ({ gold: ch.gold + 2 + Math.floor(Math.random() * 5) }));
    });
    let updatedAQ = (char.activeQuests || []).map(q => {
      if (q.killTarget?.monster === "Wooden Dummy") {
        const nextCurrent = Math.min((q.killTarget.current ?? 0) + dead.length, q.killTarget.count);
        return { ...q, killTarget: { ...q.killTarget, current: nextCurrent } };
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
              emotion: "gentle",
              text: "From now on, the path ahead is yours to walk...",
              next: "farewell"
            },
            farewell: {
              emotion: "gentle",
              text: "May the stars guide you through your darkest nights, and may your heart remain steadfast. I will always be watching over you, Traveler.\n(Received Blessing of Selenia)",
              next: () => {
                setSeleniaDialogTree(null);
                updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" });
                setScreen("town");
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

  // Monster sight
  useEffect(() => {
    if (screen !== "dungeon" || combat.active || !char) return;
    clearTimeout(monsterTimerRef.current);
    monsterTimerRef.current = setTimeout(() => {
      const triggered = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(char.position, m.position) <= m.sightRange);
      if (triggered.length > 0) startCombat(triggered.map(m => m.id));
    }, 300);
  }, [char?.position, screen, combat.active, gs.dungeonMonsters, startCombat]);

  // New monsters joining
  useEffect(() => {
    if (!combat.active || !char || screen !== "dungeon") return;
    const inSight = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(char.position, m.position) <= m.sightRange);
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
      const isPlayerTurn = nextActor?.type === "player";
      return {
        ...prev, currentIndex: nextIdx,
        round: isNew ? prev.round + 1 : prev.round,
        actionUsed: false, extraActionUsed: false, movedSquares: 0,
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
      const d = dist(monster.position, char.position);
      let newPos = { ...monster.position };
      if (d > 1) {
        const dx = char.position.x - monster.position.x;
        const dy = char.position.y - monster.position.y;
        const sx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
        const sy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
        newPos = { x: Math.max(0, Math.min(COLS - 1, monster.position.x + sx)), y: Math.max(0, Math.min(ROWS - 1, monster.position.y + sy)) };
        newLog.push(`${monster.name} moves.`);
      }
      newMonsters[mIdx] = { ...newMonsters[mIdx], position: newPos };

      setGs(prev => ({ ...prev, dungeonMonsters: newMonsters }));

      const nd = dist(newPos, char.position);
      if (nd <= Math.ceil((monster.range ?? 5) / 5)) {
        let atkRoll1 = d20();
        let atkRoll2 = d20();
        
        // Protector Subclass: impose disadvantage
        let hasDisadvantage = char.subclass === "protector" && nd <= 1;
        let atkRollBase = hasDisadvantage ? Math.min(atkRoll1, atkRoll2) : atkRoll1;
        let atkRoll = atkRollBase + monster.attackMod;

        // Reaction: Wizard Shield
        let effectiveAC = char.ac;
        let usedShield = false;
        if (atkRoll >= char.ac && atkRoll < char.ac + 5 && char.gameSkills?.includes("wizard_shield_spell")) {
          effectiveAC += 5;
          usedShield = true;
        }

        // Shield Wall Buff
        if ((combat.activeBuffs || []).includes("fighter_shield_wall")) {
          effectiveAC += 2;
        }

        const disadvLabel = hasDisadvantage ? "(Disadv) " : "";
        const logEntry = `${monster.name} attacks ${char.name}: ${disadvLabel}[${atkRollBase}+${monster.attackMod}=${atkRoll}] vs AC ${effectiveAC}${usedShield ? " (Shield Spell!)" : ""}`;

        addDiceRoll({ type: "hit", value: atkRollBase, total: atkRoll, mod: monster.attackMod, max: 20, label: `${disadvLabel}vs AC ${effectiveAC}` });

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
              addEffect({ type: "scratch", gridX: char.position.x, gridY: char.position.y });
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
    const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(center, m.position) <= aoeSpell.aoeRadius);
    if (targets.length === 0) {
      notify(`${spellName} — no targets caught!`);
      setCombat(prev => ({ ...prev, actionUsed: true }));
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
    setCombat(prev => ({ ...prev, actionUsed: true, log }));
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
    if (combat.active) setCombat(prev => ({ ...prev, actionUsed: true, log }));
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
      setCombat(prev => ({ ...prev, [isExtra ? "extraActionUsed" : "actionUsed"]: true }));
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
      setCombat(prev => ({ ...prev, actionUsed: true }));
      setCombatMode("none");
      setSelectedSpell(null);
      const aoeRadius = wizAoe.aoeRadius;
      const targets = gs.dungeonMonsters.filter(m => m.hp > 0 && dist(target.position, m.position) <= aoeRadius);
      let newMonsters = [...gs.dungeonMonsters];
      const diedInAoe: string[] = [];
      targets.forEach(mt => {
        const saveRoll = d20();
        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: "Save DC 13" });
        const saved = saveRoll >= 13;
        const dmgDice = spellName === "Burning Hands" ? "3d6" : "2d8";
        const rawDmg = rollDice(dmgDice);
        const finalDmg = saved ? Math.floor(rawDmg / 2) : rawDmg;
        addDiceRoll({ type: "damage", value: finalDmg, total: finalDmg, mod: 0, max: finalDmg, label: dmgDice });
        newMonsters = newMonsters.map(m => {
          if (m.id !== mt.id) return m;
          log.push(`${spellName}: ${m.name} ${saved ? "saves" : "fails"} → ${finalDmg} dmg`);
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
      setCombat(prev => ({ ...prev, actionUsed: false, extraActionUsed: true }));
      log.push(`${char.name} uses Action Surge! Restored Main Action.`);
      notify("💥 Action Surge! Main Action restored.");
      setCombatMode("none");
      setSelectedSpell(null);
    } else if (["fighter_shield_wall", "fighter_warrior_focus", "fighter_samurai_focus", "fighter_berserker_rage"].includes(spellName)) {
      setCombat(prev => ({ ...prev, actionUsed: true, activeBuffs: [...(prev.activeBuffs || []), spellName] }));
      log.push(`${char.name} uses ${gameSkill?.name}!`);
      notify(`✨ ${gameSkill?.name} activated!`);
      setCombatMode("none");
      setSelectedSpell(null);
    } else if ((spell?.damage || gameSkill?.damage) && target) {
      const spMod = getSpellcastingMod(char);
      const rawDmg = rollDice(spell?.damage ?? gameSkill!.damage!);
      const dmg = Math.max(1, rawDmg + (isGameSkill ? 0 : spMod));
      const dmgLabel = (spell?.damage ?? gameSkill!.damage!) + (spMod !== 0 && !isGameSkill ? `${spMod >= 0 ? "+" : ""}${spMod}` : "");

      const isExtra = isGameSkill ? gameSkill.cost === "extra" : !!spell?.isBonus;
      setCombat(prev => ({ ...prev, [isExtra ? "extraActionUsed" : "actionUsed"]: true }));
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

              setCombat(prevC => ({ ...prevC, log: [...prevC.log, logEntry, `  ${target.name} fails save! ${dmg} dmg → ${newHp}/${target.maxHp}`] }));

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

          setCombat(prevC => ({ ...prevC, log: [...prevC.log, `${char.name} casts ${spell.name}: ${dmg} dmg to ${target.name} (${newHp}/${target.maxHp})${spMod !== 0 ? ` [+${spMod} spell mod]` : ""}`] }));

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
      return;
    } else if (target) {
      log.push(`${char.name} casts ${spellName}... no effect.`);
    }

    setCombat(prev => ({ ...prev, actionUsed: true, log }));
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
    notify(`Clicked monster ${monsterId} in mode ${combatMode}`);
    if (combatMode === "attack") handleAttackMonster(monsterId, false);
    else if (combatMode === "attack_offhand") handleAttackMonster(monsterId, true);
    else if (combatMode === "spell" && selectedSpell) handleCastSpell(selectedSpell, monsterId);
  };

  function handleAttackMonster(monsterId: string, isOffHand: boolean = false, isReaction: boolean = false) {
    if (!char || !combat.active) { notify(`Debug: char or combat not active`); return; }
    if (!isReaction) {
      if (isOffHand && combat.extraActionUsed) { notify(`Debug: offhand used`); return; }
      if (!isOffHand && combat.actionUsed) {
        // Allow Extra Attack if they have the buff
        if (!(char.class === "Fighter" && char.level >= 5 && (combat.activeBuffs || []).includes("extra_attack_used"))) {
          notify(`Debug: main action used and no extra attack`); return;
        }
      }
    }
    
    const weapon = isOffHand ? char.equipment.offHand : char.equipment.mainHand;
    if (!weapon || weapon.type !== "weapon") { notify(`Debug: no weapon`); return; }
    
    const monster = gs.dungeonMonsters.find(m => m.id === monsterId);
    if (!monster || monster.hp <= 0) { notify(`Debug: monster dead or not found`); return; }
    
    // Weapon Properties check
    const isRanged = (weapon.range ?? 5) > 5;
    const isFinesse = weapon.properties?.includes("finesse");
    const isTwoHanded = weapon.properties?.includes("two-handed");
    const isLight = weapon.properties?.includes("light");
    const isMelee = !isRanged;

    let useDex = isRanged || (isFinesse && char.stats.dex > char.stats.str);
    const mod = getMod(useDex ? char.stats.dex : char.stats.str);

    // Samurai Focus Advantage
    const hasSamuraiFocus = (combat.activeBuffs || []).includes("fighter_samurai_focus");
    let roll1 = d20();
    let roll2 = d20();
    let roll = hasSamuraiFocus ? Math.max(roll1, roll2) : roll1;

    // Hit Buffs & Subclass
    let extraHitBonus = 0;
    if ((combat.activeBuffs || []).includes("fighter_warrior_focus")) extraHitBonus += rollDice("1d4") + char.profBonus;
    
    if (char.subclass === "archer" && isRanged) extraHitBonus += 2;
    if (char.subclass === "duelwield" && char.equipment.mainHand && char.equipment.offHand && isLight) extraHitBonus += 1;
    if (char.subclass === "berserker" && isMelee && isTwoHanded) extraHitBonus += 2;
    if (char.subclass === "samurai" && isMelee) extraHitBonus += 2;

    const total = roll + mod + char.profBonus + extraHitBonus;

    if (!isReaction) {
      // Extra Attack Logic (Fighter Lv 5)
      const canExtraAttack = char.class === "Fighter" && char.level >= 5;
      const isFirstAttackOfAction = !(combat.activeBuffs || []).includes("extra_attack_used");

      if (!isOffHand) {
        if (canExtraAttack && isFirstAttackOfAction) {
          setCombat(prev => ({ ...prev, activeBuffs: [...(prev.activeBuffs || []), "extra_attack_used"] }));
        } else {
          setCombat(prev => ({ ...prev, actionUsed: true }));
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
    addDiceRoll({ type: "hit", value: roll, total, mod: mod + char.profBonus + extraHitBonus, max: 20, label: `${advLabel}vs AC ${monster.ac}` });

    if (weapon.name === "Longsword") {
      addEffect({ type: "sword_swing", gridX: monster.position.x, gridY: monster.position.y, targetX: char.position.x, targetY: char.position.y });
    } else if (isRanged) {
      addEffect({ type: "arrow", gridX: char.position.x, gridY: char.position.y, targetX: monster.position.x, targetY: monster.position.y });
      setTimeout(() => addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y }), 320);
    }

    setTimeout(() => {
      const isHit = total >= monster.ac;
      const isSurprise = !monster.alerted;
      const logEntry = `${char.name} attacks ${monster.name}${isOffHand ? " (Off-Hand)" : ""}: [${roll}+${mod + char.profBonus}${extraLabel}=${total}] vs AC ${monster.ac}`;

      if (isHit) {
        setActionText({ text: isSurprise ? "AMBUSH!" : "HIT!", color: C.blue });
        setTimeout(() => setActionText(null), 1000);

        setTimeout(() => {
          let dieRoll = rollDice(weapon.damage ?? "1d4");
          let dmgMod = isRanged ? getMod(char.stats.dex) : getMod(char.stats.str);
          
          if (weapon.name === "Shortbow") {
            const distance = dist(char.position, monster.position);
            dmgMod -= distance;
          }

          if ((combat.activeBuffs || []).includes("fighter_berserker_rage") && isMelee) {
            dieRoll += rollDice("1d6");
          }

          const withMod = Math.max(1, dieRoll + dmgMod);
          const finalDmg = isSurprise ? withMod * 2 : withMod;

          let newHp = 0;
          setGs(prevGs => {
            const m = prevGs.dungeonMonsters.find(mm => mm.id === monsterId);
            if (!m) return prevGs;
            newHp = Math.max(0, m.hp - finalDmg);
            return { ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === monsterId ? { ...mm, hp: newHp, alerted: true } : mm) };
          });

          const dmgLabel = `${weapon.damage}${dmgMod >= 0 ? "+" : ""}${dmgMod}`;
          addDiceRoll({ type: "damage", value: dieRoll, total: finalDmg, mod: dmgMod, max: dieRoll, label: dmgLabel });

          setCombat(prevC => {
            const newLog = [...prevC.log, logEntry];
            if (isSurprise) {
              newLog.push(`  💥 SURPRISE! ×2 dmg! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]×2=${finalDmg} → ${newHp}/${monster.maxHp} HP`);
            } else {
              newLog.push(`  Hit! [${dieRoll}${dmgMod >= 0 ? "+" : ""}${dmgMod}]=${finalDmg} dmg → ${newHp}/${monster.maxHp} HP`);
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
            addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y });
            addHit(monsterId);
          }, 180);

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
    }, 600);
  }

  function revealFog(pos: { x: number; y: number }) {
    setFogRevealed(prev => {
      const next = new Set(prev);
      for (let dy = -SIGHT; dy <= SIGHT; dy++)
        for (let dx = -SIGHT; dx <= SIGHT; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
            const fx = pos.x + dx, fy = pos.y + dy;
            if (fx >= 0 && fx < COLS && fy >= 0 && fy < ROWS) next.add(`${fx},${fy}`);
          }
        }
      return next;
    });
  }

  function handleTileClick(x: number, y: number) {
    if (!char || specialDialog) return;

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
      }, 100);
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

      const newX = Math.max(0, Math.min(COLS - 1, char.position.x + dx));
      const newY = Math.max(0, Math.min(ROWS - 1, char.position.y + dy));

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
  function handleBuyItem(item: Item) {
    if (!char || char.gold < item.value) return;
    updateChar(char.id, c => ({ gold: c.gold - item.value, inventory: [...c.inventory, { ...item, id: gid() }] }));
    notify(`Bought ${item.name} for ${item.value}g`);
    setShopPurchaseAnim(item.name);
    setTimeout(() => setShopPurchaseAnim(null), 1200);
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
    setGs(prev => ({ ...prev, dungeonMonsters: genMonsters() }));
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
          { label: "Learn the basics again", next: "tutorial_ask" },
          { label: "Send a message to the Creator", next: "feedback_ask" },
          { label: "I want another blessing", next: "more_blessing" },
          { label: "I just missed you", next: "miss_you" },
          { label: "Just passing by", next: "accidental" },
          { label: "I should get going", next: () => setSeleniaDialogTree(null) }
        ]
      },
      tutorial_ask: {
        emotion: "wondering",
        text: "Hm? Why do you want to learn it again?",
        choices: [
          { label: "I forgot everything", next: "forgot_all" },
          { label: "I just wanted to see you", next: "want_to_see" },
          { label: "Teach me one more time", next: "tutorial_teach" }
        ]
      },
      forgot_all: {
        emotion: "gentle",
        text: "I understand. There's a lot to take in! Let's start over.",
        next: () => {
          setSeleniaDialogTree(null);
          enterTutorial();
        }
      },
      want_to_see: {
        emotion: "blushing",
        text: "...I don't even know what to say to that. But... I'm happy.",
        next: "options"
      },
      tutorial_teach: {
        emotion: "happy",
        text: "Of course! I'll try to explain it a bit more detailed this time.",
        next: () => {
          setSeleniaDialogTree(null);
          enterTutorial();
        }
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
    updateChar(c.id, { position: { x: 15, y: 15 }, currentMap: "tutorial" }); 
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
      actionUsed: false, extraActionUsed: false, movedSquares: 0, 
      log: ["⚔ Tutorial Combat Started!"], engagedMonsterIds: [dummyId] 
    });
    setCombatMode("none");

    setTimeout(() => showSeleniaPopup("gentle", ["Try walking around using WASD or the arrow keys.", "Take a few steps! The world is yours to explore.", "Don't be shy, take a walk!", "Movement is the first step of any grand adventure."]), 1000);
    setTimeout(() => showSeleniaPopup("happy", ["See? It's not that hard.", "You're getting the hang of it!", "That's it! Just take it one step at a time.", "Perfect! You move quite gracefully."]), 7000);
    setTimeout(() => showSeleniaPopup("gentle", ["Now, try attacking that dummy over there.", "Ready for some action? Hit that training dummy!", "Let's see your combat skills! Attack the dummy.", "Show me what you've got! Strike the dummy."]), 13000);
    setTimeout(() => showSeleniaPopup("wondering", ["The menu is very important... Many adventurers forget how to open it on their first day.", "Don't forget to check your menu! It's easy to get lost without it.", "Your equipment and stats are all in the menu. Don't forget about them!", "Some heroes wander for days without ever opening their inventory... don't be one of them."]), 20000);
  }

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
    actionText, restAnim, zoom, shopPurchaseAnim,
    char,
    // setters
    setHudTab, setHudOpen, setChatTab, setZoom, setCombatMode, setCreatingChar, setScreen,
    setActiveCharId, setSelectedSpell, setPendingBombItemId, setShowShop, setShowQuests, setSpecialDialog, setCombat,
    updateChar,
    // combat
    startCombat, endCombat, endPlayerTurn, handleSpellSelect, handleCastSpellAtTile,
    handleCastSpell, handleHealSelf, handleGuard, handleMonsterClick, handleAttackMonster,
    executeBombEffect, handleAOECastFromGrid,
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
    enterTown, enterDungeon, enterSanctuary, enterTutorial, handleSpecialYes, handleSpeakWithSelenia,
    // ui helpers
    notify,
    setRestAnim,
    handleLongRest,
    handleShortRest,
    handleCancelQuest,
    INIT_COMBAT,
  };
}

void CLASS_CFG;
void ({} as Stats);
