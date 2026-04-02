'use client';

interface TimerProps {
  timeLeft: number;
  totalTime: number;
}

function getTimerColor(timeLeft: number, totalTime: number): string {
  const pct = timeLeft / totalTime;
  if (pct > 0.5) return 'var(--correct)';   // Green: >50%
  if (pct > 0.25) return 'var(--present)';  // Yellow: 25-50%
  if (pct > 0.1) return '#ff9800';          // Orange: 10-25%
  return 'var(--error)';                     // Red: <10%
}

export function Timer({ timeLeft, totalTime }: TimerProps) {
  const color = getTimerColor(timeLeft, totalTime);
  const isUrgent = timeLeft <= totalTime * 0.1;
  const progress = (timeLeft / totalTime) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-2xl sm:text-4xl font-bold tabular-nums ${isUrgent ? 'animate-pulse' : ''}`}
        style={{ color }}
      >
        {timeLeft}s
      </div>
      <div className="w-24 sm:w-32 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
