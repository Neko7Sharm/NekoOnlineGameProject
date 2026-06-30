const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const User = require('../models/User');
const { authMiddleware } = require('./auth');

// ── Helpers ──────────────────────────────────────────────────────────
const statMod = (val) => Math.floor((val - 10) / 2);

// Calculate HP for Fighter at level 1
const calcFighterHP = (stats) => {
  const conMod = statMod(stats.con);
  return 10 + conMod; // d10 hit die
};

// Calculate AC (no armor = 10 + DEX mod)
const calcBaseAC = (stats) => 10 + Math.max(0, statMod(stats.dex));

// ── GET all characters for logged-in user ────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const characters = await Character.find({ user: req.user.id });
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST create character ────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, characterClass, portrait, stats, fightingStyle } = req.body;

    if (!name || !characterClass) return res.status(400).json({ error: 'Name and class are required' });

    // Max 5 characters per account
    const count = await Character.countDocuments({ user: req.user.id });
    if (count >= 5) return res.status(400).json({ error: 'Maximum character limit (5) reached' });

    // Validate and build final stats
    let finalStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    if (stats && typeof stats === 'object') {
      // Validate: total points spent must not exceed 7 (above base 10 each)
      const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      let pointsSpent = 0;
      for (const k of keys) {
        const v = parseInt(stats[k]) || 10;
        const clamped = Math.min(17, Math.max(8, v)); // 8-17 range
        finalStats[k] = clamped;
        pointsSpent += Math.max(0, clamped - 10);
      }
      if (pointsSpent > 7) return res.status(400).json({ error: 'Too many stat points spent (max 7)' });
    }

    // Class-specific initialization
    let hp = 10, classFeatures = {};

    if (characterClass === 'Fighter') {
      hp = calcFighterHP(finalStats);
      classFeatures = {
        secondWind: { uses: 2, maxUses: 2 },
        actionSurge: { available: false },  // Unlocked at level 2
        tacticalMind: false
      };
    } else if (characterClass === 'Wizard') {
      finalStats.int = Math.max(finalStats.int, 13);
      hp = 6 + statMod(finalStats.con);
    } else if (characterClass === 'Cleric') {
      finalStats.wis = Math.max(finalStats.wis, 13);
      hp = 8 + statMod(finalStats.con);
    } else if (characterClass === 'Paladin') {
      finalStats.str = Math.max(finalStats.str, 13);
      hp = 10 + statMod(finalStats.con);
    } else if (characterClass === 'Ranger') {
      finalStats.dex = Math.max(finalStats.dex, 13);
      hp = 10 + statMod(finalStats.con);
    }

    hp = Math.max(1, hp);

    // AC: base 10 + DEX mod, defense style adds +1
    let ac = calcBaseAC(finalStats);
    if (characterClass === 'Fighter' && fightingStyle === 'defense') ac += 1;

    const newCharacter = new Character({
      user: req.user.id,
      name: name.trim(),
      class: characterClass,
      portrait: portrait || '',
      stats: finalStats,
      hp: { current: hp, max: hp },
      ac,
      fightingStyle: fightingStyle || '',
      classFeatures,
      gold: 50
    });

    let saved = await newCharacter.save();

    // ── Create Starter Items ──
    const Item = require('../models/Item');
    let starterItems = [];

    if (characterClass === 'Fighter') {
      if (fightingStyle === 'archery') {
        starterItems.push({ name: 'Longbow', type: 'weapon', subtype: 'bow', damage: '1d8', damageType: 'piercing', range: 150, isRanged: true });
        starterItems.push({ name: 'Leather Armor', type: 'armor', acBonus: 1 });
      } else if (fightingStyle === 'great_weapon_fighting') {
        starterItems.push({ name: 'Greatsword', type: 'weapon', subtype: 'sword', damage: '2d6', damageType: 'slashing' });
        starterItems.push({ name: 'Chain Mail', type: 'armor', acBonus: 6 });
      } else if (fightingStyle === 'two_weapon_fighting') {
        starterItems.push({ name: 'Shortsword', type: 'weapon', subtype: 'sword', damage: '1d6', damageType: 'piercing' });
        starterItems.push({ name: 'Shortsword (Off-hand)', type: 'weapon', subtype: 'sword', damage: '1d6', damageType: 'piercing' });
        starterItems.push({ name: 'Leather Armor', type: 'armor', acBonus: 1 });
      } else {
        // Defense, Dueling, Protection, or none
        starterItems.push({ name: 'Longsword', type: 'weapon', subtype: 'sword', damage: '1d8', damageType: 'slashing' });
        starterItems.push({ name: 'Chain Mail', type: 'armor', acBonus: 6 });
        if (fightingStyle === 'protection' || fightingStyle === 'defense') {
          starterItems.push({ name: 'Wooden Shield', type: 'accessory', acBonus: 2 });
        }
      }
      starterItems.push({ name: 'Health Potion', type: 'consumable', subtype: 'potion', hpRestore: 10, isStackable: true, quantity: 2 });
    }

    if (starterItems.length > 0) {
      const itemsToInsert = starterItems.map(item => ({ ...item, ownedBy: saved._id }));
      const insertedItems = await Item.insertMany(itemsToInsert);
      
      let extraAc = 0;
      for (const item of insertedItems) {
        if (item.type === 'weapon' && !saved.equipment.weapon) {
          saved.equipment.weapon = item._id;
        } else if (item.type === 'armor' && !saved.equipment.armor) {
          saved.equipment.armor = item._id;
          extraAc += item.acBonus || 0;
        } else if (item.type === 'accessory' && !saved.equipment.accessory1) {
          saved.equipment.accessory1 = item._id;
          extraAc += item.acBonus || 0;
        } else {
          saved.inventory.push(item._id);
        }
      }
      if (extraAc > 0) saved.ac += extraAc;
      saved = await saved.save();
    }

    await User.findByIdAndUpdate(req.user.id, { $push: { characters: saved._id } });
    
    // Populate before returning so frontend sees items
    const populated = await Character.findById(saved._id).populate('equipment.weapon').populate('equipment.armor').populate('equipment.accessory1').populate('inventory');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET single character ─────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const char = await Character.findOne({ _id: req.params.id, user: req.user.id });
    if (!char) return res.status(404).json({ error: 'Not found' });
    res.json(char);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
