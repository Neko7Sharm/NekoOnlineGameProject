import { C, PX, NU, MO } from "../../constants/theme";
import { PixelCorners } from "../ui/PixelCorners";
import type { Item } from "../../types/game";
import { getVersatileDamage2H } from "../../utils/dice";
import { SHOP_ITEMS } from "../../constants/items";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getDamageTypeColor = (dt: string) => {
  switch (dt) {
    case "slashing":    return "#e05050";
    case "piercing":    return "#c0a060";
    case "bludgeoning": return "#a08060";
    case "fire":        return "#ff9800";
    case "cold":        return "#4fc3f7";
    case "lightning":   return "#ffeb3b";
    case "poison":      return "#81c784";
    case "necrotic":    return "#b39ddb";
    case "radiant":     return "#fff176";
    default:            return C.muted;
  }
};

export const PROPERTY_META: Record<string, { color: string; icon: string; label: string; desc: string }> = {
  light:        { color: "#aed581", icon: "🗡️",  label: "LIGHT",       desc: "Usable with Dual Wield." },
  finesse:      { color: "#4db6ac", icon: "🎯",  label: "FINESSE",     desc: "Uses STR or DEX — whichever is higher." },
  heavy:        { color: "#e57373", icon: "🪓",  label: "HEAVY",       desc: "A powerful, weighty weapon." },
  reach:        { color: "#ba68c8", icon: "📏",  label: "REACH",       desc: "Attack enemies 2 tiles away." },
  versatile:    { color: "#64b5f6", icon: "⚔️",  label: "VERSATILE",   desc: "1H with shield · 2H for bonus damage." },
  "two-handed": { color: "#f06292", icon: "🛡",  label: "TWO-HANDED",  desc: "Requires both hands. No shield." },
  loading:      { color: "#ffb74d", icon: "🔄",  label: "LOADING",     desc: "Must reload between shots." },
  thrown:       { color: "#a1887f", icon: "💨",  label: "THROWN",      desc: "Can be thrown at range." },
};

export function PropertyTag({ prop, small = false }: { prop: string; small?: boolean }) {
  const meta = PROPERTY_META[prop];
  const color = meta?.color ?? C.muted;
  return (
    <span style={{
      fontFamily: PX, fontSize: small ? 7 : 8,
      padding: small ? "1px 4px" : "2px 7px",
      background: color + "18",
      color,
      border: `1px solid ${color}35`,
      display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
    }}>
      {meta?.icon && <span style={{ fontSize: small ? 8 : 10 }}>{meta.icon}</span>}
      {meta?.label ?? prop.toUpperCase()}
    </span>
  );
}

export function DamageTypeTag({ dt, small = false }: { dt: string; small?: boolean }) {
  const color = getDamageTypeColor(dt);
  return (
    <span style={{
      fontFamily: PX, fontSize: small ? 7 : 8,
      padding: small ? "1px 4px" : "2px 7px",
      background: color + "18", color,
      border: `1px solid ${color}35`,
      display: "inline-flex", alignItems: "center",
    }}>
      {dt.toUpperCase()}
    </span>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, letterSpacing: 1.5, marginBottom: 5 }}>
      {children}
    </div>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value, color = C.blue }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
      <span style={{ fontFamily: NU, fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontFamily: MO, fontSize: 12, color }}>{value}</span>
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ label, onClick, variant = "primary" }: { label: string; onClick: () => void; variant?: "primary" | "danger" | "ghost" }) {
  const colors = {
    primary: { bg: "#4a3f8a", border: "#7060cc", text: "#c8c0f8", hover: "#5a4f9a" },
    danger:  { bg: "#6a2030", border: "#c04060", text: "#f8a0b0", hover: "#7a2540" },
    ghost:   { bg: "transparent", border: C.border, text: C.muted, hover: C.card2 },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "9px 0",
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.text, fontFamily: PX, fontSize: 8,
        cursor: "pointer", letterSpacing: 1, transition: "all 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = c.hover)}
      onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
    >
      {label}
    </button>
  );
}

// ─── Main ItemMenu ────────────────────────────────────────────────────────────

