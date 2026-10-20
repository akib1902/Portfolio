# Portfolio Upgrade: SEO, Theme System, and Secure Admin CMS

## Project Context

You are working on the existing portfolio website for Akib Ahmed.

The current stack, according to the repository README, is:

- React 19
- TypeScript
- Vite 7
- React Router 7
- Express 4
- Zod 4
- Nodemailer
- Vitest

Before making changes, inspect the complete repository, package.json, source files, server routes, tests, and deployment configuration.

**Do not rebuild the application from scratch or migrate frameworks unnecessarily.** Extend the existing architecture and preserve all working pages, project case studies, contact functionality, accessibility features, and security headers.

Implement the following three workstreams.

# Workstream 1: Production SEO

## 1. Audit the current implementation

Inspect every public route:

- /
- /about
- /projects
- /projects/:slug
- /contact
- /resume
- /sitemap.xml
- /robots.txt
- Not-found routes

Verify the actual HTTP response and initial HTML for every route. Do not assume that a React metadata hook guarantees that search engines receive the correct metadata.

Check:
- HTTP status codes.
- Initial HTML content.
- Page titles and meta descriptions.
- Canonical URLs.
- Robots directives.
- Open Graph and social-sharing metadata.
- Structured data.
- Internal links.
- Sitemap accuracy.
- Mobile rendering.
- Broken links and images.
- Duplicate content.
- Indexability of project details.
- Production security headers and content-security-policy compatibility.

Produce a short audit report before implementing changes.

## 2. Rendering and crawlability

The existing site uses Vite and React Router.

Determine whether important page content and metadata are available in the initial server response.

If the application currently relies entirely on client-side rendering, implement an appropriate prerendering or server-rendering strategy for public pages, particularly project case studies.

Requirements:
- Preserve the existing React and TypeScript architecture wherever practical.
- Ensure each public route has its own meaningful HTML title, description, canonical URL, and primary content.
- Ensure project details are discoverable without requiring users to navigate from the home page.
- Avoid serving the same metadata and content shell for every route.
- Preserve working browser navigation, query parameters, filters, and deep links.
- Ensure unknown routes return an actual HTTP 404.
- Ensure the admin interface and private API responses are never included in public prerendered content.

Do not claim SEO improvements solely because metadata appears in the browser after JavaScript executes.

## 3. Metadata and technical SEO

Implement or verify:

- Unique, descriptive titles and meta descriptions for all public pages.
- Canonical URLs using the configured production origin.
- Open Graph title, description, URL, type, and image metadata.
- Twitter/X card metadata.
- A suitable default social-sharing image and page-specific project images where available.
- Correct robots.txt behavior.
- An accurate sitemap.xml containing only canonical, publicly indexable URLs.
- A favicon and appropriate touch icons.
- Descriptive image alt text.
- Semantic HTML and a logical heading hierarchy.
- Crawlable internal links between related projects and pages.
- Appropriate noindex behavior for private and not-found pages.
- Correct redirect and trailing-slash behavior, if applicable.
- A sensible 404 page with working navigation.

Never include admin routes, authentication endpoints, private files, or unpublished content in the sitemap.

Use the configured SITE_URL as the canonical production origin. Fail safely when it is missing or invalid; do not silently publish incorrect production URLs.

## 4. Structured data

Audit the existing Person JSON-LD and improve it where appropriate.

Use valid Schema.org structured data for:
- Person.
- WebSite.
- BreadcrumbList on relevant pages.
- CreativeWork or SoftwareSourceCode for project pages when the available information supports it.

Use only verified information.

Do not invent employment history, certifications, reviews, awards, client testimonials, project outcomes, or social profile URLs.

Validate structured data and escape any content inserted into JSON-LD safely.

## 5. Content and search visibility

Improve the content structure for a professional software engineer portfolio.

The portfolio covers:
- Full-stack engineering.
- DevOps and deployment automation.
- Quality assurance and test automation.
- Backend engineering and software architecture.

Use natural, descriptive headings and informative project case studies.

