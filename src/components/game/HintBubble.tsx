'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface HintBubbleProps {
  words: string[];
  onDismiss: () => void;
}

export function HintBubble({ words, onDismiss }: HintBubbleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Rotate through words every 3 seconds with slower fade
  useEffect(() => {
    if (words.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);

      // After fade out (400ms), change word and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsTransitioning(false);
      }, 400);
    }, 3000);

    return () => clearInterval(interval);
  }, [words.length]);

  if (words.length === 0) return null;

  const currentWord = words[currentIndex];

  return (
    <div className="relative mb-3 animate-[fadeIn_0.3s_ease]">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--present)]/10 border border-[var(--present)]/30">
        <Lightbulb className="w-4 h-4 text-[var(--present)] flex-shrink-0" />
        <span className="text-sm text-[var(--text-muted)]">Try:</span>
        <span
          className={`font-mono font-bold uppercase text-[var(--present)] transition-opacity duration-400 ease-in-out ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {currentWord}
        </span>
        {words.length > 1 && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {currentIndex + 1}/{words.length}
          </span>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-[var(--present)]/20 transition-colors ml-1"
          aria-label="Dismiss hints"
        >
          <X className="w-3 h-3 text-[var(--text-muted)]" />
        </button>
      </div>
    </div>
  );
}
