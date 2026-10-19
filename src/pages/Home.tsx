import { Link } from 'react-router-dom';
import { activeSocialLinks, contactMailto, profile } from '@/content/profile';
import { projects } from '@/content/projects';
import { skillGroups, toolkitNote } from '@/content/skills';
import { usePageMeta } from '@/lib/use-page-meta';
import { ArrowRight, ArrowUpRight, DownloadIcon } from '@/components/icons';
import { PortraitPlate } from '@/components/PortraitPlate';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectDiagram } from '@/components/Diagrams';

const heroSkills = [
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'Docker',
  'GitHub Actions',
  'PostgreSQL',
  'Linux',
];

const disciplineLinks = [
  {
    category: 'Full-Stack',
    title: 'Full-stack engineering',
    body: 'Interfaces, APIs, authentication, and data models that fit together.',
  },
  {
    category: 'DevOps',
    title: 'DevOps & delivery',
    body: 'Containers, pipelines, and repeatable deployments with visible failure modes.',
  },
  {
    category: 'QA / Automation',
    title: 'QA & automation',
    body: 'Test strategies that protect behaviour across unit, integration, and end-to-end layers.',
  },
];

const disciplineCategory: Record<string, string> = {
  frontend: 'Full-Stack',
  backend: 'Backend',
  devops: 'DevOps',
  qa: 'QA / Automation',
};

