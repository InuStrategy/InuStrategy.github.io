# While waiting for launch

- Confirm the official InuStrategy mint when issued; leave the production mint blank until then.
- Review `/about.html` in dark and light mode. The supplied executive portrait and biography are presented as fictional parody.
- Inspect `/test.html` for the user-supplied e/acc token. This page is explicitly separate from InuStrategy and never contributes fees to its totals.
- Prepare the official X profile and buy URL.
- Obtain a reliable Solana RPC and a provider for holders and historical candles. The current pair endpoint does not supply those fields.
- Ask UsePaid for a supported, per-mint claims and payout API, including amounts, currencies, timestamps, recipient handles, payout status and receipt IDs. Do not send this request automatically.
- Keep creator fees accrued, fees claimed, recipient share, and completed X Money payouts separate. A payment into UsePaid's treasury is not a payment to Michael Saylor.
- Before launch, recheck UsePaid's payout availability and fee-routing requirements. On September 27, 2026 their site displayed an X Money payout pause.

## Verified test findings

Mint: `CbcyNo7m1amFWqEQm2m4PLv1UNvpcL3C1Ujm6AkzpKoU` (Effective Accelerationism / e/acc).

The existing backend returned price, market cap, liquidity, 24-hour volume, supply, buys and sells. Holders, historical candles and 7D/30D returns remain unavailable.

UsePaid documents `GET https://usepaid.app/api/fee-proof?mint=<mint>`. The tested token returned HTTP 200 with `status: confirmed`, `verified: false`, and `proof: null`. This response does not establish payout completion. A supported complete payout-history API has not been established by this research.

Sources: https://usepaid.app/docs and https://usepaid.app/ . These statements are dated findings, not a permanent claim about service availability.

No cooldown automation is installed. This checklist is saved for the next working session.
