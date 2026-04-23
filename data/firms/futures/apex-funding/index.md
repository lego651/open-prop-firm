---
title: 'Apex Trader Funding — Overview'
firm: Apex Trader Funding
category: futures
type: basic-info
status: active
last_verified: '2026-03-29T00:00:00Z'
verified_by: manual
website: 'https://apextraderfunding.com'
founded: 2021
headquarters: 'Austin, TX, USA'
sources:
  - url: 'https://apextraderfunding.com/evaluation'
    label: 'Apex Trader Funding — Evaluations (Official)'
  - url: 'https://support.apextraderfunding.com/hc/en-us/articles/4408610260507-How-Does-the-Trailing-Static-Drawdown-Threshold-Work-Master-Course'
    label: 'Apex Trader Funding — How Trailing Drawdown Works (Help Center)'
decision:
  snapshot:
    news_trading_allowed: true
    overnight_holding_allowed: true
    weekend_holding_allowed: false
    max_drawdown:
      type: trailing_eod
      value_usd: 2000
      source_url: 'https://support.apextraderfunding.com/hc/en-us/articles/4408610260507-How-Does-the-Trailing-Static-Drawdown-Threshold-Work-Master-Course'
    consistency_rule:
      enabled: false
      source_url: 'https://apextraderfunding.com/evaluation'
    payout_split_pct: 100
    best_for: 'Intraday futures scalpers — $50k EOD flagship (trailing drawdown)'
  kill_you_first:
    - title: 'Trailing EOD drawdown locks up on every new equity high'
      detail: 'The $2,000 trailing threshold raises at end-of-day whenever equity closes higher, and can only move up. Aggressive scaling after a green day leaves no buffer for the next session.'
      source_url: 'https://support.apextraderfunding.com/hc/en-us/articles/4408610260507-How-Does-the-Trailing-Static-Drawdown-Threshold-Work-Master-Course'
    - title: 'Weekend holding banned — flat by Friday close'
      detail: 'All positions must close before the weekend market close. Futures traders attempting to hold through Monday open will be terminated, including otherwise-winning trades.'
      source_url: 'https://apextraderfunding.com/evaluation'
    - title: '$1,000 daily loss limit on EOD accounts'
      detail: 'Separate from the trailing drawdown, the EOD $50k has a hard $1,000 daily loss cap. One bad session mechanically ends the evaluation even if the trailing threshold is untouched.'
      source_url: 'https://apextraderfunding.com/evaluation'
  fit_score:
    ny_scalping: 4
    swing_trading: 1
    news_trading: 4
    beginner_friendly: 2
    scalable: 3
  pre_trade_checklist:
    - id: trail_dd_buffer
      label: 'Trailing drawdown buffer > $500'
    - id: daily_loss_buffer
      label: 'Daily loss buffer intact on EOD account'
    - id: weekend_flat_plan
      label: 'All positions will close before Friday weekend cutoff'
    - id: contract_count_ok
      label: 'Not over the per-account contract limit (6 minis on $50k)'
    - id: session_close_plan
      label: 'No overnight carry beyond eval rules; scalp-out before session end if unsure'
  changelog: []
  affiliate:
    url: null
    utm: 'openprop'
---

# Apex Trader Funding — Overview

Apex Trader Funding is a futures-focused proprietary trading evaluation firm founded in 2021 and headquartered in Austin, Texas. The firm provides evaluation programs for CME-listed futures contracts, allowing traders to demonstrate consistent profitability before receiving access to a Performance Account (funded account).

In March 2026, Apex launched its 4.0 update, transitioning from a monthly subscription model to a one-time fee structure with a separate activation fee after passing. Active account sizes are $25,000, $50,000, $100,000, and $150,000. The $300,000 account size, previously available, is now a legacy product not available for new purchase.

Apex offers two evaluation types: EOD (End-of-Day trailing drawdown) and Intraday (real-time trailing drawdown). EOD accounts are generally higher-priced but allow more intraday flexibility before the drawdown trailing activates.

## Company Details

| Detail | Info |
| --- | --- |
| Website | [apextraderfunding.com](https://apextraderfunding.com) |
| Founded | 2021 |
| Headquarters | Austin, TX, USA |
| Markets | Futures (CME-listed contracts) |
| Evaluation Types | EOD (End-of-Day trailing), Intraday (real-time trailing) |
| Account Sizes | $25K, $50K, $100K, $150K |

## Active Evaluation Accounts

All accounts below reflect the 4.0 pricing structure (March 2026). Prices shown are EOD evaluation fees; a one-time activation fee applies upon passing.

- [[firms/futures/apex-funding/challenges/25k|$25k Account]] — $177 EOD / $118 Intraday; $1,500 profit target; $1,000 trailing drawdown
- [[firms/futures/apex-funding/challenges/50k|$50k Account]] — $197 EOD / $131 Intraday; $3,000 profit target; $2,000 trailing drawdown
- [[firms/futures/apex-funding/challenges/100k|$100k Account]] — $297 EOD / $198 Intraday; $6,000 profit target; $3,000 trailing drawdown
- [[firms/futures/apex-funding/challenges/300k|$300k Account]] — Legacy product; no longer available for new purchase

## Key Features

- Trailing drawdown (not static): drawdown threshold follows the account's highest equity point
- EOD type: drawdown trails based on end-of-day equity; intraday fluctuations do not move the threshold in real-time
- Intraday type: drawdown trails in real-time as the account grows
- 100% payout to the trader (subject to per-payout caps)
- 5-day minimum qualifying trading period before first payout
- Activation fee of $99 (EOD) or $79 (Intraday) applies after passing evaluation
- Up to 20 Performance Accounts can be held simultaneously

Compare with: [[firms/futures/lucid-trading|Lucid Trading]]

See also: [[firms/futures/apex-funding/rules|Trading Rules]] · [[firms/futures/apex-funding/promos|Promo Codes]] · [[firms/futures/apex-funding/changelog|Changelog]]
