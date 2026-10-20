import { describe, expect, it } from 'vitest';
import { adjacentProjects, filterProjects, getProject } from '@/lib/projects';
import { projects } from './projects';

describe('project content', () => {
  it('has unique slugs and complete case studies', () => {
    const slugs = projects.map((project) => project.slug);
    expect(new Set(slugs).size).toBe(projects.length);
    for (const project of projects) {
      expect(project.sections.length).toBeGreaterThanOrEqual(8);
      expect(new Set(project.sections.map((section) => section.id)).size).toBe(
        project.sections.length,
      );
      expect(project.summary.length).toBeGreaterThan(40);
      expect(project.evidenceNote.length).toBeGreaterThan(40);
    }
  });

  it('features exactly three projects for the home page', () => {
    expect(projects.filter((project) => project.featured)).toHaveLength(3);
  });

  it('only allows absolute https URLs for public links', () => {
    for (const project of projects) {
      for (const link of [project.links.repo, project.links.live]) {
        if (link !== null) expect(link).toMatch(/^https:\/\//);
      }
    }
  });

  it('ships every seed project as published', () => {
    for (const project of projects) {
      expect(project.status).toBe('published');
    }
  });
});

describe('filterProjects', () => {
  it('returns everything for the All filter', () => {
    expect(filterProjects(projects, 'All')).toHaveLength(projects.length);
  });

  it('matches a secondary category', () => {
    const devops = filterProjects(projects, 'DevOps');
    expect(devops.map((project) => project.slug)).toContain('cicd-test-automation-lab');
    expect(devops).toHaveLength(1);
  });

  it('matches QA projects across more than one case study', () => {
    expect(filterProjects(projects, 'QA / Automation').length).toBeGreaterThan(1);
  });

  it('searches stack, focus, and summary', () => {
    expect(filterProjects(projects, 'All', 'FastAPI')[0]?.slug).toBe(
      'financial-research-settlement-agent',
    );
    expect(filterProjects(projects, 'All', 'postgres')[0]?.slug).toBe(
      'full-stack-learning-platform',
    );
    expect(filterProjects(projects, 'All', 'not-a-real-term')).toHaveLength(0);
  });

  it('combines filter and search', () => {
    expect(filterProjects(projects, 'Backend', 'learning platform')).toHaveLength(1);
    expect(filterProjects(projects, 'DevOps', 'postgres')).toHaveLength(0);
  });
});

describe('getProject and adjacentProjects', () => {
  it('finds a project by slug', () => {
    expect(getProject(projects, 'cicd-test-automation-lab')?.category).toBe('DevOps');
    expect(getProject(projects, 'unknown')).toBeUndefined();
  });

  it('wraps around at both ends', () => {
    const first = adjacentProjects(projects, projects[0].slug);
    expect(first?.previous.slug).toBe(projects[projects.length - 1].slug);
    expect(first?.next.slug).toBe(projects[1].slug);

    const last = adjacentProjects(projects, projects[projects.length - 1].slug);
    expect(last?.next.slug).toBe(projects[0].slug);
  });

  it('returns null when there is nothing to navigate to', () => {
    expect(adjacentProjects([], 'anything')).toBeNull();
  });
});
