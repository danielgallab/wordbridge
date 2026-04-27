'use client';

import { useState, useCallback, useEffect } from 'react';

const PLAYER_EXPERIENCE_KEY = 'wordbridge-player-experience';

export type HintPreference = 'auto' | 'minimal' | 'off';

interface PlayerExperience {
  gamesCompleted: number;
  hintsPreference: HintPreference;
  playerName: string;
}

const DEFAULT_EXPERIENCE: PlayerExperience = {
  gamesCompleted: 0,
  hintsPreference: 'auto',
  playerName: '',
};

function loadExperience(): PlayerExperience {
  if (typeof window === 'undefined') {
    return DEFAULT_EXPERIENCE;
  }
  try {
    const stored = localStorage.getItem(PLAYER_EXPERIENCE_KEY);
    if (!stored) return DEFAULT_EXPERIENCE;
    const parsed = JSON.parse(stored);
    return {
      gamesCompleted: parsed.gamesCompleted ?? 0,
      hintsPreference: parsed.hintsPreference ?? 'auto',
      playerName: parsed.playerName ?? '',
    };
  } catch {
    return DEFAULT_EXPERIENCE;
  }
}

function saveExperience(experience: PlayerExperience): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYER_EXPERIENCE_KEY, JSON.stringify(experience));
  } catch {
    // localStorage might be unavailable or full
  }
}

export function usePlayerExperience() {
  const [experience, setExperience] = useState<PlayerExperience>(DEFAULT_EXPERIENCE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadExperience();
    setExperience(loaded);
    setIsLoaded(true);
  }, []);

  const incrementGamesCompleted = useCallback(() => {
    setExperience(prev => {
      const updated = { ...prev, gamesCompleted: prev.gamesCompleted + 1 };
      saveExperience(updated);
      return updated;
    });
  }, []);

  const setHintsPreference = useCallback((preference: HintPreference) => {
    setExperience(prev => {
      const updated = { ...prev, hintsPreference: preference };
      saveExperience(updated);
      return updated;
    });
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setExperience(prev => {
      const updated = { ...prev, playerName: name };
      saveExperience(updated);
      return updated;
    });
  }, []);

  // Determine if player is experienced (completed 3+ games)
  const isExperienced = experience.gamesCompleted >= 3;

  // Determine if auto-hints should be enabled
  const autoHintsEnabled = experience.hintsPreference === 'auto' ||
    (experience.hintsPreference === 'minimal' && !isExperienced);

  return {
    gamesCompleted: experience.gamesCompleted,
    hintsPreference: experience.hintsPreference,
    playerName: experience.playerName,
    isExperienced,
    autoHintsEnabled,
    isLoaded,
    incrementGamesCompleted,
    setHintsPreference,
    setPlayerName,
  };
}

// Standalone functions for use outside React components
export function getPlayerExperience(): PlayerExperience {
  return loadExperience();
}

export function recordGameCompletion(): void {
  const current = loadExperience();
  saveExperience({ ...current, gamesCompleted: current.gamesCompleted + 1 });
}

export function getStoredPlayerName(): string {
  return loadExperience().playerName;
}

export function savePlayerName(name: string): void {
  const current = loadExperience();
  saveExperience({ ...current, playerName: name });
}
