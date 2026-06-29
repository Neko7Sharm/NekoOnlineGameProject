const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const Character = require('../models/Character');
const { authMiddleware } = require('./auth');

// Get all parties (for joining)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const parties = await Party.find()
      .populate('leader', 'name class level')
      .populate('members', 'name class level');
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a party
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, characterId } = req.body;
    if (!name || !characterId) return res.status(400).json({ error: 'Name and characterId required' });

    const character = await Character.findOne({ _id: characterId, user: req.user.id });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const existing = await Party.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Party name already taken' });

    const party = await Party.create({
      name,
      leader: characterId,
      members: [characterId]
    });

    res.status(201).json(party);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a party
router.post('/:partyId/join', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.body;
    const character = await Character.findOne({ _id: characterId, user: req.user.id });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const party = await Party.findById(req.params.partyId);
    if (!party) return res.status(404).json({ error: 'Party not found' });
    if (party.members.length >= party.maxMembers) return res.status(400).json({ error: 'Party is full' });
    if (party.members.includes(characterId)) return res.status(400).json({ error: 'Already in party' });

    party.members.push(characterId);
    await party.save();

    res.json(party);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a party
router.post('/:partyId/leave', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.body;
    const party = await Party.findById(req.params.partyId);
    if (!party) return res.status(404).json({ error: 'Party not found' });

    party.members = party.members.filter(id => id.toString() !== characterId);

    if (party.members.length === 0) {
      await Party.findByIdAndDelete(req.params.partyId);
      return res.json({ message: 'Party disbanded (empty)' });
    }

    // If leader left, assign next member as leader
    if (party.leader.toString() === characterId && party.members.length > 0) {
      party.leader = party.members[0];
    }

    await party.save();
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
