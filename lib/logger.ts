type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (!meta) {
    return `[${ts}] [${level.toUpperCase()}] ${message}`;
  }

  let serialized = '';
  try {
    serialized = JSON.stringify(meta);
  } catch {
    serialized = '[unserializable meta]';
  }

  return `[${ts}] [${level.toUpperCase()}] ${message} ${serialized}`;
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    console.debug(formatLog('debug', message, meta));
  },
};
