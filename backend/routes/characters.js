const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
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

// Helper to format character with joined items
const formatCharacterWithItems = (char) => {
  const items = char.items || [];
  
  // Create mapping of item IDs
  const inventoryIds = Array.isArray(char.inventory) ? char.inventory : [];
  char.inventory = items.filter(i => inventoryIds.includes(i.id));
  
  if (char.equipment) {
    if (char.equipment.weapon) char.equipment.weapon = items.find(i => i.id === char.equipment.weapon) || null;
    if (char.equipment.armor) char.equipment.armor = items.find(i => i.id === char.equipment.armor) || null;
    if (char.equipment.accessory1) char.equipment.accessory1 = items.find(i => i.id === char.equipment.accessory1) || null;
    if (char.equipment.accessory2) char.equipment.accessory2 = items.find(i => i.id === char.equipment.accessory2) || null;
    if (char.equipment.accessory3) char.equipment.accessory3 = items.find(i => i.id === char.equipment.accessory3) || null;
  }
  
  delete char.items; // remove raw relationship array
  return char;
};

// ── GET all characters for logged-in user ────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*, items(*)')
      .eq('user_id', req.user.id);
      
    if (error) throw error;
    
    const formatted = characters.map(formatCharacterWithItems);
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST create character ────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, characterClass, portrait, stats, fightingStyle } = req.body;

    if (!name || !characterClass) return res.status(400).json({ error: 'Name and class are required' });

    // Max 5 characters per account
    const { count, error: countError } = await supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
      
    if (countError) throw countError;
    if (count >= 5) return res.status(400).json({ error: 'Maximum character limit (5) reached' });

    // Validate and build final stats
    let finalStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    if (stats && typeof stats === 'object') {
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
        actionSurge: { available: false },
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

    let ac = calcBaseAC(finalStats);
    if (characterClass === 'Fighter' && fightingStyle === 'defense') ac += 1;

    // Insert character
    const { data: saved, error: charError } = await supabase
      .from('characters')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        class: characterClass,
        portrait: portrait || '',
        stats: finalStats,
        hp: { current: hp, max: hp },
        ac,
        fighting_style: fightingStyle || '',
        class_features: classFeatures,
        gold: 50,
        equipment: { weapon: null, armor: null, accessory1: null, accessory2: null, accessory3: null },
        inventory: [],
        location: { map: 'town', x: 0, y: 0 }
      })
      .select()
      .single();
      
    if (charError) throw charError;

    // ── Create Starter Items ──
    let starterItems = [];

    if (characterClass === 'Fighter') {
      if (fightingStyle === 'archery') {
        starterItems.push({ name: 'Longbow', type: 'weapon', subtype: 'bow', damage: '1d8', damage_type: 'piercing', range: 150, is_ranged: true, ac_bonus: 0 });
        starterItems.push({ name: 'Leather Armor', type: 'armor', subtype: null, damage: null, damage_type: null, is_ranged: false, ac_bonus: 1 });
      } else if (fightingStyle === 'great_weapon_fighting') {
        starterItems.push({ name: 'Greatsword', type: 'weapon', subtype: 'sword', damage: '2d6', damage_type: 'slashing', is_ranged: false, ac_bonus: 0 });
        starterItems.push({ name: 'Chain Mail', type: 'armor', subtype: null, damage: null, damage_type: null, is_ranged: false, ac_bonus: 6 });
      } else if (fightingStyle === 'two_weapon_fighting') {
        starterItems.push({ name: 'Shortsword', type: 'weapon', subtype: 'sword', damage: '1d6', damage_type: 'piercing', is_ranged: false, ac_bonus: 0 });
        starterItems.push({ name: 'Shortsword (Off-hand)', type: 'weapon', subtype: 'sword', damage: '1d6', damage_type: 'piercing', is_ranged: false, ac_bonus: 0 });
        starterItems.push({ name: 'Leather Armor', type: 'armor', subtype: null, damage: null, damage_type: null, is_ranged: false, ac_bonus: 1 });
      } else {
        starterItems.push({ name: 'Longsword', type: 'weapon', subtype: 'sword', damage: '1d8', damage_type: 'slashing', is_ranged: false, ac_bonus: 0 });
        starterItems.push({ name: 'Chain Mail', type: 'armor', subtype: null, damage: null, damage_type: null, is_ranged: false, ac_bonus: 6 });
        if (fightingStyle === 'protection' || fightingStyle === 'defense') {
          starterItems.push({ name: 'Wooden Shield', type: 'accessory', subtype: null, damage: null, damage_type: null, is_ranged: false, ac_bonus: 2 });
        }
      }
      starterItems.push({ name: 'Health Potion', type: 'consumable', subtype: 'potion', hp_restore: 10, is_stackable: true, quantity: 2, damage: null, damage_type: null, is_ranged: false, ac_bonus: 0 });
    }

    let finalChar = saved;

    if (starterItems.length > 0) {
      const itemsToInsert = starterItems.map(item => ({ ...item, owned_by: saved.id }));
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from('items')
        .insert(itemsToInsert)
        .select();
        
      if (itemsError) throw itemsError;
      
      let extraAc = 0;
      let newEquipment = { ...saved.equipment };
      let newInventory = [...saved.inventory];
      
      for (const item of insertedItems) {
        if (item.type === 'weapon' && !newEquipment.weapon) {
          newEquipment.weapon = item.id;
        } else if (item.type === 'armor' && !newEquipment.armor) {
          newEquipment.armor = item.id;
          extraAc += item.ac_bonus || 0;
        } else if (item.type === 'accessory' && !newEquipment.accessory1) {
          newEquipment.accessory1 = item.id;
          extraAc += item.ac_bonus || 0;
        } else {
          newInventory.push(item.id);
        }
      }
      
      let updatedAc = saved.ac + extraAc;
      
      const { data: updatedChar, error: updateError } = await supabase
        .from('characters')
        .update({ equipment: newEquipment, inventory: newInventory, ac: updatedAc })
        .eq('id', saved.id)
        .select('*, items(*)')
        .single();
        
      if (updateError) throw updateError;
      finalChar = updatedChar;
    } else {
      const { data: updatedChar, error: fetchError } = await supabase
        .from('characters')
        .select('*, items(*)')
        .eq('id', saved.id)
        .single();
        
      if (fetchError) throw fetchError;
      finalChar = updatedChar;
    }

    res.status(201).json(formatCharacterWithItems(finalChar));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET single character ─────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: char, error } = await supabase
      .from('characters')
      .select('*, items(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
      
    if (error) throw error;
    if (!char) return res.status(404).json({ error: 'Not found' });
    
    res.json(formatCharacterWithItems(char));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE single character ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: char, error: fetchError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();
      
    if (fetchError) throw fetchError;
    if (!char) return res.status(404).json({ error: 'Not found' });
    
    // Deleting character will cascade delete items due to ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('characters')
      .delete()
      .eq('id', char.id);
      
    if (deleteError) throw deleteError;
    
    res.json({ message: 'Character deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
