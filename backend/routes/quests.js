const express = require('express');
const router = express.Router();
const Quest = require('../models/Quest');
const Party = require('../models/Party');
const { authMiddleware } = require('./auth');

// Random quest templates
const questTemplates = [
  { title: 'Pest Control', description: 'Clear out the wooden dummies lurking in the dungeon.', type: 'kill', target: 'WoodenDummy', targetCount: 3, rewardGold: 60, rewardExp: 120 },
  { title: 'Deep Dive', description: 'Explore the dungeon and slay 5 dummies.', type: 'kill', target: 'WoodenDummy', targetCount: 5, rewardGold: 100, rewardExp: 200 },
  { title: 'Lumberjack\'s Nightmare', description: 'The dummies are awakening! Kill 2 of them.', type: 'kill', target: 'WoodenDummy', targetCount: 2, rewardGold: 40, rewardExp: 80 },
  { title: 'The Big Hunt', description: 'A bounty for slaying 8 wooden dummies.', type: 'kill', target: 'WoodenDummy', targetCount: 8, rewardGold: 150, rewardExp: 300 },
];

// Get all available quests on the board
router.get('/', authMiddleware, async (req, res) => {
  try {
    const quests = await Quest.find({ isAvailable: true }).limit(10);
    res.json(quests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept a quest (requires partyId)
router.post('/:questId/accept', authMiddleware, async (req, res) => {
  try {
    const { partyId } = req.body;
    if (!partyId) return res.status(400).json({ error: 'Party ID required' });

    const party = await Party.findById(partyId);
    if (!party) return res.status(404).json({ error: 'Party not found' });
    if (party.activeQuests.length >= 2) return res.status(400).json({ error: 'Party already has 2 active quests' });

    const quest = await Quest.findById(req.params.questId);
    if (!quest || !quest.isAvailable) return res.status(404).json({ error: 'Quest not available' });

    quest.isAvailable = false;
    quest.acceptedBy = partyId;
    await quest.save();

    party.activeQuests.push(quest._id);
    await party.save();

    res.json({ message: 'Quest accepted!', quest });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed some initial quests (admin use)
router.post('/seed', async (req, res) => {
  try {
    const count = await Quest.countDocuments({ isAvailable: true });
    const needed = 10 - count;
    if (needed <= 0) return res.json({ message: 'Quest board full' });

    for (let i = 0; i < needed; i++) {
      const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];
      await Quest.create({ ...template, isAvailable: true });
    }
    res.json({ message: `Added ${needed} quests` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
