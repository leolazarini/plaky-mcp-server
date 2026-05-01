import pino from 'pino'
import { config } from '../config.js'

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: ['req.headers.authorization', 'Authorization'],
  ...(config.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})
