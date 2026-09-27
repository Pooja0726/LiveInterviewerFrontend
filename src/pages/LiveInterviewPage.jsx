import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../api/client.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useLiveCaption } from '../hooks/useLiveCaption.js';
import Navbar from '../components/Navbar.jsx';
import CameraPanel from '../components/CameraPanel.jsx';
import TalkingHeadAvatar from '../components/TalkingHeadAvatar.jsx';

/* ─── Strip markdown so captions look like spoken speech ─────────── */
function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1') // `code` / ```code```
    .replace(/^#+\s+/gm, '')             // # headings
    .replace(/^[-*+]\s+/gm, '')          // bullet points
    .replace(/^\d+\.\s+/gm, '')          // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1') // _italic_ / __bold__
    .replace(/\n{3,}/g, '\n\n')          // collapse excess blank lines
    .trim();
}

/* ─── Inline keyframes injected once ─────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes vi-pulse-ring {
    0%   { transform: scale(1);    opacity: 0.7; }
    50%  { transform: scale(1.12); opacity: 1;   }
    100% { transform: scale(1);    opacity: 0.7; }
  }
  @keyframes vi-spin-hue {
    from { filter: hue-rotate(0deg); }
    to   { filter: hue-rotate(25deg); }
  }
  @keyframes vi-dot-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes vi-caption-fade {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes vi-listen-breathe {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2); }
    50%       { box-shadow: 0 0 0 10px rgba(59,130,246,0), 0 0 40px rgba(59,130,246,0.4); }
  }
  @keyframes vi-waveform {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }
`;

/* ─── Animated waveform bars (when listening) ─────────────────────── */
function WaveformBars({ active, volume = 0 }) {
  const bars = [0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4];
  
  // If active but no volume, show a flat line. If volume exists, scale the bars dynamically!
  const baseScale = active ? 0.3 : 0.1;
  const dynScale = active ? (volume * 1.5) : 0; // volume is 0-1

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      height: 20,
      flex: 1,
      justifyContent: 'center',
    }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 3,
          height: '100%',
          borderRadius: 2,
          background: active 
            ? (volume > 0.05 ? '#22c55e' : 'rgba(96,165,250,0.9)') // Turn green when sound is detected!
            : 'rgba(255,255,255,0.2)',
          transformOrigin: 'center',
          transform: `scaleY(${Math.max(baseScale, Math.min(1, dynScale * h + baseScale))})`,
          transition: 'transform 0.05s, background 0.2s',
        }} />
      ))}
    </div>
  );
}

/* ─── Avatar Component Removed ─── */

/* ─── Status label under avatar ──────────────────────────────────── */
function StatusLabel({ state, connected }) {
  if (!connected) return (
    <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500, letterSpacing: '0.01em' }}>
      Connecting…
    </span>
  );

  const map = {
    speaking:  { text: 'Interviewer speaking',  color: '#f97316' },
    listening: { text: 'Listening — just talk', color: '#60a5fa' },
    thinking:  { text: 'Processing…',           color: '#a78bfa' },
    idle:      { text: 'Ready',                  color: '#6b7280' },
  };
  const { text, color } = map[state] || map.idle;
  return (
    <span style={{ fontSize: 14, color, fontWeight: 500, letterSpacing: '0.01em', transition: 'color 0.3s' }}>
      {text}
    </span>
  );
}

