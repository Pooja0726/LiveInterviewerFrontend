import React, { useEffect, useImperativeHandle, forwardRef, useState, useRef } from 'react';

const TalkingHeadAvatar = forwardRef(({ avatarState, onReady }, ref) => {
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Simulate initialization delay
    const timer = setTimeout(() => {
      setIsReady(true);
      if (onReady) onReady();
    }, 500);
    return () => clearTimeout(timer);
  }, [onReady]);

  useImperativeHandle(ref, () => ({
    speak: (text) => {
      return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        const maleVoice = voices.find(v =>
          v.lang.startsWith('en') && /male|david|mark|james|george|arthur|alex|brian/i.test(v.name)
        ) || voices.find(v => v.lang.startsWith('en'));
        
        if (maleVoice) utterance.voice = maleVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.2;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };

        window.speechSynthesis.speak(utterance);
      });
    }
  }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111' }}>
      
      {/* 
        Since a 3D ReadyPlayerMe avatar cannot be downloaded due to network blocks, 
        and the local 3D avatar lacks blend shapes, we use a static image with a CSS pulse 
        to simulate speech reaction.
      */}
      <style>
        {`
          @keyframes talkPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.03); }
            100% { transform: scale(1); }
          }
          .talking-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.1s;
          }
          .talking-avatar.speaking {
            animation: talkPulse 0.3s infinite alternate ease-in-out;
          }
        `}
      </style>

      <img
        src="/interviewer.png"
        alt="Interviewer"
        className={`talking-avatar ${isSpeaking ? 'speaking' : ''}`}
      />
      
      {!isReady && (
        <div style={{
          position: 'absolute', inset: 0, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(17,17,17,0.8)',
          color: 'var(--text-muted)',
          fontSize: 12,
          textAlign: 'center',
          padding: 20
        }}>
          Loading Avatar...
        </div>
      )}
    </div>
  );
});

export default TalkingHeadAvatar;
