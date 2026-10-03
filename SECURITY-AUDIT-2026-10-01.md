# InuStrategy security audit — October 1, 2026

Reviewed commit: `74bd8750f87242e5694923bd334d1c49db93cd22`, matching remote `main` at review time.

## Conclusion

No intentional backdoor, hidden administration endpoint, wallet signing/draining logic, dynamic code execution, or obvious credential exfiltration was found in the reviewed first-party website and build code. This is a bounded source/configuration review, not proof that the service or its accounts cannot be compromised. Several hardening gaps should be addressed before launch.

The issues below were documented before remediation. The accompanying hardening changes isolate third-party X code, pin workflow actions, reject malformed preview paths, suppress expired browser cache data, and preserve reward verification timestamps. Repository protection and edge-managed response headers remain configuration tasks.

## Findings, in priority order

### 1. High impact: production branch has no review barrier

Evidence: GitHub's branch-protection API returned `Branch not protected`; the repository rulesets API returned an empty list. `.github/workflows/pages.yml:5` deploys pushes to main. The github-pages environment permits main, but has no reviewer protection rule.

Prerequisite: an attacker needs a write-capable repository account/token, or another route to change main. This is not an unauthenticated visitor exploit. Such an attacker can replace the contract address, Buy destination, or entire website and trigger deployment. Modified build code could also access the provider secrets supplied to the build step.

Recommendation: protect main with required pull requests, checks, blocked force pushes/deletions, and independent review where available. Review collaborator/token access and account MFA separately. Protect workflow/config changes. Coordinate this with the current direct-push release process before enforcing it.

### 2. Medium: mutable third-party JavaScript executes in the dashboard

Evidence: `site/dist/index.html:16` loads `https://platform.twitter.com/widgets.js` directly in the top-level page, without integrity verification. The live HTML response had no Content-Security-Policy header and the source has no equivalent meta policy.

Prerequisite: compromise of the script delivery chain, or malicious code served by that trusted source. The script can change displayed addresses, links, and metrics and access this origin's localStorage. It cannot inherently read GitHub Actions secrets. This is a supply-chain exposure, not evidence X is compromised.

Recommendation: remove executable third-party embeds in favor of links, or isolate the feed on a separate origin in a suitably sandboxed iframe. Add and test a restrictive CSP. Merely allowing the existing script in CSP does not remove its page privileges.

### 3. Medium: deployment actions use mutable tags

Evidence: `.github/workflows/pages.yml:22,23,49,50,65` references official actions with major-version tags, rather than immutable commit SHAs.

Prerequisite: compromise or malicious replacement of an upstream action reference. An action running in the build/deploy pipeline could alter the published artifact or interfere with later secret-bearing steps.

Recommendation: pin each action to a verified full commit SHA, retain version comments, and configure reviewed update automation. Official GitHub actions lower the dependency risk but do not make mutable references immutable.

### 4. Low: missing anti-framing and other browser response protections

Evidence: the sampled live root response lacked CSP/frame-ancestors, X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security. GitHub Pages reports HTTPS enforcement enabled. No claim is made about inherited browser HSTS state.

An unrelated site can attempt to frame the dashboard for UI deception; browser embedding was not actively tested. Current impact is limited by the absence of login, wallet signing, and transaction forms.

Recommendation: configure response headers at the serving edge, including `frame-ancestors 'none'` if framing is unnecessary, `nosniff`, and HSTS after checking all relevant hostnames. Test a CSP against charts/media before enforcement. frame-ancestors requires an HTTP header, not a meta tag.

### 5. Low, development only: malformed URL crashes preview server

Evidence: `site/server.mjs:6` calls decodeURIComponent outside its try/catch in an async request handler. An isolated child-process reproduction using an ephemeral localhost port and request URL `/%` terminated with exit code 1 and `URIError: URI malformed`.

The server binds only to 127.0.0.1 and is not used by GitHub Pages. A client able to reach the local preview can interrupt that preview; this finding is not a production-server crash vulnerability.

Recommendation: catch URL parsing/decoding errors and return HTTP 400; keep the loopback binding. Add a regression test that a malformed path does not stop subsequent requests.

## Additional data-integrity observations

- `site/dist/live-market.js:20` emits cached market data before checking its age. Expired cached values and lastMarket can remain marked live during provider failures; app.js also merges lastMarket over stale-snapshot suppression. This is a stale-data correctness issue, not an independent remote code-execution path. Validate cached fields and enforce freshness/status separately from retaining last-known numbers. Writing this cache requires same-origin script privileges or local browser access; arbitrary remote visitors cannot edit other visitors' caches.
- `site/scripts/test-token.mjs:12` intentionally retains previous verified rewards during outages. It advances the snapshot generation timestamp without preserving an explicit reward verification timestamp. Keep the last verified totals, but record and display their actual verification time; the explanatory note is currently hidden with the Fees fine print.
- DEX, RPC, history, and reward APIs are trusted data sources. Schema/mint checks do not cryptographically prove every returned balance or reward total. A compromised provider can supply plausible false data. No provider compromise was observed.

## Checks completed

- Reviewed first-party frontend scripts, local server, backend providers/accounting, build scripts, package manifest, workflow, configuration and recent commit history.
- No npm dependencies or install lifecycle scripts are declared. An npm vulnerability audit would not cover the remote embeds, GitHub Actions, or Node runtime.
- Dynamic provider values are rendered using textContent/DOM nodes. The inspected innerHTML in tabs.js is a fixed literal, not provider/user input. Explorer address components are URL-encoded and navigation requires HTTPS.
- Static publication is restricted to site/dist. Provider secrets are supplied to the build; public configuration is explicitly allowlisted. No hidden payment receiver or wallet-connection implementation was found.
- GitHub secret scanning and push protection are enabled; zero open secret-scanning alerts were returned. A targeted scan across the 59 locally available commits found no matching private-key blocks, common GitHub/AWS token patterns, or long literal api-key URL values in the site subtree. This is not an exhaustive entropy-based secret scan or credential validation.
- `npm test`: 36 passed. `npm run check`: passed. `git diff --check`: passed before adding this report. These are existing functional checks, not a full penetration-test suite.
- Read live response headers and GitHub Pages/repository/environment settings. Environment deployment branch is main; HTTPS is enforced.

## Limits

Did not inspect personal account MFA/sessions, collaborator devices, DNS registrar/Cloudflare account permissions, provider infrastructure, private keys, all historical third-party script versions, or any future token contract. No smart-contract audit was performed. Existing public JSON is intended to be readable; Access-Control-Allow-Origin: * on that public data is not itself a secret exposure.

## References

- GitHub Actions security guidance: https://docs.github.com/en/actions/reference/security/secure-use
- MDN CSP implementation: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP
- MDN frame-ancestors: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
