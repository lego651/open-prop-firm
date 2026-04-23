---
title: 'Lucid Trading — Overview'
firm: Lucid Trading
category: futures
type: basic-info
status: active
last_verified: '2026-03-29T00:00:00Z'
verified_by: manual
website: 'https://lucidtrading.com'
founded: 2025
headquarters: 'USA'
sources:
  - url: 'https://lucidtrading.com/how-it-works'
    label: 'Lucid Trading — How It Works (Official)'
  - url: 'https://lucidtrading.com/rules'
    label: 'Lucid Trading — Trading Rules (Official)'
decision:
  snapshot:
    news_trading_allowed: true
    overnight_holding_allowed: false
    weekend_holding_allowed: false
    max_drawdown:
      type: trailing_eod
      value_usd: 2000
      source_url: 'https://lucidtrading.com/how-it-works'
    consistency_rule:
      enabled: true
      max_daily_pct: 50
      source_url: 'https://lucidtrading.com/rules'
    payout_split_pct: 90
    best_for: 'Session scalpers — $50k LucidFlex flagship (EOD trail, 50% eval consistency)'
  kill_you_first:
    - title: 'EOD trailing drawdown raises on each winning close'
      detail: 'The $2,000 trailing threshold ratchets up at end-of-day and cannot move down. A green close that you do not protect with tighter next-day risk leaves almost no buffer.'
      source_url: 'https://lucidtrading.com/how-it-works'
    - title: '50% consistency rule during LucidFlex evaluation'
      detail: 'No single day can account for more than 50% of total evaluation profits. One outlier green day can stall the eval until other sessions catch up — not a violation, but you cannot withdraw until the ratio balances.'
      source_url: 'https://lucidtrading.com/rules'
    - title: 'No overnight or weekend holds — session-only futures trading'
      detail: 'Swing trading is explicitly not permitted. All positions must close before session end and before the weekend. Attempting to hold ends the account.'
      source_url: 'https://lucidtrading.com/rules'
  fit_score:
    ny_scalping: 4
    swing_trading: 0
    news_trading: 4
    beginner_friendly: 3
    scalable: 2
  pre_trade_checklist:
    - id: trail_dd_buffer
      label: 'EOD trailing drawdown buffer > $500'
    - id: consistency_50_check
      label: "Today's P&L won't push any single day above 50% of total eval profit"
    - id: no_overnight_carry
      label: 'All positions will close before session end'
    - id: weekend_flat_plan
      label: 'Flat before weekend / Friday close'
    - id: five_second_rule
      label: '≥50% of profits come from trades held longer than 5 seconds'
  changelog: []
  affiliate:
    url: null
    utm: 'openprop'
---

# Lucid Trading — Overview

Lucid Trading (Lucid Trading Group LLC) is a US-based futures proprietary trading evaluation firm founded in early 2025 by CEO AJ Campanella. The firm offers funded accounts for CME-listed futures contracts, including ES, NQ, YM, CL, and GC. As of March 2026, Lucid Trading has served over 14,000 traders and paid over $10 million in profits.

Lucid Trading offers three evaluation paths: LucidFlex (two-day minimum, 50% consistency rule), LucidPro (one-day minimum, no consistency rule), and LucidDirect (instant-funded, no evaluation phase). Account sizes start at $25,000. Payouts are available daily and traders keep 90% of profits.

## Company Details

| Detail | Info |
| --- | --- |
| Website | [lucidtrading.com](https://lucidtrading.com) |
| Founded | 2025 |
| Headquarters | USA |
| Entity | Lucid Trading Group LLC |
| Markets | Futures (CME-listed: ES, NQ, YM, CL, GC, and others) |
| Evaluation Types | LucidFlex, LucidPro, LucidDirect |
| Account Sizes | $25K, $50K, $100K, $150K |
| Platforms | Rithmic, Tradovate |

## Challenge Models

Lucid Trading offers three account types. All use an End-of-Day (EOD) trailing drawdown model.

### LucidFlex (Evaluation)
Two-day minimum trading, 50% consistency rule during evaluation. One-time fee, no monthly charges, no activation fee.

- [[firms/futures/lucid-trading/challenges/25k|$25k LucidFlex]] — $100, profit target $1,250, drawdown $1,000
- [[firms/futures/lucid-trading/challenges/50k|$50k LucidFlex]] — $130, profit target $3,000, drawdown $2,000

### LucidPro (Evaluation)
One-day minimum, no consistency rule. Higher entry price, but stricter drawdown relative to account size (drawdown equals profit target).

### LucidDirect (Instant Funded)
No evaluation phase. Traders begin trading immediately on a funded account, subject to a 20% consistency rule.

## Key Features

- 90/10 payout split (trader keeps 90%)
- 100% payout on first $10,000 in lifetime earnings, then 90/10
- Daily payouts available
- EOD trailing drawdown (not real-time)
- No activation fee, no monthly fee
- Scalping allowed (50% of profits must come from trades held longer than 5 seconds)
- News trading allowed on all account types
- Maximum 5 funded accounts per household; up to $750,000 total allocation

Compare with: [[firms/futures/apex-funding|Apex Trader Funding]]

See also: [[firms/futures/lucid-trading/rules|Trading Rules]] · [[firms/futures/lucid-trading/promos|Promo Codes]] · [[firms/futures/lucid-trading/changelog|Changelog]]
