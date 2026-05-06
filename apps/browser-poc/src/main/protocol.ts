import { net, protocol, session } from 'electron'
import { gunzipSync, inflateSync, brotliDecompressSync } from 'node:zlib'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { processWithAI } from './ai-processor'
import { getCachedResponse, setCachedResponse } from './cache'
import { logger } from './lib/logger'

type ResponseHeaders = Record<string, string | string[]>
type RawResponseHeaders = Record<string, string | string[] | undefined>
const AI_BYPASS_DOMAINS: string[] = [];
// const AI_BYPASS_DOMAINS = ['youtube.com', 'youtube-nocookie.com', 'google.com', 'googlevideo.com', 'ytimg.com', 'gstatic.com']

function mimeTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    }[ext] || 'application/octet-stream'
  )
}

function shouldProcess(contentType: string) {
  return contentType.includes('text/html')
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

function shouldBypassAiForHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase()
  return AI_BYPASS_DOMAINS.some(domain => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`))
}

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function normalizeResponseHeaders(headers: RawResponseHeaders): ResponseHeaders {
  const nextHeaders: ResponseHeaders = {}

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'undefined') continue
    if (Array.isArray(value)) {
      const filteredValues = value.filter(item => item.trim().length > 0)
      if (filteredValues.length === 0) continue
      nextHeaders[key.toLowerCase()] = filteredValues
      continue
    }

    if (value.trim().length === 0) continue
    nextHeaders[key.toLowerCase()] = value
  }

  return nextHeaders
}

function hasNoStoreCacheControl(headers: ResponseHeaders) {
  const cacheControl = firstHeaderValue(headers['cache-control'])
  return cacheControl.toLowerCase().includes('no-store')
}

function stripCacheUnsafeHeaders(headers: ResponseHeaders): ResponseHeaders {
  const nextHeaders: ResponseHeaders = { ...headers }
  delete nextHeaders['set-cookie']
  delete nextHeaders['date']
  delete nextHeaders['expires']
  return nextHeaders
}

function stripProcessingUnsafeHeaders(headers: ResponseHeaders): ResponseHeaders {
  const nextHeaders: ResponseHeaders = { ...headers }
  delete nextHeaders['content-length']
  delete nextHeaders['content-encoding']
  delete nextHeaders['transfer-encoding']
  delete nextHeaders['content-security-policy']
  delete nextHeaders['content-security-policy-report-only']
  return nextHeaders
}

function buildForwardHeaders(request: Electron.ProtocolRequest): Record<string, string> {
  const nextHeaders: Record<string, string> = {}

  for (const [key, value] of Object.entries(request.headers)) {
    nextHeaders[key] = value
  }

  return nextHeaders
}

function decodeHtmlBody(body: Buffer, contentEncodingHeader: string) {
  const normalizedEncoding = contentEncodingHeader.trim().toLowerCase()
  if (normalizedEncoding.length === 0 || normalizedEncoding === 'identity') {
    return body.toString('utf8')
  }

  try {
    if (normalizedEncoding.includes('gzip')) {
      return gunzipSync(body).toString('utf8')
    }

    if (normalizedEncoding.includes('deflate')) {
      return inflateSync(body).toString('utf8')
    }

    if (normalizedEncoding.includes('br')) {
      return brotliDecompressSync(body).toString('utf8')
    }
  } catch {
    return null
  }

  return null
}

async function writeUploadData(clientRequest: Electron.ClientRequest, uploadData?: Electron.UploadData[]) {
  if (!uploadData) return

  for (const part of uploadData) {
    if (part.bytes.length > 0) {
      clientRequest.write(part.bytes)
      continue
    }

    if (!part.file) continue
    const fileBytes = await fs.readFile(part.file)
    if (fileBytes.length === 0) continue
    clientRequest.write(fileBytes)
  }
}

export function registerLocalProtocol() {
  protocol.handle('app', async request => {
    const requestUrl = new URL(request.url)
    if (requestUrl.hostname !== 'local') {
      return new Response('Unknown app host', { status: 404 })
    }

    const relativePath = requestUrl.pathname.replace(/^\/+/, '')
    const filePath = path.join(__dirname, '../static', relativePath)

    try {
      const file = await fs.readFile(filePath)
      return new Response(file, { headers: { 'content-type': mimeTypeFor(filePath) } })
    } catch {
      return new Response('File not found', { status: 404 })
    }
  })
}

export function registerAIProtocol() {
  const browserSession = session.fromPartition('persist:browser-poc')
  for (const targetSession of [session.defaultSession, browserSession]) {
    for (const scheme of ['https', 'http'] as const) {
      targetSession.protocol.interceptBufferProtocol(scheme, async (request, callback) => {
        try {
          const parsedUrl = new URL(request.url)
          const localRequest = isLocalHost(parsedUrl.hostname)
          const shouldBypassAi = shouldBypassAiForHost(parsedUrl.hostname)
          const isGetRequest = request.method.toUpperCase() === 'GET'
          const canUseCache = !localRequest && isGetRequest && !shouldBypassAi

          if (canUseCache) {
            const cached = await getCachedResponse(request.url)
            if (cached) {
              callback({
                mimeType: cached.mimeType,
                data: cached.data,
                statusCode: cached.statusCode,
                headers: cached.headers
              })
              return
            }
          }

          const clientRequest = net.request({
            session: targetSession,
            url: request.url,
            method: request.method,
            bypassCustomProtocolHandlers: true,
            redirect: 'manual',
            credentials: 'include',
            useSessionCookies: true
          })

          let hasResponded = false
          const respond = (payload: { mimeType?: string; data?: Buffer; statusCode?: number; headers?: ResponseHeaders }) => {
            if (hasResponded) return
            hasResponded = true
            callback(payload)
          }

          const forwardHeaders = buildForwardHeaders(request)
          for (const [key, value] of Object.entries(forwardHeaders)) {
            clientRequest.setHeader(key, value)
          }

          clientRequest.on('redirect', (statusCode, _method, redirectUrl, responseHeaders) => {
            const normalizedHeaders = normalizeResponseHeaders(responseHeaders)
            const redirectHeaders: ResponseHeaders = {
              ...normalizedHeaders,
              location: redirectUrl,
              'x-ai-processed': 'false',
              'x-ai-skip-reason': 'redirect-pass-through'
            }
            const contentTypeHeader = firstHeaderValue(redirectHeaders['content-type']).toLowerCase()

            respond({
              mimeType: contentTypeHeader || 'text/html; charset=utf-8',
              data: Buffer.alloc(0),
              statusCode,
              headers: redirectHeaders
            })

            clientRequest.abort()
          })

          clientRequest.on('response', response => {
            if (hasResponded) return
            const chunks: Buffer[] = []
            response.on('data', chunk => chunks.push(Buffer.from(chunk)))
            response.on('end', async () => {
              try {
                const body = Buffer.concat(chunks)
                const headers = normalizeResponseHeaders(response.headers)
                const contentTypeHeader = firstHeaderValue(headers['content-type']).toLowerCase()
                const contentEncodingHeader = firstHeaderValue(headers['content-encoding'])
                const statusCode = response.statusCode ?? 200
                const shouldPreprocess =
                  !localRequest &&
                  !shouldBypassAi &&
                  shouldProcess(contentTypeHeader) &&
                  statusCode >= 200 &&
                  statusCode < 300 &&
                  body.length > 0

                if (!shouldPreprocess) {
                  const passthroughHeaders: ResponseHeaders = {
                    ...headers,
                    'x-ai-processed': 'false',
                    'x-ai-skip-reason': shouldBypassAi ? 'domain-bypass' : 'not-processable'
                  }

                  respond({
                    mimeType: contentTypeHeader || 'application/octet-stream',
                    data: body,
                    statusCode,
                    headers: passthroughHeaders
                  })
                  return
                }

                const decodedHtml = decodeHtmlBody(body, contentEncodingHeader)
                if (!decodedHtml) {
                  const passthroughHeaders: ResponseHeaders = {
                    ...headers,
                    'x-ai-processed': 'false',
                    'x-ai-skip-reason': 'unsupported-content-encoding'
                  }

                  respond({
                    mimeType: contentTypeHeader || 'text/html; charset=utf-8',
                    data: body,
                    statusCode,
                    headers: passthroughHeaders
                  })
                  return
                }

                const processed = await processWithAI(decodedHtml, request.url)
                const processedHeaders: ResponseHeaders = {
                  ...stripProcessingUnsafeHeaders(headers),
                  'x-ai-processed': 'true',
                  'x-ai-processing-time-ms': String(processed.metadata.processingTime)
                }

                const result = {
                  mimeType: 'text/html',
                  data: Buffer.from(processed.html, 'utf8'),
                  headers: processedHeaders,
                  statusCode
                }

                const hasSetCookie = typeof processedHeaders['set-cookie'] !== 'undefined'
                const canStoreInCache = canUseCache && !hasSetCookie && !hasNoStoreCacheControl(processedHeaders)
                if (canStoreInCache) {
                  await setCachedResponse(request.url, {
                    ...result,
                    headers: stripCacheUnsafeHeaders(result.headers)
                  })
                }

                respond(result)
              } catch (error) {
                logger.error('failed to process intercepted response', {
                  url: request.url,
                  message: messageFromError(error)
                })
                respond({
                  mimeType: 'text/html',
                  data: Buffer.from(`<h1>Protocol error</h1><pre>${messageFromError(error)}</pre>`, 'utf8'),
                  statusCode: 500
                })
              }
            })
          })

          clientRequest.on('error', error => {
            if (hasResponded) return
            logger.warn('network request failed during interception', {
              url: request.url,
              message: error.message
            })
            respond({
              mimeType: 'text/html',
              data: Buffer.from(`<h1>Request failed</h1><pre>${error.message}</pre>`, 'utf8'),
              statusCode: 502
            })
          })

          await writeUploadData(clientRequest, request.uploadData)
          clientRequest.end()
        } catch (error) {
          logger.error('interception failed before request dispatch', {
            url: request.url,
            message: messageFromError(error)
          })
          callback({
            mimeType: 'text/html',
            data: Buffer.from(`<h1>Protocol error</h1><pre>${messageFromError(error)}</pre>`, 'utf8'),
            statusCode: 500
          })
        }
      })
    }
  }
}
