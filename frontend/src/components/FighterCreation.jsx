import { useState } from 'react';

// ─── Stat Descriptions ────────────────────────────────────────────────────────
const STAT_INFO = {
  str: {
    name: 'Strength',
    icon: '💪',
    color: '#ef4444',
    affects: ['Melee attack rolls', 'Melee damage', 'Athletics (climb, jump, swim)', 'Carrying capacity'],
    tip: '+1 STR → +1 attack/damage with melee weapons'
  },
  dex: {
    name: 'Dexterity',
    icon: '🏹',
    color: '#f59e0b',
    affects: ['Ranged attack rolls', 'Ranged damage (bow)', 'Armor Class (light armor)', 'Initiative', 'Acrobatics, Stealth, Sleight of Hand'],
    tip: '+2 DEX → +1 AC (when not in heavy armor)'
  },
  con: {
    name: 'Constitution',
    icon: '❤️',
    color: '#10b981',
    affects: ['Max HP (+1 per CON mod, per level)', 'Concentration checks (spellcasters)'],
    tip: '+2 CON → +1 Max HP per level'
  },
  int: {
    name: 'Intelligence',
    icon: '📚',
    color: '#3b82f6',
    affects: ['Arcana, History, Investigation, Nature, Religion', 'Spell attack/save DC (Wizard)'],
    tip: 'Primary stat for Wizard'
  },
  wis: {
    name: 'Wisdom',
    icon: '👁️',
    color: '#8b5cf6',
    affects: ['Perception (spotting enemies)', 'Insight, Medicine, Survival', 'Spell attack/save DC (Cleric)'],
    tip: 'Primary stat for Cleric & Ranger'
  },
  cha: {
    name: 'Charisma',
    icon: '✨',
    color: '#ec4899',
    affects: ['Persuasion, Deception, Intimidation, Performance', 'Spell attack/save DC (Paladin)'],
    tip: 'Primary stat for Paladin'
  }
};

