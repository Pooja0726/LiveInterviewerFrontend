import { useRef, useState } from 'react';

// Two different jobs, two different tools:
//   - Live captions (what you SEE appear as you talk) -> browser's built-in
//     SpeechRecognition. Streams interim results instantly. Free, but less
//     accurate — good enough for a caption, not for what actually gets sent.
//   - The real answer that gets submitted -> Whisper, via useAudioRecorder,
//     on the recorded audio. More accurate, runs in parallel.
// Both run at once during a recording: this hook only ever drives the
// caption text on screen, it never sends anything anywhere.
export function useLiveCaption() {
  const [caption, setCaption] = useState('');
  const recognitionRef = useRef(null);

  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // not supported (e.g. Firefox) — recording/Whisper still work, captions just won't show

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setCaption(text);
    };

    // Some browsers stop the recognizer on brief silence even mid-answer —
    // restart it automatically as long as we're still meant to be listening.
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // already stopped intentionally (stop() clears the ref first) — ignore
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null; // clear first so the onend auto-restart above sees it's intentional
    recognition?.stop();
  };

  const reset = () => setCaption('');

  return { caption, start, stop, reset };
}
