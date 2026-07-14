import { useState, useEffect, useRef } from "react";
import { Star, X } from "lucide-react";
import { C, PX, NU, MO, pixelBtn } from "../../constants/theme";
import { SHOP_ITEMS } from "../../constants/items";
import type { Character, Item } from "../../types/game";

import npcShopImg from "../../assets/npc/npc_01.png";
import npcShopImg2 from "../../assets/npc/npc_02.png";
import npcShopImg3 from "../../assets/npc/npc_03.png";

const BUY_QUOTES = [
  "You have a great eye for quality!",
  "Thank you so much for your purchase~!",
  "Have a safe journey out there!",
  "Come back and visit me again soon!",
  "I get new items all the time, so keep checking back!"
];

const IDLE_QUOTES = [
  "Hesitating? Don't worry, everything here is of the finest quality!",
  "Do you need any help finding something?",
  "These weapons were just polished today!",
  "Let me know if you need any assistance!",
  "Welcome in! Take your time looking around."
];

export function ShopModal({ char, onBuy, onClose }: { char: Character; onBuy: (item: Item) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"weapon" | "armor" | "consumable" | "accessory">("weapon");
  const [tabKey, setTabKey] = useState(0);
  const items = SHOP_ITEMS.filter(i => i.type === tab);

  type NpcFace = "talk" | "happy" | "idle" | "exiting";
  const [npcFace, setNpcFace] = useState<NpcFace>("talk");
  const [npcEntered, setNpcEntered] = useState(false);
  const [npcExiting, setNpcExiting] = useState(false);
  const [npcBounce, setNpcBounce] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const [bubbleText, setBubbleText] = useState<string>("");
  const [bubbleShow, setBubbleShow] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  function after(ms: number, fn: () => void) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }

  useEffect(() => {
    after(60, () => setNpcEntered(true));
    after(480, () => setPanelVisible(true));
    after(800, () => {
      setNpcFace("talk");
      setBubbleText("Welcome, adventurer! Looking for something special today?");
      setBubbleShow(true);
    });
    after(6200, () => setBubbleShow(false));
    after(6700, () => { setNpcFace("idle"); setBubbleText(""); });
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (npcFace === "idle") {
      const waitTime = 6000 + Math.random() * 8000;
      const t = setTimeout(() => {
        setNpcFace("talk");
        setBubbleText(IDLE_QUOTES[Math.floor(Math.random() * IDLE_QUOTES.length)]);
        setBubbleShow(true);
        after(7000, () => setBubbleShow(false));
        after(5500, () => { setNpcFace("idle"); setBubbleText(""); });
      }, waitTime);
      timersRef.current.push(t);
      return () => clearTimeout(t);
    }
  }, [npcFace]);

  function handleTabChange(t: typeof tab) {
    setTab(t);
    setTabKey(k => k + 1);
  }

  function handleBuy(item: Item) {
    if (char.gold < item.value) return;
    onBuy(item);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const quote = BUY_QUOTES[Math.floor(Math.random() * BUY_QUOTES.length)];
    setBubbleShow(false);
    after(100, () => {
      setNpcFace("happy");
      setNpcBounce(true);
      setBubbleText(quote);
      setBubbleShow(true);
    });
    after(700, () => setNpcBounce(false));
    after(6700, () => setBubbleShow(false));
    after(7200, () => { setNpcFace("idle"); setBubbleText(""); });
  }

  function handleClose() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setNpcFace("talk");
    setBubbleText("Come back soon, adventurer!");
    setBubbleShow(true);
    after(200, () => setPanelExiting(true));
    after(1100, () => setBubbleShow(false));
    after(1400, () => setNpcExiting(true));
    after(2100, () => onClose());
  }

  const npcSrc = npcFace === "talk" ? npcShopImg : npcFace === "happy" ? npcShopImg2 : npcShopImg3;

  const wood1 = "#3d2006", wood2 = "#6b3a1f", wood3 = "#a0622a", wood4 = "#c8884e", wood5 = "#e8c49a";
  const cream = "#fdf4e7", cream2 = "#f5e8d0";
  const paperBg = "linear-gradient(170deg, #fdf6e8 0%, #f5e8d0 60%, #ede0c4 100%)";
  const borderW = "#c0905a";
  const tabActive = "#7a4010";
  const tabIcons: Record<string, string> = { weapon: "⚔️", armor: "🛡️", consumable: "🧪", accessory: "💍" };
  const tabLabels: Record<string, string> = { weapon: "Weapons", armor: "Armors", consumable: "Potions", accessory: "Accessories" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      display: "flex", alignItems: "stretch",
      background: "rgba(20, 10, 4, 0.78)",
      backdropFilter: "blur(3px)",
    }}>
      <style>{`
        @keyframes shop-npc-in { 0%{transform:translateX(-115%)} 72%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes shop-npc-out { 0%{transform:translateX(0)} 100%{transform:translateX(-115%)} }
        @keyframes shop-panel-in { 0%{transform:translateX(70px);opacity:0} 70%{transform:translateX(-4px);opacity:1} 100%{transform:translateX(0);opacity:1} }
        @keyframes shop-panel-out { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(80px);opacity:0} }
        @keyframes shop-item-in { 0%{transform:translateX(36px) scaleX(0.92);opacity:0} 65%{transform:translateX(-2px) scaleX(1.01);opacity:1} 100%{transform:translateX(0) scaleX(1);opacity:1} }
        @keyframes npc-breathe { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-7px)} }
        @keyframes npc-bounce-once { 0%{transform:translateX(-50%) translateY(0px) scale(1)} 25%{transform:translateX(-50%) translateY(-22px) scale(1.04)} 55%{transform:translateX(-50%) translateY(6px) scale(0.97)} 75%{transform:translateX(-50%) translateY(-8px) scale(1.01)} 100%{transform:translateX(-50%) translateY(0px) scale(1)} }
        @keyframes wood-shine { 0%{opacity:0} 50%{opacity:0.08} 100%{opacity:0} }
        @keyframes bubble-pop-in { 0%{transform:scale(0.5) translateY(8px);opacity:0} 70%{transform:scale(1.04) translateY(-2px);opacity:1} 100%{transform:scale(1) translateY(0);opacity:1} }
        @keyframes bubble-fade-out { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.85) translateY(-4px)} }
      `}</style>

      {/* LEFT PANEL: NPC */}
      <div style={{
        width: "25%", flexShrink: 0, position: "relative",
        background: `linear-gradient(180deg, #1a0c04 0%, #2d1606 50%, #3d2008 100%)`,
        borderRight: `4px solid ${wood2}`,
        overflow: "hidden",
        animation: npcExiting ? "shop-npc-out 0.7s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
          : npcEntered ? "shop-npc-in 0.75s cubic-bezier(0.34, 1.4, 0.64, 1) forwards" : "none",
        transform: "translateX(-115%)",
      }}>
        {[0.15, 0.35, 0.55, 0.72, 0.88].map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0, top: `${p * 100}%`,
            height: 1, background: `${wood2}40`,
            animation: `wood-shine 4s ease-in-out ${i * 0.8}s infinite`,
          }} />
        ))}

        <img src={npcSrc} alt="Shop NPC"
          style={{
            position: "absolute", bottom: 0, left: "50%",
            transform: "translateX(-50%)", width: "100%", height: "auto",
            imageRendering: "pixelated", display: "block",
            animation: npcBounce ? "npc-bounce-once 0.6s cubic-bezier(0.34, 1.5, 0.64, 1) forwards" : "npc-breathe 3.8s ease-in-out 0.5s infinite",
          }} />

        {bubbleText && (
          <div style={{
            position: "absolute", top: "6%", left: 10, width: "calc(100% - 20px)", zIndex: 6,
            animation: bubbleShow ? "bubble-pop-in 0.4s cubic-bezier(0.34,1.5,0.64,1) forwards" : "bubble-fade-out 0.5s ease forwards",
            pointerEvents: "none",
          }}>
            <div style={{
              background: cream, border: `3px solid ${wood3}`, borderRadius: 12,
              padding: "10px 12px", fontFamily: NU, fontSize: 12, color: wood1, lineHeight: 1.5,
              boxShadow: `0 4px 16px rgba(100,50,0,0.35)`, position: "relative",
            }}>
              {bubbleText}
              <div style={{ position: "absolute", bottom: -10, left: "50%", marginLeft: -7, width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `10px solid ${wood3}` }} />
              <div style={{ position: "absolute", bottom: -6, left: "50%", marginLeft: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `8px solid ${cream}` }} />
            </div>
          </div>
        )}

        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
          padding: "10px 12px",
          background: `linear-gradient(180deg, ${wood2}ee 0%, ${wood1}f8 100%)`,
          borderTop: `3px solid ${wood3}`,
          boxShadow: `0 -4px 16px rgba(0,0,0,0.6)`, textAlign: "center",
        }}>
          <div style={{ fontFamily: PX, fontSize: 9, color: cream, letterSpacing: 2, textShadow: `0 1px 3px ${wood1}` }}>MIRA</div>
          <div style={{ fontFamily: NU, fontSize: 10, color: wood5, marginTop: 2 }}>General Shopkeeper</div>
        </div>
      </div>

      {/* RIGHT PANEL: Shop */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: paperBg, position: "relative", overflow: "hidden",
        animation: panelExiting ? "shop-panel-out 0.6s cubic-bezier(0.4, 0, 0.8, 0.4) forwards"
          : panelVisible ? "shop-panel-in 0.65s cubic-bezier(0.34, 1.2, 0.64, 1) forwards" : "none",
        opacity: panelVisible ? 1 : 0,
        transform: panelVisible ? "translateX(0)" : "translateX(70px)",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, ${wood5}08 18px, ${wood5}08 19px)`,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          background: `linear-gradient(180deg, ${wood2} 0%, ${wood1} 100%)`,
          borderBottom: `4px solid ${wood1}`, boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ height: 8, background: `repeating-linear-gradient(90deg, ${wood3} 0px, ${wood3} 12px, ${wood4} 12px, ${wood4} 24px)` }} />
          <div style={{ padding: "12px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: PX, fontSize: 12, color: cream, letterSpacing: 2, textShadow: `0 2px 4px ${wood1}` }}>🏪 NEKO GENERAL STORE</div>
              <div style={{ fontFamily: NU, fontSize: 11, color: wood5, marginTop: 3 }}>Fine goods for fine adventurers ☕</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                background: `linear-gradient(180deg, #ffe8a0 0%, #d4a020 100%)`,
                border: `2px solid #a07010`,
                boxShadow: `inset 0 1px 0 #fff8c0, 0 2px 6px rgba(0,0,0,0.4)`,
              }}>
                <Star className="w-3 h-3" style={{ fill: "#6a4000", color: "#6a4000" }} />
                <span style={{ fontFamily: MO, fontSize: 13, color: "#4a2800", fontWeight: 700 }}>{char.gold}g</span>
              </div>
              <button onClick={handleClose} style={{
                background: `linear-gradient(180deg, ${wood3} 0%, ${wood2} 100%)`,
                border: `2px solid ${wood1}`, cursor: "pointer", color: cream, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `inset 0 1px 0 ${wood4}60, 0 2px 4px rgba(0,0,0,0.4)`, transition: "transform 0.1s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div style={{
          position: "relative", zIndex: 1, display: "flex",
          background: `linear-gradient(180deg, ${wood3}60 0%, ${wood4}30 100%)`,
          borderBottom: `3px solid ${wood3}`,
        }}>
          {(["weapon", "armor", "consumable", "accessory"] as const).map(t => (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              flex: 1, padding: "11px 8px",
              background: tab === t ? `linear-gradient(180deg, ${cream} 0%, ${cream2} 100%)` : "none",
              border: "none", borderRight: `1px solid ${wood3}50`,
              borderBottom: tab === t ? `3px solid ${wood2}` : "3px solid transparent",
              marginBottom: -3, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "background 0.2s",
            }}>
              <span style={{ fontSize: 16 }}>{tabIcons[t]}</span>
              <span style={{ fontFamily: PX, fontSize: 7, letterSpacing: 0.5, color: tab === t ? tabActive : wood2 }}>{tabLabels[t]}</span>
            </button>
          ))}
        </div>

        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, alignContent: "start",
          position: "relative", zIndex: 1,
        }}>
          {items.map((item, idx) => (
            <div key={`${tabKey}-${item.id}`} style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px",
              background: cream, border: `2px solid ${borderW}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 8px rgba(100,50,0,0.12)`,
              position: "relative", overflow: "hidden",
              animation: `shop-item-in 0.45s cubic-bezier(0.34, 1.25, 0.64, 1) ${idx * 70}ms both`,
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${wood3}, ${wood4}, ${wood3})` }} />
              <div style={{ paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: PX, fontSize: 9, color: wood1 }}>{item.name}</span>
                  {item.damage && (
                    <span style={{ fontFamily: MO, fontSize: 9, color: "#7a4010", padding: "1px 6px", background: `${wood5}80`, border: `1px solid ${wood4}` }}>{item.damage}</span>
                  )}
                  {item.ac && (
                    <span style={{ fontFamily: MO, fontSize: 9, color: "#305080", padding: "1px 6px", background: "#d8e8f8", border: "1px solid #8ab0d0" }}>AC {item.ac}</span>
                  )}
                </div>
                <div style={{ fontFamily: NU, fontSize: 11, color: "#7a5030", lineHeight: 1.4 }}>{item.description}</div>
              </div>
              <button onClick={() => handleBuy(item)} disabled={char.gold < item.value}
                style={{
                  marginTop: "auto", padding: "7px 0",
                  background: char.gold >= item.value ? `linear-gradient(180deg, ${wood4} 0%, ${wood2} 100%)` : "#c0a898",
                  border: `2px solid ${char.gold >= item.value ? wood1 : "#9a8878"}`,
                  color: cream, fontFamily: PX, fontSize: 8,
                  cursor: char.gold >= item.value ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: char.gold < item.value ? 0.6 : 1,
                  boxShadow: char.gold >= item.value ? `inset 0 1px 0 ${wood4}80, 0 3px 6px rgba(0,0,0,0.3)` : "none",
                  transition: "transform 0.1s, box-shadow 0.15s",
                  textShadow: `0 1px 2px ${wood1}`, letterSpacing: 0.5,
                }}
                onMouseEnter={e => { if (char.gold >= item.value) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `inset 0 1px 0 ${wood4}80, 0 5px 12px rgba(80,30,0,0.4)`; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = char.gold >= item.value ? `inset 0 1px 0 ${wood4}80, 0 3px 6px rgba(0,0,0,0.3)` : "none"; }}>
                <Star className="w-2.5 h-2.5" style={{ fill: "#ffe080", color: "#ffe080" }} />
                BUY — {item.value}g
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", color: wood3, fontFamily: NU, fontSize: 14, padding: 48 }}>☕ Out of stock for now...</div>
          )}
        </div>

        <div style={{
          position: "relative", zIndex: 1, padding: "10px 20px",
          borderTop: `3px solid ${wood3}`, background: `linear-gradient(180deg, ${wood4}40 0%, ${wood3}30 100%)`,
          display: "flex", justifyContent: "center",
        }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: wood2, letterSpacing: 2 }}>⚒ NEKO GOODS · QUALITY GUARANTEED ⚒</span>
        </div>
      </div>
    </div>
  );
}

void pixelBtn;