// ─── Fighting Styles ──────────────────────────────────────────────────────────
const FIGHTING_STYLES = [
  {
    id: 'archery',
    name: 'Archery',
    icon: '🏹',
    color: '#f59e0b',
    description: '+2 bonus to attack rolls with ranged weapons.',
    best: 'Best for ranged DEX builds'
  },
  {
    id: 'defense',
    name: 'Defense',
    icon: '🛡️',
    color: '#3b82f6',
    description: '+1 to AC while wearing armor. Every 2 levels, gain an additional +1 AC.',
    best: 'Best for tanky builds'
  },
  {
    id: 'dueling',
    name: 'Dueling',
    icon: '⚔️',
    color: '#10b981',
    description: '+2 to attack rolls when wielding a one-handed melee weapon in one hand (off-hand empty or shield).',
    best: 'Best for sword+shield builds'
  },
  {
    id: 'great_weapon_fighting',
    name: 'Great Weapon Fighting',
    icon: '🗡️',
    color: '#ef4444',
    description: 'When wielding a two-handed weapon, you may reroll the attack roll once. You must use the new result.',
    best: 'Best for two-handed weapon builds'
  },
  {
    id: 'protection',
    name: 'Protection',
    icon: '🔰',
    color: '#8b5cf6',
    description: 'While holding a shield, use your Reaction to impose Disadvantage (roll 2 dice, use lower) on an attack within 5ft of an enemy you can see.',
    best: 'Best for protecting allies'
  },
  {
    id: 'two_weapon_fighting',
    name: 'Two-Weapon Fighting',
    icon: '⚔️⚔️',
    color: '#ec4899',
    description: 'When dual wielding, every 2nd attack gets +5 to attack roll. (1st: +0, 2nd: +5, 3rd: +0, 4th: +5...)',
    best: 'Best for dual-wield builds'
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statMod = (v) => Math.floor((v - 10) / 2);
const modStr = (v) => (v >= 0 ? `+${v}` : `${v}`);

export default function FighterCreation({ onComplete, onCancel }) {
  const [step, setStep] = useState(1); // 1: stats, 2: style, 3: review
  const [baseStats, setBaseStats] = useState({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  const [pointsLeft, setPointsLeft] = useState(7);
  const [hoveredStat, setHoveredStat] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [hoveredStyle, setHoveredStyle] = useState(null);

  const totalSpent = Object.values(baseStats).reduce((acc, v) => acc + Math.max(0, v - 10), 0);

  const addStat = (key, delta) => {
    const cur = baseStats[key];
    const next = cur + delta;
    if (next < 8 || next > 17) return;
    if (delta > 0 && pointsLeft <= 0) return;
    setBaseStats(p => ({ ...p, [key]: next }));
    setPointsLeft(p => p - delta);
  };

  // Computed stats for Fighter
  const conMod = statMod(baseStats.con);
  const dexMod = statMod(baseStats.dex);
  const maxHp = 10 + conMod;
  const ac = 10 + Math.max(0, dexMod) + (selectedStyle === 'defense' ? 1 : 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 40px' }}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {['Stat Allocation', 'Fighting Style', 'Review'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: 700,
              background: step > i + 1 ? '#10b981' : step === i + 1 ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: step >= i + 1 ? 'white' : '#475569'
            }}>{step > i + 1 ? '✓' : i + 1}</div>
            <span style={{ fontSize: '12px', color: step === i + 1 ? '#f8fafc' : '#475569' }}>{s}</span>
            {i < 2 && <div style={{ width: '32px', height: '1px', background: '#334155' }} />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: STAT ALLOCATION ─── */}
      {step === 1 && (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '6px' }}>⚔️ Fighter — Ability Scores</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
            All stats start at 10. Distribute <strong style={{ color: '#f8fafc' }}>{pointsLeft}</strong> points freely (max 17 per stat).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {Object.entries(baseStats).map(([key, val]) => {
              const info = STAT_INFO[key];
              const mod = statMod(val);
              const isHovered = hoveredStat === key;
              return (
                <div key={key}
                  onMouseEnter={() => setHoveredStat(key)}
                  onMouseLeave={() => setHoveredStat(null)}
                  className="glass-panel"
                  style={{ padding: '14px 16px', transition: 'all 0.2s', borderColor: isHovered ? info.color : undefined, cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left: name + info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>{info.icon}</span>
                        <span style={{ fontWeight: 700, color: info.color, fontSize: '14px' }}>{info.name}</span>
                        <span style={{ fontSize: '10px', color: '#475569', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                          mod: {modStr(mod)}
                        </span>
                      </div>
                      {isHovered && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                          {info.affects.map((a, i) => <div key={i}>• {a}</div>)}
                          <div style={{ color: info.color, marginTop: '4px', fontWeight: 600 }}>💡 {info.tip}</div>
                        </div>
                      )}
                    </div>
                    {/* Right: controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                      <button onClick={() => addStat(key, -1)}
                        disabled={val <= 8}
                        style={{ width: '30px', height: '30px', padding: 0, fontSize: '16px', lineHeight: 1, opacity: val <= 8 ? 0.3 : 1 }}>
                        −
                      </button>
                      <span style={{ fontSize: '22px', fontWeight: 700, minWidth: '30px', textAlign: 'center', color: val > 10 ? info.color : '#f8fafc' }}>
                        {val}
                      </span>
                      <button onClick={() => addStat(key, 1)}
                        disabled={val >= 17 || pointsLeft <= 0}
                        style={{ width: '30px', height: '30px', padding: 0, fontSize: '16px', lineHeight: 1, opacity: (val >= 17 || pointsLeft <= 0) ? 0.3 : 1 }}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preview */}
          <div className="glass-panel" style={{ padding: '12px 20px', marginTop: '20px', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 700 }}>❤️ {maxHp}</div><div style={{ color: '#64748b', fontSize: '11px' }}>Max HP (10+CON)</div></div>
            <div><div style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 700 }}>🛡 {ac}</div><div style={{ color: '#64748b', fontSize: '11px' }}>AC (base)</div></div>
            <div><div style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 700 }}>⚡ {pointsLeft}</div><div style={{ color: '#64748b', fontSize: '11px' }}>Points left</div></div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="secondary" style={{ flex: 1 }} onClick={onCancel}>← Cancel</button>
            <button style={{ flex: 2 }} onClick={() => setStep(2)}>Next: Fighting Style →</button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: FIGHTING STYLE ─── */}
      {step === 2 && (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '6px' }}>🎯 Choose Fighting Style</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
            Your combat specialization. Hover for details.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {FIGHTING_STYLES.map(style => {
              const isSelected = selectedStyle === style.id;
              const isHovered = hoveredStyle === style.id;
              return (
                <div key={style.id}
                  className="glass-panel"
                  onMouseEnter={() => setHoveredStyle(style.id)}
                  onMouseLeave={() => setHoveredStyle(null)}
                  onClick={() => setSelectedStyle(style.id)}
                  style={{
                    padding: '16px', cursor: 'pointer', transition: 'all 0.2s',
                    borderColor: isSelected ? style.color : isHovered ? 'rgba(255,255,255,0.2)' : undefined,
                    background: isSelected ? `${style.color}18` : undefined,
                    transform: isSelected ? 'translateY(-2px)' : undefined
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{style.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: isSelected ? style.color : '#f8fafc' }}>{style.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{style.best}</div>
                    </div>
                    {isSelected && <div style={{ marginLeft: 'auto', color: style.color, fontSize: '18px' }}>✓</div>}
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                    {style.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button style={{ flex: 2 }} disabled={!selectedStyle} onClick={() => setStep(3)}
              title={!selectedStyle ? 'Select a style first' : ''}>
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: REVIEW ─── */}
      {step === 3 && (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>📋 Character Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Stats */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px' }}>Ability Scores</h4>
              {Object.entries(baseStats).map(([key, val]) => {
                const info = STAT_INFO[key];
                const mod = statMod(val);
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>{info.icon} {info.name}</span>
                    <span style={{ fontWeight: 700 }}>
                      {val} <span style={{ color: mod >= 0 ? '#10b981' : '#ef4444', fontSize: '12px' }}>({modStr(mod)})</span>
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Combat + Skills */}
            <div>
              <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px' }}>Combat Stats</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>❤️ Max HP</span><strong>{maxHp}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>🛡 Armor Class</span><strong>{ac}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>💰 Starting Gold</span><strong>50g</strong></div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h4 style={{ color: '#3b82f6', marginBottom: '12px', textTransform: 'uppercase', fontSize: '12px' }}>Class Features (Lv.1)</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <div>⚔️ <strong>Fighting Style:</strong> <span style={{ color: '#fbbf24' }}>{FIGHTING_STYLES.find(s => s.id === selectedStyle)?.name}</span></div>
                  <div>💨 <strong>Second Wind</strong> — 2 uses/long rest</div>
                  <div style={{ color: '#475569', fontSize: '11px' }}>Lv.2: Tactical Mind + Action Surge</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button style={{ flex: 2, background: '#10b981' }}
              onClick={() => onComplete({ stats: baseStats, fightingStyle: selectedStyle })}>
              ✅ Create Fighter!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
