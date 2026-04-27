'use client';

import { useState, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { getStoredPlayerName } from '@/hooks/usePlayerExperience';

interface NameInputModalProps {
  onSubmit: (name: string) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

export function NameInputModal({ onSubmit, onSkip, isSubmitting }: NameInputModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    const storedName = getStoredPlayerName();
    if (storedName) {
      setName(storedName);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onSubmit(trimmedName);
    }
  };

  return (
    <div className="bg-[var(--background)] rounded-lg p-4 mb-4 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--present)]" />
          <h3 className="font-bold text-[var(--text)]">Join the Leaderboard!</h3>
        </div>
        <button
          onClick={onSkip}
          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          aria-label="Skip"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-sm text-[var(--text-muted)] mb-3">
        Enter your name to appear on the leaderboard
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="flex-1 px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--present)]"
          autoFocus
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="px-4 py-2 rounded-md bg-[var(--present)] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
