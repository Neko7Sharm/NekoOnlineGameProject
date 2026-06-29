import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.players = {}; // Store player sprites
  }

  init(data) {
    this.character = data.character;
    this.socket = data.socket;
  }

  preload() {
    // We'll use simple colored shapes for tokens for now, no need to load external images if we just draw them.
    const graphics = this.add.graphics();
    
    // Local player token (Blue)
    graphics.fillStyle(0x3b82f6, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeCircle(16, 16, 16);
    graphics.generateTexture('localPlayerToken', 32, 32);

    graphics.clear();
    // Other player token (Red)
    graphics.fillStyle(0xef4444, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(2, 0xffffff);
    graphics.strokeCircle(16, 16, 16);
    graphics.generateTexture('otherPlayerToken', 32, 32);
    graphics.destroy();
  }

  create() {
    // Basic Town Background (Grid-like)
    this.add.grid(0, 0, 1600, 1200, 32, 32, 0x1e293b, 1, 0x334155, 1).setOrigin(0);

    this.add.text(20, 20, 'Town Area', { fontSize: '24px', fill: '#fff' });

    // Join the game world
    this.socket.emit('join_game', this.character);

    // Add existing players
    this.socket.on('current_players', (players) => {
      Object.keys(players).forEach((id) => {
        if (players[id].id === this.socket.id) {
          this.addLocalPlayer(players[id]);
        } else {
          this.addOtherPlayer(players[id]);
        }
      });
    });

    // Add new players joining
    this.socket.on('new_player', (playerInfo) => {
      this.addOtherPlayer(playerInfo);
    });

    // Remove disconnected players
    this.socket.on('player_disconnected', (playerId) => {
      if (this.players[playerId]) {
        this.players[playerId].sprite.destroy();
        this.players[playerId].nameText.destroy();
        delete this.players[playerId];
      }
    });

    // Handle other player movement
    this.socket.on('player_moved', (playerInfo) => {
      if (this.players[playerInfo.id]) {
        this.tweens.add({
          targets: [this.players[playerInfo.id].sprite, this.players[playerInfo.id].nameText],
          x: playerInfo.x,
          y: playerInfo.y,
          duration: 1000,
          ease: 'Power2'
        });
      }
    });

    // Movement logic (Point-and-click)
    this.input.on('pointerdown', (pointer) => {
      if (!this.localPlayer) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      if (window.confirm(`Walk to x:${Math.floor(worldX)}, y:${Math.floor(worldY)}?`)) {
        // Move local player (simple tween)
        this.tweens.add({
          targets: [this.localPlayer, this.localPlayerNameText],
          x: worldX,
          y: worldY,
          duration: 1000,
          ease: 'Power2'
        });

        // Tell the server we moved
        this.socket.emit('player_move', { x: worldX, y: worldY });
      }
    });
  }

  addLocalPlayer(playerInfo) {
    this.localPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'localPlayerToken');
    this.localPlayerNameText = this.add.text(playerInfo.x, playerInfo.y - 25, playerInfo.character.name, { fontSize: '12px', fill: '#fff' }).setOrigin(0.5);
    
    // Setup camera
    this.cameras.main.startFollow(this.localPlayer, true, 0.05, 0.05);
    this.cameras.main.setBounds(0, 0, 1600, 1200);
  }

  addOtherPlayer(playerInfo) {
    const sprite = this.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayerToken');
    const nameText = this.add.text(playerInfo.x, playerInfo.y - 25, playerInfo.character.name, { fontSize: '12px', fill: '#ef4444' }).setOrigin(0.5);
    this.players[playerInfo.id] = { sprite, nameText };
  }

  update() {
    // Game loop logic
  }
}
