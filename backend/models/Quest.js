const mongoose = require('mongoose');

const QuestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['kill', 'collect', 'explore'], default: 'kill' },
  target: { type: String },           // e.g. 'WoodenDummy'
  targetCount: { type: Number, default: 1 },
  rewardGold: { type: Number, default: 50 },
  rewardExp: { type: Number, default: 100 },
  rewardItem: { type: String },       // Optional item name drop
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' }, // Which party took this quest
  isAvailable: { type: Boolean, default: true },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Quest', QuestSchema);
