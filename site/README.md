# InuStrategy

A single-page Solana meme dashboard with a black default theme, a persistent light-mode toggle, an orange brand header, compact financial metrics, verified fee accounting, and clearly labeled meme statistics. Treasury and Tokenomics sections have been removed.

## Local preview

Requires Node.js 24. No dependencies or install step.

```powershell
cd site
npm run build
npm start
```

Open http://127.0.0.1:4173. `npm test` runs the accounting tests; `npm run check` checks JavaScript syntax.

## GitHub Pages

The repository-root `.github/workflows/pages.yml` builds and deploys `site/dist` on pushes to `main`, manual runs, and a five-minute schedule. Enable **Settings → Pages → Build and deployment → GitHub Actions**. The initial version is a fully styled pre-launch page; no token or fee values are invented.

The requested destination is the InuStrategy GitHub account. An account-level Pages repository would normally be named `InuStrategy.github.io`; a project repository also works because all frontend asset and data paths are relative. Creating or publishing in that account requires an authenticated account with repository access.

Scheduled GitHub Actions can be delayed and are not a real-time feed. Public repository schedules may be disabled after prolonged inactivity. The frontend checks the published snapshot every 30 seconds and hides live values if its timestamp is older than 20 minutes. No exchange-rate refresh occurs inside the visitor's browser.

## Trusted data architecture

```
Solana RPC / configured trusted indexer
                ↓
GitHub Actions build worker
    token verification + normalized accounting
                ↓
Read-only data/snapshot.json on GitHub Pages
                ↓
Frontend formatting and chart display
```

The browser has no financial-data write endpoint and never supplies the mint, fee recipient, fee sources or historical prices to the build worker. The mint is validated as a Solana token mint. Failed, unfinalized, wrong-recipient and wrong-source fee transfers are excluded. Only the explicit public configuration allowlist is published; RPC and indexer endpoint secrets stay in Actions.

A visitor can always edit their own local DOM with browser tools. That does not change the authoritative published data or what anyone else sees. Protect repository access and the default branch to control who can configure the official site.

## Launch configuration

Edit `site/config.json`, or use these GitHub Actions values:

| Type | Name | Purpose |
| --- | --- | --- |
| Repository variable | `TOKEN_CA` | Official Solana mint |
| Repository variable | `FEE_RECIPIENT` | Designated fee recipient |
| Repository variable | `FEE_SOURCES` | Comma-separated known fee-sending wallets or authorities |
| Repository secret | `SOLANA_RPC_URL` | Production HTTPS Solana RPC endpoint |
| Repository secret | `TOKEN_DATA_URL` | Optional normalized market/history/holders provider |
| Repository secret | `FEE_INDEXER_URL` | Complete finalized fee-history provider |

The public Solana RPC endpoint is a development fallback and can throttle or reject requests. Use a reliable production RPC. Set official HTTPS buy, explorer and X links in `config.json`. Unconfigured actions explain availability. Announcement text and the fee-recipient display name are also configurable there. Never commit private provider credentials to config.

After the mint is configured, DEX Screener supplies market price, market cap, liquidity, volume, buys and sells for the highest-liquidity base-token pool. Pool-specific metrics are labeled. FDV is never substituted for market cap. Holder counts, historical candles, 7D/30D returns and other unavailable metrics remain `—` until a normalized provider is connected. A missing source never turns into a made-up number.

## Fee accounting

The fee provider in `backend/providers.js` is independent of the price provider. It filters successful finalized transfers by recipient, mint and known fee sources. Source addresses are necessary because a mint plus recipient alone cannot identify arbitrary inbound transfers as protocol fees. Changing the recipient starts accounting for that recipient only. Wallet ownership by Michael Saylor is not asserted.

Amounts are separated by asset: the token, optional native SOL (`fee.includeNative`), and configured other assets (`fee.otherAssets`, each with `mint` and `symbol`). Transfer instructions are deduplicated, and transaction count counts unique signatures. USD value uses each transfer's historical price. If any qualifying transfer is unpriced, the lifetime USD total is withheld and raw asset amounts are shown. Spot prices never masquerade as historical values.

The basic RPC fallback scans the recipient and currently open token accounts, paginates signatures, and inspects parsed outer/inner standard SPL-token transfer instructions. Closed historical token accounts and pruned history cannot be reliably recovered this way. Thus this fallback is explicitly partial and never displays a lifetime USD total. It has a defensive 20,000-signature limit per account. Large histories, full lifetime accounting, historical pricing and Token-2022 net received amounts require a trusted indexer. The site does not include a hosted indexing service.

