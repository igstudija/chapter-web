type LogLevel = 'error' | 'warn' | 'info'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  stack?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ROTATED_FILES = 5

// Use globalThis.__non_webpack_require__ or Function constructor to bypass webpack static analysis
// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
const nodeRequire = typeof __non_webpack_require__ !== 'undefined'
  ? __non_webpack_require__
  : new Function('mod', 'return require(mod)')

declare const __non_webpack_require__: typeof require

function getFs() {
  return nodeRequire('fs') as typeof import('fs')
}

function getLogPaths() {
  const pathMod = nodeRequire('path') as typeof import('path')
  const logDir = pathMod.join(process.cwd(), 'logs')
  const logFile = pathMod.join(logDir, 'app.log')
  return { logDir, logFile, path: pathMod }
}

function ensureLogDir(): void {
  try {
    const fs = getFs()
    const { logDir } = getLogPaths()
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  } catch {
    // Can't create dir - will fallback to console only
  }
}

function rotateIfNeeded(): void {
  try {
    const fs = getFs()
    const { logFile } = getLogPaths()
    if (!fs.existsSync(logFile)) return
    const stats = fs.statSync(logFile)
    if (stats.size < MAX_FILE_SIZE) return

    // Rotate: app.log.4 -> delete, app.log.3 -> app.log.4, ... app.log -> app.log.1
    for (let i = MAX_ROTATED_FILES; i >= 1; i--) {
      const older = `${logFile}.${i}`
      if (i === MAX_ROTATED_FILES) {
        if (fs.existsSync(older)) fs.unlinkSync(older)
      } else {
        const newer = `${logFile}.${i + 1}`
        if (fs.existsSync(older)) fs.renameSync(older, newer)
      }
    }
    fs.renameSync(logFile, `${logFile}.1`)
  } catch {
    // Rotation failed - continue logging to current file
  }
}

function writeToFile(entry: LogEntry): void {
  try {
    ensureLogDir()
    rotateIfNeeded()
    const fs = getFs()
    const { logFile } = getLogPaths()
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(logFile, line, 'utf-8')
  } catch {
    // File write failed - console output is the fallback
  }
}

function writeToConsole(entry: LogEntry): void {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
  const msg = `${prefix} ${entry.message}`

  if (entry.level === 'error') {
    console.error(msg)
    if (entry.stack) console.error(entry.stack)
    if (entry.context) console.error('Context:', JSON.stringify(entry.context))
  } else if (entry.level === 'warn') {
    console.warn(msg)
  } else {
    console.log(msg)
  }
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, stack?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    ...(stack ? { stack } : {}),
  }

  writeToConsole(entry)
  writeToFile(entry)
}

export const logger = {
  error(message: string, contextOrError?: Record<string, unknown> | Error | unknown): void {
    if (contextOrError instanceof Error) {
      log('error', message, {
        errorName: contextOrError.name,
        errorMessage: contextOrError.message,
      }, contextOrError.stack)
    } else if (contextOrError && typeof contextOrError === 'object') {
      log('error', message, contextOrError as Record<string, unknown>)
    } else if (contextOrError !== undefined) {
      log('error', message, { value: String(contextOrError) })
    } else {
      log('error', message)
    }
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context)
  },

  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context)
  },
}

/** Read log entries from the log file (newest first) */
export function readLogs(options?: {
  limit?: number
  level?: LogLevel
  search?: string
}): LogEntry[] {
  const limit = options?.limit ?? 100
  const level = options?.level
  const search = options?.search?.toLowerCase()

  try {
    const fs = getFs()
    const { logFile } = getLogPaths()
    if (!fs.existsSync(logFile)) return []
    const content = fs.readFileSync(logFile, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    let entries: LogEntry[] = []
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line))
      } catch {
        // Skip malformed lines
      }
    }

    // Newest first
    entries.reverse()

    // Filter by level
    if (level) {
      entries = entries.filter((e) => e.level === level)
    }

    // Filter by search term
    if (search) {
      entries = entries.filter(
        (e) =>
          e.message.toLowerCase().includes(search) ||
          e.stack?.toLowerCase().includes(search) ||
          JSON.stringify(e.context || {}).toLowerCase().includes(search),
      )
    }

    return entries.slice(0, limit)
  } catch {
    return []
  }
}

/** Get list of available log files (for reading rotated logs) */
export function getLogFiles(): { name: string; size: number; modified: string }[] {
  try {
    const fs = getFs()
    const { logDir, path: pathModule } = getLogPaths()
    ensureLogDir()
    const files = fs.readdirSync(logDir)
    return files
      .filter((f: string) => f.startsWith('app.log'))
      .map((f: string) => {
        const filePath = pathModule.join(logDir, f)
        const stats = fs.statSync(filePath)
        return {
          name: f,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        }
      })
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}