Each case study should explain:
- The problem.
- The solution.
- The architecture and key technical decisions.
- The implementation.
- Testing and security.
- Deployment and operational considerations.
- Verified results and lessons learned.

Do not stuff keywords into headings or repeat phrases unnaturally.

Keep existing content accurate. Use placeholders or clearly identified drafts where information is missing.

## 6. Search-engine verification

Add documented instructions for:

- Configuring Google Search Console.
- Verifying domain ownership.
- Submitting the production sitemap.
- Inspecting representative URLs.
- Checking indexing and crawl errors.
- Testing social-sharing previews.
- Validating structured data.
- Running Lighthouse and accessibility checks.

Where tooling is available, run automated checks against the built production application.

Do not claim that Google has indexed the site or that rankings have improved unless that has been independently verified.

# Workstream 2: Theme System

## 1. Theme selection

Implement a complete, reusable theme system with these themes:

1. Amber Minimal — default.
2. Graphite Terminal.
3. Swiss Editorial.
4. Warm Bento.
5. Forest & Sand.

Each theme must have a coherent visual identity, not merely a different accent color.

### Amber Minimal

- Warm ivory background.
- Charcoal typography.
- Amber accent.
- Warm white surfaces.
- Subtle borders.
- Editorial typography.
- Restrained shadows.

### Graphite Terminal

- Graphite background.
- Dark layered surfaces.
- High-contrast text.
- Restrained amber highlights.
- Technical labels and subtle grid details.

### Swiss Editorial

- Clean white or ivory surfaces.
- Black typography.
- Strict alignment.
- Generous whitespace.
- Minimal decoration.

### Warm Bento

- Warm neutral background.
- Modular cards.
- Balanced information density.
- Subtle orange or amber accents.
- Clear project and capability groupings.

### Forest & Sand

- Sand-colored backgrounds.
- Deep forest-green surfaces or accents.
- Muted brass highlights.
- Elegant typography and subtle borders.

Define centralized design tokens using CSS custom properties. All shared components must consume these tokens rather than hardcoding theme-specific colors throughout the codebase.

## 2. Theme switcher

Add an accessible theme selector to the public navigation or a compact appearance menu.

Requirements:
- Allow users to switch themes without reloading the entire page.
- Show the current theme.
- Include accessible labels and keyboard navigation.
- Support visible focus states.
- Persist the visitor's chosen theme using localStorage.
- Use Amber Minimal when no preference has been saved.
- Apply the saved theme before the main interface paints where practical to prevent a flash of the wrong theme.
- Handle invalid or unavailable stored theme values safely.
- Ensure all themes work on desktop, tablet, and mobile.
- Ensure all themes retain readable contrast and accessible interactions.
- Respect reduced-motion preferences.
- Do not let the theme switcher alter profile information or website content.

If a visitor chooses a theme, that preference should affect only their own browsing experience.

## 3. Default theme management

Allow the authenticated administrator to choose the site's default theme.

Store the default theme in persistent application configuration.

Behavior:
- New visitors receive the configured default theme.
- Existing visitors retain their saved personal preference.
- A visitor without a saved preference receives the latest administrator-selected default.
- Theme selection must not affect SEO metadata, content, page URLs, or access controls.

Keep the default theme separate from the visitor's personal theme preference.

# Workstream 3: Secure Private Admin Dashboard

## 1. Objective

Build a private content-management interface that allows Akib Ahmed to update the portfolio after deployment without editing source code or manually rebuilding the site for ordinary content changes.

The administrator must be able to manage the public profile, portrait, skills, projects, resume, contact details, and default theme.

**No anonymous visitor or other user must be able to alter portfolio content.**

Hiding an edit button or obscuring an admin URL is not security. Enforce authorization on the server for every privileged operation.

## 2. Admin routes

Add routes such as:

- /admin/login
- /admin
- /admin/profile
- /admin/projects
- /admin/skills
- /admin/appearance
- /admin/settings

These routes are for administration only.

