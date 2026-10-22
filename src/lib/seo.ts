import type { Project, PublicContent } from '@/content/types';
import { getProject } from '@/lib/projects';

export interface SeoData {
  title: string;
  description: string;
  path: string;
  canonical: string | null;
  noindex: boolean;
  type: 'website' | 'article';
  image: string | null;
  imageAlt: string;
  jsonLd: Record<string, unknown>[];
  status: 200 | 404;
}

export function normalisePath(pathname: string): string {
  if (!pathname) return '/';
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? '/';
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function absolute(siteUrl: string | null, path: string): string | null {
  if (/^https?:\/\//i.test(path)) return path;
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

const fallbackImagePath = '/og.png';

function defaultDescription(content: PublicContent): string {
  return `${content.profile.name} is a ${content.profile.role.toLowerCase()} working across ${content.profile.disciplines.join(
    ', ',
  )}. ${content.profile.shortIntro}`;
}

function personNode(content: PublicContent): Record<string, unknown> {
  const { profile } = content;
  const siteUrl = content.site.url;
  const sameAs = [
    profile.links.github,
    profile.links.linkedin,
    profile.links.upwork,
    ...(profile.links.more ?? []).map((link) => link.href),
  ].filter((link): link is string => Boolean(link));
  const image = profile.portrait ? absolute(siteUrl, profile.portrait) : null;

  return {
    '@type': 'Person',
    '@id': siteUrl ? `${siteUrl}/#person` : undefined,
    name: profile.name,
    jobTitle: profile.role,
    description: profile.headline,
    url: siteUrl ? `${siteUrl}/` : undefined,
    ...(image ? { image } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    email: profile.email ? `mailto:${profile.email}` : undefined,
    knowsAbout: Array.from(
      new Set([...profile.disciplines, ...content.skills.groups.map((group) => group.title)]),
    ),
    address: {
      '@type': 'PostalAddress',
      addressCountry: profile.location,
    },
  };
}

function websiteNode(content: PublicContent): Record<string, unknown> {
  const siteUrl = content.site.url;
  return {
    '@type': 'WebSite',
    name: content.profile.name,
    url: siteUrl ? `${siteUrl}/` : undefined,
    description: defaultDescription(content),
    inLanguage: 'en',
    publisher: siteUrl ? { '@id': `${siteUrl}/#person` } : undefined,
  };
}

function breadcrumbNode(
  content: PublicContent,
  project: Project,
): Record<string, unknown> {
  const base = content.site.url?.replace(/\/+$/, '') ?? '';
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'Projects', item: `${base}/projects` },
      {
        '@type': 'ListItem',
        position: 3,
        name: project.shortTitle,
        item: `${base}/projects/${project.slug}`,
      },
    ],
  };
}

function projectNode(content: PublicContent, project: Project): Record<string, unknown> {
  const url = `${content.site.url?.replace(/\/+$/, '') ?? ''}/projects/${project.slug}`;
  const image = project.image ? absolute(content.site.url, project.image) : null;
  return {
    '@type': 'SoftwareSourceCode',
    name: project.title,
    description: project.summary,
    url: content.site.url ? url : undefined,
    ...(image ? { image } : {}),
    ...(project.links.repo ? { codeRepository: project.links.repo } : {}),
    keywords: [...project.stack, ...project.categories].join(', '),
    programmingLanguage: project.stack[0],
    author: content.site.url ? { '@id': `${content.site.url}/#person` } : undefined,
    creativeWorkStatus: project.statusLabel,
  };
}

/** Builds every piece of route metadata used by SSR and client navigation. */
export function buildSeo(pathname: string, content: PublicContent): SeoData {
  const path = normalisePath(pathname);
  const canonical = content.site.url ? absolute(content.site.url, path) : null;
  const fallbackImage = absolute(content.site.url, fallbackImagePath);
  const profileImage = content.profile.portrait
    ? absolute(content.site.url, content.profile.portrait)
    : null;
  const sharedImage =
    absolute(content.site.url, content.profile.shareImage ?? '') ?? fallbackImage;
  const imageAlt = `Portrait of ${content.profile.name}`;
  const base = {
    canonical,
    noindex: false,
    type: 'website' as const,
    image: profileImage ?? sharedImage,
    imageAlt,
    jsonLd: [] as Record<string, unknown>[],
  };

  if (path === '/') {
    const featured = content.projects.filter((project) => project.featured).slice(0, 3);
    return {
      ...base,
      title: `${content.profile.name} — ${content.profile.role} | Full-Stack, DevOps & QA`,
      description: content.profile.intro,
      path: '/',
      jsonLd: [
        personNode(content),
        websiteNode(content),
        ...featured.map((project) => projectNode(content, project)),
      ],
      status: 200,
    };
  }

  if (path === '/about') {
    return {
      ...base,
      title: `About ${content.profile.name} — Full-Stack, DevOps & QA Engineer`,
      description: `How ${content.profile.name} connects full-stack development, DevOps, and QA automation into one reliable delivery path. Engineering principles, technical capabilities, and education.`,
      path: '/about',
      jsonLd: [personNode(content)],
      status: 200,
    };
  }

  if (path === '/projects') {
    return {
      ...base,
      title: `Engineering case studies — ${content.profile.name}`,
      description: `Selected engineering case studies by ${content.profile.name}: ${content.projects
        .map((project) => project.shortTitle)
        .join(', ')}. Each one documents the problem, architecture, implementation, and tests.`,
      path: '/projects',
      jsonLd: [
        {
          '@type': 'CollectionPage',
          name: `Engineering case studies — ${content.profile.name}`,
          url: canonical ?? undefined,
          hasPart: content.projects.map((project) => ({
            '@type': 'SoftwareSourceCode',
            name: project.title,
            url: `${content.site.url ?? ''}/projects/${project.slug}`,
          })),
        },
      ],
      status: 200,
    };
  }

  if (path.startsWith('/projects/')) {
    const project = getProject(content.projects, decodeURIComponent(path.slice('/projects/'.length)));
    if (!project) {
      return {
        ...base,
        title: `Page not found — ${content.profile.name}`,
        description: 'The requested case study does not exist or is not published.',
        path,
        noindex: true,
        canonical: null,
        image: sharedImage,
        status: 404,
      };
    }
    return {
      ...base,
      title: `${project.shortTitle} — Case study | ${content.profile.name}`,
      description: project.summary,
      path: `/projects/${project.slug}`,
      type: 'article',
      image: project.image ? absolute(content.site.url, project.image) : sharedImage,
      imageAlt: project.image ? `${project.shortTitle} project image` : imageAlt,
      jsonLd: [projectNode(content, project), breadcrumbNode(content, project)],
      status: 200,
    };
  }

  if (path === '/contact') {
    return {
      ...base,
      title: `Contact — ${content.profile.name} | Full-Stack, DevOps & QA Engineer`,
      description: `Get in touch with ${content.profile.name} about a project, a full-time or contract role, or a technical collaboration. A working contact form with a direct email option when configured.`,
      path: '/contact',
      jsonLd: [personNode(content)],
      status: 200,
    };
  }

  if (path === '/resume') {
    return {
      ...base,
      title: `Resume — ${content.profile.name} | ${content.profile.role}`,
      description: `Print-ready resume for ${content.profile.name}, a ${content.profile.role.toLowerCase()} focused on ${content.profile.disciplines.join(', ')}.`,
      path: '/resume',
      jsonLd: [personNode(content)],
      status: 200,
    };
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    return {
      title: `Admin — ${content.profile.name}`,
      description: 'Private administration area. Not indexed.',
      path,
      canonical: null,
      noindex: true,
      type: 'website',
      image: null,
      imageAlt: '',
      jsonLd: [],
      status: 200,
    };
  }

  return {
    ...base,
    title: `Page not found — ${content.profile.name}`,
    description:
      'The page you requested does not exist. Return to the portfolio home or browse the project case studies.',
    path,
    noindex: true,
    canonical: null,
    status: 404,
  };
}

/** Escapes text before it is embedded in HTML or JSON-LD. */
export function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
