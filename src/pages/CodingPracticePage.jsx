import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CodingPracticePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('Google');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/questions.jsonl');
        const text = await response.text();
        
        const parsed = text.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try { return JSON.parse(line); } catch (e) { return null; }
          })
          .filter(q => q && q.question_type && q.question_type.toLowerCase() === 'coding');
        
        setQuestions(parsed);
        const counts = parsed.reduce((acc, q) => {
          acc[q.company] = (acc[q.company] || 0) + 1;
          return acc;
        }, {});
        const uniqueCompanies = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        setCompanies(uniqueCompanies);
      } catch (err) {
        console.error('Failed to load coding questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const displayedQuestions = selectedCompany === 'All' 
    ? questions 
    : questions.filter(q => q.company === selectedCompany);

  const getDifficulty = (idx) => idx % 3 === 0 ? 'HARD' : 'MEDIUM';
  const getDifficultyColor = (diff) => diff === 'HARD' ? '#EF4444' : '#C084FC';
  
  // Dynamic company counts
  const companyCounts = questions.reduce((acc, q) => {
    acc[q.company] = (acc[q.company] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page" style={{ color: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#4F5CD1', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>LV</div>
            <div style={{ fontSize: '1rem' }}><strong>LIVE</strong>interVIEWer</div>
            <h1 style={{ fontSize: '1.5rem', margin: '0 0 0 1rem', fontWeight: '600' }}>Coding practice</h1>
          </div>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            QUESTION BANK
          </div>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: '600' }}>Practice what your target company asks.</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ borderRadius: '20px', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>←</span> Back
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search problems, topics, or companies" 
          style={{ background: '#12141C', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '6px', color: 'white', width: '300px', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ background: 'rgba(79, 92, 209, 0.2)', border: '1px solid var(--primary)', color: '#8895F3', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {selectedCompany} <span style={{ cursor: 'pointer' }}>×</span>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
            Medium
          </div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <strong>{displayedQuestions.length} matches</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Left Sidebar Filters */}
        <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 1rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem', paddingLeft: '0.5rem' }}>COMPANIES</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div onClick={() => setSelectedCompany('All')} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', background: selectedCompany === 'All' ? '#1C2237' : 'transparent', color: selectedCompany === 'All' ? 'white' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>All questions</span>
                <span>{questions.length}</span>
              </div>
              
              {companies.slice(0, 5).map(c => (
                <div key={c} onClick={() => setSelectedCompany(c)} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', background: selectedCompany === c ? '#1C2237' : 'transparent', color: selectedCompany === c ? '#8895F3' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span>{c}</span>
                  <span>{companyCounts[c] || 0}</span>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '1.5rem 0' }}></div>

            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem', paddingLeft: '0.5rem' }}>TOPICS</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.5rem' }}>
              {['Arrays & strings', 'Trees & graphs', 'Dynamic programming', 'System design'].map(topic => (
                <div key={topic} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <span>{topic}</span>
                  <div style={{ width: '14px', height: '14px', border: '1px solid var(--border)', borderRadius: '3px' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main List */}
        <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedCompany} interview set</h3>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SORT: RELEVANCE</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayedQuestions.map((q, idx) => {
              const diff = getDifficulty(idx);
              const diffColor = getDifficultyColor(diff);
              const leetcodeSlug = q.question.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
              
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', width: '30px' }}>{String(idx + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>{q.question}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{q.topic} · Sliding window</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ border: `1px solid ${diffColor}40`, color: diffColor, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600' }}>
                      {diff}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {Math.floor(Math.random() * (85 - 40) + 40)}%
                    </div>
                    <a 
                      href={`https://duckduckgo.com/?q=!ducky+site%3Aleetcode.com%2Fproblems+${encodeURIComponent(q.question)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                    >
                      Solve <span>→</span>
                    </a>
                  </div>
                </div>
              );
            })}

            {displayedQuestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                No coding questions found for {selectedCompany}.
              </div>
            )}
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open exact problem on</span>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1.5rem' }}>LeetCode</button>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1.5rem' }}>GeeksforGeeks</button>
          </div>
        </div>
      </div>
    </div>
  );
}
