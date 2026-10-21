# QA & Production-Readiness Report — Akib Ahmed Portfolio

**Audit date:** 2026-10-21
**Auditor:** Automated QA audit (Buffy / Codebuff) per [QA.md](../QA.md)
**Build under test:** commit `9679da0` + audit fixes, production build (`NODE_ENV=production`), served by Express on `http://127.0.0.1:3100`
**Release decision:** **CONDITIONAL GO** — see §I and §K.

---

## A. Executive summary

The application was exercised as a running production server, not merely reviewed as source: 6 dedicated browser/API suites (282 assertions), 71 Vitest unit/integration tests, and ~30 manual probes were executed against a production build served in production mode with an isolated QA database.

**Overall: the application is functionally correct, well-secured, and substantially production-ready.** The existing security model (server-side sessions, CSRF + Origin checks, strict Zod schemas, signature-validated uploads, rate limiting, strict CSP) held up under attack-oriented testing — every negative case tested was rejected with the correct status code and no data leakage.

Four real defects were found, confirmed by reproduction, fixed, and covered by new regression tests:

| ID | Severity | Defect | Status |
| --- | --- | --- | --- |
| QA-001 | P2 (a11y) | Swiss Editorial accent text at **1.05:1 contrast** on dark footer/CTA panels (WCAG AA serious); same latent issue in Forest & Sand (2.25:1) and Warm Bento (hover text 4.03:1) | **Fixed** — new `--inverse-accent` token; axe clean in all 5 themes; 11 vitest regressions |
| QA-002 | P2 (perf) | **No response compression** — 376 KB JS / 80 KB CSS / SSR HTML sent uncompressed; home page transferred ~693 KB | **Fixed** — `compression()` middleware; home page now ~105 KB (−85%); 2 vitest regressions |
| QA-003 | P1 (deps) | `nodemailer ≤10.0.5` high-severity advisories (SMTP command injection, IDN/recipients bypasses) in the shipped dependency tree | **Fixed** — upgraded to `nodemailer@10.1.7`; `npm audit` clean |
| QA-004 | P2 (deps, dev-only) | `vitest ≤4.1.10` → `tinypool` **critical** RCE gadget + `@vitest/mocker` path traversal (dev tooling only, never shipped) | **Fixed** — upgraded to `vitest@5.0.5`; all 71 tests pass |

Six further findings from the test runs were investigated and **dismissed as test-harness artifacts, not product defects** (documented in §D, "Non-defects").

The main residual risks are **environmental**, not code defects: SMTP delivery could not be tested against a live provider, only Chromium was available for cross-browser coverage, and Search Console / field Core Web Vitals require a deployed origin. These are the reason for CONDITIONAL GO rather than unconditional GO.

---

## B. Environment and scope

### Environment

| Item | Value |
| --- | --- |
| OS | Windows (MINGW64_NT-10.0-26200, x86_64), Git Bash toolchain |
| Node.js | v24.11.1 (engines require ≥20.19) |
| npm | 11.6.2 |
| Browser | System Google Chrome driven by Playwright (`channel: 'chrome'`) |
| a11y tool | axe-core 4.x (`runOnly: wcag2a, wcag2aa, wcag22aa`) + official `target-size` rule |
| Server mode | `NODE_ENV=production`, built client + SSR bundle served by Express |
| QA database | `qa-env/data/qa.db` (isolated; the real `data/portfolio.db` was never touched) |
| QA data dir | `qa-env/data` + `qa-env/uploads`; contact submissions written to `qa-env/data/contact-submissions.jsonl` |
| SITE_URL | `http://127.0.0.1:3100` (QA instance) |
| SMTP | **Not configured** (by design — no live side effects during testing) |
| Admin account | `qa-admin@example.com` provisioned via `npm run admin:create` against the QA DB only |
| Pre-existing process | A dev server already occupied port 3000 (owned elsewhere) — left untouched; QA ran on 3100 |

### Scope — routes tested

Public: `/`, `/about`, `/projects`, `/projects/:slug` (all 3 slugs), `/contact`, `/resume`, unknown routes, missing slugs, query params (`?category=`, `?q=`), trailing slashes, `/sitemap.xml`, `/robots.txt`, `/akib-ahmed-resume.pdf`.
Admin: `/admin/login`, `/admin`, `/admin/projects`, `/admin/appearance`, `/admin/profile` (shell-level) + every `POST/PUT/DELETE /api/admin/*` endpoint.
API: `GET /api/health`, `GET /api/content`, `POST /api/contact`, 404 fallback.

