# Comprehensive QA & Production Readiness Audit — Akib Ahmed Portfolio

## 1. Role and mission

Act as a Senior QA Engineer, SDET, Security Tester, Accessibility Specialist, and Performance Engineer.

Perform a comprehensive quality assurance audit of my existing portfolio website.

The objective is to establish whether the application is functionally correct, secure, accessible, responsive, SEO-friendly, performant, and ready for public deployment.

Do not merely review the source code or generate a checklist. Inspect the repository, run the application, execute automated and manual tests, reproduce defects, fix confirmed problems, and verify the fixes.

Be skeptical. A successful build does not mean an application works correctly.

Never claim a test passed unless it was actually executed and its result verified.

## 2. Existing application context

Inspect the current repository before testing.

The documented architecture includes:

- React 19 + TypeScript + Vite 7.
- React Router 7.
- Express 4 with server-side rendering.
- SQLite using better-sqlite3.
- Zod validation.
- Five CSS-variable-based visual themes.
- A pre-paint theme bootstrap.
- A private, single-owner administration CMS.
- Server-managed authentication sessions.
- CSRF and Origin protection.
- Profile, skills, project, theme, and media management.
- A contact form with server-side validation, rate limiting, persistent storage, and optional SMTP delivery.
- SEO metadata, JSON-LD, sitemap.xml, and robots.txt.
- A downloadable resume.
- Vitest and existing HTTP security tests.

Treat the repository as the source of truth. If the implementation differs from this description, document the discrepancy and test what actually exists.

Do not migrate frameworks, replace the database, or rewrite major architectural components merely to simplify testing.

## 3. QA execution rules

Follow these rules throughout the audit:

1. Inspect package.json, scripts, environment requirements, routes, server middleware, database migrations, tests, CSS, SSR, and deployment configuration.
2. Establish a reproducible baseline before changing code.
3. Run the existing type-check, unit tests, integration tests, and production build.
4. Start the application in the same production mode used for deployment.
5. Use browser automation when available, preferably Playwright with Chromium.
6. Use API-level tests for server behavior and browser-level tests for real user workflows.
7. Use isolated test data and a separate test database.
8. Never run destructive tests against production data.
9. Do not use real contact recipients, live credentials, or external side effects during automated tests.
10. Record each defect with reproducible steps, expected behavior, actual behavior, severity, evidence, and affected component.
11. Fix confirmed defects, add regression tests, and rerun affected tests.
12. Keep existing functionality and design unless a change is necessary to fix a verified issue.
13. Do not weaken security controls to make tests pass.
14. Distinguish automated results, manual observations, and unverified assumptions.

## 4. Test environment and baseline

Document the environment before testing:

- Node.js and npm versions.
- Operating system.
- Browser and version.
- Environment variables required.
- Database and upload paths.
- Build and test commands.
- Whether SMTP is configured.
- Whether a persistent filesystem is available.
- Whether browser automation and accessibility tools are installed.

Use a dedicated test environment file and temporary test database.

Never print or commit secrets while collecting diagnostic information.

Execute the existing repository scripts, including the equivalent of:

- Type checking.
- Unit tests.
- Production build.
- Full project check script.

Record existing failures separately from newly introduced failures.

If a command fails, investigate the cause instead of silently skipping it.

## 5. Functional testing

### 5.1 Navigation and routing

Test all public routes:

- `/`
- `/about`
- `/projects`
- `/projects/:slug`
- `/contact`
- `/resume`

Also test:

- Unknown routes.
- Missing project slugs.
- Invalid query parameters.
- Project category filters.
- Project search.
- Browser Back and Forward.
- Direct URL entry.
- Refreshing a nested route.
- Opening a route in a new tab.
- Internal and external links.
- Trailing-slash redirects.
- Query parameter preservation.
- Navigation after content changes.

Verify that:

- Every route displays the correct page.
- No route displays stale content from a previous page.
- Browser history behaves correctly.
- Direct navigation works in production.
- Unknown pages return HTTP 404 rather than a soft 200.
- Published slug changes redirect correctly where supported.
- Unpublished projects cannot be accessed through public routes.

### 5.2 Home page

Verify:

- Hero heading and introduction.
- Profile image or fallback.
- Skills and capabilities.
- Featured projects.
- Project links.
- Availability indicator.
- Hire Me calls to action.
- Social links.
- Footer and navigation.
- Responsive content order.

