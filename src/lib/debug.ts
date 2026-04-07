// Debug logging utility - only logs in development mode

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
