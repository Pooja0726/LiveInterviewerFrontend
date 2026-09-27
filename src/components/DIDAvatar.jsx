import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

// ─── D-ID VIDEO AVATAR (Custom WebRTC via Vite Proxy — No CORS issues) ─────
// All requests go through /did-api/* which Vite proxies to api.d-id.com
const AGENT_ID = "v2_agt_BlLsWvRy"; // Replace with your Agent ID
const API_KEY = "YOUR_D_ID_API_KEY"; // Replace with your D-ID API key
const AUTH_HEADER = "Basic " + API_KEY;
const API_BASE = "/did-api"; // Proxied through Vite → https://api.d-id.com

async function didFetch(path, options = {}) {
  const headers = {
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

const DIDAvatar = forwardRef(({ onMessage }, ref) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const streamInfoRef = useRef(null);
  const [connectionState, setConnectionState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const messageQueue = useRef([]);
  const hasUnmutedRef = useRef(false);

  const handleUserClick = useCallback(() => {
    if (videoRef.current && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      hasUnmutedRef.current = true;
      if (messageQueue.current.length > 0) {
        const text = messageQueue.current.shift();
        doSpeak(text);
      }
    }
  }, [isMuted]);

  const doSpeak = async (text) => {
    // 1. Fallback to native browser TTS for reliable audio
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      // Try to find a nice female English voice (e.g., Google UK English Female, or Samantha on Mac)
      const femaleVoice = voices.find(v => 
        v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira'))
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for Mei
      window.speechSynthesis.speak(utterance);
    }

    // 2. Also try D-ID if connected
    const info = streamInfoRef.current;
    if (!info) return;
    try {
      const res = await didFetch(`/agents/${AGENT_ID}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          streamId: info.stream_id,
          sessionId: info.session_id,
          messages: [{ role: 'user', content: text, created_at: new Date().toISOString() }]
        })
      });
      if (!res.ok) console.warn('[D-ID] Chat response:', res.status);
    } catch (e) {
      console.error("[D-ID] Chat error:", e);
    }
  };

  const connectWebRTC = useCallback(async (isCancelled) => {
    try {
      setConnectionState('connecting');
      setErrorMsg('');
      console.log('[D-ID] Creating stream via proxy...');

      // 1. Create stream
      const streamRes = await didFetch(`/agents/${AGENT_ID}/streams`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!streamRes.ok) {
        const errText = await streamRes.text();
        if (streamRes.status === 403 && errText.includes('Max user sessions')) {
          throw new Error("Max active sessions reached on D-ID server. Please wait 1-2 minutes for old sessions to expire and try again.");
        }
        throw new Error(`Stream creation failed (${streamRes.status}): ${errText}`);
      }
      const streamData = await streamRes.json();
      if (isCancelled()) return;

      console.log('[D-ID] Stream created:', streamData.id);
      streamInfoRef.current = { stream_id: streamData.id, session_id: streamData.session_id };

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: streamData.ice_servers });
      pcRef.current = pc;

      // D-ID requires a data channel for signaling
      const dc = pc.createDataChannel("JanusDataChannel");
      dcRef.current = dc;
      dc.onmessage = (msg) => {
        console.log("[D-ID] DataChannel msg:", msg.data);
      };

      pc.ontrack = (event) => {
        console.log("[D-ID] Got video track!", event.streams?.length, "streams");
        if (videoRef.current && event.streams && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.warn("Autoplay block:", e));
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await didFetch(`/agents/${AGENT_ID}/streams/${streamData.id}/ice`, {
              method: 'POST',
              body: JSON.stringify({
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                session_id: streamData.session_id
              })
            });
          } catch (e) { console.error("[D-ID] ICE error:", e); }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[D-ID] PeerConnection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setConnectionState('connected');
          if (messageQueue.current.length > 0 && hasUnmutedRef.current) {
            doSpeak(messageQueue.current.shift());
          }
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setConnectionState('error');
          setErrorMsg('WebRTC connection failed');
        }
      };

      // 3. Set remote SDP offer and create answer
      console.log('[D-ID] Setting remote description...');
      await pc.setRemoteDescription(new RTCSessionDescription(streamData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (isCancelled()) return;

      // 4. Send SDP answer back
      console.log('[D-ID] Sending SDP answer...');
      const sdpRes = await didFetch(`/agents/${AGENT_ID}/streams/${streamData.id}/sdp`, {
        method: 'POST',
        body: JSON.stringify({ answer, session_id: streamData.session_id })
      });
      if (!sdpRes.ok) {
        console.warn('[D-ID] SDP response:', sdpRes.status, await sdpRes.text());
      } else {
        console.log('[D-ID] SDP answer accepted!');
      }

    } catch (err) {
      console.error("[D-ID] Connection failed:", err);
      setErrorMsg(err.message);
      setConnectionState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    const timer = setTimeout(() => {
      if (!cancelled) connectWebRTC(isCancelled);
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      // Cleanup stream on D-ID server
      if (streamInfoRef.current) {
        fetch(`${API_BASE}/agents/${AGENT_ID}/streams/${streamInfoRef.current.stream_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': AUTH_HEADER, 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: streamInfoRef.current.session_id }),
          keepalive: true
        }).catch(() => {});
        streamInfoRef.current = null;
      }
    };
  }, [connectWebRTC]);

  useImperativeHandle(ref, () => ({
    speak: async (text) => {
      if (hasUnmutedRef.current) {
        return doSpeak(text);
      } else {
        messageQueue.current.push(text);
        return Promise.resolve();
      }
    },
    chat: async () => {},
    isConnected: () => pcRef.current?.connectionState === 'connected',
  }));

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', cursor: isMuted ? 'pointer' : 'default' }} onClick={handleUserClick}>
      <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {connectionState === 'connecting' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.5)', fontSize: 13 }}>
          Connecting…
        </div>
      )}

      {connectionState === 'connected' && isMuted && (
        <div style={{ 
          position: 'absolute', inset: 0, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          background: 'rgba(0,0,0,0.75)', color: '#fff', padding: 20, textAlign: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#818cf8' }}>Audio is Ready</div>
          <button style={{ padding: '10px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Click to Start Interview
          </button>
        </div>
      )}

      {connectionState === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ef4444', background: 'rgba(0,0,0,0.8)', textAlign: 'center', padding: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Connection Failed</div>
          <div style={{ color: '#f87171', fontSize: 11, maxWidth: 220, marginBottom: 12 }}>
            {errorMsg}
          </div>
        </div>
      )}
    </div>
  );
});

export default DIDAvatar;
