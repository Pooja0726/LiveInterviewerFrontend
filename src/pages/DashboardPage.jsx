import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';

function getScoreClass(score) {
  if (!score && score !== 0) return 'high';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyStats, setCompanyStats] = useState([]);
  const [targetRole, setTargetRole] = useState('Senior Frontend Engineer');
  const [company, setCompany] = useState('Google');
  const [focus, setFocus] = useState('Technical');
  
  const { email } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.state?.tab || 'home';

  useEffect(() => {
    api
      .getMySessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));

    fetch('/questions.jsonl')
      .then(res => res.text())
      .then(text => {
        const parsed = text.split('\n')
          .filter(line => line.trim())
          .map(line => { try { return JSON.parse(line); } catch { return null; } })
          .filter(q => q && q.question_type && q.question_type.toLowerCase() === 'coding');
        
        const counts = parsed.reduce((acc, q) => {
          acc[q.company] = (acc[q.company] || 0) + 1;
          return acc;
        }, {});

        const sorted = Object.keys(counts)
          .sort((a, b) => counts[b] - counts[a])
          .slice(0, 4)
          .map(name => ({
            id: name.substring(0, 2).toUpperCase(),
            name: name,
            tags: 'Technical · coding',
            count: counts[name]
          }));
        setCompanyStats(sorted);
      })
      .catch(() => {});
  }, []);

  const completed = sessions.filter((s) => s.status === 'COMPLETED');

  return (
    <>
      <Navbar />

      <div className="page" style={{ color: '#fff' }}>
        
        {/* Breadcrumbs & Header */}
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            PREPARE / PRACTICE / PERFORM
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '600' }}>
            {activeTab === 'home' ? 'Ready for your next interview?' : activeTab === 'history' ? 'Your Interview History' : 'Performance Reports'}
          </h2>
          {activeTab === 'home' && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Configure a realistic session with David and company-specific questions.
            </p>
          )}
        </header>

        {activeTab === 'home' && (
          <div className="dashboard-grid">
            
            {/* New Interview Card */}
            <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>New interview</h3>
                <div style={{ background: 'rgba(79, 92, 209, 0.15)', color: '#8895F3', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8895F3' }}></div> AI interviewer
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TARGET ROLE</label>
                  <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '6px', color: 'white', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>COMPANY</label>
                  <select value={company} onChange={e => setCompany(e.target.value)} style={{ width: '100%', background: '#12141C', border: '1px solid var(--border)', padding: '0.6rem 1rem', borderRadius: '6px', color: 'white', outline: 'none', appearance: 'none' }}>
                    <option>Google</option>
                    <option>Meta</option>
                    <option>Cognizant</option>
                    <option>TCS</option>
                    <option>Amazon</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>INTERVIEW FOCUS</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Technical', 'Behavioral', 'System design'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setFocus(f)}
                      style={{ 
                        background: focus === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                        border: focus === f ? 'none' : '1px solid var(--border)', 
                        color: focus === f ? 'white' : 'var(--text-muted)', 
                        padding: '0.5rem 1.2rem', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => navigate('/setup', { state: { focus, role: targetRole, company } })} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Start interview <span>→</span>
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>~35 min · camera check included</span>
              </div>
            </div>

            {/* Avatar Profile Card */}
            <div className="dashboard-card" style={{ padding: 0, display: 'flex', overflow: 'hidden' }}>
              <div style={{ flex: 1, background: '#1A1D27', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.2 }}>
                  🧑🏻
                </div>
                {/* Fallback image if David avatar is not found, though we should just use CSS background */}
                <div style={{ width: '100%', height: '100%', background: 'url(/interviewer.png) center/cover, #1A1D27' }}></div>
              </div>
              <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>DAVID</div>
                <h3 style={{ fontSize: '1.4rem', margin: '0 0 1rem 0' }}>Senior technical interviewer</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Adapts questions to your role, level, and company.
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', padding: '0.4rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '500', width: 'fit-content' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></div> Voice calibrated
                </div>
              </div>
            </div>

            {/* Company Intelligence Card */}
            <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Company question intelligence</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>Historical topics, matched to your target.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(companyStats.length > 0 ? companyStats : [
                  { id: 'GO', name: 'Google', tags: 'Arrays · graphs · system design', count: 126 },
                  { id: 'ME', name: 'Meta', tags: 'Product sense · trees · APIs', count: 94 },
                  { id: 'CO', name: 'Cognizant', tags: 'Java · SQL · aptitude', count: 81 },
                  { id: 'TC', name: 'TCS', tags: 'OOP · DBMS · coding', count: 73 },
                ]).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#1C212D', color: '#8895F3', width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600' }}>
                      {c.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{c.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.tags}</div>
                    </div>
                    <div style={{ color: '#8895F3', fontSize: '0.8rem', fontWeight: '600' }}>{c.count} questions</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Practicing Card */}
            <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Continue practicing</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>Focused coding without leaving your flow.</p>
              
              <div style={{ background: '#12141C', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>GOOGLE · MEDIUM</div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', lineHeight: 1.4 }}>Longest substring without<br/>repeating characters</h4>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn-primary" onClick={() => navigate('/coding-practice')} style={{ flex: 1 }}>Open coding hub</button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab UI */}
        {activeTab === 'history' && (
           <div style={{ marginTop: '2rem' }}>
             {loading && <div style={{ color: 'var(--text-muted)' }}>Loading...</div>}
             {!loading && sessions.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No sessions found.</div>}
             {!loading && sessions.length > 0 && (
               <div style={{ display: 'grid', gap: '1rem' }}>
                 {sessions.map(s => (
                   <div key={s.id} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(s.status === 'COMPLETED' ? `/evaluation/${s.id}` : `/interview/${s.id}`)}>
                       <h3 style={{ margin: '0 0 0.25rem 0' }}>{s.role?.split(' ||| ')[0] || 'Interview Session'}</h3>
                       <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(s.createdAt)} · {s.company || 'General'}</div>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <div 
                         style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                         onClick={() => navigate(s.status === 'COMPLETED' ? `/evaluation/${s.id}` : `/interview/${s.id}`)}
                       >
                         {s.status === 'COMPLETED' ? 'View Report' : 'Resume'}
                       </div>
                       <button 
                         onClick={async (e) => {
                           e.stopPropagation();
                           if (window.confirm("Are you sure you want to delete this session?")) {
                             try {
                               await api.deleteSession(s.id);
                               setSessions(sessions.filter(sess => sess.id !== s.id));
                             } catch (err) {
                               alert("Failed to delete session: " + err.message);
                             }
                           }
                         }}
                         style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                         title="Delete Session"
                       >
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path></svg>
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

        {/* Reports Tab UI */}
        {activeTab === 'reports' && (
           <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             
             {/* Overall Score */}
             <div style={{ background: '#12141C', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
               <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'conic-gradient(#10B981 0% 78%, #1C212D 78% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                 <div style={{ width: '80px', height: '80px', background: '#12141C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                   78%
                 </div>
               </div>
               <div>
                 <h2 style={{ margin: '0 0 0.5rem 0' }}>Overall Performance: Strong</h2>
                 <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                   You consistently demonstrate strong problem-solving skills and clean architecture patterns. 
                   Your communication is clear, but you occasionally skip writing edge-case tests before implementation.
                 </p>
               </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               
               {/* Code Analysis */}
               <div style={{ background: '#12141C', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                 <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F5CD1" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                   Code Analysis
                 </h3>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                   <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                       <span style={{ color: 'var(--text-muted)' }}>Algorithmic Efficiency (Time/Space)</span>
                       <span style={{ color: '#10B981', fontWeight: 600 }}>Excellent</span>
                     </div>
                     <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}><div style={{ width: '92%', height: '100%', background: '#10B981', borderRadius: '3px' }}></div></div>
                   </div>
                   
                   <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                       <span style={{ color: 'var(--text-muted)' }}>Code Quality & Modularity</span>
                       <span style={{ color: '#F59E0B', fontWeight: 600 }}>Good</span>
                     </div>
                     <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}><div style={{ width: '75%', height: '100%', background: '#F59E0B', borderRadius: '3px' }}></div></div>
                   </div>

                   <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                       <span style={{ color: 'var(--text-muted)' }}>Edge Case Handling</span>
                       <span style={{ color: '#EF4444', fontWeight: 600 }}>Needs Work</span>
                     </div>
                     <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}><div style={{ width: '45%', height: '100%', background: '#EF4444', borderRadius: '3px' }}></div></div>
                   </div>
                 </div>
               </div>

               {/* Focus Areas */}
               <div style={{ background: '#12141C', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                 <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                   What to work on next
                 </h3>
                 <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, paddingLeft: '1.2rem', margin: 0 }}>
                   <li style={{ marginBottom: '1rem' }}>
                     <strong style={{ color: 'white' }}>Test-Driven Approach:</strong> Before writing implementation code, loudly state 2-3 edge cases (e.g., null arrays, negative numbers) and write dummy tests for them.
                   </li>
                   <li style={{ marginBottom: '1rem' }}>
                     <strong style={{ color: 'white' }}>System Design Scaling:</strong> Your frontend logic is solid, but you should practice explaining how to scale real-time WebSocket connections across multiple regions.
                   </li>
                   <li>
                     <strong style={{ color: 'white' }}>Think out loud:</strong> During silent periods of coding, you tend to go quiet for up to 3 minutes. Keep the interviewer engaged by narrating your thought process.
                   </li>
                 </ul>
               </div>

             </div>
           </div>
        )}

      </div>
    </>
  );
}
