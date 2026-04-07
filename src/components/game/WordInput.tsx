'use client';

import { useState, useRef, useEffect } from 'react';

interface WordInputProps {
  onSubmit: (word: string) => void;
  disabled?: boolean;
  isValidating?: boolean;
  error?: string | null;
}

export function WordInput({ onSubmit, disabled, isValidating, error }: WordInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !disabled && !isValidating) {
      setValue('');
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onKeyDown={handleKeyDown}
          placeholder="Type next word..."
          disabled={disabled}
          readOnly={isValidating}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="none"
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
        <p className="text-sm text-[var(--error)] animate-[shake_0.3s_ease]">
          {error}
        </p>
      )}
    </div>
  );
}
