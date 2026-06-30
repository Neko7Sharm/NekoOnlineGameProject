import { useState } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Confirm password check (register only)
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-container">
      {/* Background Stars */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'white',
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.6 + 0.1,
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`
          }} />
        ))}
      </div>

      <div className="glass-panel auth-box" style={{ position: 'relative', zIndex: 1 }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: '26px', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Neko Online
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            {isLogin ? 'Welcome back, Adventurer' : 'Begin your adventure'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#fca5a5', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
          <input
            type="text" placeholder="Enter username"
            value={username} onChange={e => setUsername(e.target.value)}
            required minLength={3}
          />

          <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
          <input
            type="password" placeholder="Enter password"
            value={password} onChange={e => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
              <input
                type="password" placeholder="Re-enter your password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{ borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : confirmPassword && confirmPassword === password ? '#10b981' : undefined }}
              />
              {confirmPassword && confirmPassword !== password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '-10px', marginBottom: '12px' }}>❌ Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p style={{ color: '#10b981', fontSize: '12px', marginTop: '-10px', marginBottom: '12px' }}>✅ Passwords match</p>
              )}
            </>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Loading...' : isLogin ? '⚔️ Enter World' : '✨ Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button className="secondary" onClick={switchMode} style={{ fontSize: '13px' }}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
