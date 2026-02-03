type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const prefix = context ? `[${context}]` : '';
    return `[Flow Affiliate Pro]${prefix} ${message}`;
  }

  private createEntry(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    if (!this.isDevelopment) return;
    
    const entry = this.createEntry('debug', message, data, context);
    this.store(entry);
    console.debug(this.formatMessage('debug', message, context), data ?? '');
  }

  info(message: string, data?: unknown, context?: string): void {
    const entry = this.createEntry('info', message, data, context);
    this.store(entry);
    
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context), data ?? '');
    }
  }

  warn(message: string, data?: unknown, context?: string): void {
    const entry = this.createEntry('warn', message, data, context);
    this.store(entry);
    console.warn(this.formatMessage('warn', message, context), data ?? '');
  }

  error(message: string, error?: Error | unknown, context?: string): void {
    const entry = this.createEntry('error', message, error, context);
    this.store(entry);
    console.error(this.formatMessage('error', message, context), error ?? '');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const logger = new Logger();

// Context-specific loggers
export const createLogger = (context: string) => ({
  debug: (message: string, data?: unknown) => logger.debug(message, data, context),
  info: (message: string, data?: unknown) => logger.info(message, data, context),
  warn: (message: string, data?: unknown) => logger.warn(message, data, context),
  error: (message: string, error?: Error | unknown) => logger.error(message, error, context),
});
