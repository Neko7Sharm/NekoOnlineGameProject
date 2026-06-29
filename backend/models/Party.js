const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Character' }],
  maxMembers: { type: Number, default: 4 },
  activeQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }], // Max 2
  currentMap: { type: String, default: 'town' }
}, { timestamps: true });

module.exports = mongoose.model('Party', PartySchema);