Requirements:
- No public registration.
- No publicly accessible content-editing controls.
- No anonymous write APIs.
- No public file-upload endpoints.
- No sensitive information embedded in the frontend bundle.
- No admin routes or private content in the public sitemap.
- Apply noindex directives to admin pages.
- Require authentication and authorization on every private page and API endpoint.
- Redirect unauthenticated users to the login page.
- Return appropriate 401 or 403 responses from protected APIs.
- Do not rely on frontend route guards alone.

The existence of a login URL is acceptable. Security must come from proper authentication and server-side authorization.

## 3. Authentication and session security

Implement secure administrator authentication appropriate for a single-owner portfolio.

Use a well-maintained authentication approach compatible with the existing Express server.

Requirements:
- Provision the administrator through a secure deployment or setup process.
- Do not permit public account creation.
- Do not ship default credentials.
- Do not hardcode passwords, session secrets, or credentials.
- Store passwords using a strong, established password-hashing algorithm if password authentication is selected.
- Prefer secure, server-managed sessions.
- Use HttpOnly, Secure, and appropriate SameSite session cookies in production.
- Implement CSRF protection for state-changing requests where required by the authentication and cookie strategy.
- Validate Origin where appropriate.
- Apply rate limiting to login attempts.
- Provide a secure logout mechanism.
- Regenerate session identifiers after authentication.
- Enforce session expiration and invalidate sessions on logout.
- Avoid leaking whether an administrator account exists through detailed login errors.
- Do not store session identifiers or authentication tokens in localStorage.
- Do not expose credentials through client-side environment variables.
- Protect authentication and session secrets through the deployment platform's secret manager.

Do not introduce OAuth or a third-party authentication provider unless it materially improves the implementation and is configured securely.

## 4. Content management

Create an intuitive admin dashboard with forms and previews.

### Profile editor

Allow editing:
- Name.
- Professional headline.
- Introduction and biography.
- Role descriptions.
- Location and time zone.
- Availability status and label.
- Education details.
- Skills and capability summaries.
- GitHub, LinkedIn, Upwork, and email links.
- Resume PDF.
- Portrait image.
- Relevant social-sharing image.

Support saving, canceling, validation, and clear success/error messages.

### Portrait and media management

Allow an authenticated administrator to upload, replace, and remove the portrait.

Requirements:
- Validate file type, MIME type, extension, and file size on the server.
- Restrict uploads to appropriate image formats such as JPEG, PNG, and WebP.
- Avoid accepting SVG uploads unless a secure sanitization strategy is explicitly implemented.
- Generate safe filenames.
- Prevent path traversal and arbitrary file writes.
- Do not trust the original filename or client-provided MIME type.
- Store uploaded files in durable storage that survives deployments.
- Prefer a private or access-controlled upload process with public read access only for explicitly published assets.
- Use appropriate caching headers for published images.
- Provide a preview before publishing.
- Allow the administrator to replace an image without modifying source code.

If external object storage is used, keep its credentials server-side and configure narrowly scoped permissions.

### Project editor

Allow the administrator to:
- Create, edit, publish, unpublish, and delete projects.
- Update titles, slugs, summaries, descriptions, categories, and technologies.
- Manage project images.
- Update GitHub and live-demo links.
- Edit architecture, implementation, testing, security, deployment, and lessons-learned sections.
- Mark projects as featured.
- Set project ordering.
- Preview a project before publishing.

Validate unique slugs and safe URLs.

Unpublished projects must not appear on public pages, in public API responses, in search metadata, or in the sitemap.

When deleting or changing a published project URL, handle existing URLs and redirects appropriately.

### Skills editor

Allow the administrator to:
- Create, edit, reorder, and remove skill groups.
- Add and remove skills.
- Update descriptions and categories.
- Control which skills appear in the home-page summary.

### Appearance editor

Allow the administrator to:
- Set the default public theme.
- Preview all supported themes.
- Save the default theme.
- Preview changes before publishing.

Do not give public visitors access to administrator configuration APIs.

## 5. Persistence and production deployment

Inspect the deployment model before choosing how to persist edited content.

