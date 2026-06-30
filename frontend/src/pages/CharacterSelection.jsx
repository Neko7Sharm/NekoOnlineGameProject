import { useState, useEffect } from 'react';
import FighterCreation from '../components/FighterCreation';

const API_URL = 'http://localhost:5000/api';

// Class descriptions for selection screen
const CLASS_INFO = {
  Fighter: { icon: '⚔️', color: '#ef4444', desc: 'Master of martial combat. Versatile, durable, and deadly.' },
  Cleric:  { icon: '✝️', color: '#fbbf24', desc: 'Divine spellcaster. Healer and protector of the party.' },
  Paladin: { icon: '🛡️', color: '#f59e0b', desc: 'Holy warrior. Smites evil with divine power and steel.' },
  Ranger:  { icon: '🏹', color: '#10b981', desc: 'Hunter of the wilds. Expert tracker and sharpshooter.' },
  Wizard:  { icon: '🧙', color: '#8b5cf6', desc: 'Scholar of arcane magic. Devastating spellcaster.' },
};

export default function CharacterSelection({ token, onSelectCharacter }) {
  const [characters, setCharacters] = useState([]);
  // Creation flow states
  const [creationStep, setCreationStep] = useState(null); // null | 'info' | 'fighter'
  const [newName, setNewName] = useState('');
  const [newPortrait, setNewPortrait] = useState('');
  const [portraitPreview, setPortraitPreview] = useState('');
  const [newClass, setNewClass] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`${API_URL}/characters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setCharacters(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchCharacters(); }, [token]);

  // Handle portrait URL input with preview
  const handlePortraitChange = (url) => {
    setNewPortrait(url);
    if (url) {
      const img = new Image();
      img.onload = () => setPortraitPreview(url);
      img.onerror = () => setPortraitPreview('');
      img.src = url;
    } else {
      setPortraitPreview('');
    }
  };

  // Submit name+portrait → go to class-specific creation
  const handleInfoNext = (e) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) { setError('Name is required'); return; }
    if (!newClass) { setError('Select a class'); return; }
    if (newClass === 'Fighter') setCreationStep('fighter');
    else submitCharacter({});  // Other classes: basic creation
  };

  // Final submit to backend
  const submitCharacter = async ({ stats, fightingStyle }) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, characterClass: newClass, portrait: newPortrait, stats, fightingStyle })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Reset
      setCreationStep(null);
      setNewName(''); setNewPortrait(''); setPortraitPreview(''); setNewClass(null);
      fetchCharacters();
    } catch (err) {
      setError(err.message);
      setCreationStep('info'); // Go back to info step on error
    } finally {
      setLoading(false);
    }
  };

  // Default portrait fallback
  const getPortrait = (char) => {
    if (char.portrait) return char.portrait;
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(char.name)}&backgroundColor=0f172a`;
  };

  // ─── Fighter Creation (multi-step) ────────────────────────────────
  if (creationStep === 'fighter') {
    return (
      <div style={{ padding: '40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1>⚔️ Create Your Fighter</h1>
          <p style={{ color: '#64748b' }}>Character: <strong style={{ color: '#f8fafc' }}>{newName}</strong></p>
        </div>
        {error && (
          <div style={{ textAlign: 'center', color: '#fca5a5', marginBottom: '16px', background: 'rgba(239,68,68,0.15)', padding: '10px', borderRadius: '8px', maxWidth: '600px', margin: '0 auto 16px' }}>
            {error}
          </div>
        )}
        <FighterCreation
          onComplete={({ stats, fightingStyle }) => submitCharacter({ stats, fightingStyle })}
          onCancel={() => setCreationStep('info')}
        />
      </div>
    );
  }

  // ─── Create Character — Info Step ─────────────────────────────────
  if (creationStep === 'info') {
    return (
      <div className="auth-container">
        <div className="glass-panel" style={{ width: '100%', maxWidth: '620px', padding: '32px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create Character
          </h2>
          {error && <div style={{ color: '#fca5a5', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleInfoNext}>
            {/* Name */}
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>Character Name</label>
            <input type="text" placeholder="Enter a name..." value={newName} onChange={e => setNewName(e.target.value)} maxLength={20} required />

            {/* Portrait URL */}
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>Portrait Image URL <span style={{ color: '#475569' }}>(optional)</span></label>
            <input type="url" placeholder="https://example.com/my-character.png" value={newPortrait} onChange={e => handlePortraitChange(e.target.value)} />

            {/* Portrait Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)',
                background: '#1e293b', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {portraitPreview
                  ? <img src={portraitPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '32px' }}>👤</span>
                }
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                {portraitPreview
                  ? <span style={{ color: '#10b981' }}>✅ Image loaded successfully</span>
                  : <span>Enter a valid image URL to preview.<br />Leave blank for auto-generated portrait.</span>
                }
              </div>
            </div>

            {/* Class Selection */}
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase' }}>Choose Class</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {Object.entries(CLASS_INFO).map(([cls, info]) => (
                <div key={cls} onClick={() => setNewClass(cls)}
                  className="glass-panel"
                  style={{
                    padding: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    borderColor: newClass === cls ? info.color : undefined,
                    background: newClass === cls ? `${info.color}18` : undefined,
                    transform: newClass === cls ? 'translateY(-2px)' : undefined
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '20px' }}>{info.icon}</span>
                    <span style={{ fontWeight: 700, color: newClass === cls ? info.color : '#f8fafc' }}>{cls}</span>
                    {newClass === cls && <span style={{ marginLeft: 'auto', color: info.color }}>✓</span>}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>{info.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => { setCreationStep(null); setError(''); }}>Cancel</button>
              <button type="submit" style={{ flex: 2 }}>Next →</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Character Select Screen ──────────────────────────────────────
  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Select Your Character
      </h1>
      <p style={{ textAlign: 'center', color: '#475569', fontSize: '14px', marginBottom: '32px' }}>
        {characters.length}/5 slots used
      </p>

      <div className="character-grid">
        {characters.map(char => {
          const info = CLASS_INFO[char.class] || {};
          return (
            <div key={char._id} className="glass-panel character-card" onClick={() => onSelectCharacter(char)}
              style={{ borderTop: `3px solid ${info.color || '#3b82f6'}` }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 14px', border: `2px solid ${info.color || '#3b82f6'}` }}>
                <img src={getPortrait(char)} alt="portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${char.name}`; }} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>{char.name}</h3>
              <p style={{ color: info.color || '#64748b', fontSize: '13px', fontWeight: 600 }}>{info.icon} {char.class}</p>
              <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>Level {char.level} · {char.hp?.current}/{char.hp?.max} HP</p>
              {char.fightingStyle && (
                <p style={{ color: '#94a3b8', fontSize: '11px', margin: '4px 0 0', textTransform: 'capitalize' }}>
                  Style: {char.fightingStyle.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          );
        })}

        {characters.length < 5 && (
          <div className="glass-panel character-card new-character-card" onClick={() => setCreationStep('info')}>
            <span style={{ fontSize: '40px', color: '#334155', marginBottom: '12px' }}>+</span>
            <h3 style={{ color: '#475569' }}>New Character</h3>
            <p style={{ color: '#334155', fontSize: '13px', margin: 0 }}>{5 - characters.length} slot{5 - characters.length !== 1 ? 's' : ''} remaining</p>
          </div>
        )}
      </div>
    </div>
  );
}
