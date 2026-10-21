import { describe, expect, it } from 'vitest';
import { requestOrigin, resolveSiteUrl } from './site-url';

describe('resolveSiteUrl', () => {
  it('fails closed in production when SITE_URL is missing', () => {
    expect(resolveSiteUrl(undefined, { isProduction: true })).toEqual({
      url: null,
      problem: 'SITE_URL is not configured.',
    });
    expect(resolveSiteUrl('   ', { isProduction: true }).url).toBeNull();
  });

  it('falls back to the request origin in development', () => {
    expect(
      resolveSiteUrl(undefined, {
        isProduction: false,
        requestOrigin: 'http://127.0.0.1:3000',
      }),
    ).toEqual({ url: 'http://127.0.0.1:3000', problem: null });
  });

  it('rejects malformed or non-origin values instead of publishing them', () => {
    for (const value of [
      'not-a-url',
      'ftp://example.com',
      'https://example.com/path',
      'https://example.com/?query=1',
      'https://example.com/#hash',
    ]) {
      const result = resolveSiteUrl(value, { isProduction: true });
      expect(result.url, value).toBeNull();
      expect(result.problem, value).toBeTruthy();
    }
  });

  it('normalises a valid origin without a trailing slash', () => {
    expect(resolveSiteUrl('https://example.com/', { isProduction: true })).toEqual({
      url: 'https://example.com',
      problem: null,
    });
  });
});

describe('requestOrigin', () => {
  it('falls back to localhost when the host header is missing', () => {
    expect(requestOrigin('http', undefined)).toBe('http://localhost');
  });
});
