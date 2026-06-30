const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 20 },
  portrait: { type: String, default: '' },
  class: { type: String, required: true, enum: ['Fighter', 'Cleric', 'Paladin', 'Ranger', 'Wizard'] },
  level: { type: Number, default: 1, min: 1, max: 2 }, // Max level 2 for now
  exp: { type: Number, default: 0 },

  // DnD Ability Scores (8–18 range typical)
  stats: {
    str: { type: Number, default: 10 },
    dex: { type: Number, default: 10 },
    con: { type: Number, default: 10 },
    int: { type: Number, default: 10 },
    wis: { type: Number, default: 10 },
    cha: { type: Number, default: 10 }
  },

  hp: {
    current: { type: Number, default: 10 },
    max:     { type: Number, default: 10 }
  },
  ac: { type: Number, default: 10 },
  gold: { type: Number, default: 50 },

  // Class-specific: Fighter
  fightingStyle: {
    type: String,
    enum: ['archery', 'defense', 'dueling', 'great_weapon_fighting', 'protection', 'two_weapon_fighting', ''],
    default: ''
  },
  classFeatures: {
    // Second Wind: 2 uses, recover 1 on short rest (1 turn), 2 on long rest (2 turns)
    secondWind: {
      uses:    { type: Number, default: 0 },
      maxUses: { type: Number, default: 2 }
    },
    // Action Surge: 1 use per long rest (unlocked at level 2)
    actionSurge: {
      available: { type: Boolean, default: false }
    },
    // Tactical Mind: unlocked at level 2 (uses secondWind charges for ability check bonus)
    tacticalMind: { type: Boolean, default: false }
  },

  equipment: {
    weapon:     { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    armor:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    accessory1: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    accessory2: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    accessory3: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }
  },
  inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],

  location: {
    map: { type: String, default: 'town' },
    x:   { type: Number, default: 0 },
    y:   { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Character', CharacterSchema);
