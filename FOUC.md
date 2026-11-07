# Debug and Eliminate Flash of Unstyled Content (FOUC)

## Context

I have an existing production-oriented portfolio website for Akib Ahmed.

Current stack:
- React 19 + TypeScript + Vite 7
- React Router 7
- Express 4 with server-side rendering
- SQLite-backed content management system
- Five themes implemented with CSS custom properties
- A `/theme-init.js` script that applies the visitor's saved theme before first paint
- Self-hosted fonts: Inter, Anton, JetBrains Mono, and Newsreader

The default theme is Amber Minimal. Visitors can select other themes, and their preference is stored in localStorage under `akib-portfolio-theme`. The server renders the administrator-configured default theme on the HTML element.

**Problem:** The transformed site still experiences Flash of Unstyled Content (FOUC). The page appears briefly unstyled, incorrectly themed, or visually different before settling into its final appearance.

Your task is to investigate the actual cause and fix it at the architectural level, not hide it with arbitrary delays or animations.

## Phase 1: Reproduce and diagnose

Before changing code, inspect the existing repository and trace the complete initial page-rendering sequence.

Inspect:
- `server/` SSR implementation and HTML template.
- `public/theme-init.js`.
- Theme definitions in `src/styles/themes.css`.
- Global styles, page styles, and CSS imports.
- CSS bundling and production asset paths.
- Font declarations and `@font-face` configuration.
- The HTML document's `<head>` ordering.
- Theme context/provider initialization.
- React hydration and any post-hydration effects.
- Content and theme initialization from the server.
- CSP headers and any blocked scripts or styles.
- Development versus production behavior.

Reproduce the issue using the actual production build, not only the development server.

Use browser DevTools or browser automation if available. Test:
1. A fresh browser session with no saved theme.
2. A returning visitor with Amber Minimal selected.
3. A returning visitor with each alternative theme selected.
4. A throttled network connection.
5. A hard reload with cache disabled.
6. Direct navigation to `/`, `/about`, `/projects`, `/projects/:slug`, `/contact`, and `/resume`.
7. Navigation between routes without a full page reload.
8. A logged-in administrator and the admin login page.

Identify the first incorrect visual state and the resource, script, or rendering event that causes it.

Distinguish among:
- Flash of unstyled content caused by missing or delayed CSS.
- Flash of incorrect theme caused by theme initialization timing.
- Flash of unstyled text caused by font loading.
- Layout shift caused by images or fonts.
- Hydration mismatch or client-side content replacement.
- A CSS file or bootstrap script failing to load.
- A mismatch between server-rendered and client-rendered theme or content.

Record the actual root cause before implementing the fix.

## Phase 2: Fix theme initialization

Ensure the correct theme is applied before the browser paints the page whenever technically possible.

Requirements:
- Keep the current theme architecture unless there is a demonstrated reason to change it.
- Load a small, reliable theme bootstrap script early in the document head.
- Ensure the bootstrap executes before theme-dependent content is displayed.
- Keep the script compatible with the existing Content Security Policy.
- Avoid introducing inline scripts that violate the current CSP.
- If necessary, use a correctly configured external script or an appropriate CSP nonce/hash strategy.
- Validate saved theme values against the supported theme list.
- Fall back safely to the server-configured default when the stored value is missing, invalid, or unavailable.
- Never allow an invalid localStorage value to break page rendering.
- Avoid delaying page rendering until JavaScript finishes loading.
- Prevent the theme provider from briefly resetting the theme to Amber Minimal after the bootstrap has selected another theme.
- Ensure the client hydrates using the same initial theme state represented by the server-rendered document.
- Avoid hydration warnings and avoid rendering a second, visually different version of the page.

Be explicit about the precedence rules for the visitor's saved preference versus the administrator-configured default.

If a saved preference differs from the server-rendered default, prevent a visible incorrect-theme flash without introducing a blank page or unnecessarily hiding the content.

Do not use `setTimeout`, arbitrary loading delays, or permanent opacity tricks as a substitute for fixing the cause.

