const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  portrait: {
    type: String,
    default: 'default.png' // Can be a URL to an image later
  },
  class: {
    type: String,
    required: true,
    enum: ['Fighter', 'Cleric', 'Paladin', 'Ranger', 'Wizard']
  },
  level: {
    type: Number,
    default: 1
  },
  exp: {
    type: Number,
    default: 0
  },
  // DnD Base Stats
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
    max: { type: Number, default: 10 }
  },
  ac: {
    type: Number,
    default: 10
  },
  // Equipment Slots
  equipment: {
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    armor: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    accessory1: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    accessory2: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    accessory3: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }
  },
  // Inventory (Items)
  inventory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  location: {
    map: { type: String, default: 'town' }, // e.g., 'town', 'dungeon1'
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Character', CharacterSchema);
