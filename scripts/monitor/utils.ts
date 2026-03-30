/**
 * Shared utilities for the monitoring bot scrapers.
 */

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
