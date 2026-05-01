import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  PLAKY_BASE_URL: z.string().url().default('https://api.plaky.com/v1/public'),
  PLAKY_DEFAULT_SPACE_ID: z.string().min(1),
  PLAKY_DEFAULT_BOARD_ID: z.string().min(1),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.format())
  process.exit(1)
}

export const config = result.data
export type Config = typeof config
