import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { filterProjects, projectFilters, projects } from '@/content/projects';
import type { ProjectFilter } from '@/content/projects';
import { usePageMeta } from '@/lib/use-page-meta';
import { ProjectCard } from '@/components/ProjectCard';
import { ArrowRight, ArrowUpRight } from '@/components/icons';

function isProjectFilter(value: string | null): value is ProjectFilter {
  return value !== null && (projectFilters as readonly string[]).includes(value);
}

export default function Projects() {
  usePageMeta({
    title: 'Projects — Akib Ahmed | Backend, Full-Stack, DevOps & QA',
    description:
      'Selected engineering case studies by Akib Ahmed: a financial research and settlement agent, a full-stack learning platform, and a CI/CD and test automation lab.',
    path: '/projects',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [filter, setFilter] = useState<ProjectFilter>(
    isProjectFilter(categoryParam) ? categoryParam : 'All',
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isProjectFilter(categoryParam)) {
      setFilter((current) => (current === categoryParam ? current : categoryParam));
    } else if (categoryParam === null) {
      setFilter((current) => (current === 'All' ? current : 'All'));
    }
  }, [categoryParam]);

  const visibleProjects = filterProjects(projects, filter, query);

  function chooseFilter(next: ProjectFilter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'All') {
      params.delete('category');
    } else {
      params.set('category', next);
    }
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setQuery('');
    chooseFilter('All');
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">
            <span className="section-index">03</span> Projects
          </p>
          <div className="page-head__grid">
            <h1 className="page-head__title">
              Selected work, <span>examined.</span>
            </h1>
            <p className="page-head__intro">
              Three case studies, written to show the reasoning behind the implementation: the
              constraints, the trade-offs, the tests, and the parts that are still in progress.
            </p>
          </div>
          <div className="page-head__meta">
            <span className="badge">3 case studies</span>
            <span className="badge">Backend · Full-stack · DevOps · QA</span>
            <span className="badge badge--amber">Repositories private</span>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="filter-bar">
          <div className="filter-group" role="group" aria-label="Filter projects by discipline">
            {projectFilters.map((item) => (
              <button
                key={item}
                type="button"
                className="filter-chip"
                aria-pressed={filter === item}
                onClick={() => chooseFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="search-field">
            <label className="search-field__label" htmlFor="project-search">
              Search projects
            </label>
            <input
              id="project-search"
              className="search-field__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Stack, focus, or title…"
              autoComplete="off"
            />
          </div>
        </div>

        <p className="results-bar" role="status" aria-live="polite">
          <span>
            Showing {visibleProjects.length} of {projects.length} case studies
            {filter !== 'All' ? ` · ${filter}` : ''}
            {query.trim() ? ` · matching “${query.trim()}”` : ''}
          </span>
          <span>Code links are added when a repository becomes public</span>
        </p>

        {visibleProjects.length > 0 ? (
          <div className="projects-grid">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No matches</p>
            <h2 className="empty-state__title">Nothing in this slice yet</h2>
            <p className="empty-state__body">
              No case study matches that filter and search combination. Try a broader discipline
              or a different term.
            </p>
            <button type="button" className="btn btn--primary btn--small" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}

        <aside className="evidence-card gallery-note">
          <h2 className="evidence-card__title">A note on evidence</h2>
          <p className="evidence-card__body">
            These repositories are private at the time of writing, so no GitHub or live-demo links
            are shown. Each case study distinguishes implemented work from design intent and next
            steps. No client names, production metrics, or testimonials are claimed.
          </p>
          <div className="evidence-links">
            <Link to="/contact" className="text-link text-link--accent">
              Ask about a project <ArrowRight size={14} />
            </Link>
            <Link to="/about" className="text-link">
              How I work <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