Test missing or optional content. Empty email addresses, social links, portraits, and project URLs must not generate broken links or misleading interface elements.

### 5.3 About page

Verify biography, capabilities, education, engineering workflow, contact links, and resume links.

Check that content comes from the current published profile rather than hardcoded stale copies.

### 5.4 Projects and case studies

Test:

- Search.
- Category filtering.
- Filter combinations.
- Empty results.
- Resetting filters.
- Deep links containing filter state.
- Project detail navigation.
- Related projects.
- Previous/next navigation.
- Table of contents.
- Architecture diagrams.
- Technology labels.
- Project images.
- Repository and demo links.
- Featured ordering.
- Published and unpublished states.
- Slug changes.
- Deletion and redirects.

Verify that unpublished project content never appears in public HTML, public APIs, metadata, or sitemap.xml.

### 5.5 Contact page

Test:

- Empty form submission.
- Valid submission.
- Invalid email addresses.
- Missing required fields.
- Whitespace-only fields.
- Overlong input.
- Unicode and punctuation.
- HTML-like input.
- Rapid repeated submissions.
- Honeypot submission.
- Invalid content type.
- Malformed JSON.
- Invalid Origin.
- Server errors.
- Storage failures.
- SMTP failures.
- Successful storage without SMTP.
- Keyboard-only interaction.
- Error and success announcements.

Verify that success is shown only after the server confirms acceptance.

Ensure failed email delivery does not falsely imply the message was lost if it was stored successfully.

Check that private message contents and stored submissions are never returned through public endpoints.

### 5.6 Resume

Verify:

- The resume route loads directly.
- The PDF downloads successfully.
- The PDF opens and contains readable text.
- The document uses an appropriate A4 layout.
- Print mode removes navigation and interactive controls.
- The resume link is correct.
- PDF replacement behaves as documented.
- The PDF does not expose unexpected private information.

Report any mismatch between the editable profile and the static PDF snapshot.

## 6. Theme system and FOUC testing

Test all five themes:

1. Amber Minimal.
2. Graphite Terminal.
3. Swiss Editorial.
4. Warm Bento.
5. Forest & Sand.

### Theme behavior

For every theme, verify:

- Selection.
- Immediate visual update.
- Persistence across reloads.
- Persistence across route changes.
- Behavior in a new tab.
- Behavior after clearing localStorage.
- Invalid saved theme values.
- Missing localStorage or storage-access exceptions.
- Administrator default theme changes.
- Visitor-specific theme preference precedence.
- Administrator preview without accidentally changing visitor preferences.

### Flash of Unstyled Content

Explicitly investigate FOUC and incorrect-theme flashes.

Run these scenarios:

- First visit with empty browser storage.
- Returning visitor with each saved theme.
- Hard reload with cache disabled.
- Slow network.
- Slow JavaScript loading.
- Slow font loading.
- Direct navigation to nested routes.
- Production build served through Express.
- Browser navigation between routes.
- JavaScript disabled, where applicable.

Use browser automation and performance traces to observe the page before hydration and after hydration.

Inspect:

- Initial HTML response.
- CSS loading and ordering.
- Theme bootstrap execution.
- `data-theme` on the HTML element.
- Theme provider initialization.
- Hydration warnings.
- Font swapping.
- Layout shifts.
- Console errors.
- CSP violations.

Acceptance criteria:

- No visible unstyled page before the intended design appears.
- No visible flash of Amber Minimal when a different saved theme should be applied.
- No unnecessary blank screen while waiting for JavaScript.
- No hydration mismatch caused by theme selection.
- No theme regression after navigation or reload.

Do not use arbitrary delays, permanently hidden content, or loading animations to mask FOUC.

### Theme visual consistency

Check contrast, borders, buttons, cards, forms, code blocks, diagrams, navigation, and error states in every theme.

Verify that all shared components use theme tokens rather than hardcoded colors that break in alternate themes.

## 7. Responsive and cross-browser testing

Test at these viewport widths:

- 320 px.
- 360 px.
- 390 px.
- 430 px.
- 768 px.
- 834 px.
- 1024 px.
- 1280 px.
- 1440 px.
- 1920 px.

