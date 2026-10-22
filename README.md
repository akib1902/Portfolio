# Akib Ahmed — Portfolio

A production-oriented personal portfolio for **Akib Ahmed**, a software engineer working across full-stack development, DevOps, and QA automation.

The public site is server-rendered, has route-specific SEO metadata, and ships five complete visual themes. A private, single-owner CMS stores profile, skills, project, and theme content in SQLite so ordinary edits do not require a rebuild.

## Stack

- **React 19 + TypeScript + Vite 7**
- **React Router 7** for real routes and browser navigation
- **Express 4** serving SSR HTML, SEO endpoints, the contact API, and the private admin API
- **better-sqlite3** with forward-only migrations, WAL mode, and a seeded content store
- **Zod 4** schemas shared by the browser and server
- **Nodemailer** for optional SMTP notifications
- Self-hosted **Inter**, **Anton**, **JetBrains Mono**, and **Newsreader** fonts
- **Vitest** for unit, content-integrity, and HTTP security tests

## Architecture

```
Browser ──► Express
              ├─ /api/contact        validated, rate-limited, stored + optional email
              ├─ /api/content        published content only
              ├─ /api/admin/*        session + CSRF protected
              ├─ /media/*            published uploads
              ├─ /sitemap.xml        generated from published projects
              ├─ /robots.txt         admin/API excluded
              └─ everything else     React SSR + hydration
```

- The server reads the current content document from SQLite on every request, builds route metadata, renders the public page with `renderToString`, and embeds the same content as JSON for hydration. The first response already contains the real page, title, canonical URL, social metadata, and JSON-LD.
- `/api` and `/admin` responses are never part of the public sitemap. Admin HTML is an empty application shell; the CMS fetches its data only after session validation.
- Draft projects never leave the admin layer. They are absent from `/api/content`, public HTML, metadata, and `sitemap.xml`.
- The visitor's theme is applied by `/theme-init.js` before first paint. The administrator's default theme is rendered on `<html data-theme>` by the server.
- `public/boot.css` is linked first in `<head>` and paints the correct theme canvas (background + `color-scheme`) on the very first frame, so a cold cache never flashes white in front of the dark Graphite Terminal theme. The Vite config injects `<link rel="preload">` tags for the three above-the-fold fonts (Inter, Anton, JetBrains Mono latin subsets) at build time, because the hashed filenames cannot be hardcoded; fonts then download in parallel with the stylesheet instead of after it, eliminating the fallback-font flash on the hero.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Editorial hero, profile, skills, featured work, capabilities, approach, CTA |
| `/about` | Philosophy, capabilities, delivery workflow, verified education details |
| `/projects` | Filterable, searchable case-study gallery; filter state lives in `?category=` |
| `/projects/:slug` | Full case study with diagram, table of contents, evidence, related work |
| `/contact` | Validated contact form, availability details, and administrator-managed contact links |
| `/resume` | Print-ready resume with PDF download |
| `/sitemap.xml`, `/robots.txt` | Generated from `SITE_URL`; fail closed if it is missing in production |
| `/admin/login`, `/admin`, `/admin/profile`, `/admin/projects`, `/admin/skills`, `/admin/appearance`, `/admin/settings` | Private CMS |
| `POST /api/contact` | Contact submission |
| `GET /api/content` | Published content document |
| `GET /api/health` | Readiness check |

## Run locally

Requires **Node.js 20.19+** (tested on Node 24).

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Express runs Vite in middleware mode, so HMR, SSR, and the API share one port.

The database is created automatically at `data/portfolio.db` and seeded with the content in `src/content/` on first start.

Production:

```bash
npm run build
npm start
```

`npm start` sets `NODE_ENV=production` through `server/start.ts`, serves `dist/`, and requires a build first.

## Theme system

Five themes are defined as CSS custom-property sets in `src/styles/themes.css`:

1. **Amber Minimal** — default: warm ivory paper, charcoal type, restrained amber.
2. **Graphite Terminal** — graphite surfaces, high-contrast type, technical grid, amber highlights.
3. **Swiss Editorial** — white space, black type, strict alignment, no decorative shadows.
4. **Warm Bento** — warm neutral canvas, modular cards, balanced density.
5. **Forest & Sand** — sand backgrounds, deep green inverse panels, muted brass.

