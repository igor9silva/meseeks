import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface CachedResponse {
  mimeType: string
  data: Buffer
  headers: Record<string, string | string[]>
  statusCode: number
  timestamp: number
}

const CACHE_TTL_MS = 1000 * 60 * 60
const CACHE_VERSION = 'v6'

function cacheDir() {
  return path.join(app.getPath('userData'), 'ai-cache')
}

function cachePathFor(url: string) {
  return path.join(cacheDir(), `${CACHE_VERSION}-${Buffer.from(url).toString('base64url')}.json`)
}

export async function getCachedResponse(url: string): Promise<CachedResponse | null> {
  try {
    const raw = await fs.readFile(cachePathFor(url), 'utf8')
    const cached = JSON.parse(raw) as Omit<CachedResponse, 'data'> & { data: string }

    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      await fs.unlink(cachePathFor(url)).catch(() => undefined)
      return null
    }

    return { ...cached, data: Buffer.from(cached.data, 'base64') }
  } catch {
    return null
  }
}

export async function setCachedResponse(url: string, payload: Omit<CachedResponse, 'timestamp'>): Promise<void> {
  await fs.mkdir(cacheDir(), { recursive: true })
  const serialized = {
    ...payload,
    timestamp: Date.now(),
    data: payload.data.toString('base64')
  }
  await fs.writeFile(cachePathFor(url), JSON.stringify(serialized), 'utf8')
}
