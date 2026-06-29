import Phaser from 'phaser';

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
  }

  init(data) {
    this.character = data.character;
    this.socket = data.socket;
    this.onChangeScene = data.onChangeScene;
  }

  create() {
    const W = 800, H = 600;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0f172a);

    // Title
    this.add.text(W / 2, 40, '🗺 World Map', { fontSize: '28px', fill: '#f8fafc', fontStyle: 'bold' }).setOrigin(0.5);

    // ─── Town Node ───────────────────────────────────────────────────
    const townX = 220, townY = 300;
    const townBg = this.add.rectangle(townX, townY, 140, 100, 0x1e40af, 0.9)
      .setInteractive().setStrokeStyle(2, 0x3b82f6);
    this.add.text(townX, townY - 14, '🏘', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(townX, townY + 20, 'Neko Town', { fontSize: '14px', fill: '#bfdbfe', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(townX, townY + 38, 'Lvl 1-5', { fontSize: '11px', fill: '#93c5fd' }).setOrigin(0.5);

    this.tweens.add({ targets: townBg, alpha: 0.7, yoyo: true, repeat: -1, duration: 1200 });
    townBg.on('pointerover', () => { townBg.setFillStyle(0x2563eb); this.input.setDefaultCursor('pointer'); });
    townBg.on('pointerout', () => { townBg.setFillStyle(0x1e40af); this.input.setDefaultCursor('default'); });
    townBg.on('pointerdown', () => {
      if (this.onChangeScene) this.onChangeScene('town');
    });

    // ─── Dungeon Node ────────────────────────────────────────────────
    const dungX = 560, dungY = 300;
    const dungBg = this.add.rectangle(dungX, dungY, 140, 100, 0x7f1d1d, 0.9)
      .setInteractive().setStrokeStyle(2, 0xef4444);
    this.add.text(dungX, dungY - 14, '💀', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(dungX, dungY + 20, 'Shadow Dungeon', { fontSize: '12px', fill: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(dungX, dungY + 38, 'Lvl 1-3', { fontSize: '11px', fill: '#f87171' }).setOrigin(0.5);

    this.tweens.add({ targets: dungBg, alpha: 0.7, yoyo: true, repeat: -1, duration: 900 });
    dungBg.on('pointerover', () => { dungBg.setFillStyle(0x991b1b); this.input.setDefaultCursor('pointer'); });
    dungBg.on('pointerout', () => { dungBg.setFillStyle(0x7f1d1d); this.input.setDefaultCursor('default'); });
    dungBg.on('pointerdown', () => {
      if (this.onChangeScene) this.onChangeScene('dungeon');
    });

    // ─── Path line between ───────────────────────────────────────────
    const line = this.add.graphics();
    line.lineStyle(3, 0x475569, 0.5);
    line.lineBetween(townX + 70, townY, dungX - 70, dungY);
    // Dashed effect dots
    for (let x = townX + 80; x < dungX - 80; x += 20) {
      this.add.circle(x, dungY, 3, 0x475569);
    }

    // Character info
    this.add.text(W / 2, H - 40, `${this.character.name} • ${this.character.class} Lv.${this.character.level}`, {
      fontSize: '13px', fill: '#64748b'
    }).setOrigin(0.5);
  }
}
