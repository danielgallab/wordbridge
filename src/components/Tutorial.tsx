'use client';

import { useState, useEffect, useCallback } from 'react';
import { Waypoints, Target, Check, X, Sparkles, ArrowRight } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to WordBridge!',
    description: 'Build word chains to connect the START word to the TARGET word using related words.',
    visual: (
      <div className="flex flex-col items-center gap-8 py-6">
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 rounded-lg bg-[var(--present)] text-white font-bold uppercase text-base shadow-lg opacity-0 animate-[slideInLeft_0.5s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
            SUN
          </div>
          <div className="opacity-0 animate-[scaleIn_0.5s_ease-out_forwards]" style={{ animationDelay: '0.5s' }}>
            <ArrowRight className="w-8 h-8 text-[var(--text-muted)]" strokeWidth={2.5} />
          </div>
          <div className="px-5 py-3 rounded-lg bg-[var(--correct)] text-white font-bold uppercase text-base shadow-lg opacity-0 animate-[slideInRight_0.5s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
            SHARK
          </div>
        </div>
        <div className="px-6 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animationDelay: '0.8s' }}>
          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
            Find a path of related words to bridge<br />from the <span className="font-bold text-[var(--present)]">yellow start</span> to the <span className="font-bold text-[var(--correct)]">green target</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Build Your Chain',
    description: 'Type words that are related to the previous word. Each word must connect logically!',
    visual: (
      <div className="flex flex-col gap-2 py-6 w-full max-w-[240px] mx-auto">
        {[
          { word: 'SUN', color: 'var(--present)', delay: '0s' },
          { word: 'SKY', color: 'var(--surface)', delay: '0.1s', border: true },
          { word: 'BLUE', color: 'var(--surface)', delay: '0.2s', border: true },
          { word: 'OCEAN', color: 'var(--surface)', delay: '0.3s', border: true },
          { word: 'SHARK', color: 'var(--correct)', delay: '0.4s' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="w-full px-4 py-2.5 rounded-lg font-bold uppercase text-sm flex justify-between items-center shadow-md opacity-0 animate-[slideInUp_0.4s_ease-out_forwards]"
            style={{
              backgroundColor: item.border ? item.color : item.color,
              border: item.border ? '2px solid var(--border)' : 'none',
              color: item.border ? 'var(--text)' : 'white',
              animationDelay: item.delay,
            }}
          >
            <span>{item.word}</span>
            <span className="opacity-60 text-xs">+{idx}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Words Must Connect',
    description: 'Each word must be directly related to the previous one. Weak connections will be rejected!',
    visual: (
      <div className="flex flex-col gap-3 py-6 text-sm">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--correct)]/10 border-2 border-[var(--correct)]/30 animate-[slideInLeft_0.4s_ease-out]">
          <Check className="w-5 h-5 text-[var(--correct)] flex-shrink-0" />
          <span className="font-medium">SUN → SKY</span>
          <span className="text-xs text-[var(--correct)] ml-auto font-bold">✓ STRONG</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--error)]/10 border-2 border-[var(--error)]/30 opacity-75 animate-[shake_0.5s_ease-out]" style={{ animationDelay: '0.2s' }}>
          <X className="w-5 h-5 text-[var(--error)] flex-shrink-0" />
          <span className="line-through font-medium">SUN → PIZZA</span>
          <span className="text-xs text-[var(--error)] ml-auto font-bold">✗ WEAK</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--error)]/10 border-2 border-[var(--error)]/30 opacity-75 animate-[shake_0.5s_ease-out]" style={{ animationDelay: '0.4s' }}>
          <X className="w-5 h-5 text-[var(--error)] flex-shrink-0" />
          <span className="line-through font-medium">TREE → LEG</span>
          <span className="text-xs text-[var(--error)] ml-auto font-bold">✗ TOO INDIRECT</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Aim for the Shortest Path',
    description: 'Challenge yourself to find the most efficient chain. Fewer steps means a better solution!',
    visual: (
      <div className="flex flex-col items-center gap-5 py-6">
        <div className="flex items-center gap-8">
          <div className="text-center opacity-0 animate-[scaleIn_0.5s_ease-out_forwards]">
            <div className="flex justify-center mb-2">
              <Target className="w-10 h-10 text-[var(--correct)]" />
            </div>
            <div className="text-sm text-[var(--correct)] font-bold">3 steps</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Excellent!</div>
          </div>
          <div className="text-center opacity-0 animate-[scaleIn_0.5s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-center mb-2">
              <Sparkles className="w-10 h-10 text-[var(--present)]" />
            </div>
            <div className="text-sm text-[var(--text-muted)] font-bold">5 steps</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Good!</div>
          </div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-[var(--present)]/10 border border-[var(--present)]/30 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animationDelay: '0.4s' }}>
          <p className="text-xs text-[var(--text-muted)] text-center">
            <span className="font-bold text-[var(--text)]">No timer, no opponent</span> — take your time to find the best path!
          </p>
        </div>
      </div>
    ),
  },
];

export function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = useCallback(() => {
    if (currentStep === TUTORIAL_STEPS.length - 1) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, onClose]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-[scaleIn_0.3s_ease-out]">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'bg-[var(--correct)] w-6'
                  : index < currentStep
                  ? 'bg-[var(--present)]'
                  : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 text-center h-[400px] flex flex-col">
          <h2 className="text-2xl font-bold mb-2 text-[var(--text)]">{step.title}</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.description}</p>
          <div className="flex-1 flex items-center justify-center">
            {step.visual}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold text-sm hover:opacity-90 transition-all hover:scale-105"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-[var(--correct)] text-white font-bold text-sm hover:opacity-90 transition-all hover:scale-105 shadow-md"
            >
              {isLastStep ? "Let's Play!" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
