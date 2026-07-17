// ─────────────────────────────────────────────────
// QUEST TEMPLATES
// ─────────────────────────────────────────────────

export const QUEST_TEMPLATES: Array<{ title: string; desc: string; killTarget?: { monster: string; count: number }; exp: number; gold: number; gather?: string }> = [
  { title: "Slime Hunt", desc: "Defeat 3 Slimes in the Whispering Forest.", killTarget: { monster: "Slime", count: 3 }, exp: 120, gold: 30 },
  { title: "Wolf Pack", desc: "Defeat 3 Wolves in the Whispering Forest.", killTarget: { monster: "Wolf", count: 3 }, exp: 150, gold: 40 },
  { title: "Goblin Scouting", desc: "Defeat 3 Goblin Scouts in the Whispering Forest.", killTarget: { monster: "Goblin Scout", count: 3 }, exp: 180, gold: 50 },
  { title: "Vine Clearing", desc: "Defeat 3 Creeping Vines in the Whispering Forest.", killTarget: { monster: "Creeping Vine", count: 3 }, exp: 200, gold: 60 },
  { title: "The Ancient Treant", desc: "Defeat the Ancient Treant Sapling boss.", killTarget: { monster: "Ancient Treant Sapling", count: 1 }, exp: 500, gold: 200 },
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
