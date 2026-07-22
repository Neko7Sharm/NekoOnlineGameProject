import { useState, useRef, useMemo } from "react";
import { C, MO } from "../../constants/theme";
import { CLASS_CFG } from "../../constants/classes";
import { CLASS_SPELLS, WIZARD_SPELL_CHOICES } from "../../constants/classes";
import { SKILL_DICTIONARY } from "../../constants/skills";
import {
  getMapCols, getMapRows, CELL, MOVE_SQUARES, SIGHT, DUNGEON_ENTER, DUNGEON_EXIT,
  TOWN_SPECIAL, SANCTUARY_SPECIAL, getTownTile, getDungeonTile, getSanctuaryTile, getTutorialTile,
  hasLineOfSight
} from "../../constants/map";
import { dist, distToEntity } from "../../utils/dice";
import type { MapGridProps } from "../../types/game";
import townBg from "../../assets/town_map_bg.png";
import tileGrass from "../../assets/tile_grass.png";
import tilePath from "../../assets/tile_path.png";
import bShop from "../../assets/b_shop.png";
import bQuest from "../../assets/b_quest.png";
import bInn from "../../assets/b_inn.png";
import bStatue from "../../assets/b_statue.png";
import bAlchemy from "../../assets/b_alchemy.png";
import bBlacksmith from "../../assets/b_blacksmith.png";
import npcSeleniaChibi from "../../assets/npc/npc_g01c.png";
import npcMerchant from "../../assets/npc/npc_01.png";
import npcQuestmaster from "../../assets/npc/npc_b01.png";
import npcInnkeeper from "../../assets/npc/npc_c01.png";
import npcAlchemist from "../../assets/npc/npc_d01.png";
import npcBlacksmith from "../../assets/npc/npc_g02.png";
import monsterSlime from "../../assets/monster_slime.png";
import monsterWolf from "../../assets/monster_wolf.png";
import monsterGoblin from "../../assets/monster_goblin.png";
import monsterVine from "../../assets/monster_vine.png";
import monsterTreant from "../../assets/monster_treant.png";
import sacredTree from "../../assets/sacred_tree.png";
import coverRock from "../../assets/cover_rock.png";
import coverLog from "../../assets/cover_log.png";
import coverLogH from "../../assets/cover_log_h.png";
import coverLogV from "../../assets/cover_log_v.png";
import effectScratch from "../../assets/effect_scratch.png";
import effectArrow from "../../assets/effect_arrow.png";
import effectWhip from "../../assets/effect_whip.png";
import effectRootslam from "../../assets/effect_rootslam.png";

// Longsword Custom Effects
import lsSlash1 from "../../assets/effect/attackeffect/slash1/1.png";
import lsSlash2 from "../../assets/effect/attackeffect/slash1/2.png";
import lsSlash3 from "../../assets/effect/attackeffect/slash1/3.png";
import lsSlash4 from "../../assets/effect/attackeffect/slash1/4.png";
import lsSlash5 from "../../assets/effect/attackeffect/slash1/5.png";
import lsSlash6 from "../../assets/effect/attackeffect/slash1/6.png";
import lsSlash7 from "../../assets/effect/attackeffect/slash1/7.png";

