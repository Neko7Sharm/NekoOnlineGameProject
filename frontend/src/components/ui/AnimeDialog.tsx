import { C, PX, NU, MO } from "../../constants/theme";
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
      background: "rgba(6,4,16,0.78)",
      backdropFilter: "blur(6px)",
    }}>
      <style>{`
        @keyframes dialog-popin {
          0%   { opacity: 0; transform: scale(0.7) translateY(18px); }
          60%  { opacity: 1; transform: scale(1.04) translateY(-4px); }
          80%  { transform: scale(0.97) translateY(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes dialog-icon-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-5px) scale(1.06); }
        }
        @keyframes dialog-glow-pulse {
          0%, 100% { box-shadow: 0 0 22px rgba(180,138,255,0.35), 0 0 60px rgba(180,138,255,0.12), inset 0 0 30px rgba(180,138,255,0.04); }
          50%       { box-shadow: 0 0 34px rgba(180,138,255,0.55), 0 0 80px rgba(180,138,255,0.20), inset 0 0 40px rgba(180,138,255,0.08); }
        }
        @keyframes dialog-shine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .dialog-yes-btn {
          position: relative; overflow: hidden;
          font-family: "Press Start 2P", monospace;
          font-size: 10px;
          padding: 12px 32px;
          cursor: pointer;
          background: linear-gradient(180deg, #9b73ff 0%, #6a3fcf 50%, #4d2bb5 100%);
          border: 2px solid #c59fff;
          color: #ede8ff;
          box-shadow: 0 0 18px rgba(180,138,255,0.55), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s;
          letter-spacing: 1px;
        }
        .dialog-yes-btn::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: dialog-shine 2.4s linear infinite;
        }
        .dialog-yes-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 0 28px rgba(180,138,255,0.75), 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22);
          filter: brightness(1.15);
        }
        .dialog-yes-btn:active {
          transform: translateY(1px) scale(0.97);
          box-shadow: 0 0 12px rgba(180,138,255,0.4), 0 2px 6px rgba(0,0,0,0.4);
          filter: brightness(0.95);
        }
        .dialog-no-btn {
          font-family: "Press Start 2P", monospace;
          font-size: 9px;
          padding: 11px 22px;
          cursor: pointer;
          background: rgba(30,24,54,0.9);
          border: 2px solid rgba(180,138,255,0.28);
          color: #8878b8;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          transition: border-color 0.15s, color 0.15s, transform 0.12s, background 0.15s;
          letter-spacing: 0.5px;
        }
        .dialog-no-btn:hover {
          border-color: rgba(180,138,255,0.55);
          color: #c0aaf0;
          background: rgba(40,30,70,0.95);
          transform: translateY(-1px);
        }
        .dialog-no-btn:active {
          transform: translateY(1px);
          opacity: 0.8;
        }
      `}</style>

      {/* Dialog Box */}
      <div style={{
        position: "relative",
        background: `linear-gradient(160deg, #1c1633 0%, #13102b 60%, #0f0c22 100%)`,
        border: `2px solid rgba(180,138,255,0.45)`,
        outline: `1px solid rgba(180,138,255,0.12)`,
        width: 360,
        padding: "32px 32px 28px",
        imageRendering: "pixelated",
        animation: "dialog-popin 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards, dialog-glow-pulse 3s ease-in-out 0.5s infinite",
      }}>
        <PixelCorners color={C.blue} size={9} />

        {/* Inner top glow line */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(180,138,255,0.7), transparent)",
        }} />

        {/* Icon */}
        {icon && (
          <div style={{
            textAlign: "center",
            fontSize: 48,
            marginBottom: 12,
            lineHeight: 1,
            animation: "dialog-icon-float 3s ease-in-out infinite",
            filter: "drop-shadow(0 4px 12px rgba(180,138,255,0.5))",
          }}>
            {icon}
          </div>
        )}

        {/* Title */}
        <div style={{
          fontFamily: PX,
          fontSize: 11,
          textAlign: "center",
          letterSpacing: "0.1em",
          lineHeight: 1.8,
          marginBottom: 4,
          background: "linear-gradient(90deg, #c9a0ff, #ede8ff, #c9a0ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {title}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(180,138,255,0.5), transparent)",
          margin: "14px 0",
        }} />

        {/* Message */}
        {message && (
          <div style={{
            fontFamily: NU,
            fontSize: 14,
            color: C.text + "cc",
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 1.7,
          }}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
          <button className="dialog-no-btn" onClick={onNo}>{noLabel}</button>
          <button className="dialog-yes-btn" onClick={onYes}>{yesLabel}</button>
        </div>

        {/* Bottom inner glow */}
        <div style={{
          position: "absolute", bottom: 0, left: "20%", right: "20%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(180,138,255,0.3), transparent)",
        }} />
      </div>
    </div>
  );
}
