# Selestia Horizon - Game Design & Development Guidelines

This document outlines the core design philosophies, NPC interaction rules, and future directions for Selestia Horizon. 

## 1. NPC Design Philosophy
NPCs in Selestia Horizon are inspired by tabletop RPGs.
- **Static World Tokens**: NPCs are represented as static world tokens instead of continuously animated characters. This design is intentional and part of the game's identity.
- **Benefits**: Easy to recognize, low visual noise, faster development, better performance, and consistent with turn-based gameplay.
- **Movement & Animation**: NPC movement is not required unless it directly improves gameplay or storytelling. Continuous idle animation is not required. Small visual effects are acceptable (e.g., blinking, hair movement, soft glow, floating particles). Avoid full walking cycles unless required by gameplay. Consistency is preferred over unnecessary animation. Players should focus on interaction rather than observing idle animations.

## 2. NPC Interaction
- **Personal Touch**: NPC interaction should feel personal.
- **Dynamic Dialogue**: Important NPCs should have unique dialogue that gradually changes as the player's adventure progresses.
- **Memory**: NPCs may remember important milestones (e.g., First Meeting, Dungeon Cleared, Story Progress, Seasonal Events, Game Updates).
- **World-Building**: NPC dialogue should make the world feel alive even without animation.

## 3. Selenia (Goddess of Peace)
Selenia is a permanent, central NPC who serves as a guide and a bridge between the player and the Creator (Developer).
- **Personality**: Selenia should always feel Kind, Gentle, Warm, Playful, Wise, and Patient. She never becomes angry with the player. Even when the player chooses silly dialogue options, she responds with kindness or gentle teasing. She should feel like someone players enjoy visiting.
- **Interaction Flow**: Statue -> Pray -> Teleport -> Sanctuary -> Talk with Selenia -> Return.
- **The Sanctuary**: A sacred place outside Selestia's normal time and space. It is peaceful, disconnected from the main world. Design goals: Calm, Minimal, Beautiful, White, Lavender, Soft Light, Water, Flowers, Stars. **No enemies, no combat, no danger. Only conversation and reflection.**

## 4. Tutorial Philosophy
- **Optional & Skippable**: The tutorial is optional. Players should always be allowed to skip it.
- **Rewards**: Completing the tutorial grants a small permanent blessing. The blessing should never become mandatory for progression. Rewards are only granted on the first completion.
- **Topics**: Movement, UI, Inventory, Equipment, Combat, Skills, Quest, Multiplayer Basics.
- **Replayability**: Players may replay the tutorial any time. If requested again, Selenia should playfully ask why (e.g., "I forgot", "I want another lesson", "Just visiting", "Slimes erased my memory"). These choices are intended to build emotional attachment.
- **Dialogue Style**: The tutorial should feel like a conversation instead of a lecture. Selenia should explain systems naturally. The player should occasionally choose dialogue responses. Dialogue should be warm, playful, and encouraging. Avoid excessive exposition. Humor is encouraged.

## 5. Feedback System
- **Tell Selenia**: Selenia serves as the bridge between players and the developer. Players may send feedback through Selenia.
- **Immersion**: The UI should never break immersion. Instead of a generic "Contact Developer" button, use "Tell Selenia". Selenia will respond as if she is delivering the player's words to the Creator.

## 6. Quest System Philosophy
- **Simplicity Over Complexity**: Initial quests are kept simple and limited in variety (e.g., Kill 5 enemies, Gather 5 items). Duplicate quests can appear on the board. This prevents players from being overwhelmed by too many mechanics early on.
- **Quest Board**: The quest board displays exactly 10 available quests at any time. It refreshes its list automatically every 5 minutes.
- **Active Limit**: A character may only have up to 2 active quests at the same time.
- **Individual Progression**: Quests are bound to the individual character. Progress and rewards are personal, not shared across the party.
- **Penalties for Canceling**: Players can cancel an active quest, but it incurs a flat fee (e.g., 10g) to prevent spamming and encourage commitment. Canceled quests do not return to the board.

## 7. Information & UI Design Philosophy
- **Separation of Concept and Calculation**:
  - **Selenia's Role (Lore & Concepts)**: Selenia is responsible for explaining the "Concepts" (e.g., what a Modifier is, how Armor Class works, the idea behind Hit Rolls) in a friendly, in-universe conversational manner. She teaches the player *how* the world works without overwhelming them with raw math.
  - **Status Screen's Role (Math & Transparency)**: The Status screen (UI/HUD) is responsible for showing the "Actual Numbers" and the exact "Calculation Methods" (e.g., Base HP + Con Mod + Level Bonus). The UI acts as the mathematical truth of the character, providing transparency and detailed breakdowns (via clickable elements or tooltips) for players who want to understand their exact stats and mechanics.
