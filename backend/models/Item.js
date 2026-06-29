const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['weapon', 'armor', 'accessory', 'consumable'], required: true },
  subtype: { type: String },       // e.g. 'sword', 'bow', 'potion'
  description: { type: String, default: '' },
  damage: { type: String },        // e.g. '1d6', '1d8+2'
  damageType: { type: String },    // e.g. 'slashing', 'piercing', 'bludgeoning', 'fire'
  range: { type: Number, default: 5 }, // in feet
  isRanged: { type: Boolean, default: false },
  acBonus: { type: Number, default: 0 },
  hpRestore: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  isStackable: { type: Boolean, default: false },
  quantity: { type: Number, default: 1 },
  ownedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' }
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
