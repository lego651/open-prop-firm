/**
 * Monitor scraper for Lucid Trading (lucidtrading.com)
 *
 * Checks the how-it-works page for key parameters:
 * account types (LucidFlex, LucidPro, LucidDirect), EOD trailing drawdown,
 * 90% profit split, account sizes.
 */

import * as cheerio from 'cheerio'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { BotRunResult } from './types'

const FIRM_SLUG = 'lucid-trading'
const FIRM_DIR = path.join(process.cwd(), 'data', 'firms', 'futures', 'lucid-trading')
const SCRAPE_URL = 'https://lucidtrading.com/how-it-works'
const TIMEOUT_MS = 30_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)'

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
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

async function readLocalData(): Promise<Record<string, string>> {
  const indexPath = path.join(FIRM_DIR, 'index.md')
  const raw = await readFile(indexPath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    status: String(data.status ?? ''),
    bodySnapshot: content.slice(0, 2000),
  }
}

async function scrapeRemote(): Promise<Record<string, string>> {
  const html = await fetchPage(SCRAPE_URL)
  const $ = cheerio.load(html)

  const pageTitle = $('title').text().trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)

  const hasLucidFlex = /lucidflex/i.test(bodyText)
  const hasLucidPro = /lucidpro/i.test(bodyText)
  const hasLucidDirect = /luciddirect/i.test(bodyText)
  const has90Percent = /90%/.test(bodyText)
  const hasEOD = /\beod\b/i.test(bodyText)

  return {
    pageTitle,
    hasLucidFlex: String(hasLucidFlex),
    hasLucidPro: String(hasLucidPro),
    hasLucidDirect: String(hasLucidDirect),
    has90Percent: String(has90Percent),
    hasEOD: String(hasEOD),
    bodySnippet: bodyText.slice(0, 500),
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const [local, remote] = await Promise.all([readLocalData(), scrapeRemote()])

    const diffs: string[] = []

    if (remote.hasLucidFlex === 'false') {
      diffs.push('LucidFlex product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.hasLucidPro === 'false') {
      diffs.push('LucidPro product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.hasLucidDirect === 'false') {
      diffs.push('LucidDirect product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.has90Percent === 'false') {
      diffs.push('90% profit split no longer mentioned — payout structure may have changed.')
    }
    if (remote.hasEOD === 'false') {
      diffs.push('EOD trailing drawdown no longer detected — drawdown methodology may have changed.')
    }

    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diff: diffs.length > 0 ? diffs.join('\n') : null,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
