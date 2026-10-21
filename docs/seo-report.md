# SEO audit and verification report

Date: 20 October 2026

Scope: public portfolio routes, rendering, metadata, structured data, sitemap/robots, and crawlability. This report distinguishes what was verified locally from what still requires a deployed origin and external tools.

## 1. Pre-change audit

The starting point was inspected in the `master` branch before the feature work.

| Area | Finding |
| --- | --- |
| Rendering | Public pages were a client-side Vite SPA. Express returned the same `dist/index.html` shell for `/`, `/about`, `/projects`, `/projects/:slug`, `/contact`, and `/resume`. |
| Initial HTML | The shell contained one fixed title, description, Open Graph set, and a basic `Person` JSON-LD block. Route-specific metadata was applied by `usePageMeta` in `useEffect` after hydration. |
| Crawlable content | The initial response contained only `<div id="root"></div>` plus a `<noscript>` notice. Project case studies were not present in the HTML a crawler receives without JavaScript. |
| Titles/descriptions | One title and description for every route in the raw response; per-route values existed only after JavaScript execution. |
| Canonical URLs | Added client-side from `window.location.origin`; none in the initial response. |
| Status codes | The server did return HTTP 404 for unknown paths and set `X-Robots-Tag: noindex`. |
| Sitemap | Generated from a static project list. No draft concept existed. |
| Robots | `Disallow: /api/` only; no admin area existed. |
| Structured data | Basic `Person` only; no `WebSite`, project `SoftwareSourceCode`, or breadcrumbs. |
| Social images | One static `/og.png` for every route. |
| Trailing slashes | Paths were stripped for the 404 check but the URL itself was not redirected, leaving duplicate variants reachable. |
| Admin/private content | No CMS existed; therefore no private draft/content exposure, but also no post-deployment editing. |

The material risk was not "missing meta tags" in the browser. It was that search engines and social crawlers received an empty shell with identical metadata for every URL, which makes project case studies effectively undiscoverable without JavaScript rendering.

## 2. Implemented changes

### Rendering and crawlability

- Added a Vite SSR build (`src/entry-server.tsx`, `server/render.ts`) and hydrate the client against the server markup.
- Each public request reads current content from SQLite, builds route metadata, renders the page, and injects the content payload used for hydration.
- Unknown routes and unpublished project URLs return HTTP 404 with `noindex`; `/admin` pages are never rendered server-side and are sent an empty shell with `noindex`.
- Trailing slashes permanently redirect to the canonical path.
- Development uses Vite middleware and the same renderer, so metadata and content behavior matches production.

### Metadata and structured data

- Unique title, description, canonical URL, Open Graph type/title/description/URL/image, and Twitter card per route.
- Canonical URLs use `SITE_URL`; if it is missing or invalid in production, sitemap and robots fail closed (`503`) and canonical tags are omitted.
- JSON-LD graph: `Person`, `WebSite`, `SoftwareSourceCode` for projects, `BreadcrumbList` on project pages, and `CollectionPage` on `/projects`. Content is escaped before embedding.
- Project pages use a project image for social metadata when one exists; otherwise the portrait or the site sharing image.
- `robots.txt` disallows `/admin` and `/api/`. `sitemap.xml` contains only canonical static routes and published projects, with `lastmod` from the project update time.
- Admin responses send `X-Robots-Tag: noindex` and the HTML contains `<meta name="robots" content="noindex, follow">`.

### Content

- Case studies retain the problem → requirements → architecture → implementation → security → testing → delivery → lessons structure, without invented metrics or links.
- Project records now support drafts, publishing, ordering, featured state, images, and slug changes with permanent redirects.
- The CMS prevents draft content from entering public HTML, the public API, metadata, or the sitemap.

## 3. Verification performed

Environment: production build (`npm run build` followed by `npm start`) on `http://127.0.0.1:4310`, with `SITE_URL=https://portfolio.example` and a temporary SQLite database. HTTP checks used `curl`; rendering and interaction checks used a real Chromium browser.

### Build and automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed — 58 tests across 8 files |
| `npm run build` | Passed — client and SSR bundles produced |
| HTTP security suite | Passed — unauthenticated admin reads/writes return 401, CSRF/Origin failures 403, login rate limit 429, expired/forged sessions 401, logout invalidates the session |
| Upload validation | Passed — valid PNG/PDF accepted, SVG and renamed non-PDF rejected, oversized upload 413, path traversal 400 |
| Draft isolation | Passed — draft absent from `/api/content`, public page 404, absent from sitemap; publish makes it visible; unpublish hides it again |
| Slug redirect | Passed — `/projects/verification-draft` returned `301` to `/projects/verification-renamed` |
| Public rendering after edit | Passed — a profile headline edit appeared in the server-rendered `/about` HTML and produced an audit entry |

### Route responses (production build)

