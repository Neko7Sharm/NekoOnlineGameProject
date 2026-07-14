# Selestia Horizon - Development Guidelines

Version: 0.4
Project: Selestia Horizon
Last Updated: 2026

---

# Project Vision

Selestia Horizon is an online turn-based fantasy RPG inspired by Dungeons & Dragons.

The game focuses on strategic combat, exploration, character progression, multiplayer cooperation, and immersive storytelling.

The goal is to create a relaxing fantasy adventure where players enjoy the journey, not just the destination.

Every feature should improve the player's experience instead of adding unnecessary complexity.

---

# Core Design Pillars

Every new feature should support at least one of these pillars.

• Adventure
• Exploration
• Strategy
• Character Growth
• Multiplayer Cooperation
• World Immersion

If a feature supports none of these, it should be reconsidered.

---

# World

World Name

Selestia

Creator Goddess

Selenia

Theme

Twilight Fantasy

Keywords

• Lavender
• Moonlight
• Stars
• Horizon
• Nature
• Magic
• Hope

Atmosphere

Peaceful

Dreamlike

Warm

Mysterious

Comfortable

The world should feel beautiful and worth exploring.

---

# Selenia

Selenia is the Creator Goddess of Selestia.

She is also the mascot of Selestia Horizon and represents the creator of the game.

Responsibilities

• Guide new players
• Introduce new content
• Narrate important events
• Appear in promotional artwork
• Represent the game's identity

Rules

• Never becomes an enemy.
• Never dies.
• Never becomes playable.
• Never behaves maliciously.
• Always remains calm, wise, and kind.

---

# Art Direction

Style

Anime Fantasy

Semi-Realistic

Elegant

Dreamlike

Soft Lighting

Inspirations

Fantasy

Moonlight

Nature

Magic

Ancient Ruins

Avoid

Cyberpunk

Modern Cities

Industrial Themes

Military Themes

Heavy Sci-Fi

Post-Apocalyptic Style

---

# Color Palette

Primary

Lavender Purple

Secondary

Moon White

Dark

Midnight Black

Accent

Soft Gold

Support Colors

Sky Blue

Silver

Soft Pink

Rules

• Use soft colors.
• Avoid oversaturated UI.
• Purple should define the game's identity without overwhelming every screen.

---

# Environment Design

Town

Safe

Warm

Wood

Stone

Flowers

Trees

Lanterns

Fountains

Inn

Cozy

Warm Lighting

Comfortable

Dungeon

Ancient

Dark Stone

Magic Crystals

Mist

Boss Area

Dark Purple

White Light

Large Ancient Structures

Strong visual contrast

---

# Character Design

Characters should feel believable.

Equipment should visually evolve as players progress.

Avoid exaggerated proportions.

Every important NPC should have a recognizable silhouette.

---

# Equipment Design

Equipment Tiers

Common

Uncommon

Rare

Epic

Legendary

Mythic

Equipment should become visually more impressive as rarity increases.

Visual effects should remain readable during gameplay.

---

# UI Guidelines

Style

Minimal Fantasy

Goals

Easy to Read

Minimal Clutter

Elegant

Responsive

Panels

Rounded Corners

Soft Shadows

Semi-Transparent Background

Fantasy Border

Buttons

Hover Animation

Press Animation

Disabled State

Loading State

Spacing

Use an 8px spacing system.

All UI elements should align consistently.

---

# Typography

Headings

Fantasy Style

Body Text

Readable Sans Serif

Requirements

Readable

Clean

High Contrast

Avoid decorative fonts in gameplay UI.

---

# Icon Guidelines

Simple

Readable

Fantasy Theme

Consistent Line Width

Avoid overly detailed icons.

---

# Animation Guidelines

Animation Duration

150ms - 250ms

Required Animations

• Button Hover
• Button Click
• Window Open
• Window Close
• Tooltip
• Inventory
• Damage Numbers
• HP Bar
• Mana Bar
• EXP Bar
• Quest Complete
• Level Up
• Notifications

Animations should improve feedback, not slow down gameplay.

---

# Audio Direction

Town

Piano

Flute

Nature

Birds

Water

Battle

Orchestra

Percussion

Magic

Crystal

Bell

Wind

Avoid loud repetitive sounds.

---

# Gameplay Philosophy

Gameplay comes before graphics.

Combat should reward thinking instead of speed.

Players should always understand why they win or lose.

Classes must feel unique.

Grinding should never be mandatory.

---

# Gameplay Flow

Every gameplay interaction must have a clear beginning and end.

General Rules

• Players must never become trapped.
• Every modal must have a close button.
• ESC closes non-critical windows.

---

# Player Experience Rules

The game should always feel smooth, readable, and fair.

Rules

• Town interactions such as shop, inn, shrine, and quest board must return the player to a playable state after closing.
• Exit actions must clearly transition the player back to the world map or previous screen.
• Quest acceptance, completion, and turn-in must reflect immediately in the UI.
• Important state changes such as leveling, healing, and item rewards must show clear feedback.
• Notifications should be short, friendly, and informative.

---

# Progression Rules

Progression should feel meaningful, not repetitive.

Rules

• Leveling up should create visible growth in strength or utility.
• Stat allocation should feel intentional and readable.
• Quest rewards should support character growth, exploration, or story progression.
• Grinding should not be required to progress through core content.

---

# Technical Consistency Rules

Systems should stay synchronized as the game grows.

Rules

• Quest state, party state, and character state must always remain consistent.
• UI should immediately reflect gameplay changes.
• Shared systems such as inventory, party quests, and progression should use the same update patterns.
• New features should not break existing flow or create hidden state bugs.
• Confirm dialogs must always have Confirm and Cancel.
• Players must always regain control after interactions.

