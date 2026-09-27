import React, { useMemo } from 'react';

// Not a photo/video avatar (generating a consistent photoreal "person" who
// animates correctly isn't something this stack can do reliably, and reusing
// a real person's likeness isn't appropriate either) — instead a small
// illustrated, animated face that visibly reacts: it blinks at idle, its
// mouth moves only while the interviewer is actually talking (driven by
// useSpeech's onStart/onEnd, not a fixed timer), and its expression shifts
// a little based on the candidate's detected mood so it feels responsive
// rather than static.
//
// state: 'idle' | 'listening' | 'thinking' | 'speaking'
// candidateEmotion: optional string from CameraPanel's onEmotionDetected
export default function InterviewerAvatar({ name = 'Sarah', state = 'idle', candidateEmotion }) {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';

  // If the candidate looks visibly stressed, the avatar leans slightly more
  // encouraging/warm (softer brow, slight smile) instead of staying neutral.
  const encouraging = ['sad', 'fearful', 'disgusted', 'angry'].includes(candidateEmotion);

  const ringClass = isSpeaking ? 'avatar-ring-speaking' : isListening ? 'avatar-ring-listening' : '';
  const ringColorVar = isSpeaking ? 'var(--amber, #d69b4c)' : 'var(--teal, #2fa38c)';

  const statusText = useMemo(() => {
    if (isSpeaking) return `${name} is speaking…`;
    if (isListening) return 'Listening…';
    if (isThinking) return 'Thinking…';
    return `${name} is ready`;
  }, [isSpeaking, isListening, isThinking, name]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        className={ringClass}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: `2px solid ${ringColorVar}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 35% 30%, #2b2f38, #16181c)',
          transition: 'border-color 0.3s',
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 100 100" width={50} height={50}>
          <ellipse cx="50" cy="52" rx="30" ry="34" fill="#e8b98a" opacity="0.15" />
          <ellipse cx="50" cy="52" rx="26" ry="30" fill="#3a3025" opacity="0.5" />

          <path
            d={encouraging ? 'M28 38 Q35 34 42 37' : 'M28 36 Q35 33 42 36'}
            stroke="#c9a876"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={encouraging ? 'M58 37 Q65 34 72 38' : 'M58 36 Q65 33 72 36'}
            stroke="#c9a876"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />

          <ellipse className="avatar-eye" cx="36" cy="46" rx="4.5" ry="5.5" fill="#1a1c20" />
          <ellipse className="avatar-eye" cx="64" cy="46" rx="4.5" ry="5.5" fill="#1a1c20" />

          {isSpeaking ? (
            <ellipse className="avatar-mouth-speaking" cx="50" cy="68" rx="9" ry="7" fill="#5a2e28" />
          ) : isThinking ? (
            <path d="M42 69 Q52 65 60 68" stroke="#5a2e28" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path
              d={encouraging ? 'M40 66 Q50 76 60 66' : 'M40 67 Q50 73 60 67'}
              stroke="#5a2e28"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 11 }}>{name}</div>
        <div className="label-mono" style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 1 }}>
          {statusText}
        </div>
      </div>
    </div>
  );
}
