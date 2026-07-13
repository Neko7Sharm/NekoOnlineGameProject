import { C, MO } from "../../constants/theme";
import { modStr } from "../../utils/dice";

export function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "6px 8px", textAlign: "center", minWidth: 50 }}>
      <div style={{ fontFamily: MO, fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: MO, fontSize: 14, color: C.blue, fontWeight: 700 }}>{value}</div>
      <div style={{ fontFamily: MO, fontSize: 9, color: C.text + "80" }}>{modStr(value)}</div>
    </div>
  );
}
