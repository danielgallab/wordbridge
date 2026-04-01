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
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !disabled && !isValidating) {
      onSubmit(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          onKeyDown={handleKeyDown}
          placeholder="Type next word..."
          disabled={disabled || isValidating}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="none"
          className={`
            flex-1 px-4 py-3 rounded-md
            bg-[var(--surface)] border-2 border-[var(--border)]
            text-[var(--text)] font-mono uppercase
            placeholder:text-[var(--text-muted)] placeholder:normal-case
            focus:outline-none focus:border-[var(--correct)]
            disabled:opacity-50
            ${error ? 'border-[var(--error)] shake' : ''}
          `}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || isValidating || !value.trim()}
          className={`
            px-6 py-3 rounded-md font-bold
            bg-[var(--correct)] text-white
            hover:opacity-90 transition-opacity
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          {isValidating ? '...' : 'GO'}
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
