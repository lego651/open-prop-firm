import type { DecisionSnapshot, MaxDrawdown } from '../../../scripts/monitor/schema'

export type ChipStatus = 'allowed' | 'forbidden' | 'neutral'

export interface SnapshotChip {
  key: string
  label: string
  value: string
  status: ChipStatus
  sourceUrl: string
}

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatDrawdownType(t: MaxDrawdown['type']): string {
  switch (t) {
    case 'trailing_intraday':
      return 'trailing intraday'
    case 'trailing_eod':
      return 'trailing EOD'
    case 'static':
      return 'static'
  }
}

export function formatDrawdownValue(usd: number, type: MaxDrawdown['type']): string {
  return `${USD.format(usd)} (${formatDrawdownType(type)})`
}

function yesNoChip(
  key: string,
  label: string,
  allowed: boolean,
  sourceUrl: string,
): SnapshotChip {
  return {
    key,
    label,
    value: allowed ? 'Yes' : 'No',
    status: allowed ? 'allowed' : 'forbidden',
    sourceUrl,
  }
}

/**
 * Build the 6-chip render model for SnapshotBar. The order and labels are
 * locked — SnapshotBar relies on them for layout.
 */
export function buildSnapshotChips(snapshot: DecisionSnapshot): SnapshotChip[] {
  const fallbackSource = snapshot.max_drawdown.source_url

  const chips: SnapshotChip[] = [
    yesNoChip('news_trading', 'News trading', snapshot.news_trading_allowed, fallbackSource),
    yesNoChip(
      'overnight_holding',
      'Overnight holding',
      snapshot.overnight_holding_allowed,
      fallbackSource,
    ),
    yesNoChip(
      'weekend_holding',
      'Weekend holding',
      snapshot.weekend_holding_allowed,
      fallbackSource,
    ),
    {
      key: 'max_drawdown',
      label: 'Max drawdown',
      value: formatDrawdownValue(snapshot.max_drawdown.value_usd, snapshot.max_drawdown.type),
      status: 'neutral',
      sourceUrl: snapshot.max_drawdown.source_url,
    },
  ]

  if (
    snapshot.consistency_rule.enabled &&
    typeof snapshot.consistency_rule.max_daily_pct === 'number'
  ) {
    chips.push({
      key: 'consistency_rule',
      label: 'Consistency rule',
      value: `${snapshot.consistency_rule.max_daily_pct}% daily cap`,
      status: 'forbidden',
      sourceUrl: snapshot.consistency_rule.source_url,
    })
  } else {
    chips.push({
      key: 'consistency_rule',
      label: 'Consistency rule',
      value: 'None',
      status: 'allowed',
      sourceUrl: snapshot.consistency_rule.source_url,
    })
  }

  chips.push({
    key: 'payout_split',
    label: 'Payout split',
    value: `${snapshot.payout_split_pct}%`,
    status: 'neutral',
    sourceUrl: fallbackSource,
  })

  return chips
}