### Viewports tested

320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920 px — every public route scanned for horizontal overflow at every width.

---

## C. Test execution matrix

| # | Category | Total | Passed | Failed | Blocked | Not run |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Baseline checks (typecheck, build, `npm run check`) | 3 | 3 | 0 | 0 | — |
| 2 | Vitest unit/integration/content/security (incl. new regressions) | 71 | 71 | 0 | 0 | — |
| 3 | Theme selection/persistence/FOUC/hydration (browser) | 46 | 46 | 0 | 0 | — |
| 4 | Functional & routing (browser: history, filters, search, forms, keyboard) | 19 | 19 | 0 | 0 | — |
| 5 | Admin CMS E2E + authorization negatives (live HTTP) | 46 | 46 | 0 | 0 | — |
| 6 | Contact API validation/security matrix (manual HTTP, 14 scenarios) | 14 | 14 | 0 | 0 | — |
| 7 | SEO/HTTP metadata, JSON-LD, sitemap, headers | 122 | 122 | 0 | 0 | — |
| 8 | Accessibility (axe WCAG 2.2 AA × 6 routes + 5 themes + keyboard/motion/touch) | 21 | 21 | 0 | 0 | — |
| 9 | Responsive + performance (10 widths × 6 routes, CWV, transfer size, mobile nav) | 28 | 28 | 0 | 0 | — |
| 10 | Reliability/manual probes (persistence, restart, storage failure, missing SITE_URL, concurrency, print/PDF, skills editor) | ~20 | 20 | 0 | 0 | — |
| 11 | Dependency audit (`npm audit` before/after) | 1 | 1 | 0 | 0 | — |
| 12 | SMTP delivery to a live provider | 0 | 0 | 0 | **4** | — |
| 13 | Cross-browser (Firefox, WebKit/Safari) | 0 | 0 | 0 | **3** | — |
| 14 | Deployed-origin validation (Search Console, Rich Results, social cards, Lighthouse field) | 0 | 0 | 0 | **4** | — |
| | **Totals** | **391** | **391** | **0** | **11** | **0** |

Skipped tests are counted as blocked, never as passed. "Failed" = 0 at the end of the audit; **5 intermediate failures occurred during development of the test harness and 4 during defect discovery** — all resolved: 4 test-harness bugs (§D non-defects), 4 product defects fixed (§E), and 1 heuristic replaced by the official axe rule.

Browser console audit: **0 console errors, 0 hydration warnings, 0 failed requests** across all 6 public routes.

---

## D. Defect register

### QA-001 — Inverse-surface accent text fails WCAG AA contrast (P2, accessibility)

- **Affected:** `/` and every route footer; Swiss Editorial theme most severely.
- **Preconditions:** Theme = `swiss-editorial` (also latent in `forest-sand`, `warm-bento`).
- **Reproduction:** Set `localStorage['akib-portfolio-theme']='swiss-editorial'`, load `/`, inspect `.footer-brand > span` and `.cta-band__title span`.
- **Expected:** ≥4.5:1 contrast for body text (≥3:1 for large text) per WCAG 2.2 AA SC 1.4.3.
- **Actual:** `rgb(23,23,22)` on `rgb(17,17,16)` = **1.05:1** — text effectively invisible. axe: `color-contrast` **serious**, `.footer-brand > span`. Measured: Forest & Sand 2.25:1 (fails even 3:1 large-text); Warm Bento 4.03:1 (fails 4.5:1 for footer hover links).
- **Root cause:** Swiss Editorial deliberately sets `--amber: #171716` (black accent for its monochrome paper design), but six rules painted `var(--amber)` onto the dark `--inverse-bg` surfaces (`.footer-brand span`, `.footer-list a:hover`, `.footer-social a:hover`, `.site-footer__bottom a:hover`, `.cta-band__title span`, `.cta-band__eyebrow::before`).
- **Fix applied:** New `--inverse-accent` token declared in `:root` and all five theme blocks in [themes.css](../src/styles/themes.css); the six inverse-surface rules in [base.css](../src/styles/base.css) and [home.css](../src/styles/home.css) now consume it. Verified ratios: Swiss 18.1:1, Amber 6.07:1, Graphite 8.72:1, Bento 4.99:1, Forest 6.49:1.
- **Regression tests:** [theme-contrast.test.ts](../src/styles/theme-contrast.test.ts) (11 tests parsing `themes.css` and asserting ≥4.5:1 for `--inverse-accent`, `--inverse-ink`, `--inverse-muted` on `--inverse-bg` in every theme); axe `color-contrast` scan across all 5 themes.
- **Verification status:** ✅ Verified — axe clean in every theme; 11/11 regressions pass.