import lsHit1 from "../../assets/effect/hiteffect/slash1/1.png";
import lsHit2 from "../../assets/effect/hiteffect/slash1/2.png";
import lsHit3 from "../../assets/effect/hiteffect/slash1/3.png";
import lsHit4 from "../../assets/effect/hiteffect/slash1/4.png";
import lsHit5 from "../../assets/effect/hiteffect/slash1/5.png";
import lsHit6 from "../../assets/effect/hiteffect/slash1/6.png";
import lsHit7 from "../../assets/effect/hiteffect/slash1/7.png";

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

  const treeIlluminatedTiles = useMemo(() => {
    const sets: Set<string>[] = [];
    if (wfMap.glowingTrees) {
      for (const tree of wfMap.glowingTrees) {
        const treeTiles = new Set<string>();
        for (let dy = -tree.range; dy <= tree.range; dy++) {
          for (let dx = -tree.range; dx <= tree.range; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= tree.range) {
               const fx = tree.x + dx, fy = tree.y + dy;
               if (hasLineOfSight("dungeon", tree.x, tree.y, fx, fy)) {
                 treeTiles.add(`${fx},${fy}`);
               }
            }
          }
        }
        sets.push(treeTiles);
      }
    }
    return sets;
  }, []);

  const visible = new Set<string>();
  const activeGlowingTrees: number[] = [];
  const localFogRevealed = new Set(fogRevealed);

  if (mode === "dungeon") {
    const baseVisible = new Set<string>();
    for (let dy = -SIGHT; dy <= SIGHT; dy++)
      for (let dx = -SIGHT; dx <= SIGHT; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= SIGHT) {
          const fx = pos.x + dx, fy = pos.y + dy;
          if (fx >= 0 && fx < cols && fy >= 0 && fy < rows) {
            if (hasLineOfSight("dungeon", pos.x, pos.y, fx, fy)) {
              baseVisible.add(`${fx},${fy}`);
              visible.add(`${fx},${fy}`);
            }
          }
        }
      }

    // Glowing trees vision logic
    for (let i = 0; i < treeIlluminatedTiles.length; i++) {
       const treeTiles = treeIlluminatedTiles[i];
       let intersects = false;
       for (const t of treeTiles) {
          if (baseVisible.has(t) || localFogRevealed.has(t)) {
             intersects = true;
             break;
          }
       }
       if (intersects) {
          activeGlowingTrees.push(i);
          for (const t of treeTiles) {
             visible.add(t);
             localFogRevealed.add(t); // Keep it revealed
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
  
  if (combat.active && (combatMode === "attack" || combatMode === "attack_offhand")) {
    const weapon = combatMode === "attack_offhand" ? char.equipment.offHand : char.equipment.mainHand;
    if (weapon) {
      const rs = Math.ceil((weapon.range ?? 5) / 5);
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
        if (distToEntity(pos, m.position, m.size) <= rs) attackableM.add(m.id); 
      });
    }
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
        if (distToEntity(pos, m.position, m.size) <= rangeSquares) spellableM.add(m.id);
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
        const mSize = m.size ?? 1;
        const mRadius = Math.floor(mSize / 2);
        let hit = false;
        for(let dy = -mRadius; dy <= mRadius; dy++) {
          for(let dx = -mRadius; dx <= mRadius; dx++) {
            if (aoeTiles.has(`${m.position.x + dx},${m.position.y + dy}`)) hit = true;
          }
        }
        if (hit) aoeHitMonsters.add(m.id);
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
        @keyframes anim-frame-1 { 0%, 24.9% { opacity: 1; } 25%, 100% { opacity: 0; } }
        @keyframes anim-frame-2 { 0%, 24.9% { opacity: 0; } 25%, 49.9% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes anim-frame-3 { 0%, 49.9% { opacity: 0; } 50%, 74.9% { opacity: 1; } 75%, 100% { opacity: 0; } }
        @keyframes anim-frame-4 { 0%, 74.9% { opacity: 0; } 75%, 100% { opacity: 1; } }

        @keyframes anim-frame-7-1 { 0%, 14.2% { opacity: 1; } 14.3%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-2 { 0%, 14.2% { opacity: 0; } 14.3%, 28.5% { opacity: 1; } 28.6%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-3 { 0%, 28.5% { opacity: 0; } 28.6%, 42.8% { opacity: 1; } 42.9%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-4 { 0%, 42.8% { opacity: 0; } 42.9%, 57.1% { opacity: 1; } 57.2%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-5 { 0%, 57.1% { opacity: 0; } 57.2%, 71.4% { opacity: 1; } 71.5%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-6 { 0%, 71.4% { opacity: 0; } 71.5%, 85.7% { opacity: 1; } 85.8%, 100% { opacity: 0; } }
        @keyframes anim-frame-7-7 { 0%, 85.7% { opacity: 0; } 85.8%, 100% { opacity: 1; } }
        @keyframes dnd-slash { 0%{opacity:0;transform:scale(0.3) rotate(-25deg)} 30%{opacity:1;transform:scale(1) rotate(-25deg)} 100%{opacity:0;transform:scale(1.6) rotate(-25deg)} }
        @keyframes dnd-float-up { 0%{opacity:1;transform:translateY(0)} 60%{opacity:1;transform:translateY(-22px)} 100%{opacity:0;transform:translateY(-44px)} }
        @keyframes dnd-fireball { 0%{opacity:0;transform:scale(0)} 35%{opacity:1;transform:scale(1.1)} 100%{opacity:0;transform:scale(2)} }
        @keyframes dnd-pulse-ring { 0%{opacity:0.9;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.5)} }
        @keyframes dnd-shake { 0%,100%{transform:translateX(0) translateY(0)} 20%{transform:translateX(-4px) translateY(-2px)} 40%{transform:translateX(4px) translateY(1px)} 60%{transform:translateX(-3px) translateY(-1px)} 80%{transform:translateX(2px)} }
        @keyframes dnd-arrow-fly { 0%{clip-path:inset(0 100% 0 0);opacity:1} 75%{clip-path:inset(0 0% 0 0);opacity:1} 100%{clip-path:inset(0 0% 0 0);opacity:0} }
        @keyframes dnd-dissolve { 0%{opacity:1;filter:none;transform:scale(1)} 30%{opacity:0.8;filter:blur(0px) brightness(2);transform:scale(1.1)} 60%{opacity:0.4;filter:blur(2px) brightness(3);transform:scale(1.3)} 100%{opacity:0;filter:blur(6px) brightness(0);transform:scale(0.2)} }
        @keyframes dnd-aoe-pulse { 0%{opacity:0.3} 100%{opacity:0.7} }
        @keyframes dnd-slash-sheet { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
      `}</style>
        <div ref={gridRef}
          onClick={(e) => {
            if (!gridRef.current) return;
            if (mode === "town" || mode === "sanctuary") {
              const r = gridRef.current.getBoundingClientRect();
              const cellW = r.width / cols;
              const cellH = r.height / rows;
              const cx = Math.floor((e.clientX - r.left) / cellW);
              const cy = Math.floor((e.clientY - r.top) / cellH);
              if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                const td = mode === "town" ? getTownTile(cx, cy) : getSanctuaryTile(cx, cy);
                if (!td.isWall) onTileClick(cx, cy);
              }
            }
          }}
          onMouseMove={e => {
            if (!gridRef.current) return;
            if (combatMode !== "spell" || !selectedSpell) return;
            const r = gridRef.current.getBoundingClientRect();
            const cellW = r.width / cols;
            const cellH = r.height / rows;
            setMouseGrid({
              x: ((e.clientX - r.left) / cellW) * CELL,
              y: ((e.clientY - r.top) / cellH) * CELL
            });
          }}
          style={{ 
            position: "relative", width: cols * CELL, height: rows * CELL, imageRendering: "pixelated",
            backgroundColor: "#000", cursor: "pointer"
          }}>
        {/* ═══ GROUND LAYER: Pure Grass Base + Separate Stone Path Overlay ═══ */}
        {(mode === "town") && (
          <>
            {/* 1. Full-Coverage Pure Grass Base Layer */}
            <div style={{
              position: "absolute", left: 0, top: 0, width: cols * CELL, height: rows * CELL,
              backgroundImage: `url(${tileGrass})`, backgroundSize: `${CELL * 4}px ${CELL * 4}px`,
              backgroundColor: "#1b1435", pointerEvents: "none", zIndex: 0
            }} />

            {/* 2. Separate Stone Path Overlay Layer (Renders only on path tiles) */}
            {(() => {
              const pathTiles = [];
              for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                  const td = getTownTile(x, y);
                  if (td.type === "path") {
                    pathTiles.push(
                      <div key={`path-${x}-${y}`} style={{
                        position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                        backgroundImage: `url(${tilePath})`, backgroundSize: `${CELL * 4}px ${CELL * 4}px`,
                        backgroundPosition: `-${(x % 4) * CELL}px -${(y % 4) * CELL}px`,
                        pointerEvents: "none", zIndex: 1, opacity: 0.92,
                        boxShadow: "inset 0 0 6px rgba(0,0,0,0.25)"
                      }} />
                    );
                  }
                }
              }
              return pathTiles;
            })()}

            {/* 3. Atmosphere Layer: Floating Firefly Orbs, Street Lamps & Glowing Mana Crystals */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={`orb-${i}`} style={{
                  position: "absolute",
                  left: `${(i * 17 + 7) % 100}%`,
                  top: `${(i * 23 + 11) % 100}%`,
                  width: `${(i % 3) * 3 + 6}px`,
                  height: `${(i % 3) * 3 + 6}px`,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "#ffd700" : "#00e5ff",
                  boxShadow: i % 2 === 0 ? "0 0 12px #ffd700, 0 0 24px #ffaa00" : "0 0 12px #00e5ff, 0 0 24px #0088ff",
                  opacity: 0.8,
                  animation: `dnd-float-up ${4 + (i % 4)}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.25}s`
                }} />
              ))}
            </div>

            {/* Street Lamps, Moonflowers & Mana Crystals scattered across key town locations */}
            {[
              { x: 5, y: 6, icon: "🏮", color: "#ffd700" },
              { x: 22, y: 6, icon: "🏮", color: "#ffd700" },
              { x: 5, y: 14, icon: "🏮", color: "#ffd700" },
              { x: 22, y: 14, icon: "🏮", color: "#ffd700" },
              { x: 12, y: 8, icon: "💎", color: "#00e5ff" },
              { x: 16, y: 12, icon: "💎", color: "#00e5ff" },
              { x: 2, y: 14, icon: "🌸", color: "#c492d6" },
              { x: 26, y: 14, icon: "🌸", color: "#c492d6" },
            ].map((item, idx) => (
              <div key={`prop-${idx}`} style={{
                position: "absolute", left: item.x * CELL, top: item.y * CELL, width: CELL, height: CELL,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: CELL * 0.5, pointerEvents: "none", zIndex: 4,
                filter: `drop-shadow(0 0 10px ${item.color})`
              }}>
                {item.icon}
              </div>
            ))}

            {/* Clickable overlay grid — only walkable & special tiles get DOM elements */}
            {Object.entries(TOWN_SPECIAL).map(([key, special]) => {
              const [sx, sy] = key.split(",");
              const x = parseInt(sx), y = parseInt(sy);
              return (
                <div key={`sp-${key}`}
                  onClick={() => onTileClick(x, y)}
                  style={{
                    position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                    cursor: "pointer", zIndex: 6,
                  }}>
                  {["8,6", "9,6", "20,6", "21,6", "8,14", "9,14", "4,10", "22,8", "22,14", "19,21", "20,21", "21,21", "14,6"].includes(key) && (
                    <div style={{ 
                      position: "absolute", inset: 2, display: "flex", alignItems: "center", justifyContent: "center", 
                      fontSize: CELL * 0.6, background: "rgba(0,0,0,0.5)", border: `2px solid ${special.color}`, 
                      borderRadius: 6, opacity: 0.9, boxShadow: `0 0 8px ${special.color}`, zIndex: 6
                    }}>
                      {special.icon}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {(mode === "sanctuary") && (
          <>
            {/* Sanctuary ground: single gradient background */}
            <div style={{
              position: "absolute", left: 0, top: 0, width: cols * CELL, height: rows * CELL,
              background: "linear-gradient(180deg, #fdfbfe 0%, #f2e6ff 40%, #e8d5f5 100%)",
              pointerEvents: "none", zIndex: 0
            }} />
            {/* Border walls */}
            {Array.from({ length: cols }).map((_, x) => (
              <div key={`sb-t-${x}`} style={{ position: "absolute", left: x * CELL, top: 0, width: CELL, height: CELL, backgroundColor: "#ffffff", zIndex: 1 }} />
            ))}
            {Array.from({ length: cols }).map((_, x) => (
              <div key={`sb-b-${x}`} style={{ position: "absolute", left: x * CELL, top: (rows - 1) * CELL, width: CELL, height: CELL, backgroundColor: "#ffffff", zIndex: 1 }} />
            ))}
            {Array.from({ length: rows }).map((_, y) => (
              <div key={`sb-l-${y}`} style={{ position: "absolute", left: 0, top: y * CELL, width: CELL, height: CELL, backgroundColor: "#ffffff", zIndex: 1 }} />
            ))}
            {Array.from({ length: rows }).map((_, y) => (
              <div key={`sb-r-${y}`} style={{ position: "absolute", left: (cols - 1) * CELL, top: y * CELL, width: CELL, height: CELL, backgroundColor: "#ffffff", zIndex: 1 }} />
            ))}
            {/* Sanctuary special interactive tiles */}
            {Object.entries(SANCTUARY_SPECIAL).map(([key, special]) => {
              const [sx, sy] = key.split(",");
              const x = parseInt(sx), y = parseInt(sy);
              return (
                <div key={`sanc-sp-${key}`}
                  onClick={() => onTileClick(x, y)}
                  style={{ position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL, cursor: "pointer", zIndex: 2 }}
                />
              );
            })}
            {/* Invisible click layer for walkable tiles */}
            <div style={{ position: "absolute", left: 0, top: 0, width: cols * CELL, height: rows * CELL, zIndex: 1 }}
              onClick={(e) => {
                if (!gridRef.current) return;
                const r = gridRef.current.getBoundingClientRect();
                const cellW = r.width / cols;
                const cellH = r.height / rows;
                const cx = Math.floor((e.clientX - r.left) / cellW);
                const cy = Math.floor((e.clientY - r.top) / cellH);
                if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                  const td = getSanctuaryTile(cx, cy);
                  if (!td.isWall) onTileClick(cx, cy);
                }
              }}
            />
          </>
        )}

        {/* ═══ TILE LAYER: Dungeon & Tutorial keep per-tile rendering (fog-of-war) ═══ */}
        {(mode === "dungeon" || mode === "tutorial") && (() => {
          let keysToRender: {x: number, y: number, key: string}[] = [];
          if (mode === "dungeon") {
            const setKeys = new Set(localFogRevealed);
            setKeys.add(`${DUNGEON_ENTER.x},${DUNGEON_ENTER.y}`);
            setKeys.add(`${DUNGEON_EXIT.x},${DUNGEON_EXIT.y}`);
            keysToRender = Array.from(setKeys).map(k => {
              const [sx, sy] = k.split(",");
              return { x: parseInt(sx), y: parseInt(sy), key: k };
            });
          } else {
            for (let y = 0; y < rows; y++) {
              for (let x = 0; x < cols; x++) {
                keysToRender.push({x, y, key: `${x},${y}`});
              }
            }
          }
          return keysToRender.map(({x, y, key}) => {
            const td = mode === "tutorial" ? getTutorialTile(x, y) : getDungeonTile(x, y);
            let tileBg = td.bg;
            
            const isExit = mode === "dungeon" && x === DUNGEON_EXIT.x && y === DUNGEON_EXIT.y;
            const isEntrance = mode === "dungeon" && x === DUNGEON_ENTER.x && y === DUNGEON_ENTER.y;
            const isFogged = mode === "dungeon" && !visible.has(key) && !localFogRevealed.has(key);
            const isDimmed = mode === "dungeon" && !visible.has(key) && localFogRevealed.has(key);
            const isReachable = reachable.has(key);
            const isAttackRange = attackRangeTiles.has(key) && mode === "dungeon" && !isFogged;
            const isInsightVision = insightVisionTiles?.has(key) && !isFogged;
            const isPlayer = x === pos.x && y === pos.y;

            let cellBg = tileBg;
            const inCone = aoeTiles.has(key);
            const isAoeCursor = inCone && isAoeSpell && combatMode === "spell";
            
            const isWarning = combat.active && combat.warnings?.some(w => w.x === x && w.y === y && w.level === 2) && !isFogged;
            if (isWarning) cellBg = "rgba(220, 20, 20, 0.45)";

            // Optimization: Skip rendering DOM nodes for tiles that are completely fogged out
            if (isFogged && !isExit && !isEntrance) return null;

            return (
              <div key={key}
                onClick={() => {
                  if (td.isWall || isFogged) return;
                  if (isAoeCursor) {
                    const hit = Array.from(aoeHitMonsters);
                    onAOECast?.(hit, x, y);
                  } else {
                    onTileClick(x, y);
                  }
                }}
                style={{
                  position: "absolute", left: x * CELL, top: y * CELL, width: CELL, height: CELL,
                  backgroundColor: isFogged ? "#000" : cellBg,
                  opacity: isDimmed ? 0.4 : 1,
                  cursor: td.isWall || isFogged ? "default" : isAoeCursor ? "crosshair" : "pointer",
                  outline: isReachable ? `2px solid ${C.gold}` : isAttackRange ? `1px solid ${C.blue}50` : "none",
                  outlineOffset: "-2px",
                  boxShadow: isReachable ? `inset 0 0 8px ${C.gold}20` : isAttackRange ? `inset 0 0 12px ${C.blue}30` : "none",
                }}>
                  {isInsightVision && <div style={{ position: "absolute", inset: 0, background: "rgba(255, 0, 0, 0.25)", pointerEvents: "none" }} />}
                  {isWarning && <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(255,50,50,0.8)", animation: "pulse 1.5s infinite" }} />}
                  {isAoeCursor && <div style={{ position: "absolute", inset: 0, background: "rgba(255,50,50,0.3)", border: `1px solid ${C.red}` }} />}
                  {isAttackRange && <div style={{ position: "absolute", inset: 0, background: `${C.blue}15`, pointerEvents: "none" }} />}
                <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(0,0,0,0.25)" }} />

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
          });
        })()}

        {/* GLOWING TREES */}
        {mode === "dungeon" && wfMap.glowingTrees?.map((tree, i) => {
          if (!visible.has(`${tree.x},${tree.y}`) && !localFogRevealed.has(`${tree.x},${tree.y}`)) return null;
          const cx = tree.x * CELL + CELL/2;
          const cy = tree.y * CELL + CELL/2;
          const isActive = activeGlowingTrees.includes(i);
          return (
            <div key={`glowingTree-${i}`} style={{
              position: "absolute", left: cx - CELL*2, top: cy - CELL*3, width: CELL*4, height: CELL*4, pointerEvents: "none", zIndex: 3
            }}>
               <img src="/assets/glowing_tree.png" style={{ width: "100%", height: "100%", objectFit: "contain",
                  filter: isActive ? "drop-shadow(0 0 30px rgba(0, 255, 200, 0.8))" : "none"
                }} />
            </div>
          );
        })}

        {mode === "dungeon" && <AmbientSystem width={cols * CELL} height={rows * CELL} />}

        {/* Building Overlays */}
        {mode === "town" && (
          <>
            <img src={bInn} style={{ position: "absolute", left: 3 * CELL, top: 1 * CELL, width: 10 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }} alt="Inn" />
            <img src={bShop} style={{ position: "absolute", left: 3 * CELL, top: 15 * CELL, width: 12 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))", transform: "rotate(180deg)" }} alt="Shop" />
            <img src={bQuest} style={{ position: "absolute", left: 17 * CELL, top: 1 * CELL, width: 10 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }} alt="Quest Guild" />
            <img src={bStatue} style={{ position: "absolute", left: 1 * CELL, top: 8 * CELL, width: 3 * CELL, height: 4 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(196,146,214,0.6))" }} alt="Statue" />
            <img src={bAlchemy} style={{ position: "absolute", left: 23 * CELL, top: 6 * CELL, width: 5 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }} alt="Alchemy Workstation" />
            <img src={bBlacksmith} style={{ position: "absolute", left: 23 * CELL, top: 12 * CELL, width: 5 * CELL, height: 5 * CELL, pointerEvents: "none", zIndex: 5, objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.4))" }} alt="Blacksmith Workstation" />
          </>
        )}
        {mode === "dungeon" && (
          <>
            {wfMap.rocks.filter(r => localFogRevealed.has(`${r.x},${r.y}`)).map((r, i) => {
              const isDimmed = !visible.has(`${r.x},${r.y}`);
              return <img key={`rock-${i}`} src={coverRock} style={{ position: "absolute", left: r.x * CELL, top: r.y * CELL, width: CELL, height: CELL, pointerEvents: "none", zIndex: 4, objectFit: "contain", opacity: isDimmed ? 0.4 : 1 }} alt="Rock" />
            })}
            {wfMap.logs.filter(l => localFogRevealed.has(`${l.x},${l.y}`)).map((l, i) => {
              const isDimmed = !visible.has(`${l.x},${l.y}`);
              const src = l.type === "H" ? coverLogH : l.type === "V" ? coverLogV : coverLog;
              const w = l.type === "H" ? 2 * CELL : CELL;
              const h = l.type === "V" ? 2 * CELL : CELL;
              return <img key={`log-${i}`} src={src} style={{ position: "absolute", left: l.x * CELL, top: l.y * CELL, width: w, height: h, pointerEvents: "none", zIndex: 4, objectFit: "fill", opacity: isDimmed ? 0.4 : 1 }} alt="Log" />
            })}
            {localFogRevealed.has(`${wfMap.landmark.x},${wfMap.landmark.y}`) && (() => {
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

        {monsters.filter(m => m.hp > 0).map(m => {
          const key = `${m.position.x},${m.position.y}`;
          const isEngagedInCombat = combat.active && (combat.engagedMonsterIds || []).includes(m.id);
          if (mode === "town") return null;
          if (mode === "dungeon" && !visible.has(key) && !isEngagedInCombat) return null;
          const isAttackable = attackableM.has(m.id);
          const isSpellable = spellableM.has(m.id);
          const isAoeTarget = aoeHitMonsters.has(m.id);
          const isHovered = hoveredMonsterId === m.id;
          const isCurrentTurn = combat.active && combat.turnOrder[combat.currentIndex]?.id === m.id;
          const isTargetable = isAttackable || isSpellable || isAoeTarget;
          const isShaking = hitTokenIds?.has(m.id);

          const mSize = m.size ?? 1;
          const mRadius = Math.floor(mSize / 2);
          const mLeft = (m.position.x - mRadius) * CELL + 3;
          const mTop = (m.position.y - mRadius) * CELL + 3;
          const mWidth = CELL * mSize - 6;
          const mHeight = CELL * mSize - 6;

          if (dyingMonsters?.has(m.id)) {
            return (
              <div key={m.id} style={{
                position: "absolute",
                left: mLeft, top: mTop,
                width: mWidth, height: mHeight,
                fontSize: CELL * 0.5, display: "flex", alignItems: "center", justifyContent: "center",
                animation: "dnd-dissolve 0.9s ease-out 1s forwards",
                pointerEvents: "none",
              }}>
                {m.image ? <img src={MONSTER_IMAGES[m.image]} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} alt={m.name} /> : "💀"}
              </div>
            );
          }

          return (
            <div key={m.id}
              onClick={() => { if (isTargetable) onMonsterClick(m.id); }}
              onMouseEnter={() => setHoveredMonsterId(m.id)}
              onMouseLeave={() => setHoveredMonsterId(null)}
              style={{
                position: "absolute",
                left: mLeft, top: mTop,
                width: mWidth, height: mHeight,
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
        {chests?.filter(c => !c.opened && localFogRevealed.has(`${c.position.x},${c.position.y}`)).map(c => {
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
        {secrets?.filter(s => !s.found && localFogRevealed.has(`${s.position.x},${s.position.y}`)).map(s => {
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
          if (e.type === "slash" || e.type === "scratch" || e.type === "whip" || e.type === "sword_swing") {
            // User requested to remove all generic melee attack effects for now to prepare for new custom animations
            return null;
          }

          if (e.type === "ls_slash") {
            // Calculate angle if there's a target
            let angle = 0;
            let cx = ex;
            let cy = ey;
            if (e.targetX !== undefined && e.targetY !== undefined) {
              const fromX = e.targetX * CELL + CELL / 2;
              const fromY = e.targetY * CELL + CELL / 2;
              const dx = ex - fromX;
              const dy = ey - fromY;
              angle = Math.atan2(dy, dx) * 180 / Math.PI;
              // Center the slash between player and monster
              cx = fromX + dx * 0.55;
              cy = fromY + dy * 0.55;
            }
            const animStyle: React.CSSProperties = { position: "absolute", width: "100%", height: "100%", objectFit: "contain", opacity: 0 };
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 60, left: cx - 160, top: cy - 160, width: 320, height: 320,
                transform: `rotate(${angle}deg) scaleY(${e.flip ? -1 : 1}) scale(${e.scale || 1})`,
                mixBlendMode: "screen",
                overflow: "hidden"
              }}>
                <img src={lsSlash1} style={{ ...animStyle, animation: "anim-frame-7-1 0.25s linear forwards" }} />
                <img src={lsSlash2} style={{ ...animStyle, animation: "anim-frame-7-2 0.25s linear forwards" }} />
                <img src={lsSlash3} style={{ ...animStyle, animation: "anim-frame-7-3 0.25s linear forwards" }} />
                <img src={lsSlash4} style={{ ...animStyle, animation: "anim-frame-7-4 0.25s linear forwards" }} />
                <img src={lsSlash5} style={{ ...animStyle, animation: "anim-frame-7-5 0.25s linear forwards" }} />
                <img src={lsSlash6} style={{ ...animStyle, animation: "anim-frame-7-6 0.25s linear forwards" }} />
                <img src={lsSlash7} style={{ ...animStyle, animation: "anim-frame-7-7 0.25s linear forwards" }} />
              </div>
            );
          }

          if (e.type === "ls_hit") {
            let angle = 0;
            if (e.targetX !== undefined && e.targetY !== undefined) {
              const fromX = e.targetX * CELL + CELL / 2;
              const fromY = e.targetY * CELL + CELL / 2;
              const dx = ex - fromX;
              const dy = ey - fromY;
              angle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
            const animStyle: React.CSSProperties = { position: "absolute", width: "100%", height: "100%", objectFit: "contain", opacity: 0 };
            return (
              <div key={e.id} style={{
                position: "absolute", pointerEvents: "none", zIndex: 65, left: ex - 75, top: ey - 75, width: 150, height: 150,
                transform: `rotate(${angle}deg) scaleY(${e.flip ? -1 : 1}) scale(${e.scale || 1})`,
                mixBlendMode: "screen"
              }}>
                <img src={lsHit1} style={{ ...animStyle, animation: "anim-frame-7-1 0.2s linear forwards" }} />
                <img src={lsHit2} style={{ ...animStyle, animation: "anim-frame-7-2 0.2s linear forwards" }} />
                <img src={lsHit3} style={{ ...animStyle, animation: "anim-frame-7-3 0.2s linear forwards" }} />
                <img src={lsHit4} style={{ ...animStyle, animation: "anim-frame-7-4 0.2s linear forwards" }} />
                <img src={lsHit5} style={{ ...animStyle, animation: "anim-frame-7-5 0.2s linear forwards" }} />
                <img src={lsHit6} style={{ ...animStyle, animation: "anim-frame-7-6 0.2s linear forwards" }} />
                <img src={lsHit7} style={{ ...animStyle, animation: "anim-frame-7-7 0.2s linear forwards" }} />
              </div>
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
