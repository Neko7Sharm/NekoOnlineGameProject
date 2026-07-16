import { C, MO } from "../../constants/theme";
import { modStr } from "../../utils/dice";

export function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "4px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: MO, fontSize: 13, color: C.blue, fontWeight: 700 }}>{value}</span>
        <span style={{ fontFamily: MO, fontSize: 9, color: C.text + "80" }}>({modStr(value)})</span>
      </div>
    </div>
  );
}
