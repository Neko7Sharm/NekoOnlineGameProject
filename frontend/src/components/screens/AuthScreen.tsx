import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { C, PX, NU, panel, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import type { GameState } from "../../types/game";
import { persist } from "../../storage";

export function AuthScreen({ onLogin }: { onLogin: (u: string, ids: string[], gs: GameState) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [gs, setGs] = useState<GameState>(() => {
    // load lazily without circular import
    const raw = localStorage.getItem("dnd_online_v2");
    if (raw) { try { return JSON.parse(raw); } catch {} }
    return { accounts: [], characters: {}, globalChat: [], partyChat: [], party: null, dungeonMonsters: [], availableQuests: [], partyQuests: [], questRefreshAt: 0 };
  });

  function handleLogin() {
    const acc = gs.accounts.find(a => a.username === username && a.password === password);
    if (!acc) { setError("Invalid username or password."); return; }
    onLogin(username, acc.charIds, gs);
  }
  function handleRegister() {
    if (username.length < 3) { setError("Username must be 3+ characters."); return; }
    if (password.length < 4) { setError("Password must be 4+ characters."); return; }
    if (gs.accounts.find(a => a.username === username)) { setError("Username already taken."); return; }
    const newGs = { ...gs, accounts: [...gs.accounts, { username, password, charIds: [] }] };
    setGs(newGs);
    persist(newGs);
    onLogin(username, [], newGs);
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: C.card2, border: `2px solid ${C.border}`,
    color: C.text, fontFamily: NU, fontSize: 14,
    padding: "10px 12px", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 35%, #1b1238 0%, #0c081e 65%, #05030c 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", userSelect: "none" }}>
      <style>{`
        @keyframes auth-logo-fade-in {
          0% { opacity: 0; transform: scale(0.9) translateY(-15px); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes auth-orb-float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-90px) rotate(180deg); opacity: 0.2; }
        }
      `}</style>

      {/* Floating Moonlight Particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={`auth-orb-${i}`}
            style={{
              position: "absolute",
              left: `${(i * 13 + 5) % 100}%`,
              top: `${(i * 19 + 7) % 100}%`,
              width: `${(i % 3) * 4 + 4}px`,
              height: `${(i % 3) * 4 + 4}px`,
              borderRadius: "50%",
              background: i % 2 === 0 ? "#c492d6" : "#60a5fa",
              boxShadow: i % 2 === 0 ? "0 0 16px #c492d6" : "0 0 16px #60a5fa",
              animation: `auth-orb-float ${5 + (i % 5)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 390, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24, animation: "auth-logo-fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div style={{ fontFamily: PX, fontSize: 24, fontWeight: "bold", color: "#ffffff", letterSpacing: 4, textShadow: `0 0 25px ${C.gold}88, 0 4px 10px rgba(0,0,0,0.8)` }}>
            SELASTIA HORIZON
          </div>
          <div style={{ fontFamily: NU, fontSize: 12, color: C.gold, marginTop: 6, fontStyle: "italic", letterSpacing: 2 }}>
            ✨ Choice & Consequence RPG ✨
          </div>
          <div style={{ height: 2, margin: "14px auto 0", width: 160, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />
        </div>

        <div style={{ ...panel, padding: 24, position: "relative", borderRadius: 16, background: `linear-gradient(180deg, ${C.card} 0%, ${C.card2} 100%)` }}>
          <PixelCorners color={C.gold} size={6} />

          <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1, padding: "8px 4px", background: "none", border: "none",
                  borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent",
                  marginBottom: -2, cursor: "pointer",
                  fontFamily: PX, fontSize: 8,
                  color: tab === t ? C.gold : C.muted,
                  letterSpacing: 1,
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>USERNAME</div>
              <input value={username} onChange={e => setUsername(e.target.value)} style={{ ...inputStyle, borderRadius: 10 }}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>PASSWORD</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, borderRadius: 10 }}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>

            {error && (
              <div style={{ fontFamily: NU, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle className="w-3 h-3" />{error}
              </div>
            )}

            <button onClick={tab === "login" ? handleLogin : handleRegister}
              style={{ ...pixelBtn("primary"), width: "100%", marginTop: 4, letterSpacing: 1, borderRadius: 10 }}>
              {tab === "login" ? "ENTER REALM" : "CREATE ACCOUNT"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontFamily: NU, fontSize: 11, color: C.muted }}>
          Data saved in your browser · Demo mode
        </div>
      </div>
    </div>
  );
}
