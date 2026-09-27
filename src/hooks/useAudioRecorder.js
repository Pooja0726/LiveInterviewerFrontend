import { useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';

// ── Config ─────────────────────────────────────────────────────────────────
const SILENCE_THRESHOLD_RMS = 0.003; // Lower threshold to detect quieter speech
const SILENCE_DURATION_MS   = 3000;  // 3s of continuous silence → auto-stop
const CHUNK_MS              = 80;    // ~80ms analysis slices (matches voice.ts)

// ── RMS helper ─────────────────────────────────────────────────────────────
function calcRMS(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128; // uint8 → [-1,1]
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

/**
 * useAudioRecorder
 *
 * Starts on startRecording(), stops either manually (stopRecording()) or
 * automatically after SILENCE_DURATION_MS of sub-threshold audio.
 * Sends the recorded blob to Whisper and calls onTranscribed(text).
 */
export function useAudioRecorder(onTranscribed) {
  const [recording, setRecording]     = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError]             = useState(null);
  const [volume, setVolume]           = useState(0); // Real-time volume 0-1

  const mediaRecorderRef  = useRef(null);
  const chunksRef         = useRef([]);
  const streamRef         = useRef(null);
  const audioCtxRef       = useRef(null);
  const analyserRef       = useRef(null);
  const silenceTimerRef   = useRef(null);
  const rafRef            = useRef(null);
  const stoppedRef        = useRef(false); // prevent double-stop

  // ── Cleanup audio analysis ───────────────────────────────────────────────
  const stopAnalysis = useCallback(() => {
    if (rafRef.current)      { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
    setVolume(0);
  }, []);

  // ── Internal stop (called by both silence-detection and manual) ──────────
  const doStop = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    stopAnalysis();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setRecording(false);
  }, [stopAnalysis]);

  // ── Start recording + silence detection ─────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    stoppedRef.current = false;
    chunksRef.current  = [];
    setVolume(0);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access denied or unavailable.');
      return;
    }
    streamRef.current = stream;

    // ── MediaRecorder ──────────────────────────────────────────────────────
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setTranscribing(true);
      try {
        const result = await api.transcribeAudio(blob);
        onTranscribed(result.text);
      } catch (err) {
        setError('Transcription failed: ' + err.message);
      } finally {
        setTranscribing(false);
      }
    };

    recorder.start(CHUNK_MS); // timesliced so ondataavailable fires often
    setRecording(true);

    // ── Silence detection via Web Audio analyser ───────────────────────────
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      let silenceSince = null;

      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        const rms = calcRMS(buf);
        
        // Update visual volume state (scale it up a bit for visual effect)
        setVolume(Math.min(1, rms * 10));

        if (rms < SILENCE_THRESHOLD_RMS) {
          if (silenceSince === null) silenceSince = Date.now();
          else if (Date.now() - silenceSince >= SILENCE_DURATION_MS) {
            // Auto-end turn after sustained silence
            doStop();
            return;
          }
        } else {
          silenceSince = null; // reset on any speech
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Web Audio not available — silence detection just won't work, manual stop still works
    }
  }, [onTranscribed, doStop]);

  // ── Manual stop ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    doStop();
  }, [doStop]);

  return { recording, transcribing, error, volume, startRecording, stopRecording };
}
