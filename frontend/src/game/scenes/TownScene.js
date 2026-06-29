import Phaser from 'phaser';

const CELL = 32;

export default class TownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TownScene' });
    this.players = {};
    this.confirmTarget = null;
    this.confirmMarker = null;
  }

  init(data) {
    this.character = data.character;
    this.socket = data.socket;
    this.onChangeScene = data.onChangeScene;
  }

  preload() {
    const g = this.add.graphics();
    g.fillStyle(0x3b82f6, 1); g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff); g.strokeCircle(16, 16, 14);
    g.generateTexture('localToken', 32, 32);

    g.clear(); g.fillStyle(0x10b981, 1); g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff); g.strokeCircle(16, 16, 14);
    g.generateTexture('partyToken', 32, 32);

    // Move target marker
    g.clear(); g.lineStyle(2, 0xfbbf24, 0.8); g.strokeCircle(16, 16, 12);
    g.fillStyle(0xfbbf24, 0.4); g.fillCircle(16, 16, 6);
    g.generateTexture('moveTarget', 32, 32);

    g.destroy();
  }

  create() {
    const MAP_W = 50, MAP_H = 40;

    // ─── Town Floor & Buildings ───────────────────────────────────────
    // Ground
    for (let row = 0; row < MAP_H; row++)
      for (let col = 0; col < MAP_W; col++)
        this.add.rectangle(col * CELL + 16, row * CELL + 16, CELL - 1, CELL - 1, 0x1e293b);

    // Road (horizontal)
    for (let col = 0; col < MAP_W; col++)
      this.add.rectangle(col * CELL + 16, 20 * CELL + 16, CELL, CELL, 0x334155);
    // Road (vertical)
    for (let row = 0; row < MAP_H; row++)
      this.add.rectangle(25 * CELL + 16, row * CELL + 16, CELL, CELL, 0x334155);

    // ── Buildings ──
    this.drawBuilding(5, 5, 6, 5, 0x1d4ed8, '🏪 Shop');
    this.drawBuilding(14, 5, 6, 5, 0x065f46, '📋 Quest Board');
    this.drawBuilding(5, 24, 7, 5, 0x7c3aed, '🏠 Inn');
    this.drawBuilding(32, 5, 6, 5, 0x92400e, '⚒ Blacksmith');

    // Shop interactive zone
    const shopZone = this.add.rectangle(8 * CELL, 7 * CELL, 4 * CELL, 3 * CELL, 0x1d4ed8, 0)
      .setInteractive();
    shopZone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    shopZone.on('pointerout', () => this.input.setDefaultCursor('default'));
    shopZone.on('pointerdown', () => this.events.emit('open_shop'));

    // Quest Board interactive zone
    const questZone = this.add.rectangle(17 * CELL, 7 * CELL, 4 * CELL, 3 * CELL, 0x065f46, 0)
      .setInteractive();
    questZone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    questZone.on('pointerout', () => this.input.setDefaultCursor('default'));
    questZone.on('pointerdown', () => this.events.emit('open_quests'));

    // World Map exit
    const exitZone = this.add.rectangle(MAP_W * CELL - CELL, CELL, CELL * 3, CELL * 2, 0xfbbf24, 0.3)
      .setInteractive().setStrokeStyle(2, 0xfbbf24);
    this.add.text(MAP_W * CELL - CELL, CELL, '🗺 World\nMap', { fontSize: '10px', fill: '#fbbf24', align: 'center' }).setOrigin(0.5);
    exitZone.on('pointerdown', () => this.events.emit('open_world_map'));

    // Camera
    this.cameras.main.setBounds(0, 0, MAP_W * CELL, MAP_H * CELL);

    // ─── SOCKET ─────────────────────────────────────────────────────
    this.socket.emit('change_map', { map: 'town', x: 25 * CELL, y: 20 * CELL });

    this.socket.on('current_players', (players) => {
      Object.values(players).forEach(p => {
        if (p.id === this.socket.id) this.spawnLocal(p);
        else if (p.map === 'town') this.spawnOther(p);
      });
    });

    this.socket.on('new_player', (p) => {
      if (p.id !== this.socket.id && p.map === 'town') this.spawnOther(p);
    });

    this.socket.on('player_moved', ({ id, x, y }) => {
      if (this.players[id]) {
        this.tweens.add({ targets: [this.players[id].sprite, this.players[id].label], x, y, duration: 500 });
      }
    });

    this.socket.on('player_disconnected', (id) => {
      this.players[id]?.sprite?.destroy();
      this.players[id]?.label?.destroy();
      delete this.players[id];
    });

    // ─── CLICK TO MOVE (with confirm marker) ────────────────────────
    this.input.on('pointerdown', (pointer) => {
      const wx = pointer.worldX, wy = pointer.worldY;
      if (this.confirmTarget) {
        // Second click = confirm move
        if (Math.abs(wx - this.confirmTarget.x) < CELL && Math.abs(wy - this.confirmTarget.y) < CELL) {
          this.doMove(this.confirmTarget.x, this.confirmTarget.y);
          this.confirmMarker?.destroy();
          this.confirmTarget = null;
          return;
        }
      }
      // Place confirm marker
      this.confirmMarker?.destroy();
      const snappedX = Math.floor(wx / CELL) * CELL + 16;
      const snappedY = Math.floor(wy / CELL) * CELL + 16;
      this.confirmMarker = this.add.image(snappedX, snappedY, 'moveTarget').setDepth(5);
      this.confirmTarget = { x: snappedX, y: snappedY };

      // Popup text
      this.confirmText?.destroy();
      this.confirmText = this.add.text(snappedX, snappedY - 28, '▶ Click again to walk here', {
        fontSize: '10px', fill: '#fbbf24', backgroundColor: '#0f172a', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(20);
      this.time.delayedCall(2000, () => {
        this.confirmMarker?.destroy();
        this.confirmText?.destroy();
        this.confirmTarget = null;
      });
    });
  }

  drawBuilding(col, row, w, h, color, label) {
    this.add.rectangle(col * CELL + (w * CELL) / 2, row * CELL + (h * CELL) / 2, w * CELL, h * CELL, color, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.15);
    this.add.text(col * CELL + (w * CELL) / 2, row * CELL + (h * CELL) / 2, label, {
      fontSize: '11px', fill: '#f8fafc', fontStyle: 'bold', align: 'center', wordWrap: { width: w * CELL - 8 }
    }).setOrigin(0.5);
  }

  spawnLocal(p) {
    const x = p.x || 25 * CELL;
    const y = p.y || 20 * CELL;
    const sprite = this.add.sprite(x, y, 'localToken').setDepth(10);
    const label = this.add.text(x, y - 22, this.character.name, { fontSize: '10px', fill: '#93c5fd' }).setOrigin(0.5).setDepth(11);
    this.players[this.socket.id] = { sprite, label };
    this.cameras.main.startFollow(sprite, true, 0.08, 0.08);
  }

  spawnOther(p) {
    const sprite = this.add.sprite(p.x, p.y, 'partyToken').setDepth(10);
    const label = this.add.text(p.x, p.y - 22, p.character?.name || '?', { fontSize: '10px', fill: '#6ee7b7' }).setOrigin(0.5).setDepth(11);
    this.players[p.id] = { sprite, label };
  }

  doMove(x, y) {
    const myEntry = this.players[this.socket.id];
    if (!myEntry) return;
    this.tweens.add({ targets: [myEntry.sprite, myEntry.label], x, y, duration: 500 });
    this.socket.emit('player_move', { x, y });
  }
}
