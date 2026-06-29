import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function CharacterSelection({ token, onSelectCharacter }) {
  const [characters, setCharacters] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  // New character form state
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('Fighter');

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`${API_URL}/characters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCharacters(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, [token]);

  const handleCreateCharacter = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/characters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, characterClass: newClass })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setIsCreating(false);
      setNewName('');
      fetchCharacters();
    } catch (err) {
      setError(err.message);
    }
  };

  if (isCreating) {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-box">
          <h1>Create Character</h1>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleCreateCharacter}>
            <input 
              type="text" 
              placeholder="Character Name" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              maxLength={20}
            />
            <select value={newClass} onChange={(e) => setNewClass(e.target.value)}>
              <option value="Fighter">Fighter</option>
              <option value="Cleric">Cleric</option>
              <option value="Paladin">Paladin</option>
              <option value="Ranger">Ranger</option>
              <option value="Wizard">Wizard</option>
            </select>
            <button type="submit">Create</button>
          </form>
          <div style={{ marginTop: '16px' }}>
            <button className="secondary" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="character-select-container">
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Select Your Character</h1>
      <div className="character-grid">
        {characters.map(char => (
          <div 
            key={char._id} 
            className="glass-panel character-card"
            onClick={() => onSelectCharacter(char)}
          >
            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${char.name}`} alt="portrait" />
            <h3>{char.name}</h3>
            <p>Level {char.level} {char.class}</p>
          </div>
        ))}
        
        {characters.length < 5 && (
          <div 
            className="glass-panel character-card new-character-card"
            onClick={() => setIsCreating(true)}
          >
            <span>+</span>
            <h3>Create New Character</h3>
            <p>{characters.length} / 5 slots used</p>
          </div>
        )}
      </div>
    </div>
  );
}
