const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const User = require('../models/User');
const { authMiddleware } = require('./auth');

// Get all characters for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const characters = await Character.find({ user: req.user.id });
    res.json(characters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new character (Max 5 per user)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, characterClass, portrait } = req.body;
    
    if (!name || !characterClass) {
      return res.status(400).json({ error: 'Name and class are required' });
    }

    // Check if user has 5 characters already
    const characterCount = await Character.countDocuments({ user: req.user.id });
    if (characterCount >= 5) {
      return res.status(400).json({ error: 'Maximum character limit (5) reached' });
    }
    
    // Initialize stats based on class (basic logic for now)
    const baseStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    let hp = 10;
    
    if (characterClass === 'Fighter') { baseStats.str = 15; baseStats.con = 14; hp = 12; }
    if (characterClass === 'Wizard') { baseStats.int = 15; baseStats.wis = 13; hp = 6; }
    if (characterClass === 'Rogue') { baseStats.dex = 15; baseStats.cha = 13; hp = 8; }
    if (characterClass === 'Cleric') { baseStats.wis = 15; baseStats.con = 14; hp = 8; }
    if (characterClass === 'Paladin') { baseStats.str = 15; baseStats.cha = 14; hp = 10; }
    if (characterClass === 'Ranger') { baseStats.dex = 15; baseStats.wis = 14; hp = 10; }

    const newCharacter = new Character({
      user: req.user.id,
      name,
      class: characterClass,
      portrait: portrait || 'default.png',
      stats: baseStats,
      hp: { current: hp, max: hp },
      ac: 10 + Math.floor((baseStats.dex - 10) / 2) // Basic AC formula
    });
    
    const savedCharacter = await newCharacter.save();
    
    // Add character to User's list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { characters: savedCharacter._id }
    });
    
    res.status(201).json(savedCharacter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
