import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import CharacterSelection from './pages/CharacterSelection';
import GameLayout from './pages/GameLayout';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  useEffect(() => {
    // If token changes/is removed, we might want to handle logout
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setSelectedCharacter(null);
  };

  if (!token) {
    return <Auth setToken={setToken} />;
  }

  if (!selectedCharacter) {
    return (
      <>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="secondary" style={{ width: 'auto' }} onClick={handleLogout}>Logout</button>
        </div>
        <CharacterSelection token={token} onSelectCharacter={setSelectedCharacter} />
      </>
    );
  }

  return (
    <GameLayout 
      character={selectedCharacter} 
      token={token} 
      onBack={() => setSelectedCharacter(null)} 
    />
  );
}

export default App;
