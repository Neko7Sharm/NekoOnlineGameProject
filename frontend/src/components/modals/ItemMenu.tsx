import { C, PX, NU, panel, pixelBtn } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import type { Item } from "../../types/game";

const getDamageTypeColor = (dt: string) => {
  switch (dt) {
    case "slashing": return "#e05050";
    case "piercing": return "#a39081";
    case "bludgeoning": return "#8b7355";
    case "fire": return "#ff9800";
    case "cold": return "#4fc3f7";
    case "lightning": return "#ffeb3b";
    case "poison": return "#81c784";
    case "necrotic": return "#7e57c2";
    case "radiant": return "#fff176";
    default: return C.muted;
  }
};

const getPropertyColor = (prop: string) => {
  switch (prop) {
    case "finesse": return "#4db6ac";
    case "light": return "#aed581";
    case "heavy": return "#e57373";
    case "reach": return "#ba68c8";
    case "versatile": return "#64b5f6";
    case "two-handed": return "#f06292";
    case "loading": return "#ffb74d";
    case "thrown": return "#a1887f";
    default: return C.muted;
  }
};

export function ItemMenu({ item, inInventory, onUse, onEquip, onUnequip, onDrop, onClose }: {
  item: Item; inInventory: boolean;
  onUse?: () => void; onEquip?: () => void; onUnequip?: () => void; onDrop?: () => void; onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div style={{ ...panel, width: 220, padding: 16, position: "relative" }} onClick={e => e.stopPropagation()}>
        <PixelCorners size={5} />
        <div style={{ fontFamily: PX, fontSize: 8, color: C.text, marginBottom: 4 }}>{item.name}</div>
        
        {/* WEAPON PROPERTIES TAGS */}
        {(item.damageType || (item.properties && item.properties.length > 0)) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {item.damageType && (
              <span style={{ fontFamily: NU, fontSize: 9, padding: "2px 6px", borderRadius: 2, background: getDamageTypeColor(item.damageType) + "20", color: getDamageTypeColor(item.damageType), border: `1px solid ${getDamageTypeColor(item.damageType)}40` }}>
                {item.damageType.toUpperCase()}
              </span>
            )}
            {item.properties?.map(prop => (
              <span key={prop} style={{ fontFamily: NU, fontSize: 9, padding: "2px 6px", borderRadius: 2, background: getPropertyColor(prop) + "20", color: getPropertyColor(prop), border: `1px solid ${getPropertyColor(prop)}40` }}>
                {prop.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, marginBottom: 12 }}>{item.description}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onUse && <button onClick={onUse} style={{ ...pixelBtn("primary", true) }}>USE ITEM</button>}
          {onEquip && inInventory && <button onClick={onEquip} style={{ ...pixelBtn("primary", true) }}>EQUIP</button>}
          {onUnequip && !inInventory && <button onClick={onUnequip} style={{ ...pixelBtn("primary", true) }}>UNEQUIP</button>}
          {onDrop && inInventory && <button onClick={onDrop} style={{ ...pixelBtn("danger", true) }}>DROP</button>}
          <button onClick={onClose} style={{ ...pixelBtn("ghost", true) }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
