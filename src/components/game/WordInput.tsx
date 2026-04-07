'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface WordInputProps {
  onSubmit: (word: string) => void;
  disabled?: boolean;
  isValidating?: boolean;
  error?: string | null;
}

export function WordInput({ onSubmit, disabled, isValidating, error }: WordInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef<number>(0);
  const DEBOUNCE_MS = 300; // Prevent rapid submissions

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus input after validation completes (for rapid play)
  useEffect(() => {
    if (!isValidating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isValidating]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim().toLowerCase();
    const now = Date.now();

    // Debounce: prevent rapid submissions
    if (now - lastSubmitRef.current < DEBOUNCE_MS) {
      return;
    }

    if (trimmed && !disabled && !isValidating) {
      lastSubmitRef.current = now;
      setValue('');
      onSubmit(trimmed);
    }
  }, [value, disabled, isValidating, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't transform the value - let mobile keyboards work naturally
    // The value is normalized to lowercase on submit, and CSS displays it uppercase
    setValue(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2" role="form" aria-label="Word submission">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type next word..."
          disabled={disabled}
          readOnly={isValidating}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="send"
          aria-label="Enter your next word"
          aria-invalid={!!error}
          aria-describedby={error ? 'word-input-error' : undefined}
          autoFocus
          className={`
            flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md text-base
            bg-[var(--surface)] border-2 border-[var(--border)]
            text-[var(--text)] font-mono uppercase
            placeholder:text-[var(--text-muted)] placeholder:normal-case
            focus:outline-none focus:border-[var(--correct)]
            disabled:opacity-50
            ${isValidating ? 'opacity-70' : ''}
            ${error ? 'border-[var(--error)] shake' : ''}
          `}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || isValidating || !value.trim()}
          aria-label="Submit word"
          className={`
            px-4 sm:px-6 py-2.5 sm:py-3 rounded-md font-bold
            bg-[var(--correct)] text-white
            hover:opacity-90 transition-opacity
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          GO
        </button>
      </div>
      {error && (
        <p
          id="word-input-error"
          role="alert"
          aria-live="assertive"
          className="text-sm text-[var(--error)] animate-[shake_0.3s_ease]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
