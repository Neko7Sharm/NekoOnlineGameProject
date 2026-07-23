// ─────────────────────────────────────────────────
// SELASTIA HORIZON - AUDIO MANAGER
// Manages BGM crossfading, loop, volume & SFX playback
// Following docs/AUDIO_BIBLE.md & docs/TECHNICAL_RULES.md
// ─────────────────────────────────────────────────

class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private masterVolume: number = 1.0;
  private bgmVolume: number = 0.7;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = false;
  private userInteracted: boolean = false;
  private lastScreen: "auth" | "charSelect" | "charCreate" | "worldMap" | "town" | "sanctuary" | "dungeon" | "combat" | "bossCombat" | null = null;
  private listeners: Set<() => void> = new Set();

  public getMasterVolume(): number { return this.masterVolume; }
  public getBgmVolume(): number { return this.bgmVolume; }
  public getSfxVolume(): number { return this.sfxVolume; }
  public getIsMuted(): boolean { return this.isMuted; }

  private applyVolumes() {
    if (this.currentAudio) {
      if (this.isMuted) {
        this.currentAudio.volume = 0;
      } else {
        this.currentAudio.volume = this.masterVolume * this.bgmVolume;
      }
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.isMuted && vol > 0) {
      this.isMuted = false;
    }
    this.applyVolumes();
    if (this.currentAudio && !this.isMuted && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    }
    this.notifyListeners();
  }

  public setBgmVolume(vol: number) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.isMuted && vol > 0) {
      this.isMuted = false;
    }
    this.applyVolumes();
    if (this.currentAudio && !this.isMuted && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    }
    this.notifyListeners();
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.isMuted && vol > 0) {
      this.isMuted = false;
      this.applyVolumes();
      if (this.currentAudio && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
    }
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyVolumes();
    if (this.currentAudio) {
      if (this.isMuted) {
        this.currentAudio.pause();
      } else {
        this.currentAudio.volume = this.masterVolume * this.bgmVolume;
        this.currentAudio.play().catch(() => {});
      }
    }
    this.notifyListeners();
    return this.isMuted;
  }

  // BGM Track Candidates Dictionary
  private tracks: Record<string, string[]> = {
    auth: ["/assets/bgm/Moonlit Gate.mp3", "/assets/bgm/MoonlitGate.mp3", "/assets/bgm/bgm_mainmenu.mp3"],
    charSelect: ["/assets/bgm/Moonlit Gate.mp3", "/assets/bgm/MoonlitGate.mp3", "/assets/bgm/bgm_mainmenu.mp3"],
    charCreate: ["/assets/bgm/Moonlit Gate.mp3", "/assets/bgm/MoonlitGate.mp3", "/assets/bgm/bgm_mainmenu.mp3"],
    worldMap: ["/assets/bgm/Moonlit Gate.mp3", "/assets/bgm/MoonlitGate.mp3", "/assets/bgm/bgm_mainmenu.mp3"],
    town: ["/assets/bgm/A New Horizon.mp3", "/assets/bgm/bgm_town.mp3"],
    sanctuary: ["/assets/bgm/Moonflower Sanctuary.mp3", "/assets/bgm/bgm_sanctuary.mp3"],
    dungeon: ["/assets/bgm/Moonlit Fern Path.mp3", "/assets/bgm/MoonlitFernPath.mp3", "/assets/bgm/bgm_dungeon.mp3"],
    combat: ["/assets/bgm/Moonlit Dice Chase.mp3", "/assets/bgm/MoonlitDiceChase.mp3", "/assets/bgm/bgm_combat.mp3"],
    bossCombat: ["/assets/bgm/Ivory Guardian.mp3", "/assets/bgm/IvoryGuardian.mp3", "/assets/bgm/Moonlit Dice Chase.mp3"],
  };

  constructor() {
    this.initUserInteractionListener();
  }

  /**
   * Listen for first click / keypress to unlock browser audio autoplay
   */
  private initUserInteractionListener() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      this.userInteracted = true;
      if (this.lastScreen) {
        const screenToPlay = this.lastScreen;
        this.lastScreen = null;
        this.playBGM(screenToPlay);
      } else if (this.currentAudio && !this.isMuted && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      } else if (!this.currentAudio) {
        this.playBGM("auth");
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("click", unlock);
      window.removeEventListener("pointermove", unlock);
      window.removeEventListener("mousemove", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("click", unlock);
    window.addEventListener("pointermove", unlock);
    window.addEventListener("mousemove", unlock);
    window.addEventListener("touchstart", unlock);
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb());
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play or crossfade to a new BGM track based on screen / state
   */
  public playBGM(screen: "auth" | "charSelect" | "charCreate" | "worldMap" | "town" | "sanctuary" | "dungeon" | "combat" | "bossCombat") {
    this.lastScreen = screen;
    const candidates = this.tracks[screen];
    if (!candidates || candidates.length === 0) return;

    // Use primary candidate track URL
    const trackUrl = candidates[0];
    if (this.currentTrack === trackUrl && this.currentAudio && !this.currentAudio.paused) return;

    this.currentTrack = trackUrl;

    // Fade out current audio
    if (this.currentAudio) {
      const oldAudio = this.currentAudio;
      let fadeVol = oldAudio.volume;
      const fadeOut = setInterval(() => {
        fadeVol = Math.max(0, fadeVol - 0.05);
        oldAudio.volume = fadeVol;
        if (fadeVol <= 0) {
          clearInterval(fadeOut);
          oldAudio.pause();
        }
      }, 50);
    }

    // Try playing candidates in sequence if file not found
    const tryPlayCandidate = (index: number) => {
      if (index >= candidates.length) return;
      const url = candidates[index];
      const newAudio = new Audio(encodeURI(url));
      newAudio.loop = true;
      newAudio.volume = 0;
      this.currentAudio = newAudio;

      if (!this.isMuted) {
        newAudio.play().then(() => {
          let fadeInVol = 0;
          const targetVol = this.masterVolume * this.bgmVolume;
          const fadeIn = setInterval(() => {
            fadeInVol = Math.min(targetVol, fadeInVol + 0.05);
            newAudio.volume = fadeInVol;
            if (fadeInVol >= targetVol) {
              clearInterval(fadeIn);
            }
          }, 50);
        }).catch(err => {
          // If primary candidate fails (e.g. file name variant), try fallback candidate
          if (index + 1 < candidates.length) {
            tryPlayCandidate(index + 1);
          } else {
            console.warn("BGM track missing or autoplay prevented:", url, err);
          }
        });
      }
    };

    tryPlayCandidate(0);
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Set global BGM volume (0.0 to 1.0)
   */
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.volume;
    }
    this.notifyListeners();
  }

  /**
   * Toggle mute / unmute
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      if (this.isMuted) {
        this.currentAudio.pause();
      } else {
        this.currentAudio.play().catch(() => {});
        this.currentAudio.volume = this.volume;
      }
    }
    this.notifyListeners();
    return this.isMuted;
  }

  /**
   * Play a Sound Effect (SFX)
   */
  public playSFX(name: string) {
    if (this.isMuted) return;
    try {
      const sfx = new Audio(`/assets/sfx/sfx_${name}.mp3`);
      sfx.volume = Math.min(1, this.volume * 1.2);
      sfx.play().catch(() => {});
    } catch (e) {
      // Ignore missing SFX files gracefully
    }
  }
}

export const audioManager = new AudioManager();
