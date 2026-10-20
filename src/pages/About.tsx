import { Link } from 'react-router-dom';
import { activeSocialLinks, contactMailto } from '@/content/profile';
import { useContent } from '@/lib/content';
import { ArrowRight, ArrowUpRight, DownloadIcon } from '@/components/icons';

const capabilityCategory: Record<string, string> = {
  frontend: 'Full-Stack',
  backend: 'Backend',
  devops: 'DevOps',
  qa: 'QA / Automation',
};

const workflow = [
  {
    index: '01',
    title: 'Build',
    body: 'Typed request boundaries, a data model with real constraints, and authorization decided on the server.',
  },
  {
    index: '02',
    title: 'Test',
    body: 'Fast checks for logic, integration tests for wiring, and end-to-end tests for the promises users rely on.',
  },
  {
    index: '03',
    title: 'Deploy',
    body: 'Containerised builds, immutable artifacts, ordered migrations, and a promotion path that can be reversed.',
  },
  {
    index: '04',
    title: 'Observe',
    body: 'Structured logs, health signals, and a timeline that explains what changed when something breaks.',
  },
];

export default function About() {
  const content = useContent();
  const { profile } = content;
  const skillGroups = content.skills.groups;
  const socials = activeSocialLinks(profile);
  const mailto = contactMailto('Project inquiry', profile);

  return (
    <div className="page">
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">
            <span className="section-index">02</span> About
          </p>
          <div className="page-head__grid">
            <h1 className="page-head__title">
              Software that <span>earns its keep.</span>
            </h1>
            <p className="page-head__intro">
              I am {profile.name}, a {profile.role.toLowerCase()} working across{' '}
              {profile.disciplines.join(', ')}. I care about the whole path from an idea to a
              system that can be trusted in production.
            </p>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="about-intro">
          <div className="prose">
            <p>
              My work sits where three disciplines meet. Full-stack development decides what the
              system does; DevOps decides how it gets there; QA decides whether the result can be
              believed. Treating them as separate phases is how reliable software turns into a
              series of hand-offs.
            </p>
            <p>
              I studied Computer Science &amp; Engineering and kept following the parts of software
              that fail quietly: authorization that is assumed rather than checked, deployments
              that depend on someone remembering a step, and tests that only prove the happy path.
              Those interests became a working practice built around explicit interfaces,
              reproducible delivery, and evidence.
            </p>
            <p>
              I do not claim to know everything in the stack. I do try to be clear about what is
              implemented, what is a design decision, and what still needs work. The case studies
              on this site follow that rule, including the parts that are unfinished.
            </p>
            <blockquote className="pull-quote">
              The goal is not more automation. It is fewer surprises.
            </blockquote>
          </div>

          <aside className="about-aside" aria-label="Profile details">
            <div className="side-card">
              <h2 className="side-card__title">Availability</h2>
              <p
                className={`status${profile.availability.available ? '' : ' status--offline'}`}
              >
                <span className="status__dot" aria-hidden="true" />
                {profile.availability.available
                  ? profile.availability.label
                  : 'Currently unavailable'}
              </p>
              <p className="side-card__note">{profile.availability.detail}</p>
            </div>
            <div className="side-card">
              <h2 className="side-card__title">Based in</h2>
              <p className="side-card__value">
                {profile.location} · {profile.timezone}
              </p>
              <p className="side-card__note">{profile.workPreference}</p>
            </div>
            <div className="side-card">
              <h2 className="side-card__title">Education</h2>
              <p className="side-card__value">{profile.education.field}</p>
              <p className="side-card__note">
                {profile.education.status}. {profile.education.note}
              </p>
            </div>
            <div className="aside-actions">
              <Link to="/resume" className="btn btn--secondary btn--small">
                <DownloadIcon size={14} />
                Resume
              </Link>
              <Link to="/contact" className="btn btn--primary btn--small">
                Contact <ArrowUpRight size={13} />
              </Link>
            </div>
            {socials.length > 0 ? (
              <div className="side-card">
                <h2 className="side-card__title">Elsewhere</h2>
                <div className="contact-links">
                  {socials.map((social) => (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-link"
                    >
                      {social.label}
                      <ArrowUpRight size={12} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                  {mailto ? (
                    <a href={mailto} className="contact-link">
                      Email <ArrowUpRight size={12} />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <section className="about-section" aria-labelledby="principles-title">
          <div className="about-section__head">
            <div>
              <p className="eyebrow">Engineering philosophy</p>
              <h2 className="about-section__title" id="principles-title">
                Three rules that shape the work
              </h2>
            </div>
            <p className="section-intro">
              These are not slogans on a wall. They show up as retries, test boundaries, and
              deployment decisions in the projects below.
            </p>
          </div>
          <div className="principle-grid">
            {profile.principles.map((principle, index) => (
              <article className="principle" key={principle.title}>
                <span className="principle__index" aria-hidden="true">
                  0{index + 1}
                </span>
                <h3 className="principle__title">{principle.title}</h3>
                <p className="principle__body">{principle.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="capabilities" aria-labelledby="capabilities-title">
          <div className="about-section__head">
            <div>
              <p className="eyebrow">Technical capabilities</p>
              <h2 className="about-section__title" id="capabilities-title">
                A working toolkit
              </h2>
            </div>
            <p className="section-intro">{content.skills.note}</p>
          </div>
          <div className="capability-grid">
            {skillGroups.map((group) => (
              <article className="capability" key={group.id} id={`about-capability-${group.id}`}>
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
                  to={
                    capabilityCategory[group.id]
                      ? `/projects?category=${encodeURIComponent(capabilityCategory[group.id])}`
                      : '/projects'
                  }
                  className="link-arrow capability__link"
                >
                  Related work <ArrowRight size={11} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" aria-labelledby="workflow-title">
          <div className="about-section__head">
            <div>
              <p className="eyebrow">One delivery path</p>
              <h2 className="about-section__title" id="workflow-title">
                How the disciplines connect
              </h2>
            </div>
            <p className="section-intro">
              A change is only complete when it can be built, proven, released, and explained.
              Each step creates the evidence the next one depends on.
            </p>
          </div>
          <div className="workflow">
            {workflow.map((step) => (
              <div className="workflow__step" key={step.title}>
                <span className="workflow__index" aria-hidden="true">
                  {step.index}
                </span>
                <h3 className="workflow__title">{step.title}</h3>
                <p className="workflow__body">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section" aria-labelledby="education-title">
          <div className="about-section__head">
            <div>
              <p className="eyebrow">Education</p>
              <h2 className="about-section__title" id="education-title">
                Verified details only
              </h2>
            </div>
            <p className="section-intro">
              I keep this section limited to facts I can substantiate. Institution, dates, and
              academic records are available on request.
            </p>
          </div>
          <div className="education-grid">
            <div className="education-card">
              <p className="education-card__kicker">Degree</p>
              <h3 className="education-card__field">{profile.education.field}</h3>
              <p className="education-card__status">{profile.education.status}</p>
              <p className="education-card__note">{profile.education.note}</p>
            </div>
            <div className="education-card">
              <p className="education-card__kicker">Documents</p>
              <h3 className="education-card__field">Resume</h3>
              <p className="education-card__status">Print-ready and up to date</p>
              <p className="education-card__note">{profile.resume.note}</p>
              <div className="aside-actions">
                <Link to="/resume" className="btn btn--primary btn--small">
                  View resume <ArrowRight size={13} />
                </Link>
                <a
                  href={profile.resume.pdf}
                  className="btn btn--secondary btn--small"
                  download="Akib-Ahmed-Resume.pdf"
                >
                  <DownloadIcon size={13} />
                  PDF
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="cta-band" aria-labelledby="about-cta-title">
        <div className="container cta-band__inner">
          <div>
            <p className="eyebrow cta-band__eyebrow">
              {profile.availability.available ? 'Available for work' : 'Get in touch'}
            </p>
            <h2 className="cta-band__title" id="about-cta-title">
              Bring me the part that <span>keeps breaking.</span>
            </h2>
          </div>
          <div className="cta-band__aside">
            <p className="cta-band__note">
              {profile.availability.detail} I read every message myself.
            </p>
            <Link to="/contact" className="btn btn--primary">
              Start a conversation <ArrowUpRight size={15} />
            </Link>
            <Link to="/projects" className="btn btn--secondary">
              See the case studies <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
