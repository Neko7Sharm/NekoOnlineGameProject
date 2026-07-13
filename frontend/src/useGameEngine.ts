import { useState, useEffect, useRef, useCallback } from "react";
import type {
  GameState, Character, Item, CombatState, CombatModeT, VisualEffect, DiceRollDisplay, Screen, Stats,
} from "./types/game";
import { C } from "./constants/theme";
import { CLASS_CFG, CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "./constants/classes";
import { SHOP_ITEMS, BRANCH_ITEM } from "./constants/items";
import { NPC_CHAT } from "./constants/quests";
import { COLS, ROWS, MOVE_SQUARES, SIGHT, TOWN_ENTER, DUNGEON_ENTER, DUNGEON_EXIT, TOWN_SPECIAL } from "./constants/map";
import { gid, d20, getMod, dist, tnow, rollDice, getSpellcastingMod, calcAC } from "./utils/dice";
import { loadState, persist } from "./storage";
import { genMonsters, genQuests } from "./game/character";

const INIT_COMBAT: CombatState = {
  active: false, round: 0, turnOrder: [], currentIndex: 0,
  actionUsed: false, bonusActionUsed: false, movedSquares: 0,
  log: [], engagedMonsterIds: [],
};

export function useGameEngine() {
  const [gs, setGs] = useState<GameState>(loadState);
  const [session, setSession] = useState<{ username: string; charIds: string[] } | null>(null);
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
  const [pendingBombItemId, setPendingBombItemId] = useState<string | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRollDisplay[]>([]);
  const [battleStart, setBattleStart] = useState(false);
  const [hudTab, setHudTab] = useState<"char" | "inv" | "equip" | "acc" | "chat" | "party" | "skills">("char");
  const [hudOpen, setHudOpen] = useState(true);
  const [chatTab, setChatTab] = useState<"global" | "party">("global");
  const [specialDialog, setSpecialDialog] = useState<{ x: number; y: number; tile: { label: string; type: string; icon: string; prompt: string; color: string } } | null>(null);
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

  // ── COMBAT ──

  const startCombat = useCallback((monsterIds: string[]) => {
    if (!char) return;
    setBattleStart(true);
    setTimeout(() => setBattleStart(false), 1800);
    const playerInit = 20 + getMod(char.stats.dex);
    const order = [{ id: char.id, type: "player" as const, name: char.name, initiative: playerInit }];
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
    setCombat({ active: true, round: 1, turnOrder: order, currentIndex: 0, actionUsed: false, bonusActionUsed: false, movedSquares: 0, log, engagedMonsterIds: monsterIds });
    setCombatMode("none");
  }, [char, gs.dungeonMonsters]);

  const endCombat = useCallback((c: CombatState) => {
    if (!char) return;
    const dead = gs.dungeonMonsters.filter(m => c.engagedMonsterIds.includes(m.id) && m.hp <= 0);
    let totalExp = 0;
    const drops: Item[] = [];
    dead.forEach(m => {
      totalExp += m.xp;
      if (Math.random() < 0.4) drops.push({ id: gid(), name: "Healing Potion", type: "consumable", healAmount: "2d4+2", effect: "heal", value: 50, description: "Restores 2d4+2 HP." });
      if (Math.random() < 0.5) drops.push({ id: gid(), ...BRANCH_ITEM });
      if (Math.random() < 0.6) updateChar(char.id, ch => ({ gold: ch.gold + 2 + Math.floor(Math.random() * 5) }));
    });
    let updatedPQ = gs.partyQuests.map(q => {
      if (q.killTarget?.monster === "Wooden Dummy") return { ...q, killTarget: { ...q.killTarget, current: Math.min(q.killTarget.current + dead.length, q.killTarget.count) } };
      return q;
    });
    updatedPQ = updatedPQ.map(q => {
      if (q.killTarget && q.killTarget.current >= q.killTarget.count && !q.readyToTurnIn && !q.completed) {
        notify(`📋 Quest complete: ${q.title}! Return to the Quest Board to claim your reward.`);
        return { ...q, readyToTurnIn: true };
      }
      return q;
    });
    updateChar(char.id, ch => ({ exp: ch.exp + totalExp, inventory: [...ch.inventory, ...drops] }));
    setGs(prev => ({ ...prev, partyQuests: updatedPQ }));
    notify(`⚔️ Victory! +${totalExp} EXP${drops.length > 0 ? `, ${drops.length} item(s)` : ""}`);
    setCombat(INIT_COMBAT); setCombatMode("none");
  }, [char, gs.dungeonMonsters, gs.partyQuests, notify, updateChar]);

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
      return {
        ...prev, currentIndex: nextIdx,
        round: isNew ? prev.round + 1 : prev.round,
        actionUsed: false, bonusActionUsed: false, movedSquares: 0,
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
        const atkRoll = d20() + monster.attackMod;
        const logEntry = `${monster.name} attacks ${char.name}: [${atkRoll}] vs AC ${char.ac}`;

        addDiceRoll({ type: "hit", value: atkRoll, total: atkRoll, mod: monster.attackMod, max: 20, label: `vs AC ${char.ac}` });

        setTimeout(() => {
          if (!combat.active) return;
          if (atkRoll >= char.ac) {
            setActionText({ text: "HIT!", color: C.red });
            setTimeout(() => setActionText(null), 1000);

            setTimeout(() => {
              if (!combat.active) return;
              const dmg = rollDice(monster.damage);
              let newHp = 0;
              let cMaxHp = 0;

              setGs(prevGs => {
                const c = prevGs.characters[char.id];
                if (!c) return prevGs;
                newHp = Math.max(0, c.hp - dmg);
                cMaxHp = c.maxHp;
                return { ...prevGs, characters: { ...prevGs.characters, [char.id]: { ...c, hp: newHp } } };
              });

              addDiceRoll({ type: "damage", value: dmg, total: dmg, mod: 0, max: dmg, label: monster.damage });
              addEffect({ type: "scratch", gridX: char.position.x, gridY: char.position.y });
              addEffect({ type: "number", gridX: char.position.x, gridY: char.position.y, value: `-${dmg}` });
              addHit(char.id);

              setCombat(prevC => ({
                ...prevC,
                log: [...newLog, logEntry, `  Hit! ${char.name} takes ${dmg} dmg. (${newHp}/${cMaxHp})`]
              }));

              if (newHp <= 0) {
                notify("💀 Defeated!");
                setCombat(INIT_COMBAT);
                setCombatMode("none");
              } else {
                doNextTurn();
              }
            }, 500);
          } else {
            setActionText({ text: "MISS!", color: C.muted });
            setTimeout(() => setActionText(null), 1000);
            addEffect({ type: "miss", gridX: char.position.x, gridY: char.position.y, value: "MISS" });
            setCombat(prevC => ({ ...prevC, log: [...newLog, logEntry, `  Miss!`] }));
            setTimeout(() => doNextTurn(), 400);
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

    const needsSlot = spell ? spell.level > 0 : true;
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
    };
    const effectType = effectTypeMap[spellName] ?? "magic_missile";

    if (spell && ((spell.type === "heal" || spell.type === "cantrip") && spell.heal)) {
      const spMod = getSpellcastingMod(char);
      const healed = spell.heal === "5" ? 5 : rollDice(spell.heal) + spMod;
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
      log.push(`${char.name} casts ${spell.name}: +${healed} HP`);
      addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
      notify(`✨ Healed ${healed} HP!`);
    } else if (wizAoe && target) {
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
    } else if (spell && spell.damage && target) {
      const spMod = getSpellcastingMod(char);
      const rawDmg = rollDice(spell.damage);
      const dmg = Math.max(1, rawDmg + spMod);
      const dmgLabel = spell.damage + (spMod !== 0 ? `${spMod >= 0 ? "+" : ""}${spMod}` : "");

      setCombat(prev => ({ ...prev, actionUsed: true }));
      setCombatMode("none");
      setSelectedSpell(null);

      if (spell.saveStat && spell.saveDC) {
        const saveRoll = d20();
        const saved = saveRoll >= spell.saveDC;
        const logEntry = `${char.name} casts ${spell.name}: Save roll [${saveRoll}] vs DC ${spell.saveDC}`;

        addDiceRoll({ type: "save", value: saveRoll, total: saveRoll, mod: 0, max: 20, label: `Save DC ${spell.saveDC}` });

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

  const handleMonsterClick = useCallback((monsterId: string) => {
    if (combatMode === "attack") handleAttackMonster(monsterId);
    else if (combatMode === "spell" && selectedSpell) handleCastSpell(selectedSpell, monsterId);
  }, [combatMode, selectedSpell, handleCastSpell]);

  function handleAttackMonster(monsterId: string) {
    if (!char || !combat.active || combat.actionUsed) return;
    const weapon = char.equipment.weapon;
    if (!weapon) return;
    const monster = gs.dungeonMonsters.find(m => m.id === monsterId);
    if (!monster || monster.hp <= 0) return;
    const isRanged = (weapon.range ?? 5) > 5;
    const mod = isRanged ? getMod(char.stats.dex) : getMod(char.stats.str);
    const roll = d20();
    const total = roll + mod + char.profBonus;

    setCombat(prev => ({ ...prev, actionUsed: true }));
    setCombatMode("none");

    addDiceRoll({ type: "hit", value: roll, total, mod: mod + char.profBonus, max: 20, label: `vs AC ${monster.ac}` });

    if (weapon.name === "Longsword") {
      addEffect({ type: "sword_swing", gridX: monster.position.x, gridY: monster.position.y, targetX: char.position.x, targetY: char.position.y });
    } else if (isRanged) {
      addEffect({ type: "arrow", gridX: char.position.x, gridY: char.position.y, targetX: monster.position.x, targetY: monster.position.y });
      setTimeout(() => addEffect({ type: "slash", gridX: monster.position.x, gridY: monster.position.y }), 320);
    }

    setTimeout(() => {
      const isHit = total >= monster.ac;
      const isSurprise = !monster.alerted;
      const logEntry = `${char.name} attacks ${monster.name}: [${roll}+${mod + char.profBonus}=${total}] vs AC ${monster.ac}`;

      if (isHit) {
        setActionText({ text: isSurprise ? "AMBUSH!" : "HIT!", color: C.blue });
        setTimeout(() => setActionText(null), 1000);

        setTimeout(() => {
          const dieRoll = rollDice(weapon.damage ?? "1d4");
          const dmgMod = isRanged ? getMod(char.stats.dex) : getMod(char.stats.str);
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

        }, 500);
      } else {
        setActionText({ text: "MISS!", color: C.muted });
        setTimeout(() => setActionText(null), 1000);

        addEffect({ type: "miss", gridX: monster.position.x, gridY: monster.position.y, value: "MISS" });
        setCombat(prevC => ({ ...prevC, log: [...prevC.log, logEntry, `  Miss!`] }));
        setGs(prevGs => ({ ...prevGs, dungeonMonsters: prevGs.dungeonMonsters.map(mm => mm.id === monsterId ? { ...mm, alerted: true } : mm) }));
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
      if (d > rem) { notify(`Can only move ${rem * 5}ft more this turn.`); return; }
      updateChar(char.id, { position: { x, y } });
      if (screen === "dungeon") revealFog({ x, y });
      setCombat(prev => ({ ...prev, movedSquares: prev.movedSquares + d }));
      if (d >= rem) setCombatMode("none");
      return;
    }
    if (combat.active) return;

    const key = `${x},${y}`;
    if (screen === "town") {
      const special = TOWN_SPECIAL[key];
      if (special) { setSpecialDialog({ x, y, tile: special }); return; }
    }
    if (screen === "dungeon") {
      if (x === DUNGEON_ENTER.x && y === DUNGEON_ENTER.y) {
        setSpecialDialog({ x, y, tile: { label: "Exit Dungeon", type: "exit", icon: "⬆️", prompt: "Leave the dungeon via the entrance?", color: "#1a5a1a" } });
        return;
      }
      if (x === DUNGEON_EXIT.x && y === DUNGEON_EXIT.y) {
        setSpecialDialog({ x, y, tile: { label: "Dungeon Exit", type: "exit", icon: "🚪", prompt: "Leave the dungeon and return to the World Map?", color: "#1a5a1a" } });
        return;
      }
      revealFog({ x, y });
    }

    updateChar(char.id, { position: { x, y } });
  }

  // Keyboard movement
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((screen !== "town" && screen !== "dungeon") || !char || specialDialog) return;

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
      }

      const newX = Math.max(0, Math.min(COLS - 1, char.position.x + dx));
      const newY = Math.max(0, Math.min(ROWS - 1, char.position.y + dy));

      if (newX === char.position.x && newY === char.position.y) return;
      handleTileClick(newX, newY);
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

  function handleEquipItem(item: Item) {
    if (!char) return;
    updateChar(char.id, c => {
      const newInv = c.inventory.filter(i => i.id !== item.id);
      let eq = { ...c.equipment };
      if (item.type === "weapon") { const old = eq.weapon; eq.weapon = item; if (old) newInv.push(old); }
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
  function handleUnequipWeapon() { if (!char?.equipment.weapon) return; const w = char.equipment.weapon; updateChar(char.id, c => ({ inventory: [...c.inventory, w], equipment: { ...c.equipment, weapon: null } })); }
  function handleUnequipArmor() {
    if (!char?.equipment.armor) return; const a = char.equipment.armor;
    updateChar(char.id, c => { const u = { ...c, inventory: [...c.inventory, a], equipment: { ...c.equipment, armor: null } }; u.ac = calcAC(u); return u; });
  }
  function handleUnequipAcc(i: number) {
    if (!char || !char.equipment.accessories[i]) return; const acc = char.equipment.accessories[i]!;
    updateChar(char.id, c => {
      const na: [Item | null, Item | null, Item | null] = [...c.equipment.accessories] as [Item | null, Item | null, Item | null]; na[i] = null;
      const u = { ...c, inventory: [...c.inventory, acc], equipment: { ...c.equipment, accessories: na } }; u.ac = calcAC(u); return u;
    });
  }
  function handleDropItem(id: string) { if (!char) return; updateChar(char.id, c => ({ inventory: c.inventory.filter(i => i.id !== id) })); notify("Item dropped."); }
  function handleUseItem(item: Item) {
    if (!char) return;
    if (item.effect === "heal" && item.healAmount) {
      const healed = rollDice(item.healAmount);
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed), inventory: c.inventory.filter(i => i.id !== item.id) }));
      notify(`🧪 ${item.name}: +${healed} HP!`);
    } else if (item.effect === "aoe_bomb") {
      setCombatMode("spell");
      setSelectedSpell("Small Bomb");
      setPendingBombItemId(item.id);
      notify("💣 Bomb ready — select target area on the map. Click Cancel to abort.");
    } else {
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
    if (!gs.party) { notify("Join or create a party first!"); return; }
    if (gs.party.questIds.length >= 2) { notify("Party already has 2 active quests."); return; }
    const q = gs.availableQuests.find(q => q.id === qid); if (!q) return;
    setGs(prev => ({ ...prev, availableQuests: prev.availableQuests.filter(q => q.id !== qid), partyQuests: [...prev.partyQuests, q], party: prev.party ? { ...prev.party, questIds: [...prev.party.questIds, qid] } : null }));
    notify(`Quest accepted: ${q.title}`);
  }
  function handleQuestClaim(questId: string) {
    if (!char) return;
    const q = gs.partyQuests.find(pq => pq.id === questId);
    if (!q) return;

    if (q.gatherTarget) {
      const { itemName, count } = q.gatherTarget;
      const currentChar = gs.characters[char.id];
      const matchingItems = currentChar.inventory.filter(i => i.name === itemName);
      if (matchingItems.length < count) {
        notify(`Need ${count} ${itemName} (have ${matchingItems.length}). Collect more!`);
        return;
      }
      let removed = 0;
      updateChar(char.id, c => ({
        inventory: c.inventory.filter(i => {
          if (i.name === itemName && removed < count) { removed++; return false; }
          return true;
        }),
        exp: c.exp + q.reward.exp,
        gold: c.gold + q.reward.gold,
      }));
      setGs(prev => ({
        ...prev,
        partyQuests: prev.partyQuests.filter(pq => pq.id !== questId),
        party: prev.party ? { ...prev.party, questIds: prev.party.questIds.filter(id => id !== questId) } : null,
      }));
      notify(`✅ Quest Complete! +${q.reward.exp} EXP, +${q.reward.gold} gold`);
      return;
    }

    if (!q.readyToTurnIn && !q.completed) return;
    updateChar(char.id, ch => ({ exp: ch.exp + q.reward.exp, gold: ch.gold + q.reward.gold }));
    setGs(prev => ({
      ...prev,
      partyQuests: prev.partyQuests.filter(pq => pq.id !== questId),
      party: prev.party ? { ...prev.party, questIds: prev.party.questIds.filter(id => id !== questId) } : null,
    }));
    notify(`✅ Reward claimed: +${q.reward.exp} EXP, +${q.reward.gold} gold!`);
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
    if (spellName === "Second Wind") {
      const healed = rollDice("1d10") + char.level;
      updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
      notify(`⚔️ Second Wind! +${healed} HP`);
      return;
    }
    if (spellName === "Hunter's Mark") {
      notify("Hunter's Mark: Your next attack deals +1d6 damage.");
      return;
    }
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const spell = allSpells.find(s => s.name === spellName);
    if (!spell) return;

    if (spell.type === "heal" || (spell.type === "cantrip" && spell.heal)) {
      if (combat.active) {
        handleSpellSelect(spellName);
      } else {
        if (spell.level > 0) {
          if (!char.spellSlots || char.spellSlots.used >= char.spellSlots.max) { notify("No spell slots!"); return; }
          updateChar(char.id, c => ({ spellSlots: { ...c.spellSlots!, used: c.spellSlots!.used + 1 } }));
        }
        const spMod = getSpellcastingMod(char);
        const healed = spell.heal === "5" ? 5 : rollDice(spell.heal ?? "1d4") + spMod;
        updateChar(char.id, c => ({ hp: Math.min(c.maxHp, c.hp + healed) }));
        addEffect({ type: "heal", gridX: char.position.x, gridY: char.position.y, value: String(healed) });
        notify(`✨ ${spell.name}: +${healed} HP`);
      }
      return;
    }

    if (screen === "town") { notify("Cannot use attack spells in a safe zone."); return; }
    handleSpellSelect(spellName);
    if (!combat.active) {
      notify(`${spellName} ready — select a target on the map!`);
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
    setCreatingChar(false); setActiveCharId(c.id); setScreen("worldMap");
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
  function enterTown() { if (!char) return; updateChar(char.id, { position: TOWN_ENTER, currentMap: "town" }); setScreen("town"); setCombat(INIT_COMBAT); }
  function enterDungeon() {
    if (!char) return;
    updateChar(char.id, { position: DUNGEON_ENTER, currentMap: "dungeon" }); setScreen("dungeon"); setCombat(INIT_COMBAT);
    setFogRevealed(new Set([`${DUNGEON_ENTER.x},${DUNGEON_ENTER.y}`, `${DUNGEON_ENTER.x},${DUNGEON_ENTER.y - 1}`, `${DUNGEON_ENTER.x - 1},${DUNGEON_ENTER.y}`]));
    setGs(prev => ({ ...prev, dungeonMonsters: genMonsters() }));
    notify("Entered Darkroot Depths. Monsters lurk in the dark...");
  }

  return {
    // state
    gs, session, activeCharId, screen, creatingChar, combat, fogRevealed, combatMode,
    effects, dyingMonsters, hitTokenIds, selectedSpell, diceRolls, battleStart,
    hudTab, hudOpen, chatTab, specialDialog, showShop, showQuests, notification,
    actionText, restAnim, zoom, shopPurchaseAnim,
    char,
    // setters
    setHudTab, setHudOpen, setChatTab, setZoom, setCombatMode, setCreatingChar, setScreen,
    setActiveCharId,
    // combat
    startCombat, endCombat, endPlayerTurn, handleSpellSelect, handleCastSpellAtTile,
    handleCastSpell, handleHealSelf, handleMonsterClick, handleAttackMonster,
    executeBombEffect, handleAOECastFromGrid,
    // movement
    handleTileClick,
    // items
    handleEquipItem, handleUnequipWeapon, handleUnequipArmor, handleUnequipAcc,
    handleDropItem, handleUseItem, handleBuyItem,
    // quests/party/chat
    handleAcceptQuest, handleQuestClaim, handleCreateParty, handleLeaveParty,
    handleSendChat, handleUseSkillFromHUD,
    // navigation
    handleLogin, handleSelectChar, handleCreateChar, handleLogout, handleDeleteChar,
    enterTown, enterDungeon, handleSpecialYes,
    // ui helpers
    notify,
    setRestAnim,
    INIT_COMBAT,
  };
}

void CLASS_CFG;
void ({} as Stats);
