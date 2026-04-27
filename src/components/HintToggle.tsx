'use client';

import { Lightbulb, LightbulbOff } from 'lucide-react';
import { usePlayerExperience, type HintPreference } from '@/hooks/usePlayerExperience';

const HINT_LABELS: Record<HintPreference, string> = {
  auto: 'Hints: Auto',
  minimal: 'Hints: Minimal',
  off: 'Hints: Off',
};

const HINT_CYCLE: HintPreference[] = ['auto', 'minimal', 'off'];

export function HintToggle() {
  const { hintsPreference, setHintsPreference, isLoaded } = usePlayerExperience();

  if (!isLoaded) {
    return null;
  }

  const cyclePreference = () => {
    const currentIndex = HINT_CYCLE.indexOf(hintsPreference);
    const nextIndex = (currentIndex + 1) % HINT_CYCLE.length;
    setHintsPreference(HINT_CYCLE[nextIndex]);
  };

  const isOff = hintsPreference === 'off';

  return (
    <button
      onClick={cyclePreference}
      className="hover:text-[var(--text)] transition-colors flex items-center gap-1"
      aria-label={HINT_LABELS[hintsPreference]}
      title={`${HINT_LABELS[hintsPreference]} (click to change)`}
    >
      {isOff ? <LightbulbOff size={16} /> : <Lightbulb size={16} />}
      <span className="text-[10px] uppercase tracking-wide">
        {hintsPreference === 'auto' ? 'Auto' : hintsPreference === 'minimal' ? 'Min' : 'Off'}
      </span>
    </button>
  );
}