export default function Home() {
  usePageMeta({
    title: 'Akib Ahmed — Software Engineer | Full-Stack, DevOps & QA',
    description:
      'Akib Ahmed builds full-stack applications, automates delivery pipelines, and tests software for reliability. Explore selected work across full-stack, DevOps, and QA automation.',
    path: '/',
  });

  const socials = activeSocialLinks();
  const mailto = contactMailto();
  const featured = projects.filter((project) => project.featured).slice(0, 3);

  return (
    <div className="page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <div className="hero__topline">
            <div className="hero__disciplines">
              <span>Software engineer</span>
              {profile.disciplines.map((discipline) => (
                <span key={discipline}>{discipline}</span>
              ))}
            </div>
            <p className="hero__motto" aria-hidden="true">
              Build
              <br />
              Test
              <br />
              <strong>Deploy</strong>
              <br />
              Repeat
            </p>
          </div>

          <h1 className="hero__display" id="hero-title" aria-label="Akib Ahmed — build, test, deploy.">
            <span className="hero__display-word">Build.</span>
            <span className="hero__display-word">Test.</span>
            <span className="hero__display-word hero__display-word--accent">Deploy.</span>
          </h1>

          <div className="hero__grid">
            <div className="hero__col hero__col--left">
              <section className="panel" aria-labelledby="about-panel-title">
                <div className="panel__head">
                  <h2 className="panel__title" id="about-panel-title">
                    About
                  </h2>
                  <Link to="/about" className="link-arrow">
                    More <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="panel__body about-panel__body">
                  <p className="about-panel__intro">
                    I am a Computer Science &amp; Engineering graduate who cares about the
                    unglamorous parts of software: clear interfaces, safe data models, and
                    pipelines that tell the truth.
                  </p>
                  <ul className="fact-list">
                    <li>
                      <span className="fact-list__index" aria-hidden="true">
                        01
                      </span>
                      <span>
                        <span className="fact-list__label">Education</span>
                        <span className="fact-list__value">CSE graduate</span>
                      </span>
                    </li>
                    <li>
                      <span className="fact-list__index" aria-hidden="true">
                        02
                      </span>
                      <span>
                        <span className="fact-list__label">Based in</span>
                        <span className="fact-list__value">
                          {profile.location} · {profile.timezone}
                        </span>
                      </span>
                    </li>
                    <li>
                      <span className="fact-list__index" aria-hidden="true">
                        03
                      </span>
                      <span>
                        <span className="fact-list__label">Work mode</span>
                        <span className="fact-list__value">{profile.workPreference}</span>
                      </span>
                    </li>
                  </ul>
                  <Link to="/resume" className="text-link">
                    <DownloadIcon size={14} />
                    Resume
                  </Link>
                </div>
              </section>

              <section className="panel" aria-labelledby="skills-panel-title">
                <div className="panel__head">
                  <h2 className="panel__title" id="skills-panel-title">
                    Skills
                  </h2>
                  <Link to="/about#capabilities" className="link-arrow">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="panel__body">
                  <div className="skill-tiles">
                    {heroSkills.map((skill) => (
                      <span className="skill-tile" key={skill}>
                        <span className="skill-tile__mark" aria-hidden="true" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="hero__col hero__col--center">
              <section className="panel hero-card" aria-labelledby="hero-name">
                <div className="hero-card__body">
                  <div>
                    <p className="hero-card__greeting">Hey there, I&apos;m</p>
                    <h2 className="hero-card__name" id="hero-name">
                      Akib <span className="hero-card__name-accent">Ahmed</span>
                    </h2>
                    <p className="hero-card__role">
                      {profile.disciplines.map((discipline) => (
                        <span key={discipline}>{discipline}</span>
                      ))}
                    </p>
                    <p className="hero-card__availability">
                      <span
                        className={`status${profile.availability.available ? '' : ' status--offline'}`}
                      >
                        <span className="status__dot" aria-hidden="true" />
                        {profile.availability.label}
                      </span>
                    </p>
                    <p className="hero-card__intro">{profile.intro}</p>

                    <div className="hero-card__actions">
                      <Link to="/contact" className="btn btn--primary">
                        Hire me
                        <ArrowUpRight size={15} />
                      </Link>
                      <Link to="/projects" className="btn btn--secondary">
                        Explore projects
                        <ArrowRight size={15} />
                      </Link>
                      <Link to="/resume" className="text-link">
                        <DownloadIcon size={14} />
                        Resume
                      </Link>
                    </div>

                    {socials.length > 0 || mailto ? (
                      <div className="hero-card__socials">
                        {socials.map((social) => (
                          <a
                            key={social.key}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-arrow"
                          >
                            {social.label} <ArrowUpRight size={11} />
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ))}
                        {mailto ? (
                          <a href={mailto} className="link-arrow">
                            Email <ArrowUpRight size={11} />
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <dl className="hero-facts">
                      <div>
                        <dt className="hero-fact__label">Based in</dt>
                        <dd className="hero-fact__value">
                          {profile.location} · {profile.timezone}
                        </dd>
                      </div>
                      <div>
                        <dt className="hero-fact__label">Work mode</dt>
                        <dd className="hero-fact__value">Remote-friendly</dd>
                      </div>
                      <div>
                        <dt className="hero-fact__label">Education</dt>
                        <dd className="hero-fact__value">CSE graduate</dd>
                      </div>
                    </dl>
                  </div>

                  <PortraitPlate />
                </div>
              </section>
            </div>

            <div className="hero__col hero__col--right">
              <section className="panel" aria-labelledby="projects-panel-title">
                <div className="panel__head">
                  <h2 className="panel__title" id="projects-panel-title">
                    Projects
                  </h2>
                  <Link to="/projects" className="link-arrow">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="panel__body">
                  <div className="mini-projects">
                    {featured.map((project) => (
                      <Link
                        to={`/projects/${project.slug}`}
                        className="mini-project"
                        key={project.slug}
                      >
                        <span className="mini-project__thumb" aria-hidden="true">
                          <ProjectDiagram kind={project.diagram} mini />
                        </span>
                        <span>
                          <span className="mini-project__category">{project.category}</span>
                          <span className="mini-project__title">{project.shortTitle}</span>
                        </span>
                        <span className="mini-project__arrow" aria-hidden="true">
                          <ArrowRight size={13} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel" aria-labelledby="connect-panel-title">
                <div className="panel__head">
                  <h2 className="panel__title" id="connect-panel-title">
                    Let&apos;s connect
                  </h2>
                  <span className="status">
                    <span className="status__dot" aria-hidden="true" />
                    Open
                  </span>
                </div>
                <div className="panel__body connect-panel__body">
                  <p className="connect-panel__copy">
                    Have a project, a role, or a system that needs untangling? Start with a
                    message.
                  </p>
                  <div className="connect-links">
                    <Link to="/contact" className="connect-link">
                      Contact form <ArrowUpRight size={12} />
                    </Link>
                    {socials.map((social) => (
                      <a
                        key={social.key}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="connect-link"
                      >
                        {social.label} <ArrowUpRight size={12} />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                    {mailto ? (
                      <a href={mailto} className="connect-link">
                        Email <ArrowUpRight size={12} />
                      </a>
                    ) : null}
                  </div>
                  <p className="connect-panel__note">
                    {profile.location} · {profile.timezone} · {profile.workPreference}
                  </p>
                </div>
              </section>
            </div>

            <nav className="disciplines" aria-label="Engineering disciplines">
            {disciplineLinks.map((item, index) => (
              <Link
                key={item.category}
                to={`/projects?category=${encodeURIComponent(item.category)}`}
                className="discipline"
              >
                <span className="discipline__index" aria-hidden="true">
                  0{index + 1}
                </span>
                <span>
                  <span className="discipline__title">{item.title}</span>
                  <span className="discipline__body">{item.body}</span>
                </span>
                <ArrowUpRight size={15} className="discipline__arrow" />
              </Link>
            ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="section recent-projects" aria-labelledby="recent-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                <span className="section-index">02</span> Selected work
              </p>
              <h2 className="section-title" id="recent-title">
                Recent <span className="accent">projects</span>
              </h2>
            </div>
            <div className="section-intro">
              <p>
                Three case studies across backend architecture, full-stack product work, and
                delivery automation. Each one documents the problem, the design decisions, and the
                tests — not just the finished screens.
              </p>
              <p>
                <Link to="/projects" className="text-link text-link--accent">
                  Browse all projects <ArrowRight size={14} />
                </Link>
              </p>
            </div>
          </div>
          <div className="featured-grid">
            {featured.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="capabilities" aria-labelledby="capabilities-title">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                <span className="section-index">03</span> Capabilities
              </p>
              <h2 className="section-title" id="capabilities-title">
                The stack behind <span className="accent">the work</span>
              </h2>
            </div>
            <div className="section-intro">
              <p>
                Four disciplines, one delivery path. The boundaries between them are useful for
                organising work — in practice, the decisions in one shape the others.
              </p>
            </div>
          </div>

          <div className="capability-grid">
            {skillGroups.map((group) => (
              <article className="capability" key={group.id} id={`capability-${group.id}`}>
                <div className="capability__top">
                  <span className="capability__index" aria-hidden="true">
                    {group.index}
                  </span>
                  <span className="capability__kicker">{group.kicker}</span>
                </div>
                <h3 className="capability__title">{group.title}</h3>
                <p className="capability__desc">{group.description}</p>
                <ul className="capability__items">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link
                  to={`/projects?category=${encodeURIComponent(disciplineCategory[group.id])}`}
                  className="link-arrow capability__link"
                >
                  Related work <ArrowRight size={11} />
                </Link>
              </article>
            ))}
          </div>
          <p className="toolkit-note">{toolkitNote}</p>
        </div>
      </section>

      <section className="section about-preview" id="approach" aria-labelledby="approach-title">
        <div className="container">
          <div className="about-preview__grid">
            <div>
              <p className="eyebrow">
                <span className="section-index">04</span> Approach
              </p>
              <h2 className="statement" id="approach-title">
                Reliable software is a <span className="accent">system</span>, not a final step.
              </h2>
            </div>
            <div className="about-preview__copy">
              <p>
                I care about what happens after the feature works on a laptop: the retry that
                runs twice, the migration that lands out of order, the test that passes for the
                wrong reason. Those are design problems, and they are easier to solve before
                production finds them.
              </p>
              <p>
                My work sits where full-stack development, DevOps, and QA meet. That usually
                means a typed API boundary, a data model with real constraints, a pipeline that
                proves the change, and enough observability to explain a failure.
              </p>
              <p>
                <Link to="/about" className="text-link text-link--accent">
                  More about how I work <ArrowRight size={14} />
                </Link>
              </p>
              <div className="flow" aria-label="Delivery workflow">
                {[
                  ['01', 'Build'],
                  ['02', 'Test'],
                  ['03', 'Deploy'],
                  ['04', 'Observe'],
                ].map(([index, label]) => (
                  <div className="flow__step" key={label}>
                    <span className="flow__index">{index}</span>
                    <span className="flow__label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band" aria-labelledby="cta-title">
        <div className="container cta-band__inner">
          <div>
            <p className="eyebrow cta-band__eyebrow">Next step</p>
            <h2 className="cta-band__title" id="cta-title">
              Let&apos;s build something that <span>holds up.</span>
            </h2>
          </div>
          <div className="cta-band__aside">
            <p className="cta-band__note">
              {profile.availability.detail} Based in {profile.location}, working remotely.
            </p>
            <Link to="/contact" className="btn btn--primary">
              Hire me <ArrowUpRight size={15} />
            </Link>
            <Link to="/resume" className="btn btn--secondary">
              View resume <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