/* ─── Caption pill — clean spoken text, max 3 lines ─────────────── */
function CaptionPill({ text }) {
  if (!text) return null;
  const clean = stripMarkdown(text);
  return (
    <div key={clean} style={{
      width: '100%',
      maxWidth: 680,
      padding: '18px 28px',
      animation: 'vi-caption-fade 0.4s ease',
    }}>
      <p style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#ffffff',
        lineHeight: 1.6,
        margin: 0,
        textAlign: 'center',
        textShadow: '0 2px 20px rgba(0,0,0,0.95)',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {clean}
      </p>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function LiveInterviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [currentStage, setCurrentStage] = useState('VOICE INTERVIEW');
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [typedMode, setTypedMode] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeLang, setCodeLang] = useState('java');
  const [executionOutput, setExecutionOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const executeCode = async () => {
    setIsExecuting(true);
    setExecutionOutput('Executing code on secure server...');
    sendAnswer("I have executed my code. Please review the results.", inputCode);
    try {
      const langKey = codeLang === 'cpp' ? 'c++' : (codeLang === 'java' ? 'java' : (codeLang === 'python' ? 'python' : 'javascript'));
      const res = await fetch('/api/local-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: langKey, code: inputCode, stdin: stdin })
      });
      const data = await res.json();
      setExecutionOutput(data.output || data.error || 'Execution failed.');
    } catch (err) {
      setExecutionOutput('Error connecting to execution server: ' + err.message);
    } finally {
      setIsExecuting(false);
    }
  };
  const [sending, setSending] = useState(false);
  const [emotionLog, setEmotionLog] = useState([]);
  const [candidateEmotion, setCandidateEmotion] = useState(null);
  const [avatarState, setAvatarState] = useState('idle');
  const [timeWarning, setTimeWarning] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [lastCaption, setLastCaption] = useState('');
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [gazeWarning, setGazeWarning] = useState(false);

  const [screenStream, setScreenStream] = useState(null);
  const [screenShareError, setScreenShareError] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [cheatingTerminated, setCheatingTerminated] = useState(false);

  const wsRef = useRef(null);
  const sendingRef = useRef(false);
  const avatarRef = useRef(null);

  /* ── Browser TTS helper ─────────────────────────────────────────── */
  // Used as fallback if 3D avatar is not ready
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text) {
      setAvatarState('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Alex') || v.name.includes('Daniel') || v.name.includes('Mark'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onstart = () => setAvatarState('speaking');
    utterance.onend = () => setAvatarState('idle');
    utterance.onerror = () => setAvatarState('idle');
    window.speechSynthesis.speak(utterance);
  }, []);

  const { caption, start: startCaption, stop: stopCaption, reset: resetCaption } = useLiveCaption();


  const { recording, transcribing, error: recordError, volume, startRecording, stopRecording } =
    useAudioRecorder((text) => {
      resetCaption();
      if (!text || !text.trim()) { setAvatarState('idle'); return; }
      setLastCaption(text.trim());
      sendAnswer(text.trim(), showCode ? inputCode : null);
    });

  const handleEmotionDetected = useCallback((emotion) => {
    setCandidateEmotion(emotion);
    setEmotionLog((prev) => [...prev.slice(-49), { emotion, at: Date.now() }]);
  }, []);

  const handleGazeWarning = useCallback(() => {
    setGazeWarning(true);
    setTimeout(() => setGazeWarning(false), 3500);
  }, []);

  // Tap once to start talking — silence detection auto-ends the turn.
  // Tapping again while recording = manual early stop.
  const handleMicTap = () => {
    if (!connected || transcribing) return;
    if (recording) {
      // Manual early stop
      setAvatarState('thinking');
      stopCaption();
      stopRecording();
    } else {
      // Start
      setAvatarState('listening');
      resetCaption();
      startCaption();
      startRecording();
    }
  };

  const handleTalkStart = handleMicTap;
  const handleTalkEnd = () => {}; // no-op: silence detection handles auto-stop

  useEffect(() => { if (recordError) setAvatarState('idle'); }, [recordError]);

  useEffect(() => {
    if (!connected || interviewEnded) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!interviewEnded) {
            alert("Time's up! The interview is ending.");
            if (wsRef.current) wsRef.current.close();
            navigate('/dashboard');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [connected, interviewEnded, navigate]);

  // Screen Share state
  // (Moved logic to requestFullscreenAndStart to ensure user gesture)

  // Tab Switching & Fullscreen Detection (Anti-Cheating)
  useEffect(() => {
    if (!hasStartedFullscreen || interviewEnded || cheatingTerminated) return;

    const triggerStrike = (reason) => {
      setTabWarningCount(p => {
        const newCount = p + 1;
        if (newCount >= 3) {
          setCheatingTerminated(true);
          if (wsRef.current) wsRef.current.close();
          alert("Interview Terminated: Excessive malpractice violations detected.");
        } else {
          setShowTabWarning(true);
          setTimeout(() => setShowTabWarning(false), 5000);
        }
        return newCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') triggerStrike('tab-switch');
    };
    const handleBlur = (e) => {
      if (e.target !== window) return;
      // Aggressively clear clipboard if they blur window
      navigator.clipboard.writeText('').catch(() => {});
      triggerStrike('window-blur');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenError(true);
        triggerStrike('exited-fullscreen');
      } else {
        setFullscreenError(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange, { capture: true });
    window.addEventListener('blur', handleBlur, { capture: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange, { capture: true });
    
    // Aggressive Anti-Copy/Paste events globally
    const preventAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('copy', preventAction, { capture: true });
    document.addEventListener('cut', preventAction, { capture: true });
    document.addEventListener('paste', preventAction, { capture: true });
    document.addEventListener('contextmenu', preventAction, { capture: true });
    document.addEventListener('selectstart', preventAction, { capture: true });

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true });
      window.removeEventListener('blur', handleBlur, { capture: true });
      document.removeEventListener('fullscreenchange', handleFullscreenChange, { capture: true });
      document.removeEventListener('copy', preventAction, { capture: true });
      document.removeEventListener('cut', preventAction, { capture: true });
      document.removeEventListener('paste', preventAction, { capture: true });
      document.removeEventListener('contextmenu', preventAction, { capture: true });
      document.removeEventListener('selectstart', preventAction, { capture: true });
    };
  }, [hasStartedFullscreen, interviewEnded, cheatingTerminated]);

  const requestFullscreenAndStart = async () => {
    try {
      // 1. Request Fullscreen
      await document.documentElement.requestFullscreen();
      setFullscreenError(false);

      // 2. Request Screen Share (now allowed because of user gesture)
      // Force 'monitor' (entire screen) to ensure they aren't hiding other windows.
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' }, 
        audio: false 
      });
      
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      if (settings.displaySurface !== 'monitor') {
        track.stop();
        alert('You must share your "Entire Screen" for the interview to proceed fairly. Please try again.');
        document.exitFullscreen().catch(() => {});
        return;
      }

      setScreenStream(stream);
      setScreenShareError(false);
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenShareError(true);
      };

      setHasStartedFullscreen(true);
    } catch (err) {
      console.error(err);
      // If either fails, they can't start.
      if (!document.fullscreenElement) {
        alert("Fullscreen is required to start the interview.");
      } else {
        setScreenShareError(true);
      }
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!hasStartedFullscreen || cheatingTerminated) return;

    let ws = null;
    // Delay connection slightly to prevent React 18 Strict Mode from instantly creating and destroying
    // the WebSocket, which causes the backend to throw an IOException when trying to send the first question.
    const timeoutId = setTimeout(() => {
      const url = api.buildWebSocketUrl(sessionId);
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnectionError(null); // Clear any previous errors
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'question') {
          if (recording) { stopCaption(); stopRecording(); }
          const cleanMessage = stripMarkdown(data.message);
          setMessages((prev) => [...prev, { from: 'interviewer', text: cleanMessage, stage: data.stage }]);
          setCurrentStage(data.stage || 'VOICE INTERVIEW');
          setShowCode(data.stage === 'CODING');
          setLastCaption(cleanMessage);

          // Speak using Browser TTS
          speakText(cleanMessage);
        }

        if (data.type === 'evaluation') {
          setAvatarState('idle');
          setInterviewEnded(true);
          navigate(`/evaluation/${sessionId}`, { state: { evaluation: data.evaluation } });
        }

        if (data.type === 'time_warning') {
          setTimeWarning(data.message);
          setLastCaption(data.message);
        }

        if (data.type === 'already_completed') navigate(`/evaluation/${sessionId}`);
      };

      ws.onerror = (e) => {
        console.error('[WS] error event:', e);
        setConnectionError('Connection error — check that the Session service is running.');
      };
      ws.onclose = (e) => {
        setConnected(false);
        setAvatarState('idle');
        console.warn(`[WS] closed — code: ${e.code}, reason: "${e.reason}", wasClean: ${e.wasClean}`);
        if (e.code === 1006) setConnectionError('WebSocket closed unexpectedly (1006) — Session service may be down or rejecting the connection.');
        if (e.code === 4001 || e.code === 3000) setConnectionError('Authentication failed (401) — your session may have expired. Please log in again.');
      };
    }, 400);

    return () => { 
      clearTimeout(timeoutId);
      if (ws) {
        ws.close(); 
      }
      setAvatarState('idle'); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hasStartedFullscreen]);

  const sendAnswer = (text, code) => {
    if (!text || sendingRef.current) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setConnectionError('Not connected — please wait before sending.');
      setAvatarState('idle');
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setMessages((prev) => [...prev, { from: 'candidate', text, code: code || null }]);
    wsRef.current.send(JSON.stringify({ message: text, code: code || null }));
    setInputMessage('');
    resetCaption();
    sendingRef.current = false;
    setSending(false);
  };

  const handleTypedSend = (e) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || sending) return;
    sendAnswer(trimmed, showCode ? inputCode : null);
  };

  /* Caption text to display — strip markdown from live captions too */
  const displayCaption = recording
    ? (stripMarkdown(caption) || 'Listening — just talk')
    : lastCaption || (connected ? 'Waiting for interviewer…' : 'Connecting…');

  const stageLabel = currentStage.replace(/_/g, ' ');

  // ─── ROBUST TOP-LEVEL OVERLAYS ───

  if (cheatingTerminated) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0B0E14', color: 'white', position: 'relative'
      }}>
        {/* Background Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(11, 14, 20, 0) 70%)', zIndex: 0 }}></div>
        
        <div style={{
          background: '#12141C', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
          padding: '3rem 2rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          {/* Top Icon (Shield with X) */}
          <div style={{ marginBottom: '1.5rem', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
          </div>

          <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Interview Terminated</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 2.5rem 0' }}>Ended due to repeated violations.</p>
          
          {/* 3 requirement boxes (red) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '2.5rem' }}>
            <div style={{ background: '#1C212D', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4"></path></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E5E5E5' }}>Tab switch</span>
            </div>
            <div style={{ background: '#1C212D', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E5E5E5' }}>Exited fullscreen</span>
            </div>
            <div style={{ background: '#1C212D', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"></path></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#E5E5E5' }}>Lost focus</span>
            </div>
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #4F5CD1 0%, #D946EF 100%)',
              color: 'white',
              border: 'none',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Return to Dashboard 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>
    );
  }

  if (screenShareError) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Screen Sharing Required</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 400, textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
          To maintain interview integrity, you must share your entire screen.
        </p>
        <button className="primary" onClick={() => window.location.reload()} style={{ padding: '12px 24px', fontSize: 16 }}>
          Reload & Try Again
        </button>
      </div>
    );
  }

  if (!hasStartedFullscreen) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0B0E14', color: 'white', position: 'relative' }}>
        {/* Background Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(136, 149, 243, 0.15) 0%, rgba(11, 14, 20, 0) 70%)', zIndex: 0 }}></div>
        
        <div style={{
          background: '#12141C', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px',
          padding: '3rem 2rem', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          {/* Top Icon */}
          <div style={{ marginBottom: '1.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="url(#grad1)">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F5CD1" />
                  <stop offset="100%" stopColor="#D946EF" />
                </linearGradient>
              </defs>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>

          <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Ready to begin?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 2.5rem 0' }}>Close other tabs. Leaving ends the interview.</p>
          
          {/* 3 requirement boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '2.5rem' }}>
            <div style={{ background: '#1C212D', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F5CD1" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>Fullscreen</span>
            </div>
            <div style={{ background: '#1C212D', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F5CD1" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>Screen share</span>
            </div>
            <div style={{ background: '#1C212D', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F5CD1" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white' }}>No tab switching</span>
            </div>
          </div>

          <button 
            onClick={requestFullscreenAndStart}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #4F5CD1 0%, #D946EF 100%)',
              color: 'white',
              border: 'none',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Enter Fullscreen & Start 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page" style={{
        display: 'flex',
        gap: '2rem',
        height: '100vh',
        paddingTop: '0',
        paddingBottom: '0',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg)'
      }}>
        <style>{STYLES}</style>

        {/* ── LEFT PANEL: AVATAR & CONTROLS ── */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '2rem 0' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }}></div>
              LIVE {formatTime(30 * 60 - timeLeft)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Google · Senior Frontend Engineer
            </div>
          </div>

          {/* Avatar Container */}
          <div style={{ 
            flex: 1, 
            background: '#12141C', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* David is speaking badge */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', zIndex: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></div>
              David is speaking
            </div>

               <img src="/interviewer.png" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} alt="David" />

            {/* Candidate PIP Overlay */}
            <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', width: '160px', height: '120px', background: 'rgba(30, 34, 45, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
               {/* Show real camera */}
               <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                 <CameraPanel onEmotionDetected={handleEmotionDetected} onGazeWarning={handleGazeWarning} />
               </div>
               
               {/* Waveform on top of camera */}
               <div style={{ position: 'absolute', bottom: '0.5rem', left: 0, right: 0, zIndex: 10 }}>
                 <WaveformBars active={recording} volume={volume} />
               </div>
               
               {/* "You" badge */}
               <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'white', zIndex: 10 }}>
                 You
               </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div style={{ background: '#151822', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: '1.5rem', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
             <button onClick={handleMicTap} style={{ background: 'transparent', border: 'none', color: recording ? '#10B981' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', border: recording ? '1px solid #10B981' : '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎤</div>
                <span style={{ fontSize: '0.7rem' }}>Mic</span>
             </button>
             <button onClick={() => setShowCode(!showCode)} style={{ background: 'transparent', border: 'none', color: showCode ? '#4F5CD1' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', border: showCode ? '1px solid #4F5CD1' : '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⌨️</div>
                <span style={{ fontSize: '0.7rem' }}>IDE</span>
             </button>
             <button onClick={() => { if(window.confirm('End interview and generate report?')) { if(wsRef.current) wsRef.current.send(JSON.stringify({ type: 'end_interview' })); setAvatarState('idle'); } }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'white' }}>✕</div>
                <span style={{ fontSize: '0.7rem', color: '#EF4444' }}>End</span>
             </button>
          </div>

        </div>

        {/* ── RIGHT PANEL: IDE or TRANSCRIPT ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: showCode ? '0' : '2rem 3rem', overflowY: 'auto' }}>
           
           {showCode ? (
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1E1E1E' }}>
               <div style={{ padding: '0.5rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <span style={{ fontSize: '0.85rem', color: '#E5E5E5', fontWeight: 600 }}>
                     {codeLang === 'python' ? 'main.py' : codeLang === 'cpp' ? 'main.cpp' : codeLang === 'java' ? 'Main.java' : 'index.js'}
                   </span>
                   <select 
                     value={codeLang} 
                     onChange={(e) => setCodeLang(e.target.value)}
                     style={{ 
                       background: '#3C3C3C', color: '#E5E5E5', border: '1px solid #555', 
                       padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', outline: 'none' 
                     }}
                   >
                     <option value="python">Python</option>
                     <option value="cpp">C++</option>
                     <option value="java">Java</option>
                     <option value="javascript">JavaScript</option>
                   </select>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <button onClick={executeCode} disabled={isExecuting} style={{ background: '#10B981', border: 'none', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.background = '#059669'} onMouseLeave={(e) => e.target.style.background = '#10B981'}>{isExecuting ? 'Running...' : 'Run & Submit'}</button>
                   <button onClick={() => setShowCode(false)} style={{ background: 'transparent', border: 'none', color: '#E5E5E5', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                 </div>
               </div>
               <div style={{ flex: 2, position: 'relative' }}>
                  <Editor
                    height="100%"
                    language={codeLang === 'cpp' ? 'cpp' : codeLang}
                    theme="vs-dark"
                    value={inputCode}
                    onChange={(value) => setInputCode(value || '')}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', borderTop: '1px solid #404040' }}>
                  <div style={{ flex: 1, background: '#1E1E1E', display: 'flex', flexDirection: 'column', borderRight: '1px solid #404040' }}>
                    <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Standard Input (stdin)</div>
                    <textarea 
                      value={stdin} 
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Enter input for Scanner / cin / input() here..."
                      style={{ margin: 0, padding: '1rem', background: 'transparent', border: 'none', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', flex: 1, resize: 'none', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1, background: '#181818', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '0.3rem 1rem', background: '#2D2D2D', borderBottom: '1px solid #404040', fontSize: '0.75rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase' }}>Console Output</div>
                    <pre style={{ margin: 0, padding: '1rem', color: '#E5E5E5', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto', flex: 1, whiteSpace: 'pre-wrap' }}>
                      {executionOutput || 'Code output will appear here after execution...'}
                    </pre>
                  </div>
                </div>
                <div style={{ padding: '0.4rem 1rem', background: '#007ACC', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span>LIVEinterVIEWer IDE with Monaco</span>
                  <span>Ready</span>
                </div>
             </div>
           ) : (
             <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600 }}>INTERVIEW SIGNAL</div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></div>
                     {avatarState === 'listening' ? 'Listening' : (avatarState === 'speaking' ? 'Speaking' : 'Processing')}
                  </div>
               </div>

               <div style={{ color: '#8895F3', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Question 4 of 8</div>
               <h2 style={{ 
                 fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.5, margin: '0 0 2rem 0', color: '#E5E5E5'
               }}>
                  "{messages.filter(m => m.from === 'interviewer').pop()?.text || "Could you walk me through your background and experience?"}"
               </h2>

               <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '1rem' }}>LIVE TRANSCRIPT</div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <div style={{ fontSize: '0.65rem', color: '#8895F3', textTransform: 'uppercase', fontWeight: 600 }}>DAVID</div>
                     <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                       {messages.filter(m => m.from === 'interviewer').slice(-2, -1)[0]?.text || "Take your time. I'm looking forward to hearing your approach."}
                     </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <div style={{ fontSize: '0.65rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 600 }}>YOU</div>
                     <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>
                       {messages.filter(m => m.from === 'candidate').pop()?.text || (recording ? caption : "Well, in my previous experience...")}
                     </div>
                  </div>
               </div>

               <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '1rem' }}>REAL-TIME COACHING</div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                     <div style={{ background: 'rgba(79, 92, 209, 0.15)', color: '#8895F3', border: '1px solid rgba(79,92,209,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                       Clear structure
                     </div>
                     <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                       Good pacing
                     </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                     Keep your answer outcome-focused.
                  </div>
               </div>
             </>
           )}
        </div>
      </div>
      
      {gazeWarning && (
        <div style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(239, 68, 68, 0.95)', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 600, zIndex: 9999 }}>
          ⚠️ Please look straight at the camera!
        </div>
      )}



      {/* ── Fullscreen Blocking Overlay ── */}
      {fullscreenError && !cheatingTerminated && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(239, 68, 68, 0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          color: 'white', textAlign: 'center'
        }}>
          <h2>⚠️ Fullscreen Exited</h2>
          <p style={{ maxWidth: 500, margin: '1rem 0' }}>
            You must remain in fullscreen mode during the interview. 
            Exiting fullscreen is considered malpractice.
          </p>
          <button className="btn-primary" onClick={requestFullscreenAndStart} style={{ background: 'white', color: '#EF4444' }}>
            Return to Fullscreen
          </button>
        </div>
      )}

      {/* ── Tab Switch Warning ── */}
      {showTabWarning && !cheatingTerminated && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(239, 68, 68, 0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          color: 'white', textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '3rem', margin: 0 }}>⚠️ WARNING</h2>
          <p style={{ maxWidth: 600, fontSize: '1.25rem', marginTop: '1rem' }}>
            Focus lost or tab switched! This is considered malpractice.
            Multiple violations will terminate the interview.
          </p>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Strike {tabWarningCount} of 3</p>
        </div>
      )}


    </>
  );
}
