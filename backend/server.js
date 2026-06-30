const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // We'll restrict this in production
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neko_online_game';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const { router: authRoutes } = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const questRoutes = require('./routes/quests');
const partyRoutes = require('./routes/parties');
const { router: shopRoutes } = require('./routes/shop');

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/shop', shopRoutes);

app.get('/', (req, res) => {
  res.send('Neko Online Game API is running.');
});

// Auto-refill quest board every 5 minutes
setInterval(async () => {
  const Quest = require('./models/Quest');
  const questTemplates = [
    { title: 'Pest Control', description: 'Clear out the wooden dummies lurking in the dungeon.', type: 'kill', target: 'WoodenDummy', targetCount: 3, rewardGold: 60, rewardExp: 120 },
    { title: 'Deep Dive', description: 'Explore the dungeon and slay 5 dummies.', type: 'kill', target: 'WoodenDummy', targetCount: 5, rewardGold: 100, rewardExp: 200 },
    { title: 'Lumberjack\'s Nightmare', description: 'The dummies are awakening! Kill 2 of them.', type: 'kill', target: 'WoodenDummy', targetCount: 2, rewardGold: 40, rewardExp: 80 },
    { title: 'The Big Hunt', description: 'A bounty for slaying 8 wooden dummies.', type: 'kill', target: 'WoodenDummy', targetCount: 8, rewardGold: 150, rewardExp: 300 },
  ];
  const count = await Quest.countDocuments({ isAvailable: true });
  if (count < 10) {
    const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];
    await Quest.create({ ...template, isAvailable: true });
    io.emit('quest_board_updated');
    console.log('[QUEST] Added 1 new quest to board');
  }
}, 5 * 60 * 1000);

// Game State (In-memory)
const gameState = {
  players: {},    // socket.id -> { id, character, x, y, map, partyId }
  dungeons: {},   // dungeonId -> { monsters: [], combatState: null, turnOrder: [], currentTurnIdx: 0 }
  chats: []       // last 50 world chat messages
};

// DnD Dice Utility
const rollDice = (sides) => Math.floor(Math.random() * sides) + 1;
const rollDamage = (formula) => {
  // Parse '1d6+2', '2d8', '1d4' etc.
  const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return 0;
  const [, count, sides, mod] = match;
  let total = 0;
  for (let i = 0; i < parseInt(count); i++) total += rollDice(parseInt(sides));
  if (mod) total += parseInt(mod);
  return Math.max(1, total);
};

// Monster Templates
const MONSTERS = {
  WoodenDummy: {
    name: 'Wooden Dummy',
    hp: 10, maxHp: 10, ac: 5,
    damage: '1d4', damageType: 'bludgeoning', hitMod: 0,
    exp: 25, range: 48,
    sightRange: 4 // 4 cells
  }
};

// Spawn monsters for a dungeon instance
const spawnDungeonMonsters = (dungeonId) => {
  const count = 1; // 1 dummy for now
  const monsters = [];
  for (let i = 0; i < count; i++) {
    monsters.push({
      id: `monster_${dungeonId}_${i}`,
      ...JSON.parse(JSON.stringify(MONSTERS.WoodenDummy)),
      x: 12, // col 12
      y: 6,  // row 6
      isDead: false
    });
  }
  return monsters;
};

