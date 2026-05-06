import { z } from 'zod'
import { logger } from '../lib/logger'

const envSchema = z.object({
  ELECTRON_RENDERER_URL: z.string().url().optional()
})

const envResult = envSchema.safeParse(process.env)

if (!envResult.success) {
  logger.warn('invalid environment variables. falling back to defaults.', {
    issues: envResult.error.issues.map(issue => issue.message)
  })
}

export const env = envResult.success
  ? envResult.data
  : {
      ELECTRON_RENDERER_URL: undefined
    }
