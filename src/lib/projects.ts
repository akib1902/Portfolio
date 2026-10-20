import type { Project, ProjectFilter } from '@/content/types';

/** Returns the project with a matching slug, if it exists. */
export function getProject(items: Project[], slug: string): Project | undefined {
  return items.find((project) => project.slug === slug);
}

/** Filters by discipline and by a free-text query over the searchable fields. */
export function filterProjects(
  items: Project[],
  filter: ProjectFilter,
  query = '',
): Project[] {
  const normalisedQuery = query.trim().toLowerCase();
  return items.filter((project) => {
    const matchesFilter = filter === 'All' || project.categories.includes(filter);
    if (!matchesFilter) return false;
    if (!normalisedQuery) return true;
    const haystack = [
      project.title,
      project.summary,
      project.focus,
      ...project.stack,
      ...project.categories,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalisedQuery);
  });
}

/** Previous and next project in display order, or null when there is only one. */
export function adjacentProjects(
  items: Project[],
  slug: string,
): { previous: Project; next: Project } | null {
  if (items.length < 2) return null;
  const index = items.findIndex((project) => project.slug === slug);
  const safeIndex = index === -1 ? 0 : index;
  return {
    previous: items[(safeIndex - 1 + items.length) % items.length],
    next: items[(safeIndex + 1) % items.length],
  };
}

/** Projects that share at least one category, excluding the current project. */
export function relatedProjects(items: Project[], current: Project, limit = 2): Project[] {
  return items
    .filter(
      (project) =>
        project.slug !== current.slug &&
        project.categories.some((category) => current.categories.includes(category)),
    )
    .slice(0, limit);
}