Movement Flow

Walk

↓

Interact

↓

Transition

↓

Player Control Returns

Building Flow

Enter Building

↓

Fade

↓

Spawn Inside

↓

Player Control

Exit Building

↓

Fade

↓

Spawn Outside

↓

Player Control

Quest Flow

Accept

↓

Quest Added

↓

Quest Tracker Updated

↓

Objective Complete

↓

Talk to NPC

↓

Receive Reward

↓

Quest Finished

Battle Flow

Battle Start

↓

Turns

↓

Victory / Defeat

↓

Rewards

↓

EXP

↓

Level Check

↓

Player Control

Inn Flow

Talk

↓

Stay

↓

Restore HP/MP

↓

Auto Save

↓

Player Control

---

# Quest Design

Avoid repetitive quests.

Prefer

Story

Exploration

Puzzle

Character Interaction

Adventure

Major quests should reveal more about Selestia.

---

# Character Progression

Every level should feel rewarding.

Possible Rewards

HP

MP

Skill

Spell

Passive

Stat Point

Equipment progression should matter more than simply increasing numbers.

---

# Balance Philosophy

No class should outperform every other class.

Each class should excel in different situations.

Avoid mandatory builds.

Reward experimentation.

---

# Multiplayer Philosophy

Encourage teamwork.

Avoid punishing solo players excessively.

Trading should support the economy without becoming mandatory.

Server is authoritative.

---

# UX & Accessibility

Every interaction should provide immediate feedback.

Buttons

Hover

Pressed

Disabled

Loading

Tooltips

Required for

Items

Equipment

NPC

Skills

Buffs

Debuffs

Notifications

Quest Accepted

Quest Completed

Item Obtained

Level Up

Errors

Connection Lost

Accessibility

Readable fonts

High contrast

Scalable UI

Do not rely only on color to communicate information.

---

# Technical Guidelines

Architecture

UI

↓

Game Logic

↓

State

↓

Save

↓

Network

UI should never directly modify gameplay data.

Single Source of Truth

Character

Inventory

Quest

Party

Equipment

Save Data

Avoid duplicated state.

Networking

Server validates

Inventory

Combat

Quest

Position

Client controls only UI.

---

# Save System

Autosave

Entering Inn

Quest Completion

Manual Save

Settings Menu

Loading

Always validate save data before loading.

Never allow corrupted save data to enter gameplay.

---

# Bug Prevention Checklist

Movement

□ Cannot become stuck

Quest

□ Cannot accept twice

□ Cannot complete twice

□ Cannot lose rewards

Inventory

□ No duplicate items

□ No negative quantity

Equipment

□ Cannot equip invalid items

□ Cannot equip same item twice

Combat

□ Turn never freezes

□ Dead players cannot act

□ Victory returns player control

UI

□ Every window closes correctly

□ No invisible buttons

□ No permanent loading screens

Save

□ Save loads correctly

□ Autosave works

---

# AI Development Rules

AI-generated code must follow the existing architecture.

Rules

• Never rewrite working systems unless requested.
• Extend existing systems whenever possible.
• Reuse components.
• Avoid duplicated logic.
• Keep files modular.
• Maintain naming consistency.

Every new feature should include

• UI
• Error Handling
• State Handling
• Save Compatibility
• Multiplayer Compatibility (if applicable)

---

# Coding Standards

Write clean, maintainable code.

Prefer readable code over clever code.

Document complex systems.

Avoid magic numbers.

Separate UI, gameplay, and networking.

---

# Asset Guidelines

Characters

Anime Fantasy

Elegant

Readable

Environment

Fantasy

Nature

Ancient

Warm Lighting

UI

Minimal

Fantasy

Readable

Avoid

Modern Military

Cyberpunk

Real Brands

Random Art Styles

---

# Development Priorities

Priority Order

1. Gameplay
2. Stability
3. UI / UX
4. Performance
5. Animation
6. Audio
7. Visual Effects
8. New Content

A polished small game is better than a large unfinished game.

---

# Definition of Done (DoD)

A feature is considered complete only if all conditions below are satisfied.

□ Gameplay works correctly.
□ UI is implemented.
□ Animations are implemented.
□ Sound effects are implemented (if needed).
□ Save/Load compatibility verified.
□ Multiplayer compatibility verified (if applicable).
□ No known blocking bugs.
□ Code reviewed and documented.
□ Matches project guidelines.

---

# Roadmap

Version 0.4

• New Town
• Inn
• Statue
• Level System
• UI Polish

Version 0.5

• Fighter Lv5
• Action
• Reaction
• One-Hand / Two-Hand Weapons

Version 0.6

• Level 1 Spells
• Down / Revive
• Mastery System

Version 0.7 (Demo)

• New Quest UI
• NPC Animation
• Core Gameplay Complete
• Multiplayer Demo

Version 0.8

• Cleric
• Ranger

Version 0.9

• Paladin
• First Dungeon

Version 0.10

• Crafting
• Enchanting
• Rare Equipment

Version 0.11 (Beta)

• Guild
• Marketplace
• Balance Pass

Version 1.0

• Public Release
• Complete Early Game Experience

---

# Golden Rules

1. Gameplay comes before graphics.

2. Player experience comes before developer convenience.

3. Simplicity is better than unnecessary complexity.

4. Every feature must support the project's vision.

5. Players should understand every important action within three seconds.

6. Every class must have a unique identity.

7. Selenia is the symbol of Selestia Horizon.

8. Selestia should always feel peaceful, magical, and full of hope.

9. Consistency is more important than quantity.

10. Never sacrifice long-term quality for short-term speed.