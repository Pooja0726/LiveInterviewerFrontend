import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      login(res.token, res.email);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0B0E14', color: 'white', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Left Panel: Auth Form */}
      <div style={{ flex: 1, maxWidth: '500px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem', background: '#050505', zIndex: 10, boxShadow: '4px 0 24px rgba(0,0,0,0.5)' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4rem' }}>
          <div style={{ background: '#4F5CD1', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700' }}>LV</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}><strong>LIVE</strong>interVIEWer</div>
        </div>

        {/* Copy */}
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', fontWeight: '700', letterSpacing: '-0.02em' }}>Master the room.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 3rem 0' }}>
          Sign in to continue your high-fidelity mock interview sessions and AI-driven feedback loops.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Professional Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.85rem 1rem', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.95rem' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="login-password" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Password</label>
              <a href="#" style={{ fontSize: '0.75rem', color: '#8895F3', textDecoration: 'none' }}>Forgot?</a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.85rem 1rem', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.95rem' }}
            />
          </div>

          {error && <div style={{ color: '#EF4444', fontSize: '0.85rem' }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ 
            marginTop: '1rem',
            background: '#4F5CD1',
            border: 'none',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.2s'
          }}>
            {loading ? 'Signing in…' : 'Enter the Studio'}
          </button>
        </form>

        <div style={{ marginTop: 'auto', paddingTop: '4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Start free trial</Link>
        </div>
      </div>

      {/* Right Panel: Studio Graphic */}
      <div style={{ flex: 1, background: '#0F131E', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Fullscreen Button mock (top right) */}
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', width: '32px', height: '32px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        </div>

        {/* Mock Application Window */}
        <div style={{ width: '80%', maxWidth: '800px', background: '#131722', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
          
          {/* Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }}></div>
            </div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600 }}>
              SESSION LIVE // 00:14:32
            </div>
          </div>

          {/* Main Studio Area */}
          <div style={{ display: 'flex', padding: '1.5rem', gap: '1.5rem' }}>
            
            {/* Candidate Video Stream */}
            <div style={{ flex: 2, background: 'url(/candidate_mock.png) center/cover, #1C212D', borderRadius: '8px', minHeight: '300px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', color: 'white', backdropFilter: 'blur(4px)' }}>
                 You
              </div>
            </div>

            {/* Right Panel AI Insights */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* AI Analysis */}
              <div style={{ background: '#1A1E29', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: '#06B6D4', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>AI ANALYSIS</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>Confidence Level: High</div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '80%', height: '100%', background: '#8895F3' }}></div>
                </div>
              </div>

              {/* Transcript Snippet */}
              <div style={{ background: '#1A1E29', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>TRANSCRIPT SNIPPET</div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                  "I led the expansion project which resulted in a <span style={{ background: 'rgba(136, 149, 243, 0.2)', color: '#8895F3', padding: '0 0.2rem', borderRadius: '2px' }}>40% increase</span> in efficiency..."
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom Audio Visualizer Bar */}
          <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
             <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', display: 'flex' }}>
               <div style={{ width: '45%', height: '100%', background: '#4F5CD1', borderRadius: '2px' }}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
