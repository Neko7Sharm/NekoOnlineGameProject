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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 37px,${C.blue} 38px),repeating-linear-gradient(90deg,transparent,transparent 37px,${C.blue} 38px)`,
      }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(94,184,255,0.06) 0%, transparent 70%)` }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 360, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: PX, fontSize: 20, color: C.blue, lineHeight: 1.6, letterSpacing: 2, textShadow: `0 0 20px ${C.blue}, 0 0 40px rgba(94,184,255,0.4)` }}>
            DnD<br />Online
          </div>
          <div style={{ fontFamily: NU, fontSize: 12, color: C.muted, marginTop: 8, fontStyle: "italic" }}>
            ✨ Embark on your legend ✨
          </div>
          <div style={{ height: 2, margin: "12px auto 0", width: 120, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)` }} />
        </div>

        <div style={{ ...panel, padding: 24, position: "relative" }}>
          <PixelCorners color={C.blue} size={6} />

          <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1, padding: "8px 4px", background: "none", border: "none",
                  borderBottom: tab === t ? `2px solid ${C.blue}` : "2px solid transparent",
                  marginBottom: -2, cursor: "pointer",
                  fontFamily: PX, fontSize: 8,
                  color: tab === t ? C.blue : C.muted,
                  letterSpacing: 1,
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>USERNAME</div>
              <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>PASSWORD</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
                onKeyDown={e => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
            </div>

            {error && (
              <div style={{ fontFamily: NU, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle className="w-3 h-3" />{error}
              </div>
            )}

            <button onClick={tab === "login" ? handleLogin : handleRegister}
              style={{ ...pixelBtn("primary"), width: "100%", marginTop: 4, letterSpacing: 1 }}>
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
