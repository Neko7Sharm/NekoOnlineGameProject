import { useState, useEffect } from "react";
import { C, PX, NU } from "../../constants/theme";
import { audioManager } from "../../utils/audioManager";

interface TitleSplashScreenProps {
  onStart: () => void;
}

export function TitleSplashScreen({ onStart }: TitleSplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start playing Moonlit Gate BGM as soon as Title Splash loads
    audioManager.playBGM("auth");

    const handleInput = () => {
      audioManager.playBGM("auth");
      if (fadingOut) return;
      setFadingOut(true);
      audioManager.playSFX("click");
      setTimeout(() => {
        onStart();
      }, 500); // 500ms fade-out duration
    };

    window.addEventListener("keydown", handleInput);
    window.addEventListener("pointerdown", handleInput);

    return () => {
      window.removeEventListener("keydown", handleInput);
      window.removeEventListener("pointerdown", handleInput);
    };
  }, [fadingOut, onStart]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "radial-gradient(circle at 50% 35%, #1b1238 0%, #0c081e 65%, #05030c 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        overflow: "hidden",
        cursor: "pointer",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.5s ease-out",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes title-logo-fade-in {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes title-sub-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 0.9; transform: translateY(0); }
        }
        @keyframes title-press-key-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes title-orb-float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100px) rotate(180deg); opacity: 0.2; }
        }
      `}</style>

      {/* Background Generated Artwork Placeholder Hook */}
      <img
        src="/assets/title_splash_bg.png"
        onError={(e) => (e.currentTarget.style.display = "none")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.65,
          pointerEvents: "none",
          zIndex: 0,
        }}
        alt="Title Background Art"
      />

      {/* Floating Orbs / Moonlight Particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={`title-orb-${i}`}
            style={{
              position: "absolute",
              left: `${(i * 13 + 5) % 100}%`,
              top: `${(i * 19 + 7) % 100}%`,
              width: `${(i % 3) * 4 + 4}px`,
              height: `${(i % 3) * 4 + 4}px`,
              borderRadius: "50%",
              background: i % 2 === 0 ? "#c492d6" : "#60a5fa",
              boxShadow: i % 2 === 0 ? "0 0 16px #c492d6" : "0 0 16px #60a5fa",
              animation: `title-orb-float ${5 + (i % 5)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Central Title Logo (Centered in exact middle of screen) */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          animation: "title-logo-fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div
          style={{
            fontFamily: PX,
            fontSize: 52,
            fontWeight: "bold",
            color: "#ffffff",
            letterSpacing: 6,
            textAlign: "center",
            textShadow: "0 0 40px rgba(196, 146, 214, 0.8), 0 0 80px rgba(96, 165, 250, 0.5), 0 4px 12px rgba(0,0,0,0.9)",
            background: "linear-gradient(180deg, #ffffff 0%, #e2d5ed 50%, #b898d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          SELASTIA HORIZON
        </div>
        <div
          style={{
            fontFamily: NU,
            fontSize: 14,
            fontWeight: 600,
            color: C.gold,
            letterSpacing: 4,
            textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            animation: "title-sub-fade-in 1.8s ease-out forwards",
          }}
        >
          Choice & Consequence RPG
        </div>
      </div>

      {/* Bottom Action: Press Any Key to Start */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          animation: "title-press-key-pulse 2.2s ease-in-out infinite",
        }}
      >
        <div
          style={{
            fontFamily: PX,
            fontSize: 15,
            color: "#ffffff",
            letterSpacing: 2,
            textShadow: "0 0 16px rgba(255,255,255,0.8), 0 2px 6px #000",
          }}
        >
          PRESS ANY KEY TO START
        </div>
        <div
          style={{
            fontFamily: NU,
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 1,
          }}
        >
          (Or Click Anywhere to Begin)
        </div>
      </div>
    </div>
  );
}
