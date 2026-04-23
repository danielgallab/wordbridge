// Debug logging and monitoring utility

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'log' | 'warn' | 'error';

function createLogger(namespace: string) {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (isDev || level === 'error') {
      const prefix = `[${namespace}]`;
      console[level](prefix, ...args);
    }
  };

  return {
    log: (...args: unknown[]) => log('log', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
  };
}

// Pre-configured loggers for different modules
export const debug = {
  gameStore: createLogger('gameStore'),
  dailyStore: createLogger('dailyStore'),
  practiceStore: createLogger('practiceStore'),
  useGameRoom: createLogger('useGameRoom'),
  api: createLogger('api'),
};

// --- Metrics tracking ---

interface MetricEntry {
  count: number;
  totalMs: number;
  errors: number;
  lastResetAt: number;
}

const metrics = new Map<string, MetricEntry>();
const METRICS_WINDOW = 5 * 60 * 1000; // 5-minute rolling window

function getOrCreateMetric(name: string): MetricEntry {
  const now = Date.now();
  let entry = metrics.get(name);

  if (!entry || now - entry.lastResetAt > METRICS_WINDOW) {
    entry = { count: 0, totalMs: 0, errors: 0, lastResetAt: now };
    metrics.set(name, entry);
  }

  return entry;
}

export const monitor = {
  /** Record a successful API call with its duration */
  trackLatency(name: string, durationMs: number) {
    const entry = getOrCreateMetric(name);
    entry.count++;
    entry.totalMs += durationMs;
  },

  /** Record an error occurrence */
  trackError(name: string) {
    const entry = getOrCreateMetric(name);
    entry.errors++;
  },

  /** Record a cache hit or miss */
  trackCacheHit(name: string, hit: boolean) {
    const hitsEntry = getOrCreateMetric(`${name}:hits`);
    const missesEntry = getOrCreateMetric(`${name}:misses`);
    if (hit) {
      hitsEntry.count++;
    } else {
      missesEntry.count++;
    }
  },

  /** Get a snapshot of all metrics (for a health/metrics endpoint) */
  getSnapshot(): Record<string, { count: number; avgMs: number; errors: number }> {
    const snapshot: Record<string, { count: number; avgMs: number; errors: number }> = {};
    for (const [name, entry] of metrics) {
      snapshot[name] = {
        count: entry.count,
        avgMs: entry.count > 0 ? Math.round(entry.totalMs / entry.count) : 0,
        errors: entry.errors,
      };
    }
    return snapshot;
  },
};
