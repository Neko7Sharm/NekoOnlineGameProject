// frontend/src/constants/dialogues.ts
export const NPC_DIALOGUES = {
  inn: {
    // บุคลิก: พี่สาวที่คอยดูแลอย่างอบอุ่น (Warm, caring big sister)
    greetings: [
      "Oh, you look absolutely exhausted, dear. Come, the hearth is warm!",
      "Welcome back! I've kept a soft bed and hot tea ready just for you.",
      "Hello there, brave one. Please, leave your heavy burdens at the door and rest.",
      "It's so good to see you safe! Let me take care of you for a while."
    ],
    restSuccess: [
      "Sleep tight, dear. I'll make sure you wake up completely refreshed!",
      "Sweet dreams, brave adventurer. The morning sun will bring new strength.",
      "Rest well! I'll keep the noises down so you can have a peaceful slumber."
    ],
    noGold: "Oh my... it seems your coin pouch is a bit light today. Don't worry, come back when you can, alright?"
  },
  shrine: {
    // บุคลิก: น่ารักใสซื่อไม่ค่อยทันคน (Cute, innocent, naive)
    greetings: [
      "Oh! Hello! The divine light is very warm today, isn't it? Welcome!",
      "Welcome! Please be careful not to step on the sacred rugs... I just cleaned them!",
      "Oh my, an adventurer! The gods told me someone brave would visit today. I think?",
      "Hello! Would you like to pray? Or maybe just look at the pretty statues?"
    ],
    levelUpSuccess: [
      "Wow! The gods are smiling so brightly at you! You feel stronger, right?",
      "Yay! I knew you could do it! The divine energy is sparkling all around you!",
      "Oh wonderful! Your soul is shining so brightly now!"
    ],
    levelUpFail: "Oh... I'm sorry. The gods say you need a little more adventure first. But I believe in you!",
    statSave: "There you go! The divine balance is restored. You look very handsome/beautiful!"
  },
  quest: {
    // บุคลิก: ซุ่มซ่ามนิดหน่อย (Clumsy, scatterbrained, but tries hard)
    greetings: [
      "Oh! Uh, welcome! Let me find the board... wait, I'm already holding it. Hello!",
      "Hello! I dropped a stamp earlier, but don't worry, the quest board is ready!",
      "Welcome, adventurer! Please be careful, the pins on this board are a bit sharp...",
      "Oh dear, let me wipe this dust off... Welcome! What quest can I clumsily help you with?"
    ],
    accept: [
      "Got it! I'll file this right away... hopefully in the correct folder this time!",
      "Alright! I'll prepare the paperwork. I promise I won't lose this one!",
      "A bold choice! I'll process this immediately. Please don't mind the ink stain!"
    ],
    complete: [
      "Wow! You actually did it! I knew you could! Let me stamp this... *SMACK* There!",
      "Incredible! A true hero! Look at that perfect stamp! I'm so proud of you!",
      "By the gods, you're amazing! The paperwork is finally complete and organized!"
    ],
    cancel: [
      "Oh... okay. It's alright, really! Withdrawing is a brave choice too. Don't be sad!",
      "Oh dear, don't worry! There will be plenty of other quests. Here, take this small refund.",
      "It's okay! These things happen! Please don't let this weigh on your heart, alright?"
    ]
  }
};

// Helper function to get random dialogue
export const getRandomDialogue = (category: keyof typeof NPC_DIALOGUES, type: string) => {
  const dialogues = NPC_DIALOGUES[category][type as keyof typeof NPC_DIALOGUES[typeof category]];
  if (Array.isArray(dialogues)) {
    return dialogues[Math.floor(Math.random() * dialogues.length)];
  }
  return String(dialogues);
};