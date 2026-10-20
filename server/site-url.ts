export interface SiteUrlResult {
  url: string | null;
  problem: string | null;
}

/**
 * Resolves the canonical public origin.
 *
 * Production never guesses: an absent or malformed SITE_URL leaves the origin
 * unset so sitemap/robots requests can fail closed instead of publishing wrong
 * URLs. Local development falls back to the request origin so previews work.
 */
export function resolveSiteUrl(
  raw: string | undefined,
  options: { isProduction: boolean; requestOrigin?: string },
): SiteUrlResult {
  const value = raw?.trim();
  if (!value) {
    if (options.isProduction) {
      return { url: null, problem: 'SITE_URL is not configured.' };
    }
    return { url: options.requestOrigin ?? null, problem: null };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { url: null, problem: 'SITE_URL must use http or https.' };
    }
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      return { url: null, problem: 'SITE_URL must be an origin without a path.' };
    }
    if (parsed.search || parsed.hash) {
      return { url: null, problem: 'SITE_URL must not contain a query or fragment.' };
    }
    return { url: `${parsed.protocol}//${parsed.host}`, problem: null };
  } catch {
    return { url: null, problem: 'SITE_URL is not a valid URL.' };
  }
}

export function requestOrigin(protocol: string, host: string | undefined): string {
  return `${protocol}://${host ?? 'localhost'}`;
}
