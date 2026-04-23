import type { CurrentSnapshot, FieldDiff, ScrapedSnapshot } from './types'

/**
 * Produce a structured list of field-level diffs between the on-disk current
 * snapshot and a scraped snapshot. Fields the scraper returned undefined or
 * null are skipped — the bot only reports drift it can confirm.
 */
export function diffSnapshots(
  current: CurrentSnapshot,
  scraped: ScrapedSnapshot,
  fallbackSource: string,
): FieldDiff[] {
  const out: FieldDiff[] = []
  const snap = current.snapshot

  if (scraped.news_trading_allowed != null
      && scraped.news_trading_allowed !== snap.news_trading_allowed) {
    out.push({
      field: 'snapshot.news_trading_allowed',
      from: snap.news_trading_allowed,
      to: scraped.news_trading_allowed,
      source_url: fallbackSource,
    })
  }
  if (scraped.overnight_holding_allowed != null
      && scraped.overnight_holding_allowed !== snap.overnight_holding_allowed) {
    out.push({
      field: 'snapshot.overnight_holding_allowed',
      from: snap.overnight_holding_allowed,
      to: scraped.overnight_holding_allowed,
      source_url: fallbackSource,
    })
  }
  if (scraped.weekend_holding_allowed != null
      && scraped.weekend_holding_allowed !== snap.weekend_holding_allowed) {
    out.push({
      field: 'snapshot.weekend_holding_allowed',
      from: snap.weekend_holding_allowed,
      to: scraped.weekend_holding_allowed,
      source_url: fallbackSource,
    })
  }

  if (scraped.payout_split_pct != null
      && scraped.payout_split_pct !== snap.payout_split_pct) {
    out.push({
      field: 'snapshot.payout_split_pct',
      from: snap.payout_split_pct,
      to: scraped.payout_split_pct,
      source_url: fallbackSource,
    })
  }

  if (scraped.max_drawdown != null) {
    const srcUrl = snap.max_drawdown.source_url || fallbackSource
    if (scraped.max_drawdown.type != null
        && scraped.max_drawdown.type !== snap.max_drawdown.type) {
      out.push({
        field: 'snapshot.max_drawdown.type',
        from: snap.max_drawdown.type,
        to: scraped.max_drawdown.type,
        source_url: srcUrl,
      })
    }
    if (scraped.max_drawdown.value_usd != null
        && scraped.max_drawdown.value_usd !== snap.max_drawdown.value_usd) {
      out.push({
        field: 'snapshot.max_drawdown.value_usd',
        from: snap.max_drawdown.value_usd,
        to: scraped.max_drawdown.value_usd,
        source_url: srcUrl,
      })
    }
  }

  if (scraped.consistency_rule != null) {
    const srcUrl = snap.consistency_rule.source_url || fallbackSource
    if (scraped.consistency_rule.enabled != null
        && scraped.consistency_rule.enabled !== snap.consistency_rule.enabled) {
      out.push({
        field: 'snapshot.consistency_rule.enabled',
        from: snap.consistency_rule.enabled,
        to: scraped.consistency_rule.enabled,
        source_url: srcUrl,
      })
    }
    if (scraped.consistency_rule.max_daily_pct != null
        && scraped.consistency_rule.max_daily_pct !== snap.consistency_rule.max_daily_pct) {
      out.push({
        field: 'snapshot.consistency_rule.max_daily_pct',
        from: snap.consistency_rule.max_daily_pct,
        to: scraped.consistency_rule.max_daily_pct,
        source_url: srcUrl,
      })
    }
  }

  if (scraped.cheapest_challenge_price_usd != null
      && scraped.cheapest_challenge_price_usd !== current.cheapest_challenge_price_usd) {
    out.push({
      field: 'cheapest_challenge_price_usd',
      from: current.cheapest_challenge_price_usd,
      to: scraped.cheapest_challenge_price_usd,
      source_url: current.cheapest_challenge_source_url || fallbackSource,
    })
  }

  return out
}
