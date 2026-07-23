# Background Music (BGM) Assets Folder

Place your audio files (`.mp3` or `.ogg`) in this folder using the following standardized filenames matching `docs/AUDIO_BIBLE.md` and `docs/TECHNICAL_RULES.md`:

## Required BGM Files:
1. `bgm_town.mp3` (or `.ogg`) - Warm, acoustic, welcoming village theme
2. `bgm_sanctuary.mp3` (or `.ogg`) - Soft piano & harp gentle sanctuary theme
3. `bgm_dungeon.mp3` (or `.ogg`) - Mysterious, ambient Whispering Forest & dungeon theme
4. `bgm_combat.mp3` (or `.ogg`) - Energetic fantasy orchestral combat theme

## Audio Manager Utility:
All music tracks are automatically managed by `frontend/src/utils/audioManager.ts`.
Simply copy your `.mp3` or `.ogg` files into this directory and the game engine will automatically load and crossfade them as the player travels between maps!
