---
title: 'Funded Next — Trading Rules'
firm: Funded Next
category: cfd
type: rules
status: active
last_verified: '2026-03-29T00:00:00Z'
verified_by: manual
sources:
  - url: 'https://help.fundednext.com/en/articles/8019811-how-can-i-calculate-the-daily-loss-limit'
    label: 'Funded Next Help — Daily Loss Limit Calculation'
  - url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
    label: 'Funded Next Help — Restricted and Prohibited Strategies'
  - url: 'https://fundednext.com/stellar-model'
    label: 'Funded Next — Stellar Challenge Models'
---

# Funded Next — Trading Rules

Funded Next enforces a consistent set of trading rules across all Stellar challenge variants (2-Step, 1-Step, Lite) and the Stellar Instant product. Rules apply during both the challenge/evaluation phases and the funded account phase. Specific drawdown percentages vary by challenge variant — the rules below describe the calculation methodology that applies uniformly.

## Drawdown Rules

- **Daily drawdown:** Balance-based. The daily loss limit is calculated as a fixed percentage of the **initial account balance**, not current equity. For example, a $50,000 account with a 5% daily limit has a $2,500 daily allowance regardless of how much the account has grown. Swaps, commissions, and fees are included in the daily loss calculation. Both open (floating) and closed positions count. Resets at 00:00 server time (GMT+3 in summer / GMT+2 in winter).
- **Overall drawdown:** Static (balance-based). The overall drawdown threshold is calculated from the initial account balance and does not trail upward. For the Stellar 2-Step, the overall drawdown limit is 10% of the initial balance; for Stellar 1-Step it is 6%; for Stellar Lite it is 8%.
- **Drawdown resets:** No automatic drawdown reset mechanism. Add-on products may alter some parameters.

## Trading Restrictions

| Rule | Policy |
| --- | --- |
| Instruments | All instruments available on the assigned platform (MT4, MT5, cTrader, Match-Trader) |
| Lot sizes | No fixed minimum or maximum lot size restriction |
| EAs / Bots | Permitted, subject to the strategy consistency rule — no tick-scalping, latency arbitrage, or strategies that exploit platform delays |
| News trading | Permitted during challenge phases. On funded accounts, profits from trades opened or closed within 5 minutes of a high-impact news event are excluded from the 40% profit-count threshold |
| Weekend holding | Allowed during challenge phases. Funded accounts must close all positions before the weekend (specific cutoff applies per platform) |
| Hedging | Not permitted — opening opposing positions on the same instrument simultaneously is prohibited |
| Copy trading | Permitted for personal use only. Multiple accounts receiving identical signals from a single master account are prohibited |

## Consistency Rules

Funded Next applies a profit-count restriction on funded accounts rather than a strict consistency rule. On funded accounts, no more than 40% of total profit can come from trades executed within 5 minutes of a high-impact news event. This restriction does not apply during challenge phases.

No minimum trade volume consistency rule applies.

## Scaling Plan

Stellar 2-Step funded accounts include a scaling mechanism. Every 10% growth achieved in the funded account unlocks a 25% increase in account size, up to a maximum of $4,000,000 in total allocation. The base profit split of 80% can scale to 95% through purchasable add-ons (e.g., the "Lifetime Reward 95%" add-on).

The Stellar Instant product scales differently: every time the trader hits 10% growth and requests a withdrawal, the account allocation doubles, up to $2,000,000.

## Additional Rules

- KYC (Know Your Customer) verification is not required before trading begins; it is completed before the first withdrawal.
- Payouts are processed within 24 hours via USDT, USDC, Confirmo, or RiseWorks.
- First payout from a funded account is available 21 days after account activation (5 days for Stellar 1-Step).
- Violations of rules result in account termination. Challenge fees are non-refundable upon rule violation; the fee refund on the first payout is forfeited.

See [[firms/cfd/funded-next|Overview]] for general firm information.
