---
title: 'Funded Next — Overview'
firm: Funded Next
category: cfd
type: basic-info
status: active
last_verified: '2026-03-29T00:00:00Z'
verified_by: manual
website: 'https://fundednext.com'
founded: 2022
headquarters: 'Ajman, UAE'
sources:
  - url: 'https://fundednext.com/stellar-model'
    label: 'Funded Next — Stellar Challenge Models'
  - url: 'https://fundednext.com/stellar-instant'
    label: 'Funded Next — Stellar Instant'
  - url: 'https://fundednext.com/affiliate'
    label: 'Funded Next — Affiliate / Partner Program'
  - url: 'https://help.fundednext.com/en/'
    label: 'Funded Next Help Center'
decision:
  snapshot:
    news_trading_allowed: true
    overnight_holding_allowed: true
    weekend_holding_allowed: true
    max_drawdown:
      type: static
      value_usd: 5000
      source_url: 'https://fundednext.com/stellar-model'
    consistency_rule:
      enabled: false
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
    payout_split_pct: 80
    best_for: 'Swing + discretionary traders — $50k Stellar 2-Step flagship'
  kill_you_first:
    - title: '40% news-profit cap on funded accounts'
      detail: 'On funded accounts, no more than 40% of total profit can come from trades opened or closed within 5 minutes of a high-impact news event. Challenge phases are unaffected — the rule bites the moment you get funded.'
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
    - title: 'Weekend-close enforced on funded accounts'
      detail: 'Challenge phases allow weekend holding. Funded accounts must flatten before the weekend cutoff, which surprises traders who passed with swing setups.'
      source_url: 'https://fundednext.com/stellar-model'
    - title: 'Hedging prohibited across all phases'
      detail: 'Opposing positions on the same instrument are treated as a violation, including mirrored strategies across linked accounts.'
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
  fit_score:
    ny_scalping: 3
    swing_trading: 4
    news_trading: 2
    beginner_friendly: 3
    scalable: 4
  pre_trade_checklist:
    - id: dd_buffer_ok
      label: 'Daily drawdown buffer > 1% of initial balance'
    - id: news_window_clear
      label: 'No high-impact news within 5 minutes (funded account only)'
    - id: weekend_close_plan
      label: 'Exit plan set if holding into the weekend cutoff (funded account only)'
    - id: hedging_off
      label: 'Not mirroring opposing positions across linked accounts'
    - id: strategy_consistency
      label: 'Strategy matches the style declared at challenge purchase'
  changelog: []
  affiliate:
    url: null
    utm: 'openprop'
---

# Funded Next — Overview

Funded Next is a proprietary trading evaluation firm founded in 2022 by Abdullah Jayed. The company operates through GrowthNext F.Z.E., registered in Ajman, UAE, with additional entities in Comoros Islands, Hong Kong, and Cyprus. It offers simulated-capital evaluation programs (CFDs and Futures) that allow traders to demonstrate skill in exchange for a share of simulated profits.

On the CFD side, Funded Next provides three Stellar challenge variants — Stellar 2-Step, Stellar 1-Step, and Stellar Lite — as well as a no-challenge Stellar Instant account. All CFD trading is conducted in a simulated environment using MT4, MT5, cTrader, or Match-Trader platforms, with no real capital exchanged.

## Company Details

| Detail | Info |
| --- | --- |
| Website | [fundednext.com](https://fundednext.com) |
| Founded | 2022 |
| Headquarters | Ajman, UAE |
| Registered Entity | GrowthNext F.Z.E. (Ajman, UAE) |
| Markets | CFD (Forex, Commodities, Indices); Futures (separate product line) |
| Challenge Types | Stellar 2-Step, Stellar 1-Step, Stellar Lite, Stellar Instant |
| Platforms | MT4, MT5, cTrader, Match-Trader |

## Challenge Models

Funded Next's CFD evaluation programs are branded under the "Stellar" name. Account sizes range from $6,000 to $200,000. Note that FundedNext does not offer a standard $10,000 Stellar challenge tier; the closest Stellar challenge size is $15,000. A $10,000 tier is available only under the Stellar Instant (no-challenge) product.

### Stellar 2-Step

A two-phase evaluation with an 8% Phase 1 target and 5% Phase 2 target. Traders receive 80% of simulated profits in the funded account (scalable to 95% with add-ons). A 15% profit share applies during the challenge phases once growth targets are met.

- [[firms/cfd/funded-next/challenges/25k|$25k Stellar 2-Step]] — $199.99, 8%/5% targets, 5% daily loss, 10% overall drawdown
- [[firms/cfd/funded-next/challenges/50k|$50k Stellar 2-Step]] — $299.99, 8%/5% targets, 5% daily loss, 10% overall drawdown
- [[firms/cfd/funded-next/challenges/100k|$100k Stellar 2-Step]] — $549.99, 8%/5% targets, 5% daily loss, 10% overall drawdown
- [[firms/cfd/funded-next/challenges/200k|$200k Stellar 2-Step]] — $1,099.99, 8%/5% targets, 5% daily loss, 10% overall drawdown

### Stellar 1-Step

A single-phase evaluation requiring 10% profit. Stricter drawdown limits (3% daily, 6% overall). Funded account profit share starts at 90%.

### Stellar Lite

A two-phase evaluation with relaxed drawdown limits (4% daily, 8% overall) and targets of 8%/4%. Funded account profit share is 80%, scalable to 90%. No challenge-phase profit share.

### Stellar Instant

A no-evaluation product where traders receive an account immediately. Available in sizes up to $20,000 (including a $10,000 tier). Accounts scale up to $2M through performance. See [[firms/cfd/funded-next/challenges/10k|$10k Stellar Instant]] for details.

## Key Features

- No time limits on challenge phases for Stellar 2-Step, 1-Step, and Lite
- EAs (Expert Advisors) and automated trading permitted, subject to strategy consistency rules
- Weekend position holding allowed during challenge phases; must close positions before weekend in funded accounts
- News trading permitted with a 40% profit-count restriction on trades within 5 minutes of high-impact events (funded accounts only)
- Payouts processed within 24 hours via USDT, USDC, Confirmo, or RiseWorks
- First payout available 21 days after funded account activation
- Affiliate/partner program available with tiered commission rates (12–18% CFD)

See also: [[firms/cfd/funded-next/rules|Trading Rules]] · [[firms/cfd/funded-next/promos|Promo Codes]] · [[firms/cfd/funded-next/changelog|Changelog]]
