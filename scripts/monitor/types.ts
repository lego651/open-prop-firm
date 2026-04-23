import type { DecisionSnapshot } from './schema'

/** A single field-level change detected by the bot. */
export interface FieldDiff {
  field: string
  from: unknown
  to: unknown
  source_url: string
}

/**
 * Partial DecisionSnapshot + cheapest-tier challenge price.
 * Every field optional — scrapers only report what they successfully parsed.
 */
export interface ScrapedSnapshot {
  news_trading_allowed?: boolean | null
  overnight_holding_allowed?: boolean | null
  weekend_holding_allowed?: boolean | null
  max_drawdown?: {
    type?: DecisionSnapshot['max_drawdown']['type'] | null
    value_usd?: number | null
  } | null
  consistency_rule?: {
    enabled?: boolean | null
    max_daily_pct?: number | null
  } | null
  payout_split_pct?: number | null
  cheapest_challenge_price_usd?: number | null
}

/** Ground-truth snapshot read from on-disk frontmatter. */
export interface CurrentSnapshot {
  snapshot: DecisionSnapshot
  cheapest_challenge_price_usd: number | null
  cheapest_challenge_source_url: string | null
}

/** Result returned by each per-firm scraper. */
export interface BotRunResult {
  firmSlug: string
  lastVerified: string
  changesDetected: boolean
  diffs: FieldDiff[]
  diff: string | null
  error: string | null
}
