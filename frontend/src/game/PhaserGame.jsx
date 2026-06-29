import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import WorldMapScene from './scenes/WorldMapScene';
import TownScene from './scenes/TownScene';
import DungeonScene from './scenes/DungeonScene';

export default function PhaserGame({ character, socket, onCombatEvent }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [currentMap, setCurrentMap] = useState('world'); // 'world', 'town', 'dungeon'

  const launchScene = useCallback((map) => {
    setCurrentMap(map);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Destroy old game if exists
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    let SceneClass;
    if (currentMap === 'world') SceneClass = WorldMapScene;
    else if (currentMap === 'town') SceneClass = TownScene;
    else SceneClass = DungeonScene;

    const config = {
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: containerRef.current?.clientWidth || 800,
      height: containerRef.current?.clientHeight || 500,
      backgroundColor: '#0f172a',
      scene: [SceneClass],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Pass data into scene after it's ready
    game.events.once('ready', () => {
      const scene = game.scene.getScene(SceneClass.name || currentMap);
      if (scene) {
        scene.character = character;
        scene.socket = socket;
        scene.onChangeScene = launchScene;
      }
    });

    game.scene.start(SceneClass.name || 'scene', {
      character,
      socket,
      onChangeScene: launchScene
    });

    // Listen to Phaser scene events and forward to React
    game.events.on('scene-combat_started', (data) => onCombatEvent?.('combat_started', data));
    game.events.on('scene-turn_changed', (data) => onCombatEvent?.('turn_changed', data));
    game.events.on('scene-combat_ended', (data) => onCombatEvent?.('combat_ended', data));
    game.events.on('scene-combat_result', (data) => onCombatEvent?.('combat_result', data));

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [currentMap, socket]);

  return (
    <div
      id="phaser-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