// Socket.io integration
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // ── JOIN / LEAVE ──
  socket.on('join_game', (character) => {
    gameState.players[socket.id] = {
      id: socket.id, character,
      x: 10, y: 12,
      map: 'town', partyId: null,
      hp: character.hp?.current || 10,
      maxHp: character.hp?.max || 10,
      ac: character.ac || 10,
      stats: character.stats || {},
      spellSlots: { used: 0, max: character.class === 'Wizard' || character.class === 'Cleric' ? 3 : 0 },
      isResting: false, restTurns: 0
    };
    socket.emit('current_players', gameState.players);
    socket.emit('chat_history', gameState.chats);
    socket.broadcast.emit('new_player', gameState.players[socket.id]);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('player_disconnected', socket.id);
  });

  // ── MOVEMENT ──
  socket.on('player_move', (data) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    player.x = data.x;
    player.y = data.y;
    socket.broadcast.emit('player_moved', { id: socket.id, x: data.x, y: data.y });

    // Check monster sight in dungeon
    const dungeonId = player.map;
    if (dungeonId.startsWith('dungeon') && gameState.dungeons[dungeonId]) {
      const dungeon = gameState.dungeons[dungeonId];
      if (!dungeon.combatState) {
        dungeon.monsters.forEach(monster => {
          if (monster.isDead) return;
          const dx = monster.x - player.x;
          const dy = monster.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= monster.sightRange) {
            // Trigger combat!
            startCombat(dungeonId, io);
          }
        });
      }
    }
  });

  // ── MAP CHANGE ──
  socket.on('change_map', (data) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    socket.leave(player.map);
    player.map = data.map;
    player.x = data.x ?? 10;
    player.y = data.y ?? 7;
    socket.join(data.map);
    socket.emit('map_changed', { map: data.map, x: player.x, y: player.y });
    
    const playersInMap = Object.fromEntries(
      Object.entries(gameState.players).filter(([_, p]) => p.map === data.map)
    );
    socket.emit('current_players', playersInMap);
    
    socket.broadcast.to(data.map).emit('new_player', player);

    // Init dungeon if first player
    if (data.map.startsWith('dungeon') && !gameState.dungeons[data.map]) {
      gameState.dungeons[data.map] = {
        monsters: spawnDungeonMonsters(data.map),
        combatState: null, turnOrder: [], currentTurnIdx: 0
      };
    }
    if (data.map.startsWith('dungeon')) {
      socket.emit('dungeon_state', gameState.dungeons[data.map]);
    }
  });

  // ── COMBAT ACTIONS ──
  socket.on('combat_attack', (data) => {
    // data: { targetId, weaponDamage, weaponRange, isRanged }
    const attacker = gameState.players[socket.id];
    if (!attacker || !attacker.map.startsWith('dungeon')) return;
    const dungeon = gameState.dungeons[attacker.map];
    if (!dungeon || !dungeon.combatState) return;

    // Check it's this player's turn
    const currentTurn = dungeon.turnOrder[dungeon.currentTurnIdx];
    if (currentTurn?.id !== socket.id) {
      socket.emit('combat_error', 'Not your turn!');
      return;
    }

    const target = dungeon.monsters.find(m => m.id === data.targetId && !m.isDead);
    if (!target) { socket.emit('combat_error', 'Invalid target'); return; }

    // Str or Dex mod for attack
    const strMod = Math.floor(((attacker.stats.str || 10) - 10) / 2);
    const dexMod = Math.floor(((attacker.stats.dex || 10) - 10) / 2);
    const attackMod = data.isRanged ? dexMod : strMod;

    const d20 = rollDice(20);
    const attackRoll = d20 + attackMod;
    const hit = attackRoll >= target.ac;
    let damage = 0;
    if (hit) damage = rollDamage(data.weaponDamage || '1d4');

    target.hp = Math.max(0, target.hp - damage);
    if (target.hp === 0) target.isDead = true;

    const result = {
      attackerId: socket.id,
      targetId: data.targetId,
      d20, attackRoll, attackMod,
      hit, damage,
      targetHp: target.hp,
      targetDead: target.isDead,
      log: hit
        ? `${attacker.character.name} hits ${target.name} for ${damage} damage! (rolled ${attackRoll} vs AC ${target.ac})`
        : `${attacker.character.name} misses ${target.name}! (rolled ${attackRoll} vs AC ${target.ac})`
    };

    io.to(attacker.map).emit('combat_result', result);

    // Award EXP if monster died
    if (target.isDead) {
      const expGain = target.exp;
      io.to(attacker.map).emit('monster_died', { monsterId: target.id, exp: expGain });
      // Random loot drop
      const lootTable = ['Healing Potion', null, null, null]; // 25% chance
      const loot = lootTable[Math.floor(Math.random() * lootTable.length)];
      if (loot) {
        // Send to all in dungeon
        io.to(attacker.map).emit('item_dropped', { monsterId: target.id, itemName: loot });
      }

      // Respawn dummy after 5 seconds
      if (target.name === 'Wooden Dummy') {
        setTimeout(() => {
          target.hp = target.maxHp;
          target.isDead = false;
          // Random coordinates somewhat away from edges
          target.x = 100 + Math.random() * 600;
          target.y = 100 + Math.random() * 400;
          // Notify players in dungeon of the respawned state
          io.to(attacker.map).emit('monster_respawned', target);
        }, 5000);
      }
    }

    // Mark action used, advance turn
    currentTurn.actionsUsed = (currentTurn.actionsUsed || 0) + 1;
    advanceTurn(dungeon, attacker.map, io);
  });

  socket.on('combat_end_turn', () => {
    const player = gameState.players[socket.id];
    if (!player || !player.map.startsWith('dungeon')) return;
    const dungeon = gameState.dungeons[player.map];
    if (!dungeon || !dungeon.combatState) return;
    const currentTurn = dungeon.turnOrder[dungeon.currentTurnIdx];
    if (currentTurn?.id !== socket.id) return;
    advanceTurn(dungeon, player.map, io);
  });

  socket.on('combat_rest', () => {
    const player = gameState.players[socket.id];
    if (!player) return;
    player.isResting = true;
    player.restTurns = (player.restTurns || 0) + 1;
    if (player.restTurns >= 2) {
      // Full rest: recover all spells
      player.spellSlots.used = 0;
      player.restTurns = 0;
      player.isResting = false;
      socket.emit('spell_slots_restored', { full: true });
    } else {
      // 1 turn rest: recover 1 slot
      if (player.spellSlots.used > 0) player.spellSlots.used--;
      socket.emit('spell_slots_restored', { full: false, slotsLeft: player.spellSlots.max - player.spellSlots.used });
    }
    // End this player's turn
    const dungeon = gameState.dungeons[player.map];
    if (dungeon) advanceTurn(dungeon, player.map, io);
  });

  // ── CHAT ──
  socket.on('chat_message', (data) => {
    // data: { text, type ('world' | 'party'), partyId? }
    const player = gameState.players[socket.id];
    if (!player) return;
    const message = {
      id: Date.now(),
      sender: player.character.name,
      text: data.text,
      type: data.type,
      timestamp: new Date().toISOString()
    };
    if (data.type === 'world') {
      gameState.chats.push(message);
      if (gameState.chats.length > 50) gameState.chats.shift();
      io.emit('chat_message', message);
    } else if (data.type === 'party' && data.partyId) {
      io.to(`party_${data.partyId}`).emit('chat_message', message);
    }
  });

  socket.on('join_party_room', (partyId) => {
    socket.join(`party_${partyId}`);
  });

  socket.on('leave_party_room', (partyId) => {
    socket.leave(`party_${partyId}`);
  });
});