The current README describes an Express server and file-based contact-submission storage. A production deployment may have an ephemeral filesystem.

Do not assume that local JSON files or uploads will survive redeployment.

Use a durable persistence strategy appropriate for the deployment:
- A managed database or durable database for profile, skills, project content, and administrator settings.
- Durable object storage or a persistent disk for uploaded media.
- Versioned content changes or audit records where appropriate.

Select the simplest reliable solution that fits the current stack and deployment constraints.

If a database is added:
- Use migrations.
- Validate data at the API boundary.
- Use least-privilege credentials.
- Never expose database credentials to the browser.

Preserve the existing contact API and its security behavior.

Update deployment documentation with all required environment variables, database setup, migrations, storage configuration, backup expectations, and administrator provisioning steps.

## 6. Public/private API separation

Separate public read operations from administrator write operations.

Public visitors may retrieve only published, public-safe content.

Examples of public operations:
- Read the published profile.
- Read published skills.
- Read published projects.
- Read the public default theme.
- Retrieve explicitly published images and resume files.

Private operations must require a valid administrator session and server-side authorization:
- Update profile.
- Upload or delete media.
- Create, update, publish, or delete projects.
- Modify skills.
- Change the default theme.
- Change administrator settings.
- Access audit records.

Never accept an administrator ID, role, or ownership claim from the browser as proof of authorization.

Reject unauthorized mutations even when the API is called directly using curl, Postman, browser developer tools, or a custom script.

Do not return drafts, private project URLs, internal error details, credentials, contact submissions, or audit records through public APIs.

## 7. Content integrity and auditability

Add a simple audit trail for sensitive administrative changes.

Record:
- Administrator identity.
- Action performed.
- Affected content record.
- Timestamp.
- A safe summary of the change.

Do not log passwords, session tokens, secrets, or full authentication credentials.

Add confirmation for destructive actions and provide safe error handling.

Where practical, implement draft and publish states so that incomplete edits do not immediately overwrite public content.

Ensure that publishing a change updates public pages, metadata, and sitemap entries consistently.

## 8. Security testing

Add automated tests for:
- Unauthenticated access to every protected route.
- Unauthenticated write requests.
- Invalid and expired sessions.
- Unauthorized file uploads.
- Invalid image formats and oversized files.
- CSRF and Origin protections.
- Login rate limiting.
- Malformed profile and project payloads.
- Attempts to modify administrator roles.
- Attempts to publish unauthorized content.
- Access to unpublished projects through public endpoints.
- Attempts to modify content using direct API calls.
- Session invalidation after logout.
- Correct public rendering after legitimate edits.

Test that an anonymous user cannot alter content even when bypassing the UI entirely.

Run the existing type-check, unit tests, and production build, and add security-focused tests without removing existing coverage.

## 9. Acceptance criteria

The implementation is complete only when:

1. Public routes have correct SEO metadata and crawlable content.
2. Rendering behavior has been verified against the production build.
3. All five themes work across desktop, tablet, and mobile.
4. Visitors can change their own theme without gaining editing privileges.
5. Theme preference persists correctly.
6. The administrator can securely log in and update content.
7. The administrator can upload and replace the portrait.
8. Profile, skills, project content, and theme settings persist across deployments.
9. Unauthenticated users cannot perform any administrative mutation.
10. Drafts and unpublished projects remain private.
11. Contact functionality continues working.
12. Existing routes, resume behavior, accessibility, and security headers remain intact.
13. Automated tests, type checking, and production build pass.
14. Deployment and administrator setup instructions are documented.

After implementation, provide a concise report of:
- Files changed.
- Architectural decisions.
- Authentication and authorization design.
- Database and storage configuration.
- SEO changes and verification results.
- Tests executed and actual results.
- Required production environment variables.
- Remaining limitations.

Do not claim success for tests, deployments, indexing, or security checks that were not actually performed.

**Non-negotiable security requirement:** the public website is read-only for visitors. Only the authenticated, authorized administrator may change published content, images, project information, or site-wide settings.