export const NPC_DIALOGUES = [
  { id: "welcome", sender: "Guide", text: "Welcome to Neko Online!", time: "now" },
  { id: "greetings", sender: "Guide", text: "Welcome, traveler.", time: "now" },
  { id: "restSuccess", sender: "Innkeeper", text: "You wake refreshed and ready for the day.", time: "now" },
  { id: "levelUpSuccess", sender: "Shrine Keeper", text: "Your spirit grows stronger.", time: "now" },
  { id: "statSave", sender: "Shrine Keeper", text: "Your fate has been blessed.", time: "now" },
  { id: "accept", sender: "Quest Giver", text: "The quest is yours.", time: "now" },
  { id: "complete", sender: "Quest Giver", text: "The task is complete.", time: "now" },
  { id: "cancel", sender: "Quest Giver", text: "The quest has been canceled.", time: "now" },
];

export function getRandomDialogue(type?: string, key?: string) {
  const fallback = NPC_DIALOGUES[0];
  const match = NPC_DIALOGUES.find(item => item.id === key) ?? fallback;
  return match.text;
}
