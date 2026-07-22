# Selestia Horizon Core Guidelines

> **Current scope:** This document describes the playable frontend experience in v0.5 and beyond.

## 1. Core Experience

Selestia Horizon is a warm, turn-based fantasy adventure with tabletop-RPG inspiration. The player explores at their own pace, builds one of several heroes, fights tactical encounters, gains loot, and returns to town for quests, rest, and story interaction.

- The current v0.5 game state is persisted locally in the player's browser.
- Character progress, inventory, quest progress, map state, and local chat are personal to that save.
- The game's authoritative backend relies on **Supabase** (PostgreSQL) and Socket.IO for any multi-player or verified interactions.

## 2. Directory

Please refer to the following specific documents for detailed rules:

- **Art & Visuals**: [ART_BIBLE.md](./ART_BIBLE.md), [UI_GUIDE.md](./UI_GUIDE.md)
- **World & Story**: [WORLD_LORE.md](./WORLD_LORE.md)
- **Gameplay Mechanics**: [GAMEPLAY_RULES.md](./GAMEPLAY_RULES.md)
- **Audio & Music**: [AUDIO_BIBLE.md](./AUDIO_BIBLE.md)
- **Standards & Tone**: [NAMING_GUIDE.md](./NAMING_GUIDE.md), [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- **Technical & Workflow**: [TECHNICAL_RULES.md](./TECHNICAL_RULES.md), [PROMPT_GUIDE.md](./PROMPT_GUIDE.md)
- **Project Planning**: [ROADMAP.md](./ROADMAP.md)

## 3. Map Rendering Architecture

Selestia Horizon uses a **Hybrid Background + Object Layer** approach for map rendering:

- **Town & Sanctuary**: Rendered as a **single background image** (`town_map_bg.png`). Only interactive tiles (Inn door, Shop door, Quest Board, Shrine, Town Exit) create DOM elements. All other ground tiles are part of the background image. Collision and walkability are determined purely by coordinate math in `constants/map.ts`, not by DOM elements.
- **Dungeon**: Uses per-tile `<div>` rendering with fog-of-war culling (only revealed tiles create DOM elements).
- **Buildings & Objects**: Rendered as overlay `<img>` elements positioned on the grid.
- **Entities (Player, Monsters, NPCs)**: Rendered as separate overlay elements with their own z-index layer.

This architecture ensures that expanding the town map size does not create performance issues, since the ground layer is always a single image regardless of map dimensions.
