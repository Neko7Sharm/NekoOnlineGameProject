// ─────────────────────────────────────────────────
// QUEST TEMPLATES
// ─────────────────────────────────────────────────

export const QUEST_TEMPLATES: Array<{ title: string; desc: string; n: number; exp: number; gold: number; gather?: string }> = [
  { title: "Training Exercise", desc: "Defeat {n} Wooden Dummies.", n: 5, exp: 100, gold: 25 },
  { title: "Timber Collection", desc: "Collect {n} wooden branches from training dummies.", n: 5, exp: 50, gold: 20, gather: "Branch" },
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
