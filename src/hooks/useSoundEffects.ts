'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound effect types
type SoundType = 'success' | 'error' | 'win' | 'lose' | 'tick';

// Simple audio context-based sound generation (no external files needed)
export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    // Init on first click/touch
    const handler = () => {
      initAudio();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    if (!enabledRef.current || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade out to avoid clicks
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;

    switch (sound) {
      case 'success':
        // Pleasant ascending tone
        playTone(523.25, 0.1); // C5
        setTimeout(() => playTone(659.25, 0.15), 80); // E5
        break;

      case 'error':
        // Low buzz
        playTone(200, 0.15, 'square', 0.2);
        break;

      case 'win':
        // Victory fanfare
        playTone(523.25, 0.15); // C5
        setTimeout(() => playTone(659.25, 0.15), 100); // E5
        setTimeout(() => playTone(783.99, 0.2), 200); // G5
        setTimeout(() => playTone(1046.5, 0.3), 350); // C6
        break;

      case 'lose':
        // Descending sad tone
        playTone(392, 0.2, 'triangle'); // G4
        setTimeout(() => playTone(349.23, 0.2, 'triangle'), 150); // F4
        setTimeout(() => playTone(293.66, 0.3, 'triangle'), 300); // D4
        break;

      case 'tick':
        // Short click for timer
        playTone(800, 0.05, 'sine', 0.1);
        break;
    }
  }, [playTone]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { play, setEnabled };
}