export function ItemMenu({ item, inInventory, onUse, onEquip, onUnequip, onDrop, onClose }: {
  item: Item; inInventory: boolean;
  onUse?: () => void; onEquip?: () => void; onUnequip?: () => void; onDrop?: () => void; onClose: () => void;
}) {
  // Merge latest catalog data so old saved items get correct properties
  const catalog = SHOP_ITEMS.find(c => c.id === item.id);
  const merged: Item = catalog ? { ...catalog, ...item, properties: catalog.properties, damageType: catalog.damageType ?? item.damageType, hands: catalog.hands ?? item.hands, damage: catalog.damage ?? item.damage, effect: catalog.effect ?? item.effect } : item;

  const isShield    = merged.type === "weapon" && merged.effect === "guard";
  const isWeapon    = merged.type === "weapon" && merged.damage !== "0" && !isShield;
  const isArmor     = merged.type === "armor";
  const isConsumable = merged.type === "consumable";
  const isAccessory  = merged.type === "accessory";

  const isVersatile  = merged.properties?.includes("versatile");
  const isTwoHanded  = merged.properties?.includes("two-handed");
  const isFinesse    = merged.properties?.includes("finesse");
  const hasReach     = merged.properties?.includes("reach");
  const isRanged     = (merged.range ?? 5) > 5;

  const damage1H = merged.damage ?? "1d4";
  const damage2H = isVersatile ? getVersatileDamage2H(damage1H) : null;

  const typeIcon = isShield ? "🛡️" : isWeapon ? "⚔️" : isArmor ? "🛡️" : isConsumable ? "🧪" : "💍";
  const handsLabel = isShield ? "SHIELD" : isWeapon
    ? (isTwoHanded ? "TWO-HANDED" : isVersatile ? "VERSATILE" : "ONE-HANDED")
    : null;
  const handsColor = isShield ? "#64b5f6" : isTwoHanded ? "#f06292" : isVersatile ? "#64b5f6" : C.muted;

  const statModLabel = isFinesse ? "STR or DEX" : isRanged ? "DEX" : "STR";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        style={{ position: "relative", width: 270, background: C.card, border: `1px solid ${C.border}`, padding: "18px 18px 14px" }}
        onClick={e => e.stopPropagation()}
      >
        <PixelCorners size={5} />

        {/* ── Header ─────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, flexShrink: 0,
            background: C.card2, border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>
            {typeIcon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: PX, fontSize: 11, color: C.text, marginBottom: 3 }}>{merged.name}</div>
            {handsLabel && (
              <div style={{ fontFamily: PX, fontSize: 7, color: handsColor, letterSpacing: 1, marginBottom: 4 }}>{handsLabel}</div>
            )}
            {/* Tags row */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {merged.damageType && !isWeapon && <DamageTypeTag dt={merged.damageType} small />}
            </div>
          </div>
        </div>

        {/* ── Shield Stats ───────────────────────── */}
        {isShield && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
            <SectionLabel>SHIELD</SectionLabel>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MO, fontSize: 22, color: C.blue }}>+2</div>
                <div style={{ fontFamily: PX, fontSize: 6, color: C.muted }}>ARMOR CLASS</div>
              </div>
              <div style={{ width: 1, height: 32, background: C.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MO, fontSize: 22, color: "#ff9800" }}>1d4</div>
                <div style={{ fontFamily: PX, fontSize: 6, color: C.muted }}>GUARD [EXTRA]</div>
              </div>
            </div>
            <div style={{ fontFamily: NU, fontSize: 11, color: C.muted, lineHeight: 1.4, borderTop: `1px solid ${C.border}25`, paddingTop: 6 }}>
              Guard reduces incoming damage by 1d4 + CON modifier.
            </div>
          </div>
        )}

        {/* ── Weapon Stats ───────────────────────── */}
        {isWeapon && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
            <SectionLabel>DAMAGE</SectionLabel>
            {isVersatile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: MO, fontSize: 20, color: C.red }}>{damage1H}</div>
                  <div style={{ fontFamily: PX, fontSize: 6, color: C.muted }}>1 HAND</div>
                </div>
                <div style={{ fontFamily: MO, fontSize: 14, color: C.muted + "60" }}>/</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: MO, fontSize: 20, color: "#ff9800" }}>{damage2H}</div>
                  <div style={{ fontFamily: PX, fontSize: 6, color: "#ff9800" }}>2 HAND (AUTO)</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  {merged.damageType && <DamageTypeTag dt={merged.damageType} />}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: MO, fontSize: 26, color: C.red }}>{damage1H}</div>
                {merged.damageType && <DamageTypeTag dt={merged.damageType} />}
                {isRanged && (
                  <span style={{ fontFamily: PX, fontSize: 7, color: "#ba68c8", marginLeft: "auto" }}>📏 {(merged.range ?? 0) / 5} tiles</span>
                )}
              </div>
            )}
            {/* Modifier + Reach row */}
            <div style={{ borderTop: `1px solid ${C.border}30`, paddingTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontFamily: NU, fontSize: 11, color: C.muted }}>
                Modifier: <span style={{ color: C.blue, fontFamily: MO, fontSize: 11 }}>{statModLabel}</span>
              </div>
              {hasReach && (
                <div style={{ fontFamily: PX, fontSize: 7, color: "#ba68c8", marginLeft: "auto" }}>📏 REACH (2 tiles)</div>
              )}
            </div>
          </div>
        )}

        {/* ── Armor Stats ────────────────────────── */}
        {isArmor && merged.ac && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
            <SectionLabel>ARMOR CLASS</SectionLabel>
            <div style={{ fontFamily: MO, fontSize: 26, color: C.blue }}>AC {merged.ac}</div>
          </div>
        )}

        {/* ── Consumable ─────────────────────────── */}
        {isConsumable && (merged.healAmount || merged.damage) && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
            {merged.healAmount && (
              <>
                <SectionLabel>HEALS</SectionLabel>
                <div style={{ fontFamily: MO, fontSize: 24, color: "#81c784" }}>+{merged.healAmount}</div>
              </>
            )}
            {!merged.healAmount && merged.damage && (
              <>
                <SectionLabel>DAMAGE</SectionLabel>
                <div style={{ fontFamily: MO, fontSize: 24, color: C.red }}>{merged.damage}</div>
                {merged.aoeRadius && <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginTop: 4 }}>AOE {merged.aoeRadius} radius · DEX save DC {merged.saveDC}</div>}
              </>
            )}
          </div>
        )}

        {/* ── Accessory Stats ────────────────────── */}
        {isAccessory && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
            <SectionLabel>BONUS</SectionLabel>
            {merged.ac && <div style={{ fontFamily: MO, fontSize: 20, color: C.blue }}>+{merged.ac} AC</div>}
            {merged.stat && merged.bonus && <div style={{ fontFamily: MO, fontSize: 20, color: C.green }}>+{merged.bonus} {merged.stat.toUpperCase()}</div>}
          </div>
        )}

        {/* ── Properties ─────────────────────────── */}
        {merged.properties && merged.properties.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>PROPERTIES</SectionLabel>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {merged.properties.map(prop => <PropertyTag key={prop} prop={prop} />)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {merged.properties.filter(p => PROPERTY_META[p]).map(prop => (
                <div key={prop} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{PROPERTY_META[prop].icon}</span>
                  <span style={{ fontFamily: NU, fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{PROPERTY_META[prop].desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Description ────────────────────────── */}
        <div style={{
          fontFamily: NU, fontSize: 11, color: C.muted + "cc",
          lineHeight: 1.6, borderTop: `1px solid ${C.border}25`,
          paddingTop: 10, marginBottom: 14,
        }}>
          {merged.description}
        </div>

        {/* ── Actions ────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onUse     && <ActionBtn label="USE ITEM"  onClick={onUse}    variant="primary" />}
          {onEquip   && <ActionBtn label="EQUIP"     onClick={onEquip}  variant="primary" />}
          {onUnequip && <ActionBtn label="UNEQUIP"   onClick={onUnequip} variant="ghost" />}
          {onDrop    && inInventory && <ActionBtn label="DROP" onClick={onDrop} variant="danger" />}
          <ActionBtn label="CLOSE" onClick={onClose} variant="ghost" />
        </div>
      </div>
    </div>
  );
}
