import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import Navbar from '../components/Navbar.jsx';

const STYLES = [
  { value: 'FAANG', label: 'FAANG — Rigorous big-tech style' },
  { value: 'STARTUP', label: 'Startup — Fast-paced, practical focus' },
  { value: 'SUPPORTIVE', label: 'Supportive — Encouraging & collaborative' },
  { value: 'STRICT', label: 'Strict — High-pressure, no hints' },
];

export default function SetupInterviewPage() {
  const location = useLocation();
  const [interviewerStyle, setInterviewerStyle] = useState('SUPPORTIVE');
  const [role, setRole] = useState(location.state?.role || '');
  const [company, setCompany] = useState(location.state?.company || '');
  const focus = location.state?.focus || 'Technical';
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.createSession(interviewerStyle);
      const enrichedRole = `${role} ||| PROMPT_INSTRUCTION: Focus=${focus}. Ask ONLY ${focus} Qs. VERY BRIEF responses! DO NOT point out mistakes in detail. Save feedback for report. ALWAYS ask 'Tell me about yourself' as the very first question!`;
      await api.setupSession(session.id, enrichedRole, company);
      if (resumeFile) await api.uploadResume(session.id, resumeFile);
      if (jdFile) await api.uploadJobDescription(session.id, jdFile);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page" style={{ 
        display: 'flex', 
        padding: 0, 
        minHeight: '100vh', 
        background: 'var(--bg)', 
        color: '#fff', 
        margin: 0,
        marginLeft: '260px' // adjust for sidebar
      }}>
        {/* Left Form Panel */}
        <div style={{ 
          width: '500px', 
          background: 'var(--surface)', 
          padding: '3rem', 
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '4px 0 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>NEW INTERVIEW</div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 1rem 0', fontWeight: '600' }}>Set up your session</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: 1.5 }}>
            Configure your mock interview to match your target role and company.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="setup-style" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Interviewer style</label>
              <select
                id="setup-style"
                value={interviewerStyle}
                onChange={(e) => setInterviewerStyle(e.target.value)}
                style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', appearance: 'none', fontSize: '0.9rem' }}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="setup-role" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Role *</label>
              <input
                id="setup-role"
                type="text"
                placeholder="e.g. Backend Developer, Frontend Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label htmlFor="setup-company" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Company (optional)</label>
              <input
                id="setup-company"
                type="text"
                placeholder="e.g. Google, Amazon, your dream company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label htmlFor="setup-resume" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Resume (PDF or DOCX)</label>
              <input
                id="setup-resume"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files[0])}
                style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label htmlFor="setup-jd" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Job description (PDF or DOCX)</label>
              <input
                id="setup-jd"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setJdFile(e.target.files[0])}
                style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem' }}>{error}</div>}

            <button type="submit" disabled={loading} id="setup-submit" style={{ 
              marginTop: '1rem',
              background: 'linear-gradient(90deg, #4F5CD1 0%, #D946EF 100%)',
              border: 'none',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}>
              {loading ? 'Starting…' : 'Start interview →'}
            </button>
          </form>
        </div>

        {/* Right Empty Space */}
        <div style={{ flex: 1, background: 'var(--bg)' }}></div>
      </div>
    </>
  );
}