| Route | Status | Initial HTML metadata |
| --- | --- | --- |
| `/` | 200 | Unique title, `canonical https://portfolio.example/`, `index, follow`, Person + WebSite + project JSON-LD |
| `/about` | 200 | Unique title/description, canonical, Person JSON-LD |
| `/projects` | 200 | Unique title/description, canonical, CollectionPage JSON-LD |
| `/projects/financial-research-settlement-agent` | 200 | Case-study title, summary description, canonical, article OG type, SoftwareSourceCode + BreadcrumbList |
| `/projects/full-stack-learning-platform` | 200 | Same route-specific treatment |
| `/projects/cicd-test-automation-lab` | 200 | Same route-specific treatment |
| `/contact` | 200 | Unique title/description, canonical |
| `/resume` | 200 | Unique title/description, canonical |
| `/admin`, `/admin/login`, `/admin/projects` | 200, noindex | No canonical; empty app shell; `X-Robots-Tag: noindex` |
| `/does-not-exist` | 404, noindex | Styled not-found page, no canonical |
| `/projects/nope` | 404, noindex | Styled not-found page, no canonical |
| `/about/` | 301 | Redirect to `/about` |

The initial HTML for `/` contained the rendered header, hero, skills, projects, capabilities, approach, CTA, and footer — not a loading placeholder.

### Sitemap and robots (production build)

`sitemap.xml` contained exactly:

```
https://portfolio.example/
https://portfolio.example/about
https://portfolio.example/projects
https://portfolio.example/contact
https://portfolio.example/resume
https://portfolio.example/projects/financial-research-settlement-agent
https://portfolio.example/projects/full-stack-learning-platform
https://portfolio.example/projects/cicd-test-automation-lab
```

No admin, API, or draft URLs. `robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: https://portfolio.example/sitemap.xml
```

Both were served with `Content-Type: application/xml` / `text/plain` and revalidation caching.

### Headers and assets

Verified on the production server: CSP (no inline script/style allowance), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Referrer Policy, Permissions Policy, COOP, and HSTS because `SITE_URL` is HTTPS. Hashed assets and `/theme-init.js` returned 200 with correct content types.

### Browser checks

- All five themes applied without a reload; body colours and display fonts changed per theme.
- Theme choice persisted across a reload; the saved theme was applied before first paint.
- No horizontal overflow at 390, 768, or 1440 px after adjusting the wide monospace/Inter hero type for Graphite Terminal and Swiss Editorial.
- Mobile menu opens the theme selector with its label and current value; focus moves to the close control.
- Admin sign-in, dashboard, appearance preview/save, project list, and the fully populated project editor rendered without console errors.

### Not verified

- Google Search Console ownership, sitemap submission, indexing, crawl stats, or ranking changes.
- Rich Results Test / Schema Markup Validator against a deployed URL.
- Social preview debuggers (LinkedIn, X, Facebook) against a deployed URL.
- Lighthouse scores or Core Web Vitals field data.
- Live SMTP delivery.
- Multi-instance deployment behavior.

## 4. Post-deployment checklist

Run these once the site is deployed with the final `SITE_URL` and HTTPS.

1. **Search Console**
   - Add the production domain as a property (domain property if DNS access is available).
   - Verify ownership with the DNS TXT record (preferred) or the HTML file/meta tag method.
   - Submit `https://<domain>/sitemap.xml`.
   - Inspect `/`, `/projects`, and each `/projects/:slug` with URL Inspection; confirm "Crawled as Googlebot" sees the case-study text and canonical.
   - Check Pages → Why pages aren't indexed; confirm `/admin` is not indexed and 404s are reported as soft-404-free.
2. **Structured data**
   - Run the home page and a project page through the Rich Results Test and Schema Markup Validator.
   - Confirm `Person`, `WebSite`, `SoftwareSourceCode`, and `BreadcrumbList` appear without errors.
3. **Social previews**
   - Check `/`, `/projects`, and a project page in LinkedIn Post Inspector, X Card Validator, and Facebook Sharing Debugger.
   - Confirm the image is absolute, reachable without authentication, and at least 1200×630.
4. **Crawl and status**
   - `curl -sI https://<domain>/does-not-exist` must return 404.
   - `curl -sI https://<domain>/admin` must include `X-Robots-Tag: noindex`.
   - `curl -s https://<domain>/robots.txt` must list the production sitemap.
   - Confirm `http://` redirects to `https://` at the proxy and trailing slashes return 301.
5. **Lighthouse / accessibility**
   - Run Lighthouse (mobile and desktop) on `/`, `/projects`, and a project page.
   - Run an axe or similar WCAG 2.1 A/AA scan at 390, 768, and 1440 px.
   - Test all five themes for contrast, focus visibility, and reduced-motion behavior.
6. **CMS smoke test on the deployed origin**
   - Sign in, upload a portrait and resume PDF, edit the profile, create a draft, preview it, publish it, confirm it appears in the sitemap, rename the slug and confirm the 301, then unpublish and confirm the page returns 404.
   - Confirm the audit log records each action and that no secret or token appears in it.

Record the deployment date, tested URLs, and any failures. Do not claim indexing or ranking improvements until Search Console independently reports them.
