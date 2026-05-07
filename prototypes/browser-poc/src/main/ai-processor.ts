export interface AIProcessResult {
  html: string
  metadata: {
    originalLength: number
    processedLength: number
    processingTime: number
    url: string
  }
}

export async function processWithAI(html: string, url: string): Promise<AIProcessResult> {
  const start = Date.now()

  const pinkTheme = `<style id="ai-pink-theme">html,body{background:#ff4fa3 !important;background-image:none !important;}body,body *,body *::before,body *::after{background-image:none !important;}#ai-pink-overlay{position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:#ff4fa3;opacity:.35;mix-blend-mode:multiply;}</style>`
  const pinkOverlay = `<div id="ai-pink-overlay" aria-hidden="true"></div>`
  const indicator = `<div id="ai-indicator" style="position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#2563eb;color:#fff;padding:6px 10px;border-radius:6px;font-family:system-ui,sans-serif;font-size:12px;">AI Processed · ${new URL(url).hostname}</div>`
  const withPinkTheme = html.includes('</head>') ? html.replace('</head>', `${pinkTheme}</head>`) : `${pinkTheme}${html}`
  const withPinkBodyAttributes = withPinkTheme.replace(
    /<body([^>]*)>/i,
    (_match, attrs: string) => `<body${attrs} bgcolor="#ff4fa3" style="background:#ff4fa3 !important;">`
  )

  const processedHtml = withPinkBodyAttributes.includes('</body>')
    ? withPinkBodyAttributes.replace('</body>', `${pinkOverlay}${indicator}</body>`)
    : `${withPinkBodyAttributes}${pinkOverlay}${indicator}`

  return {
    html: processedHtml,
    metadata: {
      originalLength: html.length,
      processedLength: processedHtml.length,
      processingTime: Date.now() - start,
      url
    }
  }
}