### QA-002 — Production responses served without compression (P2, performance)

- **Affected:** All text responses: SSR HTML (~91 KB), main JS bundle (376 KB), CSS (80 KB).
- **Reproduction:** `curl -H 'Accept-Encoding: gzip' -D - <origin>/assets/index-*.js` before the fix → no `Content-Encoding`, full 376 KB transferred.
- **Expected:** Text assets gzip/brotli-encoded behind any production deployment (QA.md §13 explicitly inspects compression).
- **Actual:** Uncompressed; home page transferred **~693 KB** across 13 requests.
- **Root cause:** Express served `dist/` via `express.static` with no compression middleware; no proxy compression assumed by the app itself.
- **Fix applied:** `compression()` mounted in [server/app.ts](../server/app.ts) (skips sub-threshold and already-compressed payloads, sets `Vary: Accept-Encoding`).
- **Regression tests:** Two tests in [admin-security.test.ts](../server/admin-security.test.ts): gzip on SSR HTML with intact body after decompression; small-JSON correctness under compression negotiation.
- **Verification status:** ✅ Verified — `Content-Encoding: gzip` + `Vary` on HTML/JS/CSS; home page transfer measured at **~105 KB (−85%)**; perf suite 28/28.

### QA-003 — Vulnerable nodemailer in the production dependency tree (P1, security hygiene)

- **Affected:** `POST /api/contact` SMTP notification path (`nodemailer@^7.0.9`).
- **Evidence:** `npm audit` — nodemailer `≤10.0.5`, **high**: SMTP command injection via unsanitized envelope, IDN/punycode domain allow-list bypass, recipient-domain validation bypass, addressparser DoS vectors. Fix line: `nodemailer@10.1.7`.
- **Exploitability here (assessed, not assumed):** the app only calls `createTransport({host, port, secure, auth})` from environment config and sends to a fixed `CONTACT_TO_EMAIL`; attacker-controlled input reaches only `replyTo`. Direct exploitation was unlikely, but a flagged high-severity advisory in shipped code is a release concern and the fix was trivial.
- **Fix applied:** `nodemailer@^10.1.7`. The only API used (`createTransport`, `sendMail`) is stable across v7→v10.
- **Regression tests:** Existing `server/email.test.ts` (5 tests) + full suite pass on the new major.
- **Verification status:** ✅ Verified — `npm audit` reports **0 vulnerabilities**; 71/71 tests pass.

### QA-004 — Critical dev-tooling advisories via vitest/tinypool (P2, development-time)

- **Affected:** Test runner only (`vitest@3` → `tinypool ≤2.1.1` critical RCE gadget; `@vitest/mocker` moderate path traversal). Not present in production output.
- **Fix applied:** `vitest@5.0.5`.
- **Verification status:** ✅ Verified — all 71 tests pass on vitest 5; `npm audit` clean.

### Non-defects (investigated and dismissed — documented to avoid re-litigation)

