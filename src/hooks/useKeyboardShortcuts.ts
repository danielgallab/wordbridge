'use client';

import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onClearInput?: () => void;
  onFocusInput?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onClearInput,
  onFocusInput,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input (except Escape)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape clears input when focused
      if (e.key === 'Escape' && isInput) {
        onClearInput?.();
        e.preventDefault();
        return;
      }

      // Don't trigger other shortcuts when in input
      if (isInput) return;

      // / to focus input
      if (e.key === '/') {
        onFocusInput?.();
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClearInput, onFocusInput]);
}
