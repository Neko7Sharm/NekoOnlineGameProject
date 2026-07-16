import type { SkillDef } from "../types/game";

export const SKILL_DICTIONARY: Record<string, SkillDef> = {
  // Fighter Combat Techniques (Lv 2, Lv 5)
  "fighter_second_wind": { id: "fighter_second_wind", name: "Second Wind", type: "active", cost: "extra", description: "Draw on stamina to heal 1d10 + (Level x 2) HP. Usable once per long rest.", icon: "💨", healAmount: "1d10" },
  "fighter_action_surge": { id: "fighter_action_surge", name: "Action Surge", type: "active", cost: "extra", description: "Push yourself beyond normal limits for an additional Main Action this turn. Usable once per long rest.", icon: "🔥" },
  "fighter_shield_wall": { id: "fighter_shield_wall", name: "Shield Wall", type: "active", cost: "main", description: "Grants +2 AC and +2 to DEX Saving Throws until the end of combat. Usable once per long rest.", icon: "🛡️" },
  "fighter_counter_attack": { id: "fighter_counter_attack", name: "Counter Attack", type: "reaction", cost: "none", description: "When an enemy misses a melee attack against you, immediately make a melee attack against them.", icon: "⚔️" },
  "fighter_warrior_focus": { id: "fighter_warrior_focus", name: "Warrior's Focus", type: "active", cost: "main", description: "Grants +1d4 + Prof Bonus to Hit Rolls until the end of combat. Usable once per short rest.", icon: "👁️" },
  "fighter_samurai_focus": { id: "fighter_samurai_focus", name: "Samurai's Focus", type: "active", cost: "main", description: "Your next attack gains Advantage (roll 2d20 and take the higher result). Usable once per long rest.", icon: "🗡️" },
  "fighter_berserker_rage": { id: "fighter_berserker_rage", name: "Berserker's Rage", type: "active", cost: "main", description: "Gain +1d6 to Melee Damage and Resistance to Physical Damage until end of combat. Usable once per long rest.", icon: "💢" },

  // Fighter Subclasses (Lv 3)
  "subclass_archer": { id: "subclass_archer", name: "Archer", type: "passive", cost: "none", description: "+2 to Attack Rolls when using a Bow.", icon: "🏹" },
  "subclass_guardian": { id: "subclass_guardian", name: "Guardian", type: "passive", cost: "none", description: "+1 to AC when wearing Heavy Armor.", icon: "🛡️" },
  "subclass_duelwield": { id: "subclass_duelwield", name: "Duel Wielder", type: "passive", cost: "none", description: "+1 to Attack Rolls when dual wielding Light weapons.", icon: "⚔️" },
  "subclass_berserker": { id: "subclass_berserker", name: "Berserker", type: "passive", cost: "none", description: "+2 to Attack Rolls when using Two-Handed Melee weapons.", icon: "🪓" },
  "subclass_samurai": { id: "subclass_samurai", name: "Samurai", type: "passive", cost: "none", description: "+2 to Melee Hit Rolls. If you didn't attack last turn, next attack gets +3 instead.", icon: "⛩️" },
  "subclass_protector": { id: "subclass_protector", name: "Protector", type: "reaction", cost: "none", description: "When an enemy attacks an ally within 1 tile, impose Disadvantage on the attack.", icon: "🛡️" },
  "subclass_swordmage": { id: "subclass_swordmage", name: "Swordmage", type: "passive", cost: "none", description: "Gain 1 Cantrip, 1 Lv1 Spell, and 1 Lv1 Spell Slot.", icon: "✨" },

  // Cleric Skills
  "cleric_divine_domain": {
    id: "cleric_divine_domain",
    name: "Divine Domain",
    type: "passive",
    cost: "none",
    description: "Your chosen deity grants you a permanent +1 bonus to AC.",
    acBonus: 1,
    icon: "✨"
  },
  "cleric_healing_word": {
    id: "cleric_healing_word",
    name: "Healing Word",
    type: "active",
    cost: "extra",
    description: "A quick prayer that heals 1d4 + WIS modifier.",
    healAmount: "1d4+3",
    range: 60,
    icon: "🙏"
  },

  // Paladin Skills
  "paladin_aura_of_protection": {
    id: "paladin_aura_of_protection",
    name: "Aura of Protection",
    type: "passive",
    cost: "none",
    description: "Holy presence grants you +2 to all saving throws and +5 Max HP.",
    hpBonus: 5,
    icon: "🛡️"
  },
  "paladin_divine_smite": {
    id: "paladin_divine_smite",
    name: "Divine Smite",
    type: "active",
    cost: "extra",
    description: "Empower your weapon with radiant energy. Next attack deals +2d8 damage.",
    damage: "2d8",
    icon: "⚔️"
  },
  "paladin_shield_block": {
    id: "paladin_shield_block",
    name: "Shield Block",
    type: "reaction",
    cost: "none",
    description: "When hit by an attack, reduce the damage taken by 1d10 + STR.",
    icon: "🛡️"
  },

  // Ranger Skills
  "ranger_hunters_mark": {
    id: "ranger_hunters_mark",
    name: "Hunter's Mark",
    type: "active",
    cost: "extra",
    description: "Mark a target. Your attacks deal an extra 1d6 damage to them.",
    damage: "1d6",
    icon: "🎯"
  },
  "ranger_nimble_escape": {
    id: "ranger_nimble_escape",
    name: "Nimble Escape",
    type: "reaction",
    cost: "none",
    description: "When an enemy misses you, you can immediately move 1 tile without triggering opportunity attacks.",
    icon: "🍃"
  },

  // Wizard Skills
  "wizard_arcane_recovery": {
    id: "wizard_arcane_recovery",
    name: "Arcane Recovery",
    type: "passive",
    cost: "none",
    description: "Your deep study of magic grants you +2 Max HP (from vitality rituals).",
    hpBonus: 2,
    icon: "📖"
  },
  "wizard_shield_spell": {
    id: "wizard_shield_spell",
    name: "Shield (Reaction)",
    type: "reaction",
    cost: "none",
    description: "An invisible barrier of force appears and protects you. Grants +5 AC for the round.",
    acBonus: 5,
    icon: "🛡️"
  }
};