Check:

- Horizontal overflow.
- Clipped text.
- Broken grids.
- Header wrapping.
- Mobile navigation.
- Touch target size.
- Modal or menu positioning.
- Long project titles.
- Large images.
- Contact form usability.
- Resume printing.
- Text scaling.
- Portrait layout.
- Footer behavior.

Use representative browsers where available:

- Chromium-based browsers.
- Firefox.
- WebKit/Safari engine.

Test actual mobile browsers or device emulation where supported.

Do not claim cross-browser coverage if only Chromium was tested.

## 8. Admin CMS end-to-end testing

Use a dedicated test administrator account.

### Authentication

Test:

- Valid login.
- Invalid password.
- Unknown email.
- Missing fields.
- Malformed requests.
- Login rate limiting.
- Session creation.
- Session expiration.
- Logout.
- Expired sessions.
- Forged cookies.
- Session fixation attempts.
- Cookie flags.
- Direct access to protected pages.
- CSRF token failures.
- Origin mismatches.

Verify that public registration is unavailable.

### Profile editor

Test editing and saving:

- Name.
- Headline.
- Biography.
- Roles.
- Skills summaries.
- Location and time zone.
- Availability.
- Education.
- Email.
- Social links.
- Portrait.
- Resume path.

Verify server-side validation, cancel behavior, persistence after refresh, and public rendering after publication.

### Project editor

Test:

- Creating a project.
- Editing a project.
- Draft saving.
- Previewing.
- Publishing.
- Unpublishing.
- Featuring and reordering.
- Changing slugs.
- Updating external links.
- Deleting projects.
- Validation failures.
- Duplicate slugs.
- Unauthorized modifications.

Ensure drafts are private until published.

### Media uploads

Test:

- Valid JPEG, PNG, and WebP images.
- Valid PDF uploads where supported.
- Oversized files.
- Empty files.
- Incorrect extensions.
- Incorrect MIME types.
- Spoofed file signatures.
- Malformed image files.
- SVG uploads.
- Path traversal filenames.
- Double extensions.
- Unicode filenames.
- Duplicate uploads.
- Unauthorized uploads.
- Missing upload directories.
- Storage failures.

Verify generated filenames, size restrictions, file signature validation, and safe file serving.

Ensure uploaded files cannot overwrite application code, environment files, database files, or arbitrary server paths.

### Appearance and settings

Verify that:

- Only the authenticated administrator can change the site-wide default theme.
- Visitor theme preferences remain separate.
- Default theme changes persist.
- Theme preview does not publish changes prematurely.
- Configuration remains valid after restart.
- Settings do not leak secrets.

### Audit trail

Verify that privileged actions are recorded with the correct administrator, action, entity, and timestamp.

Ensure logs never include passwords, session tokens, or secrets.

## 9. Authorization and API security

Test every endpoint in the actual Express application.

Build an inventory of all API routes and their required authorization.

For each private route, attempt access using:

- No session.
- Invalid session.
- Expired session.
- Forged session.
- Missing CSRF token.
- Invalid CSRF token.
- Invalid Origin.
- Malformed JSON.
- Unexpected fields.
- Oversized payloads.
- Altered record IDs.
- Attempted role escalation.
- Direct API requests bypassing the frontend.

Verify that server-side middleware rejects unauthorized requests.

Check for:

- Broken object-level authorization.
- Insecure direct object references.
- Mass assignment.
- Path traversal.
- Stored cross-site scripting.
- Reflected cross-site scripting.
- Open redirects.
- SQL injection.
- Cross-site request forgery.
- Unsafe file uploads.
- Sensitive information exposure.
- Inadequate rate limiting.
- Incorrect security headers.
- Overly permissive CORS.
- Server-side request forgery risks if URL fetching exists.
- Dependency vulnerabilities.

Use safe, non-destructive tests against the isolated test environment.

Do not perform denial-of-service testing or attack unrelated external services.

### Security headers

Verify the deployed or production-mode response headers, including:

- Content-Security-Policy.
- Strict-Transport-Security when HTTPS is correctly configured.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.
- Frame denial or equivalent clickjacking protection.

Check for conflicts between the CSP and SSR scripts, styles, fonts, and theme bootstrap.

Do not weaken the CSP without documenting the necessity and risk.