// ── COMBAT HELPERS ──
function startCombat(dungeonId, io) {
  const dungeon = gameState.dungeons[dungeonId];
  if (!dungeon || dungeon.combatState) return;

  // Gather all players in dungeon
  const players = Object.values(gameState.players).filter(p => p.map === dungeonId);
  const aliveMonsters = dungeon.monsters.filter(m => !m.isDead);

  // Roll initiative (d20 + DEX mod)
  const initiatives = [];
  players.forEach(p => {
    const dexMod = Math.floor(((p.stats?.dex || 10) - 10) / 2);
    initiatives.push({ id: p.id, name: p.character.name, initiative: rollDice(20) + dexMod, isMonster: false });
  });
  aliveMonsters.forEach(m => {
    initiatives.push({ id: m.id, name: m.name, initiative: rollDice(20), isMonster: true });
  });
  initiatives.sort((a, b) => b.initiative - a.initiative);

  dungeon.combatState = 'active';
  dungeon.turnOrder = initiatives;
  dungeon.currentTurnIdx = 0;

  io.to(dungeonId).emit('combat_started', {
    turnOrder: initiatives,
    currentTurn: initiatives[0]
  });
  console.log(`[COMBAT] Started in ${dungeonId}`);

  // If first turn is a monster, execute it
  if (initiatives[0]?.isMonster) {
    setTimeout(() => executeMonsterTurn(dungeon, dungeonId, io), 1500);
  }
}

function advanceTurn(dungeon, dungeonId, io) {
  if (!dungeon.combatState) return;

  // Check if all monsters dead
  const aliveMonsters = dungeon.monsters.filter(m => !m.isDead);
  if (aliveMonsters.length === 0) {
    dungeon.combatState = null;
    dungeon.turnOrder = [];
    dungeon.currentTurnIdx = 0;
    io.to(dungeonId).emit('combat_ended', { reason: 'All monsters defeated!' });
    return;
  }

  // Advance turn index
  let next = (dungeon.currentTurnIdx + 1) % dungeon.turnOrder.length;
  // Skip dead monsters
  while (dungeon.turnOrder[next]?.isMonster && dungeon.monsters.find(m => m.id === dungeon.turnOrder[next].id)?.isDead) {
    next = (next + 1) % dungeon.turnOrder.length;
  }
  dungeon.currentTurnIdx = next;
  const currentTurn = dungeon.turnOrder[next];
  io.to(dungeonId).emit('turn_changed', { currentTurn });

  if (currentTurn.isMonster) {
    setTimeout(() => executeMonsterTurn(dungeon, dungeonId, io), 1500);
  }
}

function executeMonsterTurn(dungeon, dungeonId, io) {
  if (!dungeon.combatState) return;
  const currentTurn = dungeon.turnOrder[dungeon.currentTurnIdx];
  if (!currentTurn?.isMonster) return;

  const monster = dungeon.monsters.find(m => m.id === currentTurn.id && !m.isDead);
  if (!monster) { advanceTurn(dungeon, dungeonId, io); return; }

  // Pick a random player to attack
  const players = Object.values(gameState.players).filter(p => p.map === dungeonId && p.hp > 0);
  if (players.length === 0) { advanceTurn(dungeon, dungeonId, io); return; }
  const target = players[Math.floor(Math.random() * players.length)];

  // hitroll 1d20 + hitMod
  const hitMod = monster.hitMod || 0;
  const d20 = rollDice(20);
  const hit = (d20 + hitMod) >= (target.ac || 10);
  let damage = 0;
  if (hit) damage = rollDamage(monster.damage);

  target.hp = Math.max(0, target.hp - damage);

  const result = {
    attackerId: monster.id,
    attackerName: monster.name,
    targetId: target.id,
    targetName: target.character.name,
    d20, hit, damage, targetHp: target.hp,
    log: hit
      ? `${monster.name} hits ${target.character.name} for ${damage} damage!`
      : `${monster.name} misses ${target.character.name}!`
  };

  io.to(dungeonId).emit('combat_result', result);
  advanceTurn(dungeon, dungeonId, io);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
