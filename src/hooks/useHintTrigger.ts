import { useEffect, useRef } from 'react';

interface UseHintTriggerOptions {
  chainLength: number;
  rejectionCount: number;
  lastWordTimestamp: number;
  onTrigger: () => void;
  enabled: boolean;
  showHints: boolean;
  isFetchingHints: boolean;
}

// Base thresholds — scale up as the chain grows
const FIRST_WORD_DELAY = 10000; // 10 seconds for first word
const BASE_LATER_DELAY = 15000; // 15 seconds base for later words
const DELAY_PER_WORD = 5000;    // +5 seconds per word already in chain
const BASE_REJECTION_THRESHOLD = 2;
const REJECTION_PER_WORD = 1;   // +1 rejection needed per word in chain

function getTimeDelay(chainLength: number): number {
  if (chainLength <= 1) return FIRST_WORD_DELAY;
  // words entered = chainLength - 1 (subtract the start word)
  const wordsEntered = chainLength - 1;
  return BASE_LATER_DELAY + wordsEntered * DELAY_PER_WORD;
}

function getRejectionThreshold(chainLength: number): number {
  const wordsEntered = Math.max(0, chainLength - 1);
  return BASE_REJECTION_THRESHOLD + wordsEntered * REJECTION_PER_WORD;
}

export function useHintTrigger({
  chainLength,
  rejectionCount,
  lastWordTimestamp,
  onTrigger,
  enabled,
  showHints,
  isFetchingHints,
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

      // Check rejection threshold — scales with progress
      if (rejectionCount >= getRejectionThreshold(chainLength)) {
        hasTriggeredRef.current = true;
        onTrigger();
        return;
      }

      // Time-based trigger — delay scales with chain length
      const delay = getTimeDelay(chainLength);
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
  ]);

  // Reset mount time when enabled changes (e.g., new puzzle)
  useEffect(() => {
    if (enabled) {
      mountTimeRef.current = Date.now();
      hasTriggeredRef.current = false;
    }
  }, [enabled]);
}