Components consume tokens (`--paper`, `--ink`, `--amber`, `--font-display`, `--radius`, `--shadow-panel`, …) rather than theme-specific colours. The header selector is a native `<select>` with a visible label and focus style. The mobile selector sits inside the navigation menu.

- The visitor's choice is stored under `akib-portfolio-theme` in `localStorage` and applies to their browser only.
- No saved preference → the administrator's default theme.
- Invalid or removed stored values fall back safely to the configured default.
- Theme choice does not change URLs, content, metadata, or authorization.
- `/admin/appearance` previews all five themes locally, then saves the default for future visitors. The preview is never written to the visitor's `localStorage`.

## Private CMS

### Provision the administrator

There is no public registration and no default account. Provision (or rotate) the single administrator from the server environment:

```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='a long passphrase of at least 12 characters' \
npm run admin:create
```

The password is hashed with **scrypt** (per-password salt, 64-byte derived key). Re-running the command rotates the password and revokes existing sessions. The command writes to `DATABASE_PATH`; run it against the same persistent volume the server uses.

Then sign in at `/admin/login`.

On Windows PowerShell, set the variables with PowerShell syntax before running
the provisioning command:

```powershell
Set-Location E:\Portfolio
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "a-long-passphrase-of-at-least-12-characters"
npm run admin:create

# Optional: do not keep the credentials in this PowerShell session.
Remove-Item Env:ADMIN_EMAIL
Remove-Item Env:ADMIN_PASSWORD
```

If you use a custom database path, set it while provisioning and when starting
the server so both commands use the same database:

```powershell
$env:DATABASE_PATH = "E:\Portfolio\data\portfolio.db"
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = "a-long-passphrase-of-at-least-12-characters"
npm run admin:create
npm run dev
```

If the password is forgotten, run `npm run admin:create` again with the same
email and a new password. This updates the existing account and revokes its
sessions. Do not use `ADMIN_EMAIL=... npm run admin:create` in PowerShell;
that is Bash syntax and will not set the variables for this script.

### What the administrator can edit

- **Profile:** name, headline, biography, disciplines, location/time zone, availability, education, contact links (email, GitHub, LinkedIn, Upwork, and up to ten additional labelled links with reordering), portrait, social-sharing image, resume paths, engineering principles. A link appears on the contact page only when its URL is filled in.
- **Media:** upload/replace/remove portrait, sharing image, project image, and resume PDF. Files are validated by signature, MIME type, extension, and size (5 MB), renamed with a UUID, and stored under `UPLOAD_DIR`.
- **Projects:** create, edit, preview, publish/unpublish, delete, feature, reorder; edit stack, links, diagram, and every case-study section. Drafts are private. Changing a published slug writes a permanent redirect from the old URL.
- **Skills:** add, edit, reorder, and remove groups; add/remove skills; choose home-page highlights.
- **Appearance:** preview and save the default public theme.
- **Settings:** inspect session policy, public URLs, and the audit log.

Every mutation is recorded in `audit_log` with the administrator email, action, entity, timestamp, and a short summary. Passwords, session tokens, and secrets are never logged.

### Security model

| Control | Implementation |
| --- | --- |
| Password storage | scrypt, per-password salt, timing-safe comparison |
| Sessions | Server-side rows; the cookie contains a random token whose SHA-256 hash is stored |
| Cookie | `HttpOnly`, `SameSite=Strict`, `Secure` in production, path `/`, bounded `Max-Age` |
| Expiration | `SESSION_TTL_HOURS` (1–72, default 8); expired rows rejected and deleted |
| Login | Rate-limited to 5 attempts per 15 minutes per IP; identical error for unknown email and wrong password |
| CSRF | Every mutation requires `X-CSRF-Token` matching the session; `Origin` must match the request host or `SITE_URL` |
| Authorization | `requireAdmin` runs on every private read and write; no client-supplied ID or role is trusted |
| Input validation | Strict Zod schemas reject unknown fields, unsafe URLs, bad slugs, and overlong values |
| Uploads | Signature detection, allowlisted MIME/extension, UUID names, no SVG, path traversal rejected |
| Secrets | Server environment only; no session token or credential is placed in `localStorage` or the public bundle |
| Headers | CSP (no inline scripts or styles), HSTS when `SITE_URL` is HTTPS, frame denial, nosniff, Referrer/Permissions policies |

