# UI Design Guide

## Philosophy
The UI must make important state legible without breaking immersion. 
- Pixel-art styling, readable contrast, and responsive interactions take priority over decorative complexity.
- Avoid futuristic or sci-fi interfaces.

## Separation of Concept and Calculation
- **Selenia's Role (Lore & Concepts)**: Selenia explains the "Concepts" (e.g., what a Modifier is, how Armor Class works) in a friendly, conversational manner.
- **Status Screen's Role (Math & Transparency)**: The Status UI is responsible for showing the "Actual Numbers" and exact "Calculation Methods" (e.g., Base HP + Con Mod + Level Bonus). It acts as the mathematical truth for players who want to understand exact mechanics.

## Terminology & Immersion
- Prefer in-world wording where possible. 
- Instead of a generic "Contact Developer" button, use **Tell Selenia**.
- Use standardized action verbs across all windows (see `STYLE_GUIDE.md`).

## Visual Style
- **Windows**: Dark translucent panels.
- **Borders**: Rounded corners with gold decorations.
- **Highlights**: Purple highlights for selected elements.
- **Icons**: Pixel-art icons to match the game aesthetic.