## Phase 3: Eliminate CSS-related FOUC

Ensure critical styling is available when the initial HTML is rendered.

Inspect the production HTML and generated asset references.

Requirements:
- Verify that the production CSS bundle is linked correctly in the document head.
- Ensure global styles and theme variables are loaded before the first meaningful paint.
- Verify CSS assets return successful HTTP responses.
- Fix incorrect asset paths, import ordering, or CSS code-splitting issues if they are contributing to the problem.
- Ensure essential page layout and typography do not depend on JavaScript executing after the page becomes visible.
- Avoid adding a second copy of the entire stylesheet to the HTML.
- Keep CSS bundles efficient and avoid unnecessarily blocking resources.
- Preserve the existing design across all five themes.

If critical CSS extraction or inlining is genuinely required, implement it carefully and keep it synchronized with the source styles. Do not create a separate, outdated set of hardcoded theme rules.

## Phase 4: Eliminate font and image layout shifts

Investigate font loading separately from CSS loading.

Requirements:
- Verify the self-hosted font URLs and production responses.
- Use appropriate `font-display` settings.
- Preload only essential fonts used above the fold, with correct URLs, font formats, and cross-origin attributes where applicable.
- Avoid preloading every font weight or font family.
- Choose reasonable fallback fonts that minimize visual differences.
- Use appropriate image dimensions or aspect ratios to reserve space before images load.
- Prevent portrait and project imagery from shifting nearby content.
- Keep the design readable when custom fonts are temporarily unavailable.

Do not claim that font-loading changes alone fix a CSS-related FOUC.

## Phase 5: Verify SSR and hydration consistency

Check that server and browser agree on:
- Initial theme.
- Initial public content.
- Route-specific metadata.
- Project visibility.
- Layout-affecting configuration.

Avoid browser-only state that changes the rendered structure before hydration without a deliberate strategy.

Ensure:
- No hydration mismatch warnings.
- No duplicate content rendering.
- No brief replacement of the server-rendered page with a loading screen.
- No unnecessary full-page re-render after initialization.
- No regression in the private CMS or its authentication.

Preserve server-side authorization and ensure unpublished content remains private.

## Phase 6: Automated regression tests

Add or update tests for:
- Theme bootstrap execution and invalid saved values.
- Theme precedence and fallback behavior.
- Correct theme on the initial document.
- SSR and client hydration consistency.
- Production CSS and JavaScript asset loading.
- All five themes.
- Direct navigation to every public route.
- Theme persistence across refreshes.
- Admin theme preview behavior.
- CSP compatibility.

If browser automation is available, add a visual regression or first-paint test that captures the page before and after JavaScript hydration.

Use throttled network conditions to reproduce delayed CSS, font, and script loading.

Measure layout shifts and record browser console errors.

Do not rely only on tests that inspect the final DOM after the page has settled.

## Phase 7: Acceptance criteria

The task is complete only when:

1. The root cause of FOUC has been identified and documented.
2. The initial page is styled correctly from the first meaningful paint.
3. The correct saved visitor theme appears without a visible flash of the default theme.
4. Amber Minimal remains the fallback for new visitors unless the administrator changes the default.
5. All alternative themes work on initial load and subsequent navigation.
6. No theme-dependent CSS is missing during initial rendering.
7. Font and image loading do not cause avoidable layout shifts.
8. SSR and hydration produce no relevant warnings or visual replacement.
9. The existing CSP remains effective.
10. Public content, admin authentication, SEO metadata, and responsive layouts continue working.
11. The production build and relevant tests pass.

At completion, report:
- The verified root cause.
- The exact files changed.
- The technical fix and why it works.
- Before-and-after observations.
- Browser tests performed and their actual results.
- Any remaining limitations.

Do not claim the FOUC is fixed unless it has been reproduced, corrected, and verified in the production build.

**Priority:** Fix the underlying rendering sequence. Do not mask the issue with delays, arbitrary animations, or hiding the page until JavaScript loads.