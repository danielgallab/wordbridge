'use client';

import { useState, useCallback } from 'react';

const TUTORIAL_SEEN_KEY = 'wordbridge-tutorial-seen';

function getInitialState(): { showTutorial: boolean; isLoaded: boolean } {
  if (typeof window === 'undefined') {
    return { showTutorial: false, isLoaded: false };
  }
  const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
  return { showTutorial: !seen, isLoaded: true };
}

export function useTutorial() {
  const [state, setState] = useState(getInitialState);

  const closeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    setState({ showTutorial: false, isLoaded: true });
  }, []);

  const openTutorial = useCallback(() => {
    setState(prev => ({ ...prev, showTutorial: true }));
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_SEEN_KEY);
    setState({ showTutorial: true, isLoaded: true });
  }, []);

  return {
    showTutorial: state.showTutorial,
    isLoaded: state.isLoaded,
    closeTutorial,
    openTutorial,
    resetTutorial,
  };
}
