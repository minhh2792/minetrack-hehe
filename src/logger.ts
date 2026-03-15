import { createLogger, format, transports, type transport } from 'winston'

const { combine, timestamp, printf, colorize } = format

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`
})

const logTransports: transport[] = [
  new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
  })
]

if (process.env.LOG_FILE) {
  logTransports.push(
    new transports.File({
      filename: process.env.LOG_FILE,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    })
  )
}

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: logTransports
})
