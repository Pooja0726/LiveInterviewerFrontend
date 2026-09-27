import React, { useEffect, useRef, useState } from 'react';

export default function CameraPanel({ onEmotionDetected, onGazeWarning }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState('starting'); 
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('ready'); 
      } catch (err) {
        if (!cancelled) {
          setError('Camera unavailable: ' + (err.message || err.name));
          setStatus('error');
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const statusLabel = {
    starting: 'Starting camera...',
    ready: '📷 Live',
    error: null,
  }[status];

  return (
    <div className="camera-panel">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
      />

      {statusLabel && (
        <div className="camera-status">{statusLabel}</div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0e1015',
            color: 'var(--error)',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            padding: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
