import Phaser from 'phaser';

// Grid constants: 1 cell = 32px = 5ft => 20ft = 4 cells
const CELL = 32;
const MOVE_RANGE = 4; // cells per turn (20ft)

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DungeonScene' });
    this.players = {};
    this.monsters = {};
    this.monsterHpBars = {};
    this.inCombat = false;
    this.isMyTurn = false;
    this.moveRemaining = MOVE_RANGE; // cells left to move this turn
    this.turnOrder = [];
    this.currentTurn = null;
    this.localPlayerId = null;
  }

  init(data) {
    this.character = data.character;
    this.socket = data.socket;
    this.localPlayerId = this.socket?.id;
  }

  preload() {
    const g = this.add.graphics();

    // Local player (blue circle)
    g.fillStyle(0x3b82f6, 1); g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff); g.strokeCircle(16, 16, 14);
    g.generateTexture('localToken', 32, 32);

    // Other player (green circle)
    g.clear(); g.fillStyle(0x10b981, 1); g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff); g.strokeCircle(16, 16, 14);
    g.generateTexture('partyToken', 32, 32);

    // Monster (red square with cross)
    g.clear(); g.fillStyle(0xef4444, 1); g.fillRect(4, 4, 24, 24);
    g.lineStyle(2, 0xffffff); g.strokeRect(4, 4, 24, 24);
    g.generateTexture('monsterToken', 32, 32);

    // Movement highlight
    g.clear(); g.fillStyle(0x3b82f6, 0.25); g.fillRect(1, 1, 30, 30);
    g.lineStyle(1, 0x3b82f6, 0.6); g.strokeRect(1, 1, 30, 30);
    g.generateTexture('moveHighlight', 32, 32);

    g.destroy();
  }

  create() {
    // ─── DUNGEON TILEMAP (simple grid) ───────────────────────────────
    const MAP_W = 40, MAP_H = 30;
    this.mapW = MAP_W; this.mapH = MAP_H;

    // Floor
    for (let row = 0; row < MAP_H; row++) {
      for (let col = 0; col < MAP_W; col++) {
        this.add.rectangle(col * CELL + CELL / 2, row * CELL + CELL / 2, CELL - 1, CELL - 1, 0x1e293b);
      }
    }

    // Walls on edges
    const wallColor = 0x334155;
    [0, MAP_H - 1].forEach(row => {
      for (let col = 0; col < MAP_W; col++)
        this.add.rectangle(col * CELL + CELL / 2, row * CELL + CELL / 2, CELL, CELL, wallColor);
    });
    [0, MAP_W - 1].forEach(col => {
      for (let row = 0; row < MAP_H; row++)
        this.add.rectangle(col * CELL + CELL / 2, row * CELL + CELL / 2, CELL, CELL, wallColor);
    });

    // Exit door (bottom right area)
    this.exitZone = this.add.rectangle((MAP_W - 2) * CELL + CELL / 2, (MAP_H - 1) * CELL + CELL / 2, CELL * 2, CELL, 0xfbbf24)
      .setInteractive();
    this.add.text((MAP_W - 2) * CELL, (MAP_H - 1) * CELL - 2, 'EXIT', { fontSize: '10px', fill: '#000', fontStyle: 'bold' });

    this.exitZone.on('pointerdown', () => {
      if (this.inCombat) {
        this.events.emit('log', 'You cannot leave during combat!', 'error');
        return;
      }
      this.socket.emit('change_map', { map: 'town', x: 400, y: 300 });
    });

    // Movement highlight group
    this.moveHighlights = this.add.group();

    // Camera setup
    this.cameras.main.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL);

    // ─── SOCKET EVENTS ───────────────────────────────────────────────
    this.socket.on('dungeon_state', ({ monsters }) => {
      monsters.forEach(m => this.spawnMonster(m));
    });

    this.socket.on('current_players', (players) => {
      Object.values(players).forEach(p => {
        if (p.id === this.socket.id) this.spawnLocalPlayer(p);
        else if (p.map === 'dungeon1') this.spawnOtherPlayer(p);
      });
    });

    this.socket.on('new_player', (p) => {
      if (p.map === 'dungeon1' && p.id !== this.socket.id) this.spawnOtherPlayer(p);
    });

    this.socket.on('player_moved', ({ id, x, y }) => {
      if (this.players[id]) {
        this.tweens.add({ targets: [this.players[id].sprite, this.players[id].label], x, y, duration: 300 });
      }
    });

    this.socket.on('player_disconnected', (id) => {
      if (this.players[id]) {
        this.players[id].sprite.destroy();
        this.players[id].label?.destroy();
        delete this.players[id];
      }
    });

    this.socket.on('combat_started', ({ turnOrder, currentTurn }) => {
      this.inCombat = true;
      this.turnOrder = turnOrder;
      this.currentTurn = currentTurn;
      this.isMyTurn = currentTurn.id === this.socket.id;
      this.moveRemaining = MOVE_RANGE;
      this.events.emit('combat_started', { turnOrder, currentTurn, isMyTurn: this.isMyTurn });
      this.clearMoveHighlights();
      if (this.isMyTurn) this.showMoveHighlights();
    });

    this.socket.on('turn_changed', ({ currentTurn }) => {
      this.currentTurn = currentTurn;
      this.isMyTurn = currentTurn.id === this.socket.id;
      this.moveRemaining = MOVE_RANGE;
      this.clearMoveHighlights();
      if (this.isMyTurn) this.showMoveHighlights();
      this.events.emit('turn_changed', { currentTurn, isMyTurn: this.isMyTurn });
    });

    this.socket.on('combat_result', (result) => {
      this.events.emit('combat_result', result);
      // Update monster HP bar
      if (result.targetId && this.monsterHpBars[result.targetId]) {
        this.updateMonsterHpBar(result.targetId, result.targetHp);
      }
    });

    this.socket.on('monster_died', ({ monsterId }) => {
      if (this.monsters[monsterId]) {
        this.monsters[monsterId].sprite?.destroy();
        this.monsters[monsterId].label?.destroy();
        this.monsterHpBars[monsterId]?.bar?.destroy();
        this.monsterHpBars[monsterId]?.bg?.destroy();
        delete this.monsters[monsterId];
        delete this.monsterHpBars[monsterId];
      }
    });

    this.socket.on('combat_ended', ({ reason }) => {
      this.inCombat = false;
      this.isMyTurn = false;
      this.clearMoveHighlights();
      this.events.emit('combat_ended', { reason });
    });

    // Join dungeon
    this.socket.emit('change_map', { map: 'dungeon1', x: CELL * 2, y: CELL * 2 });

    // Click to move
    this.input.on('pointerdown', (pointer) => {
      const gridX = Math.floor(pointer.worldX / CELL) * CELL + CELL / 2;
      const gridY = Math.floor(pointer.worldY / CELL) * CELL + CELL / 2;
      this.tryMove(gridX, gridY);
    });
  }

  spawnLocalPlayer(playerInfo) {
    const x = playerInfo.x || CELL * 2;
    const y = playerInfo.y || CELL * 2;
    const sprite = this.add.sprite(x, y, 'localToken').setDepth(10).setInteractive();
    const label = this.add.text(x, y - 22, this.character.name, { fontSize: '10px', fill: '#93c5fd' })
      .setOrigin(0.5).setDepth(11);
    this.players[this.socket.id] = { sprite, label };
    this.cameras.main.startFollow(sprite, true, 0.08, 0.08);
  }

  spawnOtherPlayer(playerInfo) {
    const sprite = this.add.sprite(playerInfo.x, playerInfo.y, 'partyToken').setDepth(10);
    const label = this.add.text(playerInfo.x, playerInfo.y - 22, playerInfo.character?.name || '?', { fontSize: '10px', fill: '#6ee7b7' })
      .setOrigin(0.5).setDepth(11);
    this.players[playerInfo.id] = { sprite, label };
  }

  spawnMonster(m) {
    const sprite = this.add.sprite(m.x, m.y, 'monsterToken').setDepth(10).setInteractive();
    const label = this.add.text(m.x, m.y - 22, m.name, { fontSize: '9px', fill: '#fca5a5' }).setOrigin(0.5).setDepth(11);
    this.monsters[m.id] = { sprite, label, data: m };

    // HP bar background
    const bg = this.add.rectangle(m.x, m.y + 18, 30, 5, 0x1e293b).setDepth(12);
    const bar = this.add.rectangle(m.x - 15, m.y + 18, 30, 5, 0xef4444).setOrigin(0, 0.5).setDepth(13);
    this.monsterHpBars[m.id] = { bar, bg, maxHp: m.maxHp };

    // Click on monster to attack during combat
    sprite.on('pointerdown', () => {
      if (!this.inCombat || !this.isMyTurn) return;
      const weapon = this.character.equipment?.weapon;
      const weaponDamage = weapon?.damage || '1d4';
      const isRanged = weapon?.isRanged || false;
      this.socket.emit('combat_attack', {
        targetId: m.id,
        weaponDamage,
        isRanged
      });
    });
  }

  updateMonsterHpBar(monsterId, currentHp) {
    const bar = this.monsterHpBars[monsterId];
    if (!bar) return;
    const pct = Math.max(0, currentHp / bar.maxHp);
    bar.bar.setSize(30 * pct, 5);
  }

  showMoveHighlights() {
    if (!this.players[this.socket.id]) return;
    const { sprite } = this.players[this.socket.id];
    const cx = Math.floor(sprite.x / CELL);
    const cy = Math.floor(sprite.y / CELL);
    const range = this.moveRemaining;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= range) {
          const gx = (cx + dx) * CELL + CELL / 2;
          const gy = (cy + dy) * CELL + CELL / 2;
          const h = this.add.image(gx, gy, 'moveHighlight').setDepth(5);
          this.moveHighlights.add(h);
        }
      }
    }
  }

  clearMoveHighlights() {
    this.moveHighlights.clear(true, true);
  }

  tryMove(worldX, worldY) {
    const mySprite = this.players[this.socket.id]?.sprite;
    if (!mySprite) return;

    if (this.inCombat) {
      if (!this.isMyTurn) return;
      // Grid movement during combat (limited by moveRemaining)
      const fromCX = Math.floor(mySprite.x / CELL);
      const fromCY = Math.floor(mySprite.y / CELL);
      const toCX = Math.floor(worldX / CELL);
      const toCY = Math.floor(worldY / CELL);
      const dist = Math.abs(toCX - fromCX) + Math.abs(toCY - fromCY);
      if (dist > this.moveRemaining || dist === 0) return;

      this.moveRemaining -= dist;
      const snappedX = toCX * CELL + CELL / 2;
      const snappedY = toCY * CELL + CELL / 2;
      this.tweens.add({ targets: [mySprite, this.players[this.socket.id].label], x: snappedX, y: snappedY, duration: 300 });
      this.socket.emit('player_move', { x: snappedX, y: snappedY });
      this.clearMoveHighlights();
      if (this.moveRemaining > 0) this.showMoveHighlights();
      this.events.emit('move_updated', { moveRemaining: this.moveRemaining });
    } else {
      // Free movement out of combat
      const snappedX = Math.floor(worldX / CELL) * CELL + CELL / 2;
      const snappedY = Math.floor(worldY / CELL) * CELL + CELL / 2;
      this.tweens.add({ targets: [mySprite, this.players[this.socket.id].label], x: snappedX, y: snappedY, duration: 300 });
      this.socket.emit('player_move', { x: snappedX, y: snappedY });
    }
  }
}
