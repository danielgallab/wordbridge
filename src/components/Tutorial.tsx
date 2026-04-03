'use client';

import { useState, useEffect, useCallback } from 'react';
import { Waypoints, Trophy, Meh, Lightbulb, Check, X } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to WordBridge!',
    description: 'Build word chains to connect two words. Let\'s learn how to play!',
    visual: (
      <div className="flex items-center justify-center gap-2 py-4">
        <Waypoints className="w-12 h-12 text-[var(--present)]" />
      </div>
    ),
  },
  {
    title: 'Your Goal',
    description: 'Connect the START word to the TARGET word using related words.',
    visual: (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-md bg-[var(--present)] text-white font-bold uppercase text-sm">
            CAT
          </div>
          <span className="text-[var(--text-muted)] text-lg">→</span>
          <div className="px-4 py-2 rounded-md bg-[var(--correct)] text-white font-bold uppercase text-sm">
            DOG
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Yellow = Start • Green = Target
        </p>
      </div>
    ),
  },
  {
    title: 'Build Your Chain',
    description: 'Type words that are related to the previous word. Each word must connect logically!',
    visual: (
      <div className="flex flex-col gap-1.5 py-4 max-w-[200px] mx-auto">
        <div className="px-3 py-2 rounded-md bg-[var(--present)] text-white font-bold uppercase text-sm flex justify-between">
          <span>CAT</span>
          <span className="opacity-60 text-xs">+0</span>
        </div>
        <div className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] font-bold uppercase text-sm flex justify-between">
          <span>PET</span>
          <span className="opacity-60 text-xs">+1</span>
        </div>
        <div className="px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] font-bold uppercase text-sm flex justify-between">
          <span>ANIMAL</span>
          <span className="opacity-60 text-xs">+2</span>
        </div>
        <div className="px-3 py-2 rounded-md bg-[var(--correct)] text-white font-bold uppercase text-sm flex justify-between">
          <span>DOG</span>
          <span className="opacity-60 text-xs">+3</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Words Must Connect',
    description: 'Each word must be directly related to the previous one. Weak connections will be rejected!',
    visual: (
      <div className="flex flex-col gap-2.5 py-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--correct)]/10 border border-[var(--correct)]/30">
          <Check className="w-4 h-4 text-[var(--correct)]" />
          <span>CAT → PET</span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">(direct)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--error)]/10 border border-[var(--error)]/30 opacity-75">
          <X className="w-4 h-4 text-[var(--error)]" />
          <span className="line-through">CAT → ROCKET</span>
          <span className="text-xs text-[var(--error)] ml-auto">no connection</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--error)]/10 border border-[var(--error)]/30 opacity-75">
          <X className="w-4 h-4 text-[var(--error)]" />
          <span className="line-through">TREE → LEG</span>
          <span className="text-xs text-[var(--error)] ml-auto">too indirect</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center mt-1">
          TREE→LEG needs: tree→wood→furniture→leg
        </p>
      </div>
    ),
  },
  {
    title: 'Shortest Chain Wins',
    description: 'Race against your opponent! The player with the shortest chain when time runs out wins.',
    visual: (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Trophy className="w-8 h-8 text-[var(--correct)]" />
            </div>
            <div className="text-xs text-[var(--correct)] font-bold">3 steps</div>
          </div>
          <div className="text-[var(--text-muted)]">vs</div>
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Meh className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <div className="text-xs text-[var(--text-muted)]">5 steps</div>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Fewer steps = Better!
        </p>
      </div>
    ),
  },
  {
    title: 'Tips for Success',
    description: 'Think of synonyms, categories, or associations. Be creative but logical!',
    visual: (
      <div className="flex flex-col gap-3 py-4 text-sm">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[var(--present)]" />
          <span className="text-[var(--text-muted)]">OCEAN → WATER → DRINK</span>
        </div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[var(--present)]" />
          <span className="text-[var(--text-muted)]">FAST → SPEED → CAR</span>
        </div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[var(--present)]" />
          <span className="text-[var(--text-muted)]">KING → ROYAL → CROWN</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Ready to Play!',
    description: 'Create a room and share the code with a friend, or join an existing room.',
    visual: (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-md bg-[var(--correct)] text-white font-bold text-sm">
            Create Room
          </div>
          <div className="px-4 py-2 rounded-md bg-[var(--present)] text-white font-bold text-sm">
            Join
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Share the 4-letter code with your opponent
        </p>
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border-2 border-[var(--border)] rounded-xl w-full max-w-sm overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-[var(--correct)]'
                  : index < currentStep
                  ? 'bg-[var(--present)]'
                  : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 text-center">
          <h2 className="text-xl font-bold mb-2">{step.title}</h2>
          <p className="text-sm text-[var(--text-muted)]">{step.description}</p>
          {step.visual}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-md bg-[var(--correct)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {isLastStep ? "Let's Play!" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
