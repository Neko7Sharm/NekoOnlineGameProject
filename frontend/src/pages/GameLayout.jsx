import { useState, useEffect } from 'react';
import PhaserGame from '../game/PhaserGame';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';

export default function GameLayout({ character, token, onBack }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([{ id: 1, sender: 'System', text: 'Welcome to Neko Online!', type: 'world' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState('world');
  const [combatState, setCombatState] = useState(null);   // null | { turnOrder, currentTurn, isMyTurn }
  const [combatLog, setCombatLog] = useState([]);
  const [moveRemaining, setMoveRemaining] = useState(4);
  const [shopItems, setShopItems] = useState([]);
  const [quests, setQuests] = useState([]);
  const [parties, setParties] = useState([]);
  const [myParty, setMyParty] = useState(null);
  const [partyName, setPartyName] = useState('');
  const [overlay, setOverlay] = useState(null); // 'shop' | 'quests' | 'party' | null

  // ── SOCKET ────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io('http://localhost:5000', { auth: { token } });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_game', character);
    });

    s.on('chat_message', (msg) => setMessages(prev => [...prev.slice(-49), msg]));
    s.on('chat_history', (history) => setMessages(history));
    s.on('combat_started', ({ turnOrder, currentTurn }) => {
      setCombatState({ turnOrder, currentTurn, isMyTurn: currentTurn.id === s.id });
      setCombatLog(prev => [...prev, `⚔️ Combat started! Turn: ${currentTurn.name}`]);
      setActiveTab('combat');
      setIsPanelExpanded(true);
    });
    s.on('turn_changed', ({ currentTurn }) => {
      setCombatState(prev => prev ? { ...prev, currentTurn, isMyTurn: currentTurn.id === s.id } : null);
      setCombatLog(prev => [...prev, `🔄 ${currentTurn.name}'s turn`]);
      setMoveRemaining(4);
    });
    s.on('combat_result', (result) => {
      setCombatLog(prev => [...prev, result.log]);
    });
    s.on('monster_died', ({ exp }) => {
      setCombatLog(prev => [...prev, `✨ Monster defeated! +${exp} EXP`]);
    });
    s.on('combat_ended', ({ reason }) => {
      setCombatState(null);
      setCombatLog(prev => [...prev, `🏆 ${reason}`]);
    });
    s.on('item_dropped', ({ itemName }) => {
      setCombatLog(prev => [...prev, `📦 Loot dropped: ${itemName}!`]);
    });
    s.on('spell_slots_restored', ({ full, slotsLeft }) => {
      setCombatLog(prev => [...prev, full ? '✨ All spell slots restored!' : `💤 Rested. Slots left: ${slotsLeft}`]);
    });
    s.on('quest_board_updated', () => fetchQuests());

    return () => s.close();
  }, [token]);

  const fetchShop = async () => {
    const res = await fetch(`${API_URL}/shop`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setShopItems(data);
    setOverlay('shop');
  };

  const fetchQuests = async () => {
    const res = await fetch(`${API_URL}/quests`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setQuests(data);
  };

  const openQuests = async () => {
    await fetchQuests();
    setOverlay('quests');
  };

  const fetchParties = async () => {
    try {
      const res = await fetch(`${API_URL}/parties`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setParties(data);
      const mine = data.find(p => p.members.some(m => m._id === character._id));
      setMyParty(mine || null);
    } catch(err) { console.error(err); }
  };

  const openParty = async () => {
    await fetchParties();
    setOverlay('party');
  };

  const createParty = async () => {
    if (!partyName.trim()) return;
    const res = await fetch(`${API_URL}/parties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: partyName, characterId: character._id })
    });
    if (res.ok) { setPartyName(''); fetchParties(); }
  };

  const joinParty = async (id) => {
    const res = await fetch(`${API_URL}/parties/${id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ characterId: character._id })
    });
    if (res.ok) fetchParties();
  };

  const leaveParty = async () => {
    if (!myParty) return;
    const res = await fetch(`${API_URL}/parties/${myParty._id}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ characterId: character._id })
    });
    if (res.ok) fetchParties();
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat_message', { text: chatInput, type: chatMode });
    setChatInput('');
  };

  const handleEndTurn = () => socket?.emit('combat_end_turn');
  const handleRest = () => socket?.emit('combat_rest');

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top Bar */}
      <div style={{ padding: '6px 16px', background: 'rgba(15,23,42,0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>⚔️</span>
          <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{character.name}</strong>
          <span style={{ color: '#3b82f6', fontSize: '12px' }}>{character.class} Lv.{character.level}</span>
          <span style={{ color: '#ef4444', fontSize: '12px' }}>❤️ {character.hp?.current}/{character.hp?.max} HP</span>
          {combatState && (
            <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
              ⚔️ IN COMBAT — {combatState.isMyTurn ? 'YOUR TURN' : combatState.currentTurn?.name + '\'s turn'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', background: '#ec4899', borderColor: '#db2777' }} onClick={openParty}>🎉 Party</button>
          <button className="secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }} onClick={onBack}>Change Character</button>
        </div>
      </div>

      {/* Game Canvas Area */}
      <div style={{ flex: 1, position: 'relative', background: '#0f172a', overflow: 'hidden' }}>
        {socket ? (
          <PhaserGame character={character} socket={socket} onCombatEvent={(type, data) => {
            if (type === 'open_shop') fetchShop();
            if (type === 'open_quests') openQuests();
          }} />
        ) : (
          <div style={{ color: '#94a3b8', padding: '20px', textAlign: 'center', marginTop: '20%' }}>Connecting to server...</div>
        )}

        {/* Shop Overlay */}
        {overlay === 'shop' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ color: '#fbbf24' }}>🏪 Shop</h2>
                <button className="secondary" style={{ width: 'auto', padding: '4px 12px' }} onClick={() => setOverlay(null)}>✕ Close</button>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {shopItems.map(item => (
                  <div key={item.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#f8fafc' }}>{item.name}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>[{item.type}]</span>
                      {item.damage && <span style={{ color: '#fbbf24', fontSize: '12px', marginLeft: '8px' }}>⚔️ {item.damage}</span>}
                      {item.acBonus > 0 && <span style={{ color: '#10b981', fontSize: '12px', marginLeft: '8px' }}>🛡 +{item.acBonus} AC</span>}
                      {item.hpRestore > 0 && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>❤️ +{item.hpRestore} HP</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#fbbf24' }}>💰 {item.price}g</span>
                      <button style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}>Buy</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quest Board Overlay */}
        {overlay === 'quests' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ color: '#10b981' }}>📋 Quest Board</h2>
                <button className="secondary" style={{ width: 'auto', padding: '4px 12px' }} onClick={() => setOverlay(null)}>✕ Close</button>
              </div>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>New quests appear every 5 minutes. Party can hold 2 quests at once.</p>
              {quests.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center' }}>No quests available. Check back later!</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {quests.map(q => (
                    <div key={q._id} className="glass-panel" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#f8fafc' }}>{q.title}</strong>
                        <button style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', background: '#065f46' }}>Accept (Party)</button>
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{q.description}</p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                        <span style={{ color: '#fbbf24' }}>💰 {q.rewardGold}g</span>
                        <span style={{ color: '#a78bfa' }}>✨ {q.rewardExp} EXP</span>
                        <span style={{ color: '#94a3b8' }}>Kill: {q.targetCount}x {q.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Party Overlay */}
        {overlay === 'party' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div className="glass-panel" style={{ width: '600px', maxHeight: '80vh', overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ color: '#ec4899' }}>🎉 Party Finder</h2>
                <button className="secondary" style={{ width: 'auto', padding: '4px 12px' }} onClick={() => setOverlay(null)}>✕ Close</button>
              </div>
              
              {!myParty && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  <input type="text" placeholder="Party Name" value={partyName} onChange={e => setPartyName(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
                  <button onClick={createParty} style={{ width: 'auto', background: '#db2777' }}>Create Party</button>
                </div>
              )}

              {myParty && (
                <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', borderColor: '#db2777', background: 'rgba(219,39,119,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>{myParty.name}</h3>
                    <button className="secondary" style={{ width: 'auto', padding: '4px 12px', borderColor: '#ef4444', color: '#fca5a5' }} onClick={leaveParty}>Leave Party</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {myParty.members.map(m => (
                      <span key={m._id} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                        {m._id === myParty.leader._id ? '👑 ' : ''}{m.name} ({m.class} {m.level})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h4 style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Active Parties</h4>
              {parties.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', fontSize: '13px' }}>No active parties looking for members.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {parties.map(p => (
                    <div key={p._id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#f8fafc' }}>{p.name}</strong>
                        <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>{p.members.length}/{p.maxMembers} Members</span>
                      </div>
                      {!myParty && p.members.length < p.maxMembers && (
                        <button style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', background: '#059669' }} onClick={() => joinParty(p._id)}>Join</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div style={{ height: isPanelExpanded ? '280px' : '40px', transition: 'height 0.3s ease', background: 'rgba(15,23,42,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>

        {/* Tabs Row */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {['stats', 'inventory', 'combat', 'chat'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setIsPanelExpanded(true); }} style={{
              width: 'auto', background: 'transparent', borderRadius: 0, padding: '8px 16px', flex: 1,
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
              color: activeTab === tab ? '#f8fafc' : '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase'
            }}>{tab === 'combat' ? '⚔️ Combat' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
          <button className="secondary" onClick={() => setIsPanelExpanded(!isPanelExpanded)} style={{
            width: 'auto', borderRadius: 0, padding: '4px 12px', fontSize: '11px',
            borderLeft: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', borderRight: 'none', borderTop: 'none'
          }}>{isPanelExpanded ? '▼' : '▲'}</button>
        </div>

        {isPanelExpanded && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

            {/* STATS */}
            {activeTab === 'stats' && (() => {
              const STAT_LABELS = {
                str: { name: 'Strength',     icon: '💪', color: '#ef4444', tip: 'Melee attack & damage' },
                dex: { name: 'Dexterity',    icon: '🏹', color: '#f59e0b', tip: 'Ranged attack, AC, Initiative' },
                con: { name: 'Constitution', icon: '❤️', color: '#10b981', tip: 'Max HP per level' },
                int: { name: 'Intelligence', icon: '📚', color: '#3b82f6', tip: 'Arcana, History (Wizard key)' },
                wis: { name: 'Wisdom',       icon: '👁️', color: '#8b5cf6', tip: 'Perception, Insight (Cleric key)' },
                cha: { name: 'Charisma',     icon: '✨', color: '#ec4899', tip: 'Persuasion, Intimidation (Paladin key)' },
              };
              const sw = character.classFeatures?.secondWind;
              const as = character.classFeatures?.actionSurge;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  {/* Ability Scores */}
                  <div>
                    <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Ability Scores</h4>
                    {Object.entries(character.stats || {}).map(([key, val]) => {
                      const mod = Math.floor((val - 10) / 2);
                      const info = STAT_LABELS[key] || {};
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', fontSize: '12px' }}>
                          <span style={{ fontSize: '14px' }}>{info.icon}</span>
                          <span style={{ color: '#64748b', flex: 1 }}>{info.name}</span>
                          <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'right' }}>{val}</span>
                          <span style={{ color: mod >= 0 ? '#10b981' : '#ef4444', minWidth: '30px', textAlign: 'right', fontSize: '11px' }}>({mod >= 0 ? '+' : ''}{mod})</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Combat Stats */}
                  <div>
                    <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Combat</h4>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>❤️ HP</span><strong style={{ color: character.hp?.current <= character.hp?.max * 0.3 ? '#ef4444' : '#f8fafc' }}>{character.hp?.current}/{character.hp?.max}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>🛡 AC</span><strong>{character.ac}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>💰 Gold</span><strong style={{ color: '#fbbf24' }}>{character.gold || 0}g</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>✨ EXP</span><strong>{character.exp}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>📊 Level</span><strong>{character.level}/2</strong></div>
                    </div>
                    {character.fightingStyle && (
                      <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>FIGHTING STYLE</div>
                        <div style={{ fontSize: '12px', color: '#60a5fa', textTransform: 'capitalize' }}>
                          ⚔️ {character.fightingStyle.replace(/_/g, ' ')}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Class Features */}
                  <div>
                    <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Class Features</h4>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>{character.class} · Level {character.level}</div>
                      {sw && (
                        <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '2px' }}>💨 Second Wind</div>
                          <div style={{ color: '#94a3b8' }}>{sw.uses}/{sw.maxUses} uses</div>
                          <div style={{ color: '#475569', fontSize: '10px' }}>Recover: 1 (short rest), 2 (long rest)</div>
                        </div>
                      )}
                      {as && character.level >= 2 && (
                        <div style={{ padding: '8px', background: 'rgba(245,158,11,0.1)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '2px' }}>⚡ Action Surge</div>
                          <div style={{ color: as.available ? '#10b981' : '#ef4444' }}>{as.available ? 'Ready' : 'Used (Long Rest)'}</div>
                        </div>
                      )}
                      {character.classFeatures?.tacticalMind && (
                        <div style={{ padding: '8px', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: '2px' }}>🧠 Tactical Mind</div>
                          <div style={{ color: '#94a3b8', fontSize: '10px' }}>Use Second Wind on failed checks</div>
                        </div>
                      )}
                      {character.class === 'Wizard' || character.class === 'Cleric' ? (
                        <div style={{ padding: '8px', background: 'rgba(139,92,246,0.1)', borderRadius: '6px' }}>
                          <div style={{ fontWeight: 700, color: '#a78bfa' }}>🔮 Spell Slots: 3</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* INVENTORY */}
            {activeTab === 'inventory' && (
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ minWidth: '180px' }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Equipment</h4>
                  {[
                    { key: 'weapon', label: '⚔️ Weapon' },
                    { key: 'armor', label: '🛡 Armor' },
                    { key: 'accessory1', label: '💍 Acc 1' },
                    { key: 'accessory2', label: '💍 Acc 2' },
                    { key: 'accessory3', label: '💍 Acc 3' },
                  ].map(slot => (
                    <div key={slot.key} className="glass-panel" style={{ padding: '6px 10px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
                      <span style={{ color: '#64748b' }}>{slot.label}</span>
                      <span style={{ color: character.equipment?.[slot.key] ? '#f8fafc' : '#334155' }}>
                        {character.equipment?.[slot.key]?.name || '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Inventory</h4>
                  {(character.inventory?.length || 0) === 0 ? (
                    <p style={{ color: '#334155', fontSize: '13px' }}>Empty inventory</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                      {character.inventory?.map(item => (
                        <div key={item._id} className="glass-panel" style={{ padding: '8px', cursor: 'pointer', fontSize: '12px', textAlign: 'center' }}
                          onClick={() => {/* context menu TODO */}}>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* COMBAT */}
            {activeTab === 'combat' && (
              <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', fontSize: '13px' }}>
                  {combatLog.length === 0 ? <p style={{ color: '#475569' }}>No combat yet. Enter the dungeon!</p> : combatLog.map((l, i) => (
                    <div key={i} style={{ marginBottom: '4px', color: '#94a3b8' }}>{l}</div>
                  ))}
                </div>
                {combatState && (
                  <div style={{ width: '180px', flexShrink: 0 }}>
                    <h4 style={{ color: '#3b82f6', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}>Turn Order</h4>
                    {combatState.turnOrder?.map((t, i) => (
                      <div key={t.id} style={{ marginBottom: '4px', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: combatState.currentTurn?.id === t.id ? 'rgba(59,130,246,0.2)' : 'transparent', color: combatState.currentTurn?.id === t.id ? '#60a5fa' : '#64748b' }}>
                        {i + 1}. {t.name} {t.isMonster ? '🤖' : '👤'} (init {t.initiative})
                      </div>
                    ))}
                    {combatState.isMyTurn && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <p style={{ fontSize: '11px', color: '#64748b' }}>Move: {moveRemaining * 5}ft left</p>
                        <button style={{ padding: '6px', fontSize: '12px' }} onClick={handleEndTurn}>⏩ End Turn</button>
                        <button style={{ padding: '6px', fontSize: '12px', background: '#7c3aed' }} onClick={handleRest}>💤 Rest (1 turn)</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CHAT */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '220px' }}>
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} style={{ marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{ color: msg.type === 'world' ? '#3b82f6' : '#10b981', fontSize: '10px' }}>[{msg.type}] </span>
                      <strong style={{ color: msg.sender === 'System' ? '#fbbf24' : '#f8fafc' }}>{msg.sender}: </strong>
                      <span style={{ color: '#94a3b8' }}>{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={chatMode} onChange={e => setChatMode(e.target.value)} style={{ width: '80px', marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}>
                    <option value="world">🌍 World</option>
                    <option value="party">⚔️ Party</option>
                  </select>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..." style={{ flex: 1, marginBottom: 0, padding: '6px 10px', fontSize: '13px' }} />
                  <button onClick={sendChat} style={{ width: '60px', marginBottom: 0, padding: '6px', fontSize: '12px' }}>Send</button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
