/** Shared utilities for the monitoring bot scrapers. */

export const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)'

const DEFAULT_TIMEOUT_MS = 30_000

export async function fetchPage(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse the first USD amount from a text blob.
 * Recognizes: $5,000 · $5000 · $199.99 · $25k · $25K (short-thousands).
 */
export function parseDollarAmount(text: string): number | null {
  const kMatch = /\$(\d+(?:\.\d+)?)\s*[kK]\b/.exec(text)
  if (kMatch) {
    const n = Number.parseFloat(kMatch[1]) * 1000
    if (Number.isFinite(n)) return n
  }
  const m = /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\b/.exec(text)
  if (!m) return null
  const cleaned = m[1].replace(/,/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse the first percentage from a text blob.
 * Recognizes "30%" and "30 percent".
 */
export function parsePercentage(text: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(?:%|percent)/.exec(text)
  if (!m) return null
  const n = Number.parseFloat(m[1])
  return Number.isFinite(n) ? n : null
}