The public site is read-only for visitors. Hiding UI controls is not the security boundary: every write endpoint rejects unauthenticated and un-CSRF'd requests even when called directly with curl.

## Environment

Copy `.env.example` to `.env` (ignored by git). Never commit real credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SITE_URL` | Production | Canonical public origin, for example `https://akibahmed.dev`. Must be an origin with no path. Missing/invalid in production disables sitemap/robots and omits canonical URLs rather than publishing wrong ones. |
| `PORT` | No | Defaults to `3000`; invalid/zero values fall back to `3000`. |
| `HOST` | No | Defaults to `127.0.0.1` in development and `0.0.0.0` in production. |
| `TRUST_PROXY` | Behind proxy | `1` so rate limits and secure-cookie decisions see the real client/protocol. |
| `DATA_DIR` | No | Defaults to `./data`. Must be a persistent disk. |
| `DATABASE_PATH` | No | Defaults to `DATA_DIR/portfolio.db`. |
| `UPLOAD_DIR` | No | Defaults to `DATA_DIR/uploads`. Must be persistent. |
| `SESSION_TTL_HOURS` | No | 1–72, default `8`. |
| `CONTACT_TO_EMAIL` | For email | Private inbox for contact notifications. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | For email | SMTP delivery. Without them, submissions are still stored. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Provisioning only | Read by `npm run admin:create`; not needed by the running server. |

## Persistence and deployment

This is a **Node server deployment**, not a static-only build. Netlify/Vercel static hosting cannot run the SSR, admin API, or contact endpoint without adapting them to a function model.

1. Build with `npm run build`, then run `npm start` from the project root.
2. Mount a persistent volume and point `DATA_DIR` (or `DATABASE_PATH` and `UPLOAD_DIR`) at it. Ephemeral filesystems lose content, uploads, and the admin account.
3. Set `SITE_URL` to the HTTPS production origin and `TRUST_PROXY=1` behind a proxy.
4. Run `npm run admin:create` against the same volume to provision the account.
5. Put HTTPS in front of the service. Production cookies are `Secure`, so plain HTTP will not keep a login.

**Database.** Migrations are forward-only and run automatically inside a transaction at startup (`server/db.ts`). Never edit a shipped migration; add a new version. Tables: `admin_users`, `sessions`, `documents`, `projects`, `project_redirects`, `audit_log`, `schema_migrations`.

**Backups.** Back up the SQLite database, `UPLOAD_DIR`, and the contact submission log together. With WAL enabled, use SQLite's backup command while the server is running:

```bash
sqlite3 data/portfolio.db ".backup 'backup/portfolio-$(date +%F).db'"
tar -czf "backup/uploads-$(date +%F).tar.gz" data/uploads
cp data/contact-submissions.jsonl "backup/contact-submissions-$(date +%F).jsonl"
```

Restore by stopping the server, replacing the database, uploads directory, and submission log, then starting it again. Test a restore before relying on it.

**Scaling.** The content store and sessions are safe for a single Node process. The in-memory rate limiters and SQLite writes are not designed for multiple application instances. If scaling horizontally, move rate limiting to a shared store and the database to a managed server, keeping the same server-side authorization model.

## Contact form

The form posts JSON to `POST /api/contact` and never shows success before the server accepts the message.

1. Rejects non-JSON requests (`415`) and mismatched origins (`403`).
2. Applies an in-memory limit of 8 submissions per 15 minutes per IP (`429` with `Retry-After`).
3. Silently drops honeypot submissions.
4. Validates with the same Zod schema the browser uses.
5. Appends to `DATA_DIR/contact-submissions.jsonl` with mode `0600`.
6. Optionally sends an SMTP notification. Email failure does not discard the stored message.
7. Returns a reference ID used in the success state.