### Fee indexer contract

The worker requests `FEE_INDEXER_URL?recipient=<wallet>&mint=<mint>`. The provider must account for all history, including closed token accounts, and verify actual finalized transfers. `completeHistory` must be true only after all history is accounted for. This is a trusted-provider boundary; merely setting a flag is not proof from an arbitrary API.

```json
{
  "recipient": "configured recipient wallet",
  "mint": "configured token mint",
  "completeHistory": true,
  "commitment": "finalized",
  "transfers": [{
    "txHash": "Solana signature",
    "instructionIndex": 0,
    "timestamp": 1800000000000,
    "recipient": "configured recipient wallet",
    "sender": "known fee source",
    "mint": "asset mint, or SOL",
    "amount": 10000,
    "finalized": true,
    "failed": false,
    "priceBasis": "historical",
    "historicalUsdPrice": 0.00004
  }]
}
```

This is a schema example, not live data. Timestamps use Unix milliseconds. Instruction indices uniquely identify outer and inner transfers within a transaction. Use net received amounts for transfer-fee tokens. Use `priceBasis: "unavailable"` and omit the historical price when unknown. A partial or invalid response produces an unavailable state, never a partial lifetime total.

### Token provider contract

The worker requests `TOKEN_DATA_URL?mint=<mint>`. Return the matching `mint` and numeric fields from `backend/types.d.ts`, plus a human-readable source. `history` contains `{timestamp, price, volume}` observations with millisecond timestamps and USD prices/volume. Omitted fields stay unknown. The frontend chart supports five time ranges, date/price/volume tooltips, keyboard inspection and responsive sizing.

## Verification

Accounting tests cover historical USD values, missing prices, duplicate instructions, multi-asset totals, rolling windows, changed recipients, source filtering, failed/unfinalized transactions, pre-launch states, mint validation and incomplete histories. The page is checked at desktop and mobile widths, in both themes, including theme persistence, navigation, chart-range controls and unconfigured links. Live-chain end-to-end validation requires the official mint, recipient, fee sources and provider configuration.

### Solscan holders
Set the GitHub Actions repository secret `SOLSCAN_API_KEY` to a Solscan Pro API key with access to `/v2.0/token/holders`. Both production and test builds read the key on the build worker only. The public snapshot contains only the reported aggregate count, source, status and timestamp; the key is excluded. Missing credentials or failed requests leave holder counts unknown while preserving DEX market data. Counts use Solscan data.total, not the length of its paginated list. This does not change the existing five-minute snapshot schedule. After adding the secret, run Publish InuStrategy manually to verify live access.

### Free Pump.fun holder feed
The configured holderProvider is now pumpfun. The backend reads totalHolders from the public advanced-api-v2.pump.fun/coins/top-holders/{mint} response, never counts the topHolders list as the total. No API key is sent. This undocumented endpoint was tested on 2026-09-28; availability and definitions may change. Invalid or failed responses leave the count unknown. Solscan remains optional when holderProvider is not pumpfun.

### Free chart history
GeckoTerminal candles are fetched on the existing five-minute build schedule. Short views (1H/6H/12H) use one-minute closes; 1D uses 15-minute closes; 7D/30D use hourly closes; 3M/ALL use daily closes (up to 180 available candles). ALL means available provider history, not guaranteed lifetime history. Pool selection validates base mint and chooses highest reported liquidity. Missing ranges stay empty and old snapshots are suppressed. The frontend checks snapshots every 30 seconds; this is not streaming.

### Automatic market refresh (GitHub Pages)
The static deployment uses the explicitly permitted browser-to-provider fallback: official DEX Screener requests start on DOM readiness and are scheduled with setInterval(update, 10000), with an eight-second timeout and overlap guard. Browsers can throttle background timers; this is not a guaranteed wall-clock SLA. Valid fields merge individually; missing/invalid fields and failed requests preserve prior numbers. The as-of timestamp remains visible. No API credentials are sent. Chart/holder snapshots remain backend-generated on GitHub Actions. Production mint is supplied by TOKEN_CA through the public snapshot. The site accepts no metric writes; browser-local DOM edits are not persisted or authoritative. A continuously running server would be required for shared server-side ten-second polling; GitHub Pages does not run such a process.

The overview shows signed 24-hour dollar and percentage changes. Price and market-cap comparisons use DEX Screener's 24-hour price change. Liquidity and volume comparisons use an eight-day rolling metric history carried forward from the previously published snapshot. They remain explicitly unavailable until a valid observation approximately 24 hours old exists; the UI never fabricates a baseline.
