# ICP launch checklist

Production remains in prelaunch mode until the real InuStrategy identifiers are available. Do not copy the `$SOON` test identifiers into production.

## Required at launch

Set these GitHub Actions repository variables:

- `ICP_LEDGER_CANISTER_ID`: InuStrategy ICRC ledger canister. This is the public token contract.
- `ICP_MARKET_CANISTER_ID`: InuStrategy Soon market canister. This is the identifier in the Soon token-page URL.
- `ICP_POOL_CANISTER_ID`: ICPSwap pool canister after graduation. Leave unset while the token is still on the Soon curve if no pool exists yet.

Update `site/config.json` links with:

- `links.buy`: the official Soon token page before graduation, then the preferred ICPSwap swap URL after graduation.
- `links.explorer`: the ICP Dashboard or ICExplorer page for the ledger canister.
- `links.community`: the official community destination, if used.

## Data routing

- Soon market canister: launch phase, curve information, launch candles, and launch trades.
- ICRC ledger canister: token identity and total supply.
- ICPSwap public API: post-graduation price, liquidity, 24-hour volume, trades, and hourly candles.
- ICRC account index or ICExplorer: holder count and ranked accounts when a complete index is available.

The dashboard validates that the market canister reports the configured ledger and symbol, and that ICPSwap reports the configured pool and ledger. Missing or mismatched sources remain unavailable rather than falling back to estimated values.

## Deployment verification

1. Run `npm ci`, `npm test`, `npm run check`, and `git diff --check` from `site`.
2. Run `npm run build` and `node scripts/test-token.mjs`.
3. Confirm production remains prelaunch before the real variables are added.
4. Confirm `index.html?mode=test` still shows the `$SOON` test snapshot.
5. After configuring the real IDs, manually run `Publish InuStrategy` and verify the production snapshot before sharing the site.
