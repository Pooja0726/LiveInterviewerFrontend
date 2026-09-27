import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import Navbar from '../components/Navbar.jsx';

function ScoreBar({ value }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  let color = 'var(--teal)';
  if (value < 6) color = 'var(--error)';
  else if (value < 8) color = 'var(--amber)';

  return (
    <div
      style={{
        height: 6,
        background: 'var(--border)',
        borderRadius: 3,
        overflow: 'hidden',
        flex: 1,
        margin: '0 12px',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  );
}

function ScoreRow({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="score-row">
      <span style={{ color: 'var(--text-muted)', fontSize: 14, minWidth: 160 }}>{label}</span>
      <ScoreBar value={value} />
      <span
        className="label-mono"
        style={{ color: 'var(--teal)', minWidth: 48, textAlign: 'right' }}
      >
        {value.toFixed(1)} / 10
      </span>
    </div>
  );
}

function List({ title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div className="label-mono" style={{ marginBottom: 10, color: color || 'var(--text-muted)' }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: 6, fontSize: 14, lineHeight: 1.5 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EvaluationPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState(location.state?.evaluation || null);
  const [loading, setLoading] = useState(!location.state?.evaluation);

  useEffect(() => {
    if (evaluation) return;

    api
      .getScorecardBySession(sessionId)
      .then((sc) =>
        setEvaluation({
          overallScore: sc.overallScore != null ? sc.overallScore : (sc.codingScore + sc.communicationScore) / 20,
          technicalKnowledge: sc.technicalKnowledge,
          coding: sc.codingScore != null ? sc.codingScore / 10 : null,
          problemSolving: sc.problemSolving,
          communication: sc.communicationScore != null ? sc.communicationScore / 10 : null,
          resumeKnowledge: sc.resumeKnowledge,
          jdAlignment: sc.jdAlignment,
          strengths: sc.strengths || [],
          weaknesses: sc.weaknesses || [],
          topicsToImprove: sc.topicsToImprove || [],
          finalRecommendation: sc.overallFeedback,
        })
      )
      .catch(() => setEvaluation(null))
      .finally(() => setLoading(false));
  }, [sessionId, evaluation]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="page">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>Loading evaluation…</p>
          </div>
        </div>
      </>
    );
  }

  if (!evaluation) {
    return (
      <>
        <Navbar />
        <div className="page">
          <div className="card card-wide">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No evaluation found for this session yet.</p>
            </div>
            <button className="full" onClick={() => navigate('/dashboard')}>
              ← Back to dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  const overallColor =
    evaluation.overallScore >= 8
      ? 'var(--green)'
      : evaluation.overallScore >= 6
      ? 'var(--teal)'
      : 'var(--error)';

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="card card-wide">
          <span className="label-mono">FINAL EVALUATION</span>
          <h1 style={{ fontSize: 24, marginTop: 6, marginBottom: 4 }}>Interview results</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 0, marginBottom: 28 }}>
            Here's a breakdown of your performance.
          </p>

          {evaluation.overallScore != null && (
            <div className="eval-score-big">
              <div
                className="eval-score-number"
                style={{ color: overallColor }}
              >
                {evaluation.overallScore.toFixed(1)}
              </div>
              <div className="eval-score-label">OVERALL SCORE / 10</div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <ScoreRow label="Technical knowledge" value={evaluation.technicalKnowledge} />
            <ScoreRow label="Coding" value={evaluation.coding} />
            <ScoreRow label="Problem solving" value={evaluation.problemSolving} />
            <ScoreRow label="Communication" value={evaluation.communication} />
            <ScoreRow label="Resume knowledge" value={evaluation.resumeKnowledge} />
            <ScoreRow label="JD alignment" value={evaluation.jdAlignment} />
          </div>

          <List
            title="✅ STRENGTHS"
            items={evaluation.strengths}
            color="var(--green)"
          />
          <List
            title="📈 AREAS TO IMPROVE"
            items={evaluation.weaknesses || evaluation.topicsToImprove}
            color="var(--amber)"
          />

          {evaluation.finalRecommendation && (
            <div
              style={{
                marginTop: 28,
                padding: 20,
                background: 'var(--surface-raised)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="label-mono" style={{ marginBottom: 8 }}>
                RECOMMENDATION
              </div>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                {evaluation.finalRecommendation}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button
              className="secondary"
              style={{ flex: 1 }}
              onClick={() => navigate('/dashboard')}
              id="eval-back"
            >
              ← Dashboard
            </button>
            <button
              style={{ flex: 1 }}
              onClick={() => navigate('/setup')}
              id="eval-new"
            >
              New interview →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
