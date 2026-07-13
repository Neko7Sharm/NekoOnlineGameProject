// ─────────────────────────────────────────────────
// QUEST TEMPLATES
// ─────────────────────────────────────────────────

export const QUEST_TEMPLATES: Array<{ title: string; desc: string; n: number; exp: number; gold: number; gather?: string }> = [
  { title: "Pest Control", desc: "Clear {n} Wooden Dummies from the dungeon.", n: 3, exp: 60, gold: 15 },
  { title: "Training Exercise", desc: "Destroy {n} training dummies.", n: 5, exp: 100, gold: 25 },
  { title: "Quick Skirmish", desc: "Defeat {n} Wooden Dummies.", n: 2, exp: 40, gold: 10 },
  { title: "Dungeon Sweep", desc: "Eliminate {n} Wooden Dummies.", n: 4, exp: 80, gold: 20 },
  { title: "The Big Cull", desc: "Slay {n} Wooden Dummies for a bounty.", n: 6, exp: 120, gold: 30 },
  { title: "Rookie Hunt", desc: "Kill {n} Wooden Dummies to prove worth.", n: 2, exp: 40, gold: 12 },
  { title: "Exterminator", desc: "Wipe out {n} Wooden Dummies below.", n: 5, exp: 95, gold: 22 },
  { title: "Combat Trial", desc: "Face and destroy {n} Wooden Dummies.", n: 3, exp: 65, gold: 16 },
  { title: "Timber Collection", desc: "Collect {n} wooden branches from training dummies.", n: 5, exp: 50, gold: 20, gather: "Branch" },
  { title: "Wood for the Workshop", desc: "Bring {n} branches from the dungeon.", n: 3, exp: 30, gold: 12, gather: "Branch" },
];

// ─────────────────────────────────────────────────
// NPC CHAT (fake world chat messages)
// ─────────────────────────────────────────────────

export const NPC_CHAT = [
  { sender: "Elara✨", text: "Cleared the dungeon east wing! Watch the north corridor." },
  { sender: "Tavern Master", text: "New potions in stock! First one's half off~" },
  { sender: "GrendakBold⚔️", text: "Anyone up for a party dungeon run? Solo is rough." },
  { sender: "Sister Aelia🙏", text: "May the light guide your swords, brave adventurers!" },
  { sender: "Kira🏹", text: "Found a ring in the dungeon. Sold for 80g, nice haul!" },
  { sender: "VexWanderer", text: "Wooden dummies hit harder than they look. Keep HP up!" },
  { sender: "Merchant Dov🏪", text: "Rare shipment arrived. Stock up before entering." },
  { sender: "Aldric🛡️", text: "Fighter LFG Cleric for dungeon runs. DM me~" },
];
