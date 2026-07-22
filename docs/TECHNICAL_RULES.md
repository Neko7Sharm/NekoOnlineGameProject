# Technical Rules

This document outlines the technical standards for code, file organization, and asset specifications in Selestia Horizon.

## 1. Asset Specifications

### Tile & Sprite Sizes
- **Map Tiles**: 32x32 pixels (or multiple thereof, e.g., 64x64 for large objects).
- **Character Sprites**: 32x32 or 48x48 bounding box. Must maintain consistent pixel density (PPU).
- **Portraits**: 512x512 or 1024x1024, scaled down in-game. Keep the face centered.
- **Animation Frames**: 
  - Walk cycles: 3-4 frames.
  - Idle (if used): 2-3 frames.
  - Combat effects: 4-6 fast frames.

### Naming Conventions for Files
- **Sprites**: `spr_[name]_[action].png` (e.g., `spr_goblin_idle.png`)
- **Portraits**: `port_[character_name].png`
- **Tilesets**: `ts_[biome_name].png`
- **Music**: `bgm_[location]_[mood].mp3` (e.g., `bgm_sanctuary_calm.mp3`)
- **SFX**: `sfx_[action]_[type].wav` (e.g., `sfx_hit_slash.wav`)

## 2. Folder Structure
Maintain a clean separation of concerns in the `frontend` and `backend`:
- `frontend/src/assets/`: All images and audio, categorized by `sprites`, `ui`, `bgm`, `sfx`.
- `frontend/src/components/`: Reusable React components.
- `frontend/src/maps/`: Map definition data.
- `backend/routes/`: Express API endpoints.

## 3. Coding Standards
- **Language**: TypeScript for frontend (Strict mode enabled).
- **Database**: PostgreSQL (via Supabase). No NoSQL/Mongoose data patterns.
- **Naming Variables**: Use `camelCase` for variables and functions. Use `PascalCase` for React components and Classes.
- **State Management**: Keep game state in `useGameEngine` hook or contextual providers. Do not mutate state directly.

## 4. Map Rendering Architecture

### Layer Structure
Maps use a **Hybrid Background + Object Layer** system:

| Layer | Town/Sanctuary | Dungeon |
|-------|---------------|----------|
| Ground | Single `<img>` background | Per-tile `<div>` with fog culling |
| Objects | Overlay `<img>` (buildings, trees) | Overlay `<img>` (rocks, logs, sacred tree) |
| Interactive | DOM `<div>` only for special tiles | DOM `<div>` for all revealed tiles |
| Entities | Player, NPC overlays | Player, Monster overlays |
| Effects | Combat VFX layer | Combat VFX layer |

### Rules
- **Never** create a DOM element for every ground tile in Town or Sanctuary mode.
- Town ground must be a **single pre-rendered image** (`town_map_bg.png`, size: `cols × CELL` by `rows × CELL`).
- Collision logic lives in `constants/map.ts` (`isWalkable`, `blocksVision`) and works purely from coordinate math — it does NOT depend on DOM elements.
- Interactive zones (Inn, Shop, Shrine, Exit) are defined in `TOWN_SPECIAL` / `SANCTUARY_SPECIAL` objects and rendered as overlay DOM elements.
- Click handling for walkable tiles uses a single invisible overlay `<div>` that calculates the clicked grid coordinate from mouse position.

### Background Image Specifications
- **Town Grid Dimensions**:
  - Cell Size: `80px × 80px` (`CELL = 80`)
  - Target Grid Size: `29 cols × 21 rows` (or compact `25×25` to `29×21` range)
  - Standard Resolution: `2320px × 1680px` (Aspect Ratio ~ 1.38:1 / 4:3)
- **Asset Layer Separation Rules**:
  - **Ground Base Layer (`town_map_bg.png`)**: Pure grass texture base (`tile_grass`). Does NOT contain buildings, roads, NPCs, or static objects.
  - **Path/Road Layer**: Modular stone path overlay (`tile_path`) or combined ground texture.
  - **Open-Air Service Areas & Objects**:
    - **Inn**: Building overlay (`b_inn.png`)
    - **Shop**: Shop / Merchant stall overlay (`b_shop.png`)
    - **Blacksmith**: Open-air Forge (`Forge`, `Anvil`, `Weapon Rack`, `Coals`)
    - **Alchemy**: Open-air Workshop (`Herb Garden`, `Potion Table`, `Alchemy Apparatus`)
    - **Selenia Shrine**: Central Statue & Shrine Hub (`b_statue.png`)
    - **Quest Board**: Guild Board overlay (`b_quest.png`)
  - **NPCs & Entities**: Standalone sprite tokens placed at service entry points.

### Interaction Logic Rules
- **Proximity Prompt**: Walking to a service point / NPC displays a key hint (e.g. `[E] Enter Shop` or `Press Space to Speak`).
- **No Instant Trigger**: Stepping onto an interactive cell does NOT instantly force-open a modal; players must explicitly press **[E]** or **Space** for full player control.
