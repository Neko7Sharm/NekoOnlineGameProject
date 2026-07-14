import { C, PX, NU, panel, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "./PixelCorners";

export function AnimeDialog({ icon, title, message, onYes, onNo, yesLabel = "YES", noLabel = "NO" }: {
  icon?: string; title: string; message?: string;
  onYes: () => void; onNo: () => void;
  yesLabel?: string; noLabel?: string;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)",
    }}>
      <div style={{
        position: "relative",
        background: C.card,
        border: `3px solid ${C.blue}`,
        boxShadow: `0 0 0 1px ${C.bg}, ${C.glowStrong}, inset 0 0 40px rgba(180,138,255,0.06)`,
        width: 340,
        padding: "28px 28px 24px",
        imageRendering: "pixelated",
      }}>
        <PixelCorners color={C.blue} size={8} />

        {icon && (
          <div style={{ textAlign: "center", fontSize: 40, marginBottom: 10, lineHeight: 1 }}>{icon}</div>
        )}

        <div style={{
          fontFamily: PX, fontSize: 10, color: C.blue,
          textAlign: "center", lineHeight: 2, marginBottom: 10,
          letterSpacing: "0.05em",
        }}>{title}</div>

        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}60, transparent)`, margin: "8px 0 14px" }} />

        {message && (
          <div style={{ fontFamily: NU, fontSize: 13, color: C.text + "cc", textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>{message}</div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onNo} style={pixelBtn("ghost")}>{noLabel}</button>
          <button onClick={onYes} style={pixelBtn("primary")}>{yesLabel}</button>
        </div>
      </div>
    </div>
  );
}
