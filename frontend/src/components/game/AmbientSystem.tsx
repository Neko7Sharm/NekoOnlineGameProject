import React, { useEffect, useState } from "react";
import { CELL } from "../../constants/map";

interface Particle {
  id: number;
  x: number;
  y: number;
  type: "leaf" | "butterfly";
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number; // velocity of rotation
}

export function AmbientSystem({ width, height }: { width: number; height: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Initial spawn
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      initialParticles.push(spawnParticle(width, height));
    }
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => {
        return prev.map(p => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;
          let newR = p.rotation + p.vr;

          // Gentle flutter for butterflies
          if (p.type === "butterfly") {
            newX += Math.sin(Date.now() / 300 + p.id) * 2;
            newY += Math.cos(Date.now() / 200 + p.id) * 2;
          }

          // Reset if out of bounds
          if (newY > height || newX > width || newX < 0 || newY < 0) {
            return spawnParticle(width, height, true);
          }

          return { ...p, x: newX, y: newY, rotation: newR };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [width, height]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12, overflow: "hidden" }}>
      {/* Sunbeams */}
      <div style={{
        position: "absolute",
        top: "-10%", left: "-10%",
        width: "120%", height: "120%",
        background: "repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255,255,200,0.03) 100px, rgba(255,255,200,0.03) 200px)",
        animation: "dnd-sunbeam 20s linear infinite alternate",
        opacity: 0.8
      }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: p.x,
          top: p.y,
          width: p.size,
          height: p.size,
          background: p.type === "leaf" ? p.color : "transparent",
          borderRadius: p.type === "leaf" ? "50% 0 50% 0" : "0",
          transform: `rotate(${p.rotation}deg)`,
          opacity: p.type === "leaf" ? 0.6 : 0.8,
          boxShadow: p.type === "butterfly" ? `0 0 8px ${p.color}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: p.size
        }}>
          {p.type === "butterfly" && "🦋"}
        </div>
      ))}
    </div>
  );
}

function spawnParticle(width: number, height: number, fromTop = false): Particle {
  const isLeaf = Math.random() > 0.3;
  return {
    id: Math.random(),
    x: Math.random() * width,
    y: fromTop ? -20 : Math.random() * height,
    type: isLeaf ? "leaf" : "butterfly",
    vx: isLeaf ? (Math.random() * 2 - 1) : (Math.random() * 4 - 2),
    vy: isLeaf ? (Math.random() * 2 + 1) : (Math.random() * 4 - 2),
    size: isLeaf ? Math.random() * 8 + 6 : Math.random() * 12 + 10,
    color: isLeaf ? ["#4caf50", "#8bc34a", "#cddc39"][Math.floor(Math.random() * 3)] : ["#e040fb", "#7c4dff", "#536dfe"][Math.floor(Math.random() * 3)],
    rotation: Math.random() * 360,
    vr: isLeaf ? (Math.random() * 4 - 2) : 0
  };
}
