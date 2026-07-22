# Gameplay Rules

## 1. Combat Mechanics
Combat is tactical and turn-based. Damage, range, saving throws, spell slots, status effects, and equipment all matter.

- **Hit Roll**: Derived from D&D 5e mechanics. Attackers roll to beat the target's Armor Class (AC).
- **Damage Types**: Slashing, Piercing, Bludgeoning, Magic, etc.
- **Weapon Properties**: Heavy, Reach, Finesse, etc.
- **Stealth and Insight**: Tactical elements that provide advantages in combat.
- **Cover**: Environmental objects can provide cover against ranged attacks.

## 2. Character Progression
Instead of generic leveling for everything, Selestia Horizon separates combat progression and life-skill progression.

- **Combat Progression (v0.5)**: Focuses on stats, HP, Class Features, and equipment.
- **Crafting & Exploration (v0.6+)**: Uses a "Mastery" system. Performing gathering, mining, or alchemy grants mastery, which unlocks specific Passives (e.g., Green Thumb) rather than raw stats.

## 3. Alchemy & Crafting Systems

### Alchemy Tag System (v0.6+)
Alchemy does not rely on rigid fixed recipes; instead, it uses a **Tag Combination System** allowing players to experiment with ingredients freely.

- **Mixing Slots**:
  - **Slot 1 (Required)**: Primary ingredient.
  - **Slot 2 (Required)**: Secondary ingredient.
  - **Slot 3 (Optional Catalyst)**: Modifies outcome, increases quality, multiplies quantity, adds special status effects, or shifts elemental affinity.
- **Ingredient Tags**:
  - Every material has inherent Tags (e.g., Herb = `Nature`, `Healing`; Water = `Liquid`, `Pure`; Slime Gel = `Organic`, `Sticky`; Fire Crystal = `Fire`, `Magic`; Ancient Bark = `Nature`, `Ancient`).
  - The system evaluates the tag combination of 2 or 3 items to derive the result (e.g., `Herb` + `Water` -> `Healing Potion`; `Herb` + `Water` + `Ancient Bark` -> `Greater Healing Potion`).
- **Recipe Book**:
  - Upon successful discovery of a new combination ("New Recipe Discovered!"), the recipe is logged into the Recipe Book for 1-click crafting in the future.

### Blacksmith System
The Blacksmith handles equipment creation and enhancements.
- **Craft Equipment**: Combine materials (e.g., `Iron Ore`, `Wood`, `Leather`) to forge weapons and armor.
- **Upgrade Equipment**: Enhance existing gear (e.g., `Iron Sword` + `Iron Ore` + `Gold` -> `Iron Sword +1`). Increases Attack/AC, Accuracy, or unlocks passives.
- **Repair**: Restores equipment durability in future updates.

## 4. Town Hub Structure
The starting town acts as an accessible, seamless **Hub Town**:
- **No Interior Loading**: Buildings are open-air or service areas. Players walk up to designated NPCs or interactive service points and press **[E]** or **Space** to interact.
- **Selenia Shrine (Fountain / Statue)**: Central Hub for Level Up, Status Point allocation, Selenia Dialogue, Tutorials, and Warping.
- **Open Plaza**: Reserved for future seasonal events, traveling merchants, and story events.
- **Services Layout**:
  - **Inn**: Long Rest (Restores HP & Spell Slots).
  - **Shop**: Buy & Sell goods.
  - **Quest Board**: Accept & turn in quests.
  - **Blacksmith**: Craft & upgrade equipment.
  - **Alchemy**: Combine ingredients & discover recipes.

## 5. Quest System
- **Quest Board**: Displays exactly 10 available quests at any time. It refreshes automatically every 5 minutes.
- **Simplicity**: Initial quests are kept simple (e.g., Kill X enemies) to prevent overwhelming the player. Duplicate quests can appear on the board.
- **Active Limit**: A character may only have up to 2 active quests at the same time.
- **Individual Progression**: Quests are bound to the individual character, not shared across the party.
- **Cancellation**: Players can cancel an active quest, but it incurs a flat fee (e.g., 10g) to prevent spamming. Canceled quests do not return to the board.

## 4. NPC Interaction
- NPCs are represented as static world tokens.
- Movement and continuous idle animation are not required unless they directly improve gameplay.
- Important NPCs have dynamic dialogue that changes as the player's adventure progresses.

## 5. Tutorials
- **Optional & Skippable**: Tutorials should never be forced.
- **Contextual**: Tutorials trigger dynamically the first time an action is taken (e.g., first attack, first spell, first critical hit) using `TriggerContextualTutorial` instead of hardcoded button clicks.
- **Rewards**: Completing the tutorial grants a small permanent blessing (e.g. +2% EXP gain), which never becomes mandatory.
- **Replayability**: Players can replay tutorials. Selenia will playfully react to the request.