## 10. Database and persistence testing

Use a disposable database.

Verify:

- Initial database creation.
- Seed data.
- Migration execution.
- Repeated startup.
- Existing data preservation.
- Invalid database paths.
- Read/write failures.
- Concurrent requests.
- Transaction rollback.
- Duplicate records.
- Unique slug enforcement.
- Draft/published isolation.
- Content persistence after server restart.
- Uploaded media persistence.
- Contact message persistence.
- Audit record persistence.

Test the documented deployment assumption that the database and upload directory live on persistent storage.

Verify that ordinary content edits survive restart and rebuild.

Never run destructive migration or reset tests against the real production database.

## 11. SEO testing

Inspect actual HTTP responses, not only React components or source code.

For every public route, verify:

- Correct HTTP status.
- Unique title.
- Useful meta description.
- Canonical URL.
- Open Graph metadata.
- Twitter/X card metadata.
- Robots directives.
- Primary page content in initial HTML.
- Correct heading structure.
- Internal links.
- Image alt text.
- Appropriate structured data.

Test:

- `/sitemap.xml`.
- `/robots.txt`.
- Unknown URLs.
- Unpublished projects.
- Changed project slugs.
- Missing or invalid `SITE_URL`.
- Trailing-slash redirects.
- Canonical host consistency.
- Duplicate metadata.
- Broken canonical links.
- JSON-LD validity.
- Admin noindex behavior.

Confirm that the sitemap contains only canonical, published public pages.

Confirm that admin pages, API endpoints, and drafts are not exposed as indexable content.

Distinguish between robots.txt crawl restrictions and actual access control. Robots directives are not security controls.

Where external validation tools are unavailable, record the check as unverified rather than passed.

## 12. Accessibility testing

Target WCAG 2.2 AA where applicable.

Test:

- Semantic landmarks.
- One clear primary heading per page.
- Heading hierarchy.
- Keyboard navigation.
- Visible focus.
- Skip link.
- Keyboard-operable menus.
- Theme selector accessibility.
- Form labels and errors.
- Screen-reader announcements.
- Color contrast in all themes.
- Image alternative text.
- Link names.
- Touch targets.
- Zoom and text scaling.
- Reduced-motion preferences.
- Focus management after errors and successful submissions.
- Accessible 404 page.
- Admin interface accessibility.

Run automated accessibility scans with axe or an equivalent tool where available.

Automated scans are not sufficient by themselves. Manually test critical keyboard and form workflows.

Record the tool, scope, and results.

## 13. Performance and Core Web Vitals

Test the production build under realistic network and CPU conditions.

Measure:

- Largest Contentful Paint (LCP).
- Cumulative Layout Shift (CLS).
- Interaction to Next Paint (INP), where measurable.
- First Contentful Paint (FCP).
- Total Blocking Time (TBT) in laboratory testing.
- JavaScript and CSS transfer size.
- Font transfer size.
- Image sizes.
- Request count.
- API latency.
- Server response time.

Use these web performance targets as goals:

- LCP: 2.5 seconds or less.
- CLS: 0.1 or less.
- INP: 200 ms or less.

Distinguish lab results from real-user field data. Do not claim field Core Web Vitals results without real-user data.

Inspect:

- Unnecessary JavaScript.
- Duplicate dependencies.
- Render-blocking resources.
- Font preload strategy.
- Image dimensions and formats.
- Caching headers.
- Compression.
- SSR response size.
- Expensive React rendering.
- Excessive network requests.
- Layout shifts during hydration.

Optimize only where measurements or reproducible defects justify changes.

## 14. Reliability and error handling

Test:

- Server startup.
- Missing required environment variables.
- Invalid configuration.
- Database unavailable.
- Upload directory unavailable.
- SMTP unavailable.
- SMTP timeout.
- Malformed API requests.
- Unhandled exceptions.
- Invalid routes.
- Empty content.
- Missing images.
- Corrupt stored content.
- Unexpected upstream failures.

Verify that errors are handled gracefully without exposing stack traces, secrets, session data, or internal file paths to public visitors.

Confirm that health-check responses accurately represent application readiness.

Ensure the server shuts down cleanly and handles persistent resources correctly.

## 15. Browser console and network audit

For every critical workflow:

