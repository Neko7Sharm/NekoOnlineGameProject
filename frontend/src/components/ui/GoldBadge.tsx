import { Star } from "lucide-react";
import { C, MO } from "../../constants/theme";

export function GoldBadge({ amount }: { amount: number }) {
  return (
    <span style={{ fontFamily: MO, fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 2 }}>
      <Star className="w-3 h-3" style={{ fill: C.gold, color: C.gold }} />{amount}g
    </span>
  );
}
