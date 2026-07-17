import { useState, useRef } from "react";
import { C, MO } from "../../constants/theme";
import { CLASS_CFG } from "../../constants/classes";
import { CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "../../constants/classes";
import { SKILL_DICTIONARY } from "../../constants/skills";
import {
  getMapCols, getMapRows, CELL, MOVE_SQUARES, SIGHT, DUNGEON_ENTER, DUNGEON_EXIT,
  TOWN_SPECIAL, SANCTUARY_SPECIAL, getTownTile, getDungeonTile, getSanctuaryTile, getTutorialTile,
  hasLineOfSight
} from "../../constants/map";
import { dist } from "../../utils/dice";
import type { MapGridProps } from "../../types/game";
import townBg from "../../assets/town_map_bg.png";
import tileGrass from "../../assets/tile_grass.png";
import tilePath from "../../assets/tile_path.png";
import tileTree from "../../assets/tile_tree.png";
import tileFence from "../../assets/tile_fence.png";
import bShop from "../../assets/b_shop.png";
import bQuest from "../../assets/b_quest.png";
import bInn from "../../assets/b_inn.png";
import bStatue from "../../assets/b_statue.png";
import npcSeleniaChibi from "../../assets/npc/npc_g01c.png";
import monsterSlime from "../../assets/monster_slime.png";
import monsterWolf from "../../assets/monster_wolf.png";
import monsterGoblin from "../../assets/monster_goblin.png";
import monsterVine from "../../assets/monster_vine.png";
import monsterTreant from "../../assets/monster_treant.png";
import sacredTree from "../../assets/sacred_tree.png";
import coverRock from "../../assets/cover_rock.png";
import coverLog from "../../assets/cover_log.png";
import effectScratch from "../../assets/effect_scratch.png";
import effectArrow from "../../assets/effect_arrow.png";
import effectWhip from "../../assets/effect_whip.png";
import effectRootslam from "../../assets/effect_rootslam.png";
import { AmbientSystem } from "./AmbientSystem";
import { parseWhisperingForest } from "../../maps/whispering_forest";

const wfMap = parseWhisperingForest();

const MONSTER_IMAGES: Record<string, string> = {
  monster_slime: monsterSlime,
  monster_wolf: monsterWolf,
  monster_goblin: monsterGoblin,
  monster_vine: monsterVine,
  monster_treant: monsterTreant
};
// Compute which grid tiles fall inside a cone pointing from player toward mouse
function getConeTiles(playerPos: { x: number; y: number }, mouseX: number, mouseY: number, length: number, cols: number, rows: number): Set<string> {
  const tiles = new Set<string>();
  const px = playerPos.x * CELL + CELL / 2;
  const py = playerPos.y * CELL + CELL / 2;
  const angle = Math.atan2(mouseY - py, mouseX - px);
  const halfAngle = Math.PI / 3.5;
  for (let dy = -length; dy <= length; dy++) {
    for (let dx = -length; dx <= length; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tx = playerPos.x + dx, ty = playerPos.y + dy;
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
      if (Math.sqrt(dx * dx + dy * dy) > length) continue;
      const tileAngle = Math.atan2(ty * CELL + CELL / 2 - py, tx * CELL + CELL / 2 - px);
      let diff = Math.abs(angle - tileAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= halfAngle) tiles.add(`${tx},${ty}`);
    }
  }
  return tiles;
}

export function MapGrid({ mode, char, monsters, chests, secrets, combat, fogRevealed, combatMode, selectedSpell, onTileClick, onMonsterClick, onObjectClick, onAOECast, effects, dyingMonsters, hitTokenIds, onHealSelf, insightVisionTiles }: MapGridProps) {
  const cols = getMapCols(mode);
  const rows = getMapRows(mode);
  const pos = char.position;
  const [hoveredMonsterId, setHoveredMonsterId] = useState<string | null>(null);
  const [mouseGrid, setMouseGrid] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const visible = new Set<string>();
  if (mode === "dungeon") {
    for (let dy = -SIGHT; dy <= SIGHT; dy++)
      for (let dx = -SIGHT; dx <= SIGHT; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
          const fx = pos.x + dx, fy = pos.y + dy;
          if (fx >= 0 && fx < cols && fy >= 0 && fy < rows) {
            if (hasLineOfSight("dungeon", pos.x, pos.y, fx, fy)) {
              visible.add(`${fx},${fy}`);
            }
          }
        }
      }
  }

  const reachable = new Set<string>();
  if (combat.active && combatMode === "move") {
    const rem = MOVE_SQUARES - combat.movedSquares;
    for (let dy = -rem; dy <= rem; dy++)
      for (let dx = -rem; dx <= rem; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= rem) {
          const tx = pos.x + dx, ty = pos.y + dy;
          if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) reachable.add(`${tx},${ty}`);
        }
      }
  }

  const attackableM = new Set<string>();
  const attackRangeTiles = new Set<string>();
  
  if (combat.active && combatMode === "attack" && char.equipment.mainHand) {
    const rs = Math.ceil((char.equipment.mainHand.range ?? 5) / 5);
    // Add all tiles within weapon range to attackRangeTiles
    for (let dy = -rs; dy <= rs; dy++) {
      for (let dx = -rs; dx <= rs; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= rs) {
          const tx = pos.x + dx, ty = pos.y + dy;
          if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) attackRangeTiles.add(`${tx},${ty}`);
        }
      }
    }
    monsters.filter(m => m.hp > 0).forEach(m => { 
      if (dist(pos, m.position) <= rs) attackableM.add(m.id); 
    });
  }

  const spellableM = new Set<string>();
  const aoeTiles = new Set<string>();
  const aoeHitMonsters = new Set<string>();
  const BOMB_AOE_DEF = { name: "Small Bomb", aoeRadius: 2, isCone: false, aoe: true };
  const isAoeSpell = selectedSpell && (WIZARD_SPELL_CHOICES.some(s => s.name === selectedSpell) || selectedSpell === "Small Bomb");
  const aoeSpellDef = isAoeSpell ? (WIZARD_SPELL_CHOICES.find(s => s.name === selectedSpell) ?? BOMB_AOE_DEF) : null;
  const mouseGridTile = {
    x: Math.min(cols - 1, Math.max(0, Math.floor(mouseGrid.x / CELL))),
    y: Math.min(rows - 1, Math.max(0, Math.floor(mouseGrid.y / CELL))),
  };

  if (combatMode === "spell" && selectedSpell) {
    const allSpells = CLASS_SPELLS[char.class] ?? [];
    const wizChoices = char.class === "Wizard" ? WIZARD_SPELL_CHOICES.map(s => ({ name: s.name, range: 30 })) : [];
    const bombEntry = selectedSpell === "Small Bomb" ? [{ name: "Small Bomb", range: 30 }] : [];
    const spell = [...allSpells, ...wizChoices, ...bombEntry].find((s: { name: string }) => s.name === selectedSpell) as { name: string; range?: number } | undefined;
    if (spell) {
      const rangeSquares = Math.ceil((spell.range ?? 5) / 5);
      monsters.filter(m => m.hp > 0).forEach(m => {
        if (dist(pos, m.position) <= rangeSquares) spellableM.add(m.id);
      });
    }
    if (isAoeSpell && aoeSpellDef) {
      const aoeLen = aoeSpellDef.aoeRadius;
      if (aoeSpellDef.isCone) {
        const coneTiles = getConeTiles(pos, mouseGrid.x, mouseGrid.y, aoeLen, cols, rows);
        coneTiles.forEach(t => aoeTiles.add(t));
      } else {
        for (let dy = -aoeLen; dy <= aoeLen; dy++) {
          for (let dx = -aoeLen; dx <= aoeLen; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= aoeLen) {
              const tx = mouseGridTile.x + dx, ty = mouseGridTile.y + dy;
              if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) aoeTiles.add(`${tx},${ty}`);
            }
          }
        }
      }
      monsters.filter(m => m.hp > 0).forEach(m => {
        if (aoeTiles.has(`${m.position.x},${m.position.y}`)) aoeHitMonsters.add(m.id);
      });
    }
  }

  const isHealSpell = selectedSpell && (() => {
    const spells = CLASS_SPELLS[char.class] ?? [];
    const s = spells.find(sp => sp.name === selectedSpell);
    const gs = SKILL_DICTIONARY[selectedSpell];
    const selfBuffs = ["fighter_action_surge", "fighter_shield_wall", "fighter_warrior_focus", "fighter_samurai_focus", "fighter_berserker_rage"];
    return s?.type === "heal" || (s?.type === "cantrip" && s?.heal) || !!gs?.healAmount || selfBuffs.includes(selectedSpell);
  })();

  return (
    <>
      <style>{`
        @keyframes dnd-slash { 0%{opacity:0;transform:scale(0.3) rotate(-25deg)} 30%{opacity:1;transform:scale(1) rotate(-25deg)} 100%{opacity:0;transform:scale(1.6) rotate(-25deg)} }
        @keyframes dnd-float-up { 0%{opacity:1;transform:translateY(0)} 60%{opacity:1;transform:translateY(-22px)} 100%{opacity:0;transform:translateY(-44px)} }
        @keyframes dnd-fireball { 0%{opacity:0;transform:scale(0)} 35%{opacity:1;transform:scale(1.1)} 100%{opacity:0;transform:scale(2)} }
        @keyframes dnd-pulse-ring { 0%{opacity:0.9;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.5)} }
        @keyframes dnd-shake { 0%,100%{transform:translateX(0) translateY(0)} 20%{transform:translateX(-4px) translateY(-2px)} 40%{transform:translateX(4px) translateY(1px)} 60%{transform:translateX(-3px) translateY(-1px)} 80%{transform:translateX(2px)} }
        @keyframes dnd-arrow-fly { 0%{clip-path:inset(0 100% 0 0);opacity:1} 75%{clip-path:inset(0 0% 0 0);opacity:1} 100%{clip-path:inset(0 0% 0 0);opacity:0} }
        @keyframes dnd-dissolve { 0%{opacity:1;filter:none;transform:scale(1)} 30%{opacity:0.8;filter:blur(0px) brightness(2);transform:scale(1.1)} 60%{opacity:0.4;filter:blur(2px) brightness(3);transform:scale(1.3)} 100%{opacity:0;filter:blur(6px) brightness(0);transform:scale(0.2)} }
        @keyframes dnd-aoe-pulse { 0%{opacity:0.3} 100%{opacity:0.7} }
      `}</style>
        <div ref={gridRef}
          onMouseMove={e => {
            if (!gridRef.current) return;
            const r = gridRef.current.getBoundingClientRect();
            setMouseGrid({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          style={{ 
            position: "relative", width: cols * CELL, height: rows * CELL, imageRendering: "pixelated",
          }}>
        {/* Tiles */}
        {Array.from({ length: rows }, (_, y) =>
          Array.from({ length: cols }, (_, x) => {
            const key = `${x},${y}`;
            const td = mode === "town" ? getTownTile(x, y) : (mode === "sanctuary" ? getSanctuaryTile(x, y) : (mode === "tutorial" ? getTutorialTile(x, y) : getDungeonTile(x, y)));
            let tileBg = td.bg;
            let special = null;
            let tileImg = "none";
            const type = mode === "town" ? (td as any).type : undefined;
            if (mode === "town") {
              if (type === "grass") tileImg = `url(${tileGrass})`;
              else if (type === "path") tileImg = `url(${tilePath})`;
              else if (type === "fence") tileImg = `url(${tileFence})`;
              special = TOWN_SPECIAL[key];
            } else if (mode === "sanctuary") {
              special = SANCTUARY_SPECIAL[key];
            }
            
            const isExit = mode === "dungeon" && x === DUNGEON_EXIT.x && y === DUNGEON_EXIT.y;
            const isEntrance = mode === "dungeon" && x === DUNGEON_ENTER.x && y === DUNGEON_ENTER.y;
            const isFogged = mode === "dungeon" && !visible.has(key) && !fogRevealed.has(key);
            const isDimmed = mode === "dungeon" && !visible.has(key) && fogRevealed.has(key);
            const isReachable = reachable.has(key);
            const isAttackRange = attackRangeTiles.has(key) && mode === "dungeon" && !isFogged;
            const isInsightVision = insightVisionTiles?.has(key) && !isFogged;
            const isPlayer = x === pos.x && y === pos.y;

            let cellBg = special?.color ? special.color + "50" : tileBg;
            const inCone = aoeTiles.has(key);
            const isAoeCursor = inCone && isAoeSpell && combatMode === "spell";

            return (
              <div key={key}
                onClick={() => {
                  if (td.isWall || isFogged) return;
                  if (isAoeCursor) {
                    const hit = monsters.filter(m => m.hp > 0 && aoeTiles.has(`${m.position.x},${m.position.y}`)).map(m => m.id);
                    onAOECast?.(hit, x, y);
                  } else {
                    onTileClick(x, y);
                  }
                }}
                style={{
                  position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                  backgroundColor: isFogged ? "#000" : cellBg,
                  backgroundImage: !isFogged && tileImg !== "none" ? tileImg : "none",
                  backgroundSize: type === "fence" ? `${CELL}px ${CELL}px` : `${CELL * 10}px ${CELL * 10}px`,
                  backgroundPosition: `-${x * CELL}px -${y * CELL}px`,
                  opacity: isDimmed ? 0.4 : 1,
                  cursor: td.isWall || isFogged ? "default" : isAoeCursor ? "crosshair" : "pointer",
                  outline: isReachable ? `2px solid ${C.gold}` : isAttackRange ? `1px solid ${C.blue}50` : "none",
                  outlineOffset: "-2px",
                  boxShadow: isReachable ? `inset 0 0 8px ${C.gold}20` : isAttackRange ? `inset 0 0 12px ${C.blue}30` : "none",
                  transform: type === "fence" && (x === 0 || x === cols - 1) ? "rotate(90deg)" : "none",
                }}>
                {isInsightVision && <div style={{ position: "absolute", inset: 0, background: "rgba(255, 0, 0, 0.25)", pointerEvents: "none" }} />}
                {isAttackRange && <div style={{ position: "absolute", inset: 0, background: `${C.blue}15`, pointerEvents: "none" }} />}
                <div style={{ position: "absolute", inset: 0, border: mode === "town" ? "none" : "1px solid rgba(0,0,0,0.25)" }} />

                {special && !isFogged && ["8,6", "9,6", "20,6", "21,6", "14,14", "15,14", "4,11", "22,19", "23,19", "24,19"].includes(key) && (
                  <div style={{ 
                    position: "absolute", inset: 2, display: "flex", alignItems: "center", justifyContent: "center", 
                    fontSize: CELL * 0.6, background: "rgba(0,0,0,0.5)", border: `2px solid ${special.color}`, 
                    borderRadius: 6, opacity: 0.9, boxShadow: `0 0 8px ${special.color}`, zIndex: 6
                  }}>
                    {special.icon}
                  </div>
                )}
                {isExit && !isFogged && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: CELL * 0.5 }}>🚪</div>}
                {isEntrance && !isFogged && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: CELL * 0.4, opacity: 0.5 }}>⬇️</div>}
                {isReachable && !isPlayer && <div style={{ position: "absolute", inset: 0, background: `${C.gold}12` }} />}
                {isAoeCursor && !isFogged && (() => {
                  const monHere = monsters.find(m => m.hp > 0 && m.position.x === x && m.position.y === y);
                  const hasTarget = monHere ? aoeHitMonsters.has(monHere.id) : false;
                  return (
                    <div style={{
                      position: "absolute", inset: 0, pointerEvents: "none",
                      background: hasTarget ? "rgba(255,40,20,0.42)" : "rgba(255,90,60,0.20)",
                      border: `1px solid rgba(255,100,70,${hasTarget ? "0.8" : "0.4"})`,
                      animation: "dnd-aoe-pulse 0.6s ease-in-out infinite alternate",
                    }} />
                  );
                })()}
              </div>
            );
          })
        )}

        {mode === "dungeon" && <AmbientSystem width={cols * CELL} height={rows * CELL} />}

        {/* Building / Character Overlays */}
        {mode === "town" && (
          <>
            <img src={bInn} style={{ position: "absolute", left: 2 * CELL, top: 1 * CELL, width: 11 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "cover", borderRadius: "12px" }} alt="Inn" />
            <img src={bShop} style={{ position: "absolute", left: 2 * CELL, top: 15 * CELL, width: 17 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "cover", borderRadius: "12px" }} alt="Shop" />
            <img src={bQuest} style={{ position: "absolute", left: 18 * CELL, top: 1 * CELL, width: 11 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "cover", borderRadius: "12px" }} alt="Quest Guild" />
            <img src={bStatue} style={{ position: "absolute", left: 1 * CELL, top: 10 * CELL, width: 3 * CELL, height: 3 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", transform: "rotate(180deg)" }} alt="Statue" />
          </>
        )}
        {mode === "dungeon" && (
          <>
            {wfMap.rocks.filter(r => fogRevealed.has(`${r.x},${r.y}`)).map((r, i) => {
              const isDimmed = !visible.has(`${r.x},${r.y}`);
              return <img key={`rock-${i}`} src={coverRock} style={{ position: "absolute", left: r.x * CELL, top: r.y * CELL, width: CELL, height: CELL, pointerEvents: "none", zIndex: 4, objectFit: "contain", opacity: isDimmed ? 0.4 : 1 }} alt="Rock" />
            })}
            {wfMap.logs.filter(l => fogRevealed.has(`${l.x},${l.y}`)).map((l, i) => {
              const isDimmed = !visible.has(`${l.x},${l.y}`);
              return <img key={`log-${i}`} src={coverLog} style={{ position: "absolute", left: l.x * CELL, top: l.y * CELL, width: CELL, height: CELL, pointerEvents: "none", zIndex: 4, objectFit: "contain", opacity: isDimmed ? 0.4 : 1 }} alt="Log" />
            })}
            {fogRevealed.has(`${wfMap.landmark.x},${wfMap.landmark.y}`) && (() => {
              const isDimmed = !visible.has(`${wfMap.landmark.x},${wfMap.landmark.y}`);
              return <img src={sacredTree} style={{ position: "absolute", left: (wfMap.landmark.x - 2.5) * CELL, top: (wfMap.landmark.y - 3) * CELL, width: 6 * CELL, height: 6 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", opacity: isDimmed ? 0.4 : 1 }} alt="Sacred Tree" />
            })()}
          </>
        )}
        {mode === "sanctuary" && (
          <>
            <style>{`
              @keyframes float-star { 0% { transform: translateY(0px) rotate(0deg); opacity: 0; } 50% { opacity: 0.6; } 100% { transform: translateY(-60px) rotate(180deg); opacity: 0; } }
            `}</style>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  color: "#e6ccff",
                  fontSize: `${Math.random() * 8 + 8}px`,
                  opacity: 0,
                  animation: `float-star ${Math.random() * 8 + 6}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}>✨</div>
              ))}
            </div>
            <img src={npcSeleniaChibi} style={{ position: "absolute", left: 15 * CELL, top: 8 * CELL, width: CELL, height: CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", transform: "scale(1.2)" }} alt="Selenia" />
          </>
        )}

        {/* Monster tokens */}
        {monsters.filter(m => m.hp > 0).map(m => {
          const key = `${m.position.x},${m.position.y}`;
          if (mode === "town") return null;
          if (mode === "dungeon" && !visible.has(key)) return null;
          const isAttackable = attackableM.has(m.id);
          const isSpellable = spellableM.has(m.id);
          const isAoeTarget = aoeHitMonsters.has(m.id);
          const isHovered = hoveredMonsterId === m.id;
          const isCurrentTurn = combat.active && combat.turnOrder[combat.currentIndex]?.id === m.id;
          const isTargetable = isAttackable || isSpellable || isAoeTarget;
          const isShaking = hitTokenIds?.has(m.id);

          if (dyingMonsters?.has(m.id)) {
            return (
              <div key={m.id} style={{
                position: "absolute",
                left: m.position.x * CELL + 3, top: m.position.y * CELL + 3,
                width: CELL - 6, height: CELL - 6,
                fontSize: CELL * 0.5, display: "flex", alignItems: "center", justifyContent: "center",
                animation: "dnd-dissolve 0.9s ease-out forwards",
                pointerEvents: "none",
              }}>🪵</div>
            );
          }

          return (
            <div key={m.id}
              onClick={() => { if (isTargetable) onMonsterClick(m.id); }}
              onMouseEnter={() => setHoveredMonsterId(m.id)}
              onMouseLeave={() => setHoveredMonsterId(null)}
              style={{
                position: "absolute",
                left: m.position.x * CELL + 3, top: m.position.y * CELL + 3,
                width: CELL - 6, height: CELL - 6,
                background: isCurrentTurn ? "#5a1010" : "#3a0a0a",
                border: `2px solid ${isTargetable ? C.red : isCurrentTurn ? "#ff8888" : "#8b1a1a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isTargetable ? "crosshair" : "default",
                boxShadow: isTargetable ? `0 0 10px ${C.red}` : "none",
                fontSize: CELL * 0.5, imageRendering: "pixelated",
                animation: isShaking ? "dnd-shake 0.35s ease-in-out" : undefined,
              }}>
              {m.image ? <img src={MONSTER_IMAGES[m.image]} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} alt={m.name} /> : "🪵"}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#0a0a0a" }}>
                <div style={{ height: "100%", width: `${(m.hp / m.maxHp) * 100}%`, background: C.red }} />
              </div>
              {(isAttackable || isSpellable || isAoeTarget) && isHovered && (
                <div style={{
                  position: "absolute", inset: -4,
                  border: `3px solid ${C.red}`,
                  borderRadius: "50%", pointerEvents: "none",
                  animation: "dnd-pulse-ring 0.7s ease-out infinite",
                  boxShadow: `0 0 10px ${C.red}`,
                }} />
              )}
              {isAttackable && !isHovered && (
                <div style={{
                  position: "absolute", inset: -3, border: `2px solid ${C.red}60`,
                  borderRadius: "50%", pointerEvents: "none",
                  animation: "dnd-pulse-ring 1s ease-out infinite",
                }} />
              )}
            </div>
          );
        })}

        {/* Chests */}
        {chests?.filter(c => !c.opened && fogRevealed.has(`${c.position.x},${c.position.y}`)).map(c => {
          const dx = Math.abs(pos.x - c.position.x);
          const dy = Math.abs(pos.y - c.position.y);
          const isAdjacent = dx <= 1 && dy <= 1;
          return (
            <div key={c.id}
              onClick={() => { if (isAdjacent && onObjectClick) onObjectClick(c.id, "chest"); }}
              style={{
                position: "absolute",
                left: c.position.x * CELL + 5, top: c.position.y * CELL + 5,
                width: CELL - 10, height: CELL - 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: CELL * 0.6, cursor: isAdjacent ? "pointer" : "default",
                background: isAdjacent ? "rgba(255,215,0,0.2)" : "transparent",
                borderRadius: "5px"
              }}>
              🎁
            </div>
          );
        })}

        {/* Secrets */}
        {secrets?.filter(s => !s.found && fogRevealed.has(`${s.position.x},${s.position.y}`)).map(s => {
          const dx = Math.abs(pos.x - s.position.x);
          const dy = Math.abs(pos.y - s.position.y);
          const isAdjacent = dx <= 1 && dy <= 1;
          return (
            <div key={s.id}
              onClick={() => { if (isAdjacent && onObjectClick) onObjectClick(s.id, "secret"); }}
              style={{
                position: "absolute",
                left: s.position.x * CELL + 5, top: s.position.y * CELL + 5,
                width: CELL - 10, height: CELL - 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: CELL * 0.6, cursor: isAdjacent ? "pointer" : "default",
                background: isAdjacent ? "rgba(255,182,193,0.2)" : "transparent",
                borderRadius: "50%",
                textShadow: "0 0 10px #ffb3ff"
              }}>
              🌸
            </div>
          );
        })}

        {/* Player token */}
        <div onClick={() => isHealSpell && onHealSelf?.()}
          style={{
            position: "absolute",
            transform: `translate(${pos.x * CELL + 3}px, ${pos.y * CELL + 3}px)`,
            width: CELL - 6, height: CELL - 6,
            background: CLASS_CFG[char.class].color + "cc",
            border: `2px solid ${CLASS_CFG[char.class].color}`,
            boxShadow: `0 0 10px ${CLASS_CFG[char.class].color}70`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: CELL * 0.6, zIndex: 10, overflow: "visible",
            transition: "transform 0.1s linear",
            animation: hitTokenIds?.has(char.id) ? "dnd-shake 0.35s ease-in-out" : undefined,
            cursor: isHealSpell ? "pointer" : "default",
          }}>
          {char.avatar
            ? <img src={char.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : CLASS_CFG[char.class].icon
          }
          {isHealSpell && (
            <div style={{
              position: "absolute", inset: -5, border: "3px solid #4cdb70",
              borderRadius: "50%", pointerEvents: "none",
              animation: "dnd-pulse-ring 0.7s ease-out infinite",
              boxShadow: "0 0 10px #4cdb70",
            }} />
          )}
        </div>

        {/* Effects layer */}
        {effects.map(e => {
          const ex = e.gridX * CELL + CELL / 2;
          const ey = e.gridY * CELL + CELL / 2;
          if (e.type === "miss" || e.type === "number") {
            return (
              <div key={e.id} style={{
                position: "absolute", left: ex - 24, top: ey - 20,
                fontFamily: MO, fontSize: e.type === "miss" ? 14 : 20,
                fontWeight: "bold", pointerEvents: "none", zIndex: 50,
                color: e.type === "miss" ? C.muted : C.red,
                textShadow: "2px 2px 0 #000, -2px -2px 0 #000",
                animation: "dnd-float-up 0.8s ease-out forwards",
              }}>{e.value}</div>
            );
          }
          if (e.type === "slash") {
            return (
              <svg key={e.id} style={{ position: "absolute", left: ex - 40, top: ey - 40, width: 80, height: 80, pointerEvents: "none", zIndex: 50, animation: "dnd-slash 0.45s ease-out forwards" }} viewBox="0 0 44 44">
                <line x1="8" y1="36" x2="36" y2="8" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="14" y1="38" x2="42" y2="10" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="2" y1="30" x2="30" y2="2" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            );
          }
          if (e.type === "scratch") {
            return (
              <img key={e.id} src={effectScratch} style={{ position: "absolute", left: ex - 50, top: ey - 50, width: 100, height: 100, pointerEvents: "none", zIndex: 50, animation: "dnd-slash 0.35s ease-out forwards", objectFit: "contain" }} alt="Scratch" />
            );
          }
          if (e.type === "arrow") {
            const fromX = (e.targetX ?? e.gridX - 1) * CELL + CELL / 2;
            const fromY = (e.targetY ?? e.gridY) * CELL + CELL / 2;
            const dx = ex - fromX;
            const dy = ey - fromY;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 55, left: fromX - 40, top: fromY - 40, width: 80, height: 80
              }}>
                <style>{`
                  @keyframes arrow-fly-${e.id} {
                    0% { transform: translate(0, 0); opacity: 1; }
                    100% { transform: translate(${dx}px, ${dy}px); opacity: 0; }
                  }
                `}</style>
                <img src={effectArrow} style={{ width: "100%", height: "100%", objectFit: "contain", transform: `rotate(${angle + 45}deg)`, animation: `arrow-fly-${e.id} 0.35s linear forwards` }} alt="Arrow" />
              </div>
            );
          }
          if (e.type === "whip") {
            return (
              <img key={e.id} src={effectWhip} style={{ position: "absolute", left: ex - 70, top: ey - 70, width: 140, height: 140, pointerEvents: "none", zIndex: 50, animation: "dnd-slash 0.4s ease-out forwards", objectFit: "contain" }} alt="Whip" />
            );
          }
          if (e.type === "rootslam") {
            return (
              <img key={e.id} src={effectRootslam} style={{ position: "absolute", left: ex - 150, top: ey - 150, width: 300, height: 300, pointerEvents: "none", zIndex: 50, animation: "dnd-fireball 0.7s ease-out forwards", objectFit: "contain" }} alt="Root Slam" />
            );
          }
          if (e.type === "fire_bolt") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 40, top: ey - 40, width: 80, height: 80, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, #fff8e0 0%, #ffcc00 30%, #ff6600 70%, transparent 100%)", animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "magic_missile") {
            return (
              <svg key={e.id} style={{ position: "absolute", left: ex - 48, top: ey - 48, width: 96, height: 96, pointerEvents: "none", zIndex: 50, animation: "dnd-fireball 0.6s ease-out forwards" }} viewBox="0 0 48 48">
                {[0, 60, 120, 180, 240, 300].map((ang, i) => {
                  const r = ang * Math.PI / 180;
                  return <line key={i} x1="24" y1="24" x2={24 + Math.cos(r) * 18} y2={24 + Math.sin(r) * 18} stroke="#88aaff" strokeWidth="2.5" strokeLinecap="round" />;
                })}
                <circle cx="24" cy="24" r="5" fill="#ccddff" />
              </svg>
            );
          }
          if (e.type === "sacred_flame") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 40, top: ey - 40, width: 80, height: 80, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, #fff 0%, #ffee88 40%, #ffaa00 80%, transparent 100%)", boxShadow: "0 0 40px #ffcc00", animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "thunder") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 55, top: ey - 55, width: 110, height: 110, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, rgba(200,220,255,0.9) 0%, rgba(100,160,255,0.6) 50%, transparent 100%)", animation: "dnd-fireball 0.65s ease-out forwards" }} />
            );
          }
          if (e.type === "smite") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 40, top: ey - 40, width: 80, height: 80, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: `radial-gradient(circle, #fff 0%, ${C.purple} 50%, transparent 100%)`, boxShadow: `0 0 40px ${C.purple}`, animation: "dnd-fireball 0.55s ease-out forwards" }} />
            );
          }
          if (e.type === "heal") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 24, top: ey - 24, fontFamily: MO, fontSize: 20, fontWeight: "bold", color: "#4cdb70", pointerEvents: "none", zIndex: 50, textShadow: "2px 2px 0 #000", animation: "dnd-float-up 1s ease-out forwards" }}>+{e.value}</div>
            );
          }
          if (e.type === "fire_aoe") {
            return (
              <div key={e.id} style={{ position: "absolute", left: ex - 60, top: ey - 60, width: 120, height: 120, borderRadius: "50%", pointerEvents: "none", zIndex: 50, background: "radial-gradient(circle, rgba(255,200,50,0.8) 0%, rgba(255,80,0,0.6) 60%, transparent 100%)", animation: "dnd-fireball 0.7s ease-out forwards" }} />
            );
          }
          if (e.type === "sword_swing") {
            const fromX = (e.targetX ?? e.gridX - 1) * CELL + CELL / 2;
            const fromY = (e.targetY ?? e.gridY) * CELL + CELL / 2;
            const dx = ex - fromX;
            const dy = ey - fromY;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const dlen = Math.sqrt(dx*dx + dy*dy);
            const SZ = CELL * 3;
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 55,
                left: fromX - SZ / 2, top: fromY - SZ / 2, width: SZ, height: SZ,
                transformOrigin: "center",
              }}>
                <style>{`
                  @keyframes epic-sword-slash-${e.id} {
                    0% { transform: rotate(${angle - 70}deg) translate(-10px, -10px) scale(0.5); opacity: 0; }
                    20% { transform: rotate(${angle - 40}deg) translate(0, 0) scale(1.2); opacity: 1; }
                    50% { transform: rotate(${angle + 60}deg) translate(${dlen * 0.8}px, 0) scale(1.3); opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.8)); }
                    100% { transform: rotate(${angle + 80}deg) translate(${dlen + 10}px, 0) scale(0.8); opacity: 0; }
                  }
                  @keyframes epic-wave-${e.id} {
                    0% { transform: rotate(${angle}deg) translate(${dlen * 0.2}px, 0) scale(0.5); opacity: 0; }
                    30% { transform: rotate(${angle}deg) translate(${dlen * 0.5}px, 0) scale(1.2); opacity: 1; }
                    100% { transform: rotate(${angle}deg) translate(${dlen + 20}px, 0) scale(2); opacity: 0; }
                  }
                `}</style>
                <div style={{ position: "absolute", inset: 0, animation: `epic-sword-slash-${e.id} 0.4s cubic-bezier(0.1, 0.8, 0.2, 1) forwards` }}>
                  <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id={`sg${e.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fff" />
                        <stop offset="50%" stopColor="#d8d8f8" />
                        <stop offset="100%" stopColor="#888" />
                      </linearGradient>
                    </defs>
                    <polygon points={`${SZ*0.2},${SZ/2-4} ${SZ*0.2},${SZ/2+4} ${SZ*0.8},${SZ/2+6} ${SZ*0.9},${SZ/2} ${SZ*0.8},${SZ/2-6}`} fill={`url(#sg${e.id})`} />
                    <rect x={SZ*0.2} y={SZ/2-15} width="6" height="30" fill="#c0a828" rx="2" />
                    <rect x={SZ*0.05} y={SZ/2-3} width={SZ*0.15} height="6" fill="#553311" />
                  </svg>
                </div>
                <div style={{ position: "absolute", inset: 0, animation: `epic-wave-${e.id} 0.35s ease-out forwards`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ overflow: "visible" }}>
                    <path d={`M ${SZ*0.7} ${SZ*0.2} Q ${SZ*0.9} ${SZ*0.5} ${SZ*0.7} ${SZ*0.8}`} fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="6" style={{ filter: "drop-shadow(0 0 10px #fff)" }} strokeLinecap="round" />
                    <path d={`M ${SZ*0.65} ${SZ*0.3} Q ${SZ*0.8} ${SZ*0.5} ${SZ*0.65} ${SZ*0.7}`} fill="none" stroke="rgba(0, 255, 255, 0.6)" strokeWidth="10" strokeLinecap="round" style={{ filter: "blur(4px)" }} />
                  </svg>
                </div>
              </div>
            );
          }
          if (e.type === "arrow" && e.targetX !== undefined && e.targetY !== undefined) {
            const tx2 = e.targetX * CELL + CELL / 2;
            const ty2 = e.targetY * CELL + CELL / 2;
            const adx = tx2 - ex, ady = ty2 - ey;
            const alen = Math.sqrt(adx * adx + ady * ady);
            const aang = Math.atan2(ady, adx) * 180 / Math.PI;
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 55,
                left: ex, top: ey - 3,
                width: alen, height: 6,
                transform: `rotate(${aang}deg)`, transformOrigin: "0 50%",
                animation: "dnd-arrow-fly 0.36s ease-in forwards",
              }}>
                <svg width={alen} height={6} viewBox={`0 0 ${alen} 6`} style={{ overflow: "visible" }}>
                  <line x1="0" y1="3" x2={alen - 10} y2="3" stroke="#b89040" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="3" x2={alen * 0.3} y2="3" stroke="#7a5a20" strokeWidth="1" strokeDasharray="3,4" />
                  <polygon points={`${alen-10},0 ${alen},3 ${alen-10},6`} fill="#d0e0ff" />
                </svg>
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}