- Capture browser console errors and warnings.
- Capture failed HTTP requests.
- Identify missing assets.
- Identify CSP violations.
- Identify hydration warnings.
- Identify React key warnings.
- Identify broken images and fonts.
- Identify unexpected redirects.
- Identify failed API requests.
- Check for unhandled promise rejections.

Separate pre-existing warnings from newly introduced ones.

No critical workflow should have unexplained console errors or failed required requests.

## 16. Test automation strategy

Build or extend an appropriate automated suite.

Use:

- Vitest for unit tests.
- React Testing Library for component tests.
- API integration tests for Express endpoints.
- Playwright for end-to-end browser tests.
- axe for automated accessibility checks when available.

Prioritize reusable test fixtures, deterministic test data, isolated sessions, and reliable cleanup.

Organize tests into:

1. Unit tests.
2. Component tests.
3. API integration tests.
4. Security tests.
5. End-to-end tests.
6. Accessibility tests.
7. Performance checks.
8. Production smoke tests.

Add regression tests for every defect fixed during the audit.

Avoid tests that pass only because they mock the behavior under investigation.

## 17. Defect classification

Assign each finding a severity:

- **P0 — Critical:** Unauthorized access to admin functions, severe data exposure, or a major security compromise.
- **P1 — High:** Core functionality broken, data loss, authentication failure, or serious production defect.
- **P2 — Medium:** Significant usability, accessibility, SEO, compatibility, or non-critical functional defect.
- **P3 — Low:** Minor visual inconsistencies, small polish issues, or low-impact defects.

For every defect, record:

- Unique ID.
- Severity.
- Title.
- Affected route/component.
- Preconditions.
- Reproduction steps.
- Expected result.
- Actual result.
- Evidence or logs.
- Root cause.
- Fix applied.
- Regression test.
- Verification status.

Do not downgrade security findings merely because the public UI appears correct.

## 18. Required final deliverables

Create a QA report in the repository, for example `docs/qa-report.md`.

Include:

### A. Executive summary
Overall readiness and the most important risks.

### B. Environment and scope
Versions, configurations, browsers, and routes tested.

### C. Test execution matrix
For each test category, show:
- Total tests.
- Passed.
- Failed.
- Blocked.
- Not run.

Do not count skipped tests as passed.

### D. Defect register
All findings with severity and reproducible evidence.

### E. Fixes applied
Files changed, root causes, and regression coverage.

### F. Security assessment
Authentication, authorization, uploads, API protection, sessions, and data handling.

### G. SEO and accessibility assessment
Verified results and unresolved issues.

### H. Performance assessment
Measurements, environment, bottlenecks, and improvements.

### I. Production readiness checklist
Separate mandatory release blockers from recommended improvements.

### J. Remaining risks
Explicitly identify untested areas, missing services, unavailable tooling, and assumptions.

### K. Commands and reproduction instructions
Document commands to run the checks again.

## 19. Execution order

Follow this order:

Phase 1: Repository inspection and baseline tests.

Phase 2: Production build and local deployment.

Phase 3: Functional and routing tests.

Phase 4: Theme, FOUC, SSR, and hydration tests.

Phase 5: Admin CMS and authorization tests.

Phase 6: Contact API, database, and upload tests.

Phase 7: SEO and accessibility checks.

Phase 8: Responsive, browser, and performance testing.

Phase 9: Fix confirmed defects and add regression tests.

Phase 10: Rerun the relevant suites and full quality checks.

Phase 11: Produce the final QA report and release recommendation.

Do not stop after producing the report. Fix confirmed issues where safe and practical. If a fix requires unavailable credentials, infrastructure, or a potentially destructive decision, document the blocker and request the necessary input.

## 20. Final release decision

End the report with exactly one recommendation:

- **GO:** No known release-blocking defects remain, and required checks have passed.
- **CONDITIONAL GO:** The application is usable, but explicitly documented non-critical issues or environmental limitations remain.
- **NO-GO:** Critical security, data-integrity, core functionality, or release-blocking defects remain.

Explain the evidence behind the decision.

Never declare the site production-ready solely because the type-check, test suite, and build pass.

The objective is to verify that the actual deployed application behaves correctly under realistic conditions and protects its administrator and data.

Start by inspecting the repository and running the baseline checks. Do not change code until you understand the current state.