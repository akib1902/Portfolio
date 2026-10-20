import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent } from '@/lib/content';
import { buildSeo, escapeJsonLd } from '@/lib/seo';

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Keeps <head> in sync during client-side navigation. The server writes the
 * same tags into the initial HTML so crawlers do not need JavaScript.
 */
export function SeoManager() {
  const content = useContent();
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = buildSeo(pathname, content);
    const image = seo.image;

    document.title = seo.title;
    setMeta('name', 'description', seo.description);
    setMeta('name', 'robots', seo.noindex ? 'noindex, follow' : 'index, follow');
    setMeta('property', 'og:type', seo.type);
    setMeta('property', 'og:site_name', content.profile.name);
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    if (seo.canonical) setMeta('property', 'og:url', seo.canonical);
    if (image) {
      setMeta('property', 'og:image', image);
      setMeta('property', 'og:image:alt', seo.imageAlt);
      setMeta('name', 'twitter:image', image);
    }
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', seo.title);
    setMeta('name', 'twitter:description', seo.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (seo.canonical) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = seo.canonical;
    } else if (canonical) {
      canonical.remove();
    }

    let jsonLd = document.getElementById('seo-jsonld');
    if (seo.jsonLd.length > 0) {
      if (!jsonLd) {
        jsonLd = document.createElement('script');
        jsonLd.id = 'seo-jsonld';
        (jsonLd as HTMLScriptElement).type = 'application/ld+json';
        document.head.appendChild(jsonLd);
      }
      jsonLd.textContent = escapeJsonLd({
        '@context': 'https://schema.org',
        '@graph': seo.jsonLd,
      });
    } else if (jsonLd) {
      jsonLd.remove();
    }
  }, [pathname, content]);

  return null;
}
