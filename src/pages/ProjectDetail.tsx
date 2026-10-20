import { Link, useParams } from 'react-router-dom';
import { useContent } from '@/lib/content';
import { adjacentProjects, getProject, relatedProjects } from '@/lib/projects';
import { ProjectDiagram } from '@/components/Diagrams';
import { ArrowLeft, ArrowRight, ArrowUpRight } from '@/components/icons';
import NotFound from './NotFound';

export default function ProjectDetail() {
  const content = useContent();
  const { slug = '' } = useParams();
  const project = getProject(content.projects, slug);

  if (!project) {
    return <NotFound />;
  }

  const adjacent = adjacentProjects(content.projects, project.slug);
  const related = relatedProjects(content.projects, project, 3);

  return (
    <div className="page">
      <header className="project-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span className="breadcrumbs__sep" aria-hidden="true">
              /
            </span>
            <Link to="/projects">Projects</Link>
            <span className="breadcrumbs__sep" aria-hidden="true">
              /
            </span>
            <span aria-current="page">{project.shortTitle}</span>
          </nav>

          <div className="project-head__grid">
            <div>
              <div className="page-head__meta">
                <span className="badge badge--amber">{project.category}</span>
                <span className="badge">{project.status}</span>
                <span className="badge">Case study</span>
              </div>
              <h1 className="project-head__title">{project.title}</h1>
              <p className="project-head__summary">{project.summary}</p>
              <div className="chip-row project-stack">
                {project.stack.map((item) => (
                  <span className="chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <aside className="project-aside" aria-label="Project at a glance">
              <h2 className="project-aside__title">
                At a glance <span aria-hidden="true">↘</span>
              </h2>
              <dl className="meta-list">
                <div>
                  <dt>Status</dt>
                  <dd>{project.status}</dd>
                </div>
                <div>
                  <dt>Disciplines</dt>
                  <dd>{project.categories.join(' · ')}</dd>
                </div>
                <div>
                  <dt>Focus</dt>
                  <dd>{project.focus}</dd>
                </div>
                <div>
                  <dt>Stack</dt>
                  <dd>{project.stack.join(' · ')}</dd>
                </div>
                <div>
                  <dt>Links</dt>
                  <dd>
                    {project.links.repo || project.links.live
                      ? 'Available below'
                      : 'Repository private at time of writing'}
                  </dd>
                </div>
              </dl>
              <div className="aside-actions">
                <Link to="/contact" className="btn btn--primary btn--small">
                  Discuss a similar project
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </header>

      <div className="container">
        {project.image ? (
          <figure className="project-image">
            <img
              src={project.image}
              alt={`${project.shortTitle} project preview`}
              width={1200}
              height={630}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ) : null}

        <figure className="detail-diagram">
          <div className="detail-diagram__head">
            <span>Architecture · system view</span>
            <span>Diagram</span>
          </div>
          <div className="detail-diagram__canvas">
            <ProjectDiagram kind={project.diagram} />
          </div>
          <figcaption>{project.diagramCaption}</figcaption>
        </figure>

        <div className="case-layout">
          <nav className="case-toc" aria-label="Case study sections">
            <p className="case-toc__title">Contents</p>
            <ol>
              {project.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span className="case-toc__index" aria-hidden="true">
                      {section.index}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="case-sections">
            {project.sections.map((section) => (
              <section className="case-section" id={section.id} key={section.id}>
                <div className="case-section__head">
                  <span className="case-section__index" aria-hidden="true">
                    {section.index}
                  </span>
                  <h2 className="case-section__title">{section.title}</h2>
                </div>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <aside className="evidence-card" aria-labelledby="evidence-title">
              <h2 className="evidence-card__title" id="evidence-title">
                Repository &amp; evidence
              </h2>
              <p className="evidence-card__body">{project.evidenceNote}</p>
              {project.links.repo || project.links.live ? (
                <div className="evidence-links">
                  {project.links.repo ? (
                    <a
                      href={project.links.repo}
                      className="btn btn--secondary btn--small"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Repository <ArrowUpRight size={13} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                  {project.links.live ? (
                    <a
                      href={project.links.live}
                      className="btn btn--primary btn--small"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Live demo <ArrowUpRight size={13} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="evidence-links">
                  <Link to="/contact" className="btn btn--secondary btn--small">
                    Ask about the implementation <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </aside>
          </article>
        </div>

        {related.length > 0 ? (
          <aside className="related-work" aria-labelledby="related-title">
            <h2 className="related-work__title" id="related-title">
              Related case studies
            </h2>
            <ul className="related-work__list">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link to={`/projects/${item.slug}`}>
                    <span className="related-work__category">{item.category}</span>
                    <span className="related-work__name">{item.shortTitle}</span>
                    <ArrowRight size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        {adjacent ? (
          <nav className="project-nav" aria-label="Adjacent projects">
            <Link to={`/projects/${adjacent.previous.slug}`}>
              <span className="project-nav__direction">
                <ArrowLeft size={12} /> Previous
              </span>
              <span className="project-nav__title">{adjacent.previous.shortTitle}</span>
            </Link>
            <Link to={`/projects/${adjacent.next.slug}`}>
              <span className="project-nav__direction">
                Next <ArrowRight size={12} />
              </span>
              <span className="project-nav__title">{adjacent.next.shortTitle}</span>
            </Link>
          </nav>
        ) : null}
      </div>

      <section className="cta-band" aria-labelledby="project-cta-title">
        <div className="container cta-band__inner">
          <div>
            <p className="eyebrow cta-band__eyebrow">Similar problem?</p>
            <h2 className="cta-band__title" id="project-cta-title">
              Let&apos;s make the failure modes <span>visible.</span>
            </h2>
          </div>
          <div className="cta-band__aside">
            <p className="cta-band__note">
              Share the system, the constraint, and what keeps going wrong. I will tell you
              honestly whether I can help.
            </p>
            <Link to="/contact" className="btn btn--primary">
              Start a conversation <ArrowUpRight size={15} />
            </Link>
            <Link to="/projects" className="btn btn--secondary">
              All case studies <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
