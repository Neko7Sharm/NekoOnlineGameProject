import { C, PX, NU, panel, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import type { Item } from "../../types/game";

export function ItemMenu({ item, inInventory, onUse, onEquip, onDrop, onClose }: {
  item: Item; inInventory: boolean;
  onUse?: () => void; onEquip?: () => void; onDrop: () => void; onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ ...panel, width: 220, padding: 16, position: "relative" }} onClick={e => e.stopPropagation()}>
        <PixelCorners size={5} />
        <div style={{ fontFamily: PX, fontSize: 8, color: C.text, marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 12 }}>{item.description}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onUse && <button onClick={onUse} style={{ ...pixelBtn("primary", true) }}>USE ITEM</button>}
          {onEquip && inInventory && <button onClick={onEquip} style={{ ...pixelBtn("primary", true) }}>EQUIP</button>}
          <button onClick={onDrop} style={{ ...pixelBtn("danger", true) }}>DROP</button>
          <button onClick={onClose} style={{ ...pixelBtn("ghost", true) }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