1. **"Two `<h1>` per page"** — the second is inside `<noscript>` (no-JS fallback). Exactly one visible h1 per route. ✅
2. **Unicode mangled in stored contact submissions** — Git Bash console codepage corrupted my own curl payload. Re-sent from Node: accents, 中文, and emoji round-trip byte-perfect into `contact-submissions.jsonl`. ✅
3. **"Sub-24px touch targets"** — my bounding-box heuristic; WCAG 2.2 SC 2.5.8 exempts inline links, and the official axe `target-size` rule reports **0 violations** on all 6 routes at 390 px. Heuristic replaced by the official rule. ✅
4. **"Theme switcher visible in print"** — helper bug (computed `display` of a child inside a hidden parent isn't `none`). With `checkVisibility()`: header, footer, switcher all hidden; **0 interactive controls print**; valid 1-page A4 PDF generated. ✅
5. **"Profile save 400"** — test-harness bug: `/api/admin/content` returns `{ok, content}`. ✅
6. **"Wrong-theme frame during navigation sampling"** — samples came from `readyState === 'loading'` DOM states before `theme-init.js` executes; these are never painted (parser-blocking script precedes body). Proof: instrumented `setAttribute('data-theme')` timestamp vs. `first-contentful-paint` shows **FCP ≥ theme-applied for all 5 themes**. ✅

---

## E. Fixes applied

| File | Change | Root cause addressed |
| --- | --- | --- |
| [src/styles/themes.css](../src/styles/themes.css) | Added `--inverse-accent` to all 5 theme blocks | QA-001 |
| [src/styles/base.css](../src/styles/base.css) | 4 footer rules now use `var(--inverse-accent)`; token documented in `:root` | QA-001 |
| [src/styles/home.css](../src/styles/home.css) | `.cta-band__title span`, `.cta-band__eyebrow::before` use `var(--inverse-accent)` | QA-001 |
| [src/styles/theme-contrast.test.ts](../src/styles/theme-contrast.test.ts) | **New** — 11 regression tests asserting token contrast in `themes.css` | QA-001 |
| [server/app.ts](../server/app.ts) | Mounted `compression()` middleware | QA-002 |
| [server/admin-security.test.ts](../server/admin-security.test.ts) | +2 compression regression tests | QA-002 |
| [package.json](../package.json) | `nodemailer@^10.1.7`, `vitest@^5.0.5`; devDeps `playwright`, `axe-core`, `@axe-core/playwright`, `compression` + types; `qa:*` scripts | QA-003/004, §G tooling |
| [.gitignore](../.gitignore) | Added `qa-env/` (isolated QA databases, logs, captures stay out of git) | audit hygiene |
| [qa/](../qa) | **New** — 6 reusable browser/API suites (282 assertions), parameterized via `QA_BASE_URL`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` | long-term regression coverage |

No security control was weakened to make a test pass. No existing behavior or design was changed beyond the two defect fixes.

---

## F. Security assessment

Executed against the live production server with an isolated database. Every claim below is backed by a passing assertion in this audit.

**Authentication & sessions — PASS.** Wrong password → 401 with an error message *identical* to unknown-email (no enumeration). Login rate limit observed live: attempt 9+ → **429** with `Retry-After` (unit test also proves 5/15-min window). Cookie flags in production: `HttpOnly`, `SameSite=Strict`, `Secure`, bounded `Max-Age`. Forged session cookie → 401; expired session row → 401; logout invalidates server-side (`Max-Age=0` + subsequent 401). No public registration endpoint exists. Session token never appears in response bodies or `localStorage`.

**CSRF & Origin — PASS.** Every admin mutation rejected without `X-CSRF-Token` (403), with a forged token (403), with a foreign `Origin` (403), and with a missing Origin (403) — re-verified on the live server, not only in unit tests.

**Authorization / IDOR / mass assignment — PASS.** All 10 admin endpoints return 401 without a session (read *and* write). `isAdmin`/`role` injection → 400 (strict schema, unknown fields rejected). No client-supplied ID trusted; audit rows are keyed to the authenticated admin.

**Draft/content isolation — PASS.** A draft project was created live: 404 on its public URL, absent from public HTML, `/api/content`, and `sitemap.xml`. Publishing made it appear everywhere; slug rename → **301** from old to new URL; unpublish → 404 again; deletion removed it from the admin list. Admin HTML carries `X-Robots-Tag: noindex` + `noindex, follow` meta.

**Uploads — PASS.** Anonymous upload → 401. Fake JPEG → 400 (signature check). SVG with script → 400. Oversized (5 MB+10) → 413. Valid JPEG → 201 under `portrait-<uuid>.jpg`. Double-extension `evil.js.jpg` and traversal `../../server/evil.jpg` both sanitized to UUID names with no path separators. Traversal DELETE → 400. Generated names cannot overwrite app code, `.env`, or the DB. Serving sets `immutable` caching + `nosniff` + same-origin resource policy.

**Contact API — PASS.** Non-JSON → 415; malformed JSON → 400; foreign Origin → 403; >16 KB → 413; invalid email/whitespace/overlong/enum → 400 with field-mapped errors; honeypot → generic 200 **and nothing written to disk** (verified by grep); rate limit 8/15-min observed live at 429; storage failure (EISDIR simulation) → friendly **500** with the technical reason only in server logs — no stack trace, paths, or secrets in the response. Stored messages never appear in any public endpoint. Submission file written as JSONL with `0600` intent. Unicode verified byte-perfect. **Note:** earlier `curl` unicode corruption was a console artifact, not a server defect.

**Security headers — PASS (production mode).** `Content-Security-Policy: default-src 'self'; … script-src 'self'; style-src 'self'` with **no `unsafe-inline`**; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy`; `Permissions-Policy`; `Cross-Origin-Opener-Policy`; `X-Powered-By` removed. HSTS correctly **absent** on HTTP origin and emitted only for `https://` SITE_URL (code path + unit-tested). CSP enforcement proven live: Playwright's inline `addScriptTag` was **blocked** by `script-src 'self'` in a real browser. The SSR/theme bootstrap survives the CSP because it uses external scripts only (no inline script/style) — no CSP relaxation was needed.

**Dependencies — PASS after fixes.** `npm audit`: **0 vulnerabilities** (4 found: 2 critical, 1 high, 1 moderate — all fixed in §D).

**Error handling & health — PASS.** No stack traces, secrets, session data, or file paths leak to public responses in any tested failure. `/api/health` reflects live readiness (`{"ok":true}` after 20 concurrent requests, zero errors in the server log). Graceful shutdown closes the HTTP server then the DB.

**Audit trail — PASS.** Privileged actions record admin email, action, entity, timestamp. Audit payload contains no passwords and no CSRF/session tokens (asserted).

**Not verified:** SMTP transport security against a real provider (blocked, no credentials); HTTPS termination/HSTS on a real TLS origin (needs deployment).

---

## G. SEO and accessibility assessment

### SEO — 122/122 HTTP-level assertions pass

For **every** public route: HTTP 200; unique `<title>`; meta description 50–300 chars; canonical exactly matching the route under `SITE_URL`; `og:title`/`og:url`/`twitter:card`; `robots: index, follow`; SSR `<main>` present in first response; exactly one visible `<h1>` (noscript excluded); h2 sections present; all `<img>` carry `alt`; primary content server-rendered (no empty shell).

Also verified: home JSON-LD contains `Person` + `WebSite`; project pages contain `SoftwareSourceCode` + `BreadcrumbList`; JSON-LD parses and cannot break out of the script tag; unknown routes → **404 + noindex** (no soft 200); admin shell → 200 + `X-Robots-Tag: noindex` + `noindex, follow`; sitemap contains only the 5 static pages + 3 published projects and **zero** `/admin` or `/api/` URLs; robots.txt disallows `/admin` and `/api/` and advertises the sitemap; drafts never appear in sitemap/HTML/API; `Cache-Control: no-store` on HTML, `immutable` on hashed assets.

**Fail-closed behavior verified live:** with `SITE_URL` unset in production, `/sitemap.xml` and `/robots.txt` return **503**, canonical tags are omitted, the site still serves 200 — exactly as documented. (Trailing-slash 301s and query preservation verified; `?category=…` deep links restore state and invalid values fall back to All.)

**Not verified (needs deployed origin):** Search Console submission, Rich Results validation, social-card scrapers, canonical host consistency across the real domain, Lighthouse SEO score. These remain on the post-deploy checklist in [seo-report.md](seo-report.md).

### Accessibility — WCAG 2.2 AA: 21/21 pass

axe-core scans: **0 serious/critical violations** on all 6 public routes and `/admin/login`; **0 `color-contrast` violations in any of the 5 themes** (after QA-001 fix); **0 `target-size` violations** at 390 px on all routes.

Manual (automated scans alone are insufficient): skip link is the first tab stop; visible focus ring found while tabbing the contact form; filter chips operable by keyboard with correct `aria-pressed`; search input typable; theme `<select>` keyboard-operable and applying live; `aria-expanded` toggles correctly on the mobile nav, which opens, navigates, and closes; empty form submit surfaces `role="alert"` + `aria-invalid` errors; `prefers-reduced-motion` reduces animation to ≤3 elements; every image has alt text; one clear h1 per page with h2 sections beneath.

**Not verified:** real screen-reader traversal (NVDA/VoiceOver), browser zoom to 400% (proxied by zero-overflow at 320 px), admin CMS beyond `/admin/login` (login page scanned; authenticated admin screens not axe-scanned — remaining risk noted in §J).

---

## H. Performance assessment

**Lab conditions:** localhost, system Chrome, warm cache, median of 3 runs (this is **lab** data, not field data).

| Metric | `/` | `/projects` | `/contact` | Target | Result |
| --- | ---: | ---: | ---: | --- | --- |
| TTFB | 11 ms | 8 ms | 7 ms | ≤500 ms | ✅ |
| FCP | 88 ms | 60 ms | 60 ms | ≤1800 ms | ✅ |
| LCP | 88 ms | 60 ms | 60 ms | ≤2500 ms | ✅ |
| CLS (4× CPU throttle) | ≤0.1 | ≤0.1 | — | ≤0.1 | ✅ (asserted pass) |

**Transfer size:** home page **~105 KB across 13 requests** after QA-002 fix (was ~693 KB pre-fix — the single biggest measured improvement of this audit). Main JS 376 KB raw → **~112 KB over the wire**; CSS 80 KB → ~13 KB. Three above-the-fold fonts (Inter, Anton, JetBrains Mono latin) are preload-injected at build time and download in parallel with the stylesheet (existing FOUC work, re-verified).

**Bottlenecks / observations:** the 376 KB raw main bundle is the dominant cost; it is React + the public app (admin code is lazy-split — visible in the build output as separate chunks). No duplicate dependencies observed; no render-blocking requests beyond the single CSS file; no layout shifts detected during hydration; INP not measurable meaningfully at this scale (no long tasks >50 ms observed; lab INP requires interaction traces and is **not claimed**).

**Fixed:** QA-002 (compression) — justified by the 693 KB measurement above.

**Not claimed:** real-user field Core Web Vitals (no field data exists yet).

---

## I. Production readiness checklist

### Release blockers (must be true before going live) — all satisfied

- [x] Type-check, 71 unit/integration tests, and production build pass (`npm run check`).
- [x] All 6 QA suites pass against the production build (282/282).
- [x] **No known P0/P1 defects remain** — QA-001..004 fixed and regression-covered.
- [x] Admin authorization: every admin endpoint rejects unauthenticated/forged/CSRF-less requests (verified live).
- [x] Draft isolation and slug-redirect behavior verified end-to-end.
- [x] Upload hardening verified (signatures, UUID names, traversal rejected).
- [x] Contact API validation, rate limiting, honeypot, storage-failure handling verified.
- [x] `npm audit` = **0 vulnerabilities**.
- [x] CSP + full security-header set verified in production mode (and proven enforced in-browser).
- [x] SEO fail-closed behavior (503 without `SITE_URL`) verified.
- [x] WCAG 2.2 AA axe-clean across all themes.
- [x] Compression enabled and measured.

### Required deployment steps (operator actions, not code)

1. Set `SITE_URL` to the real HTTPS origin — sitemap/robots/canonical fail closed without it.
2. Put **HTTPS** in front (production cookies are `Secure`; without TLS a login session will not persist) and set `TRUST_PROXY=1` behind the proxy.
3. Mount a persistent volume for `DATA_DIR`/`DATABASE_PATH`/`UPLOAD_DIR` — SQLite content, sessions, uploads, and the admin account live there.
4. Provision the admin: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create` against that same volume (use PowerShell syntax on Windows; no default credentials exist).
5. Optional SMTP: set `CONTACT_TO_EMAIL` + `SMTP_*` for email notifications; submissions store fine without it.

### Recommended (non-blocking)

- After deploy: run the Search Console / Rich Results / social-card checklist in [seo-report.md](seo-report.md) and capture field CWV.
- Add a CI step: `npm run check && npm run qa` (QA suites accept `QA_BASE_URL`).
- Consider Firefox/WebKit runs once available to close the cross-browser gap.
- Consider an authenticated axe scan of the admin CMS screens.
- Schedule periodic `npm audit` (advisories drift over time).

---

## J. Remaining risks and untested areas

| Risk / gap | Impact | Why untested |
| --- | --- | --- |
| **SMTP delivery** (4 blocked checks: success, failure, timeout, storage-without-email) | Email notifications may misbehave in production; **messages are still stored**, so no data loss either way | No live SMTP credentials; QA rules forbid live side effects. Code path (best-effort send, failure logged, stored message preserved) reviewed + unit-tested in `email.test.ts` |
| **Cross-browser: Firefox, WebKit/Safari** (3 blocked) | Theme/FOUC behavior on other engines assumed from code review + spec reasoning | Not installed on this machine; only system Chrome available. **Do not treat this audit as cross-browser coverage** |
| **Deployed-origin SEO** (Search Console, Rich Results, social scrapers, canonical host) | Real-domain indexing issues possible | Requires the live domain; local HTTP checks can't validate external services |
| **Field Core Web Vitals / INP** | Lab numbers may not reflect real users | Requires real-user telemetry post-launch |
| **HSTS on real TLS** | Header behavior under HTTPS unproven live | Local origin is HTTP (header correctly absent; code path unit-tested) |
| **Authenticated admin screens axe scan** | Possible a11y issues in CMS beyond login page | Admin a11y beyond login not scanned (functional admin flows all passed) |
| **Contact rate-limit reset window** | 15-min in-memory limiter resets on restart (by design) | Single-instance architecture documented in README; multi-instance would need a shared store |
| **Windows console unicode** | Bash codepage corrupts non-ASCII CLI payloads | Verified not a server defect (Node client round-trip perfect) |

Assumptions made: the QA instance ran with `TRUST_PROXY` unset (direct, non-proxy); no reverse proxy was in the local stack, so proxy-header behavior (`X-Forwarded-Proto`) was code-reviewed but not exercised end-to-end.

---

## K. Commands and reproduction instructions

```bash
# 0. Environment
node --version          # >= 20.19 (audited on v24.11.1)
npm install

# 1. Baseline quality gate (typecheck + 71 tests + build)
npm run check

# 2. Dependency audit (expect: found 0 vulnerabilities)
npm audit

# 3. Production server on an ISOLATED QA database (never your real data/)
mkdir -p qa-env/data qa-env/uploads
ADMIN_EMAIL=qa-admin@example.com ADMIN_PASSWORD='QA-test-passphrase-2026!' \
  DATABASE_PATH=./qa-env/data/qa.db npm run admin:create

NODE_ENV=production PORT=3100 HOST=127.0.0.1 \
  SITE_URL=http://127.0.0.1:3100 \
  DATA_DIR=./qa-env/data DATABASE_PATH=./qa-env/data/qa.db UPLOAD_DIR=./qa-env/uploads \
  npx tsx server/index.ts
# (Windows PowerShell: prefix each assignment with $env: and a semicolon)

# 4. QA suites — all against the server above
npm run qa:theme        # 46 assertions — theme selection, persistence, FOUC, hydration
npm run qa:functional   # 19 assertions — routing, history, filters, forms, keyboard
npm run qa:admin        # 46 assertions — CMS CRUD, uploads, CSRF/Origin, audit trail
npm run qa:seo          # 122 assertions — metadata, JSON-LD, sitemap, headers
npm run qa:a11y         # 21 assertions — axe WCAG 2.2 AA across themes + keyboard
npm run qa:perf         # 28 assertions — 10 viewports, CWV, transfer size, mobile nav
npm run qa              # all of the above in sequence

# Optional: point the suites at another deployment
QA_BASE_URL=https://staging.example.com npm run qa:seo
QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... npm run qa:admin
```

Expected final output of each suite: `RESULT: N passed, 0 failed` (46 / 19 / 46 / 122 / 21 / 28).

---

## Release decision

> ## **CONDITIONAL GO**
>
> The application is usable and no release-blocking defects remain — but explicitly documented environmental limitations remain, which is the definition of CONDITIONAL GO.
>
> **Evidence for GO:** 391/391 executed automated assertions pass against the production build, including attack-oriented tests (every admin endpoint rejects unauthenticated/forged/CSRF-less requests; uploads resist signature spoofing and path traversal; drafts never leak into HTML, APIs, or the sitemap; the CSP demonstrably blocks inline script execution in a real browser). The four confirmed defects (a serious WCAG contrast failure, missing compression, and two vulnerable dependency lines) were fixed and regression-tested. `npm audit` reports zero vulnerabilities. SEO is fail-closed without `SITE_URL`, and the theme system provably paints the correct theme before first contentful paint in all five themes.
>
> **Evidence preventing unconditional GO:** SMTP delivery could not be tested against a live provider; only Chromium was available (Firefox/WebKit blocked); Search Console/Rich Results/social-preview validation and field Core Web Vitals require the deployed origin. These are environmental limitations in §J, not known code defects.
>
> Completing the deployment steps in §I and running the §J post-deploy checklist against the real HTTPS origin would close every remaining gap.
