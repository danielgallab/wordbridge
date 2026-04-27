import { useEffect, useRef } from 'react';

interface UseHintTriggerOptions {
  chainLength: number;
  rejectionCount: number;
  lastWordTimestamp: number;
  onTrigger: () => void;
  enabled: boolean;
  showHints: boolean;
  isFetchingHints: boolean;
  // Experience-based settings
  isExperienced?: boolean; // Has completed 3+ games
}

// Thresholds for NEW players (first 3 games) - helpful and frequent
const NEW_PLAYER = {
  FIRST_WORD_DELAY: 15000,    // 15 seconds for first word
  BASE_LATER_DELAY: 20000,    // 20 seconds base for later words
  DELAY_PER_WORD: 5000,       // +5 seconds per word already in chain
  BASE_REJECTION_THRESHOLD: 2,
  REJECTION_PER_WORD: 1,
};

// Thresholds for EXPERIENCED players - much less intrusive
const EXPERIENCED_PLAYER = {
  FIRST_WORD_DELAY: 60000,    // 60 seconds for first word
  BASE_LATER_DELAY: 45000,    // 45 seconds base for later words
  DELAY_PER_WORD: 10000,      // +10 seconds per word already in chain
  BASE_REJECTION_THRESHOLD: 5,
  REJECTION_PER_WORD: 2,
};

function getTimeDelay(chainLength: number, isExperienced: boolean): number {
  const config = isExperienced ? EXPERIENCED_PLAYER : NEW_PLAYER;
  if (chainLength <= 1) return config.FIRST_WORD_DELAY;
  // words entered = chainLength - 1 (subtract the start word)
  const wordsEntered = chainLength - 1;
  return config.BASE_LATER_DELAY + wordsEntered * config.DELAY_PER_WORD;
}

function getRejectionThreshold(chainLength: number, isExperienced: boolean): number {
  const config = isExperienced ? EXPERIENCED_PLAYER : NEW_PLAYER;
  const wordsEntered = Math.max(0, chainLength - 1);
  return config.BASE_REJECTION_THRESHOLD + wordsEntered * config.REJECTION_PER_WORD;
}

export function useHintTrigger({
  chainLength,
  rejectionCount,
  lastWordTimestamp,
  onTrigger,
  enabled,
  showHints,
  isFetchingHints,
  isExperienced = false,
}: UseHintTriggerOptions) {
  const hasTriggeredRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  const lastChainLengthRef = useRef(chainLength);

  // Reset trigger flag when chain advances
  useEffect(() => {
    if (chainLength !== lastChainLengthRef.current) {
      hasTriggeredRef.current = false;
      lastChainLengthRef.current = chainLength;
    }
  }, [chainLength]);

  // Check conditions periodically
  useEffect(() => {
    if (!enabled || showHints || isFetchingHints || hasTriggeredRef.current) {
      return;
    }

    const checkConditions = () => {
      if (hasTriggeredRef.current || showHints || isFetchingHints) return;

      const now = Date.now();

      // Check rejection threshold — scales with progress and experience
      if (rejectionCount >= getRejectionThreshold(chainLength, isExperienced)) {
        hasTriggeredRef.current = true;
        onTrigger();
        return;
      }

      // Time-based trigger — delay scales with chain length and experience
      const delay = getTimeDelay(chainLength, isExperienced);
      const elapsed =
        chainLength === 1
          ? now - mountTimeRef.current
          : now - lastWordTimestamp;

      if (elapsed >= delay) {
        hasTriggeredRef.current = true;
        onTrigger();
        return;
      }
    };

    // Check immediately
    checkConditions();

    // Then check every second
    const interval = setInterval(checkConditions, 1000);

    return () => clearInterval(interval);
  }, [
    enabled,
    showHints,
    isFetchingHints,
    chainLength,
    rejectionCount,
    lastWordTimestamp,
    onTrigger,
    isExperienced,
  ]);

  // Reset mount time when enabled changes (e.g., new puzzle)
  useEffect(() => {
    if (enabled) {
      mountTimeRef.current = Date.now();
      hasTriggeredRef.current = false;
    }
  }, [enabled]);
}
