# InuStrategy site

A static analytics dashboard for the InuStrategy token on the Internet Computer. Production stays in an explicit prelaunch state until the official canister IDs are configured. Test mode uses the public Soon token solely to validate the ICP integration.

## Local validation

```powershell
cd site
npm test
npm run check
npm run build
node scripts/test-token.mjs
```

Run `npm start` to preview `site/dist` locally. Test mode is available at `http://localhost:4173/index.html?mode=test`.

## ICP configuration

Production reads these GitHub Actions repository variables:

| Variable | Purpose |
| --- | --- |
| `ICP_LEDGER_CANISTER_ID` | Official ICRC token ledger and public contract ID |
| `ICP_MARKET_CANISTER_ID` | Soon launch-curve market canister |
| `ICP_POOL_CANISTER_ID` | ICPSwap pool canister after listing |

The ledger and market IDs are different. The Soon token-page URL contains the market canister ID; it must never be used as the token contract.

Test mode currently uses:

- Ledger: `l3iu2-tyaaa-aaaal-qxm4q-cai`
- Soon market: `l4jso-6aaaa-aaaal-qxm4a-cai`
- ICPSwap pool: `hcju7-naaaa-aaaar-qch3a-cai`

The build queries the official read-only ICP ICRC API for holder data. If a token has not been indexed, holder totals and rankings remain unavailable. The dashboard does not estimate missing values.

## Data and deployment

`npm run build` creates the production `dist/data/snapshot.json`. `node scripts/test-token.mjs` creates the test snapshot. Both publish only allowlisted public configuration and metric fields.

GitHub Pages deploys from `site/dist`. The workflow validates JavaScript and tests before generating both snapshots. Market-price integration for the Soon curve and ICPSwap remains pending a documented public read interface; until then those metrics stay blank.

The site has no login, wallet connection, transaction signing, or financial-data write endpoint. It only presents read-only public data and links to the configured launchpad or explorer.
