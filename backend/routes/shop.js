const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

// Shop inventory (static for now, can be moved to DB later)
const shopInventory = [
  // Weapons
  { id: 'w1', name: 'Short Sword',   type: 'weapon', subtype: 'sword',  damage: '1d6',  damageType: 'slashing',  range: 5,  isRanged: false, price: 100 },
  { id: 'w2', name: 'Longbow',        type: 'weapon', subtype: 'bow',    damage: '1d8',  damageType: 'piercing',  range: 150, isRanged: true,  price: 120 },
  { id: 'w3', name: 'Battle Axe',     type: 'weapon', subtype: 'axe',    damage: '1d8',  damageType: 'slashing',  range: 5,  isRanged: false, price: 130 },
  { id: 'w4', name: 'Quarterstaff',   type: 'weapon', subtype: 'staff',  damage: '1d6',  damageType: 'bludgeoning', range: 5, isRanged: false, price: 20 },
  { id: 'w5', name: 'Dagger',         type: 'weapon', subtype: 'dagger', damage: '1d4',  damageType: 'piercing',  range: 20, isRanged: true,  price: 20 },
  // Armor
  { id: 'a1', name: 'Leather Armor',  type: 'armor',  acBonus: 11, description: 'Light armor. AC 11 + DEX mod.', price: 100 },
  { id: 'a2', name: 'Chain Mail',     type: 'armor',  acBonus: 16, description: 'Heavy armor. AC 16. Disadvantage on stealth.', price: 300 },
  { id: 'a3', name: 'Shield',         type: 'armor',  acBonus: 2,  description: '+2 AC bonus when held.', price: 50 },
  // Consumables
  { id: 'c1', name: 'Healing Potion', type: 'consumable', hpRestore: 8, isStackable: true, description: 'Restores 2d4+2 HP. (Avg 8)', price: 50 },
  { id: 'c2', name: 'Greater Healing Potion', type: 'consumable', hpRestore: 21, isStackable: true, description: 'Restores 4d4+4 HP. (Avg 21)', price: 150 },
];

// Get shop inventory
router.get('/', authMiddleware, (req, res) => {
  res.json(shopInventory);
});

module.exports = { router, shopInventory };
