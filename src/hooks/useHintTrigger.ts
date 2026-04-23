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

// Time thresholds in milliseconds
const FIRST_WORD_DELAY = 10000; // 10 seconds for first word
const LATER_WORD_DELAY = 15000; // 15 seconds for later words
const REJECTION_THRESHOLD = 2; // Number of rejections to trigger hint

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

      // Check rejection threshold (works for any word position)
      if (rejectionCount >= REJECTION_THRESHOLD) {
        hasTriggeredRef.current = true;
        onTrigger();
        return;
      }

      // For first word (chain has only start word), check time since mount
      if (chainLength === 1) {
        const timeSinceMount = now - mountTimeRef.current;
        if (timeSinceMount >= FIRST_WORD_DELAY) {
          hasTriggeredRef.current = true;
          onTrigger();
          return;
        }
      } else {
        // For later words, check time since last successful word
        const timeSinceLastWord = now - lastWordTimestamp;
        if (timeSinceLastWord >= LATER_WORD_DELAY) {
          hasTriggeredRef.current = true;
          onTrigger();
          return;
        }
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