Read stored messages with `npm run messages`.

## SEO and crawling

- Every public route returns server-rendered primary content with a unique `<title>`, meta description, canonical URL, Open Graph/Twitter tags, robots directive, and a 404 status where appropriate.
- JSON-LD includes `Person`, `WebSite`, project `SoftwareSourceCode` and `BreadcrumbList` nodes, built only from verified content. JSON-LD is escaped before embedding.
- `sitemap.xml` contains only canonical public pages and published projects. `robots.txt` disallows `/admin` and `/api/`.
- Unknown routes and unpublished project URLs return HTTP 404 with `noindex`. Unknown pages return the styled not-found UI.
- Trailing slashes redirect permanently to the canonical path.
- Admin routes send `X-Robots-Tag: noindex` and a `noindex, follow` meta tag.
- When `SITE_URL` is missing or invalid in production, sitemap and robots return `503` and canonical tags are omitted instead of publishing incorrect URLs.

See [docs/seo-report.md](docs/seo-report.md) for the pre-change audit, the implemented fixes, the verification log, and the post-deployment Search Console/Rich Results/Lighthouse checklist.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
npm run check   # typecheck + tests + build
npm run qa      # 282 browser/API assertions against a running server (see below)
```

`npm run qa` runs the six suites in `qa/` (theme/FOUC, functional routing, admin CMS,
SEO/HTTP, axe accessibility, responsive/performance) with Playwright against a server
you point them at via `QA_BASE_URL` (default `http://127.0.0.1:3100`). Start an
isolated-instance server first — see [docs/qa-report.md](docs/qa-report.md) §K for the
exact commands — so tests never touch real data.

The suite covers contact validation and field-error mapping, rate-limit windows, HTML escaping in email, project filters/search/adjacency, content integrity, canonical-origin fail-safety, SEO metadata/JSON-LD, document rendering (including the single `data-theme` attribute), and HTTP-level security: unauthenticated access to every admin endpoint, login rate limiting, session forgery/expiry/logout, CSRF and Origin rejection, malformed and role-escalation payloads, draft isolation, publish/unpublish/slug redirects, sitemap contents, public rendering after edits, and image/PDF upload validation.

## Known limitations

1. **No verified contact links or portrait are stored in the seed.** Email, GitHub, LinkedIn, Upwork, and the additional links list are empty until the administrator sets them; the monogram plate is the portrait fallback. This avoids publishing invented identities.
2. **Project repositories are private.** No repository/demo links or production metrics are claimed.
3. **SMTP is not configured in this checkout.** The form stores submissions; email delivery needs the SMTP variables. Delivery was not tested against a live provider.
4. **SQLite and in-memory rate limiting are single-instance.** Use a persistent volume and one server process, or migrate deliberately.
5. **Uploads live on local durable storage.** Object storage with narrowly scoped credentials would be the next step for multi-instance deployments.
6. **The resume PDF is still a content snapshot.** The CMS can upload a replacement PDF, but the resume page layout itself is code.
7. **Search Console, Rich Results, social-preview validation, and Lighthouse were not run against a deployed origin.** Local HTML/metadata, status codes, sitemap contents, and browser behavior were verified; the manual post-deploy checklist is in the SEO report.
8. **No automated visual-regression or axe suite is included.** Themes were checked in a real Chromium browser at 390, 768, and 1440 px for overflow, readable tokens, persistence, and admin preview behavior.

## Project structure

```
server/            Express app, SSR renderer, admin routes, SQLite store, auth, uploads, tests
src/admin/         Lazy-loaded CMS pages, API client, fields
src/components/    Layout, theme switcher, SEO manager, cards, diagrams, contact form
src/content/       Seed profile, skills, projects; shared content types
src/lib/           Content context, theme context, SEO builder, projects, contact schema
src/pages/         Home, About, Projects, ProjectDetail, Contact, Resume, NotFound
src/styles/        Token-defined base, themes, page styles, admin, print
docs/              SEO audit and verification report
public/            Favicon, touch icon, OG image, theme bootstrap, resume PDF
```
