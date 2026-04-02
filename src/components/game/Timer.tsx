'use client';

interface TimerProps {
  timeLeft: number;
  totalTime: number;
}

export function Timer({ timeLeft, totalTime }: TimerProps) {
  const isUrgent = timeLeft <= 15;
  const progress = (timeLeft / totalTime) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-2xl sm:text-4xl font-bold tabular-nums ${
          isUrgent ? 'text-[var(--error)] animate-pulse' : 'text-[var(--text)]'
        }`}
      >
        {timeLeft}s
      </div>
      <div className="w-24 sm:w-32 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent ? 'bg-[var(--error)]' : 'bg-[var(--correct)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
