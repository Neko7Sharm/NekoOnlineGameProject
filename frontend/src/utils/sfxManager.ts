// ─────────────────────────────────────────────────
// SELestia HORIZON - Sound Effects Manager (SFX)
// ─────────────────────────────────────────────────

import { audioManager } from "./audioManager";

export type SFXType = "click" | "gold" | "warp" | "slash" | "spell" | "hit" | "heal";

class SFXManager {
  private paths: Record<SFXType, string> = {
    click: "/assets/sfx/ui/click.wav",
    gold: "/assets/sfx/ui/gold.wav",
    warp: "/assets/sfx/movement/warp.wav",
    slash: "/assets/sfx/combat/slash.wav",
    spell: "/assets/sfx/combat/spell.wav",
    hit: "/assets/sfx/combat/hit.wav",
    heal: "/assets/sfx/environment/heal.wav",
  };

  play(name: SFXType, customVol?: number) {
    if (audioManager.getIsMuted()) return;
    const url = this.paths[name];
    if (!url) return;

    const master = audioManager.getMasterVolume();
    const sfx = audioManager.getSfxVolume();
    const finalVol = customVol !== undefined ? customVol * master : master * sfx;

    if (finalVol <= 0) return;

    try {
      const audio = new Audio(encodeURI(url));
      audio.volume = Math.max(0, Math.min(1, finalVol));
      audio.play().catch(() => {
        // Audio unlock silent fallback
      });
    } catch {
      // Ignore audio playback errors
    }
  }
}

export const sfxManager = new SFXManager();
