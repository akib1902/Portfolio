import { Link } from 'react-router-dom';
import { activeSocialLinks, contactMailto } from '@/content/profile';
import { useContent } from '@/lib/content';
import { ArrowLeft, DownloadIcon, PrintIcon } from '@/components/icons';

export default function Resume() {
  const content = useContent();
  const { profile, projects } = content;
  const skillGroups = content.skills.groups;
  const socials = activeSocialLinks(profile);
  const mailto = contactMailto('Hello from your resume', profile);

  return (
    <div className="page">
      <div className="container">          <div className="resume-toolbar print-hidden">
          <div>
            <p className="eyebrow">
              <span className="section-index">05</span> Resume
            </p>
            <p className="resume-toolbar__note">
              {profile.resume.note} This page contains only details that also appear on the
              portfolio.
            </p>
          </div>
          <div className="aside-actions resume-toolbar__actions">
            <Link to="/" className="btn btn--secondary btn--small">
              <ArrowLeft size={14} />
              Back home
            </Link>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => window.print()}
            >
              <PrintIcon size={14} />
              Print
            </button>
            <a
              href={profile.resume.pdf}
              className="btn btn--primary btn--small"                download={`${profile.name.replace(/\s+/g, '-')}-Resume.pdf`}
            >
              <DownloadIcon size={14} />
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="container resume-wrap">
        <article className="resume-sheet" aria-labelledby="resume-name">
          <header className="resume-head">
            <div>
              <h1 className="resume-head__name" id="resume-name">
                {profile.name}
              </h1>
              <p className="resume-head__role">{profile.positioning}</p>
            </div>
            <div className="resume-head__meta">
              <span>
                {profile.location} · {profile.timezone}
              </span>
              <span>{profile.workPreference}</span>
              <span>
                {profile.availability.available
                  ? profile.availability.label
                  : 'Currently unavailable'}
              </span>
              {mailto ? (
                <a href={mailto}>{profile.email}</a>
              ) : (
                <span>Contact details available on request</span>
              )}
              {socials.map((social) => (
                <a key={social.key} href={social.href}>
                  {social.href.replace(/^https?:\/\//, '')}
                </a>
              ))}
            </div>
          </header>

          <section className="resume-section" aria-labelledby="resume-profile">
            <h2 className="resume-section__title" id="resume-profile">
              Profile
            </h2>
            <p className="resume-summary">{profile.intro}</p>
          </section>

          <section className="resume-section" aria-labelledby="resume-skills">
            <h2 className="resume-section__title" id="resume-skills">
              Technical skills
            </h2>
            <dl>
              {skillGroups.map((group) => (
                <div className="resume-skill-row" key={group.id}>
                  <dt>{group.title}</dt>
                  <dd>{group.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="resume-section" aria-labelledby="resume-projects">
            <h2 className="resume-section__title" id="resume-projects">
              Selected projects
            </h2>
            {projects.map((project) => (
              <div className="resume-project" key={project.slug}>
                <h3 className="resume-project__title">{project.title}</h3>
                <p className="resume-project__stack">{project.stack.join(' · ')}</p>
                <p className="resume-project__body">
                  {project.summary} Focus: {project.focus}.
                </p>
              </div>
            ))}
          </section>

          <section className="resume-section" aria-labelledby="resume-education">
            <h2 className="resume-section__title" id="resume-education">
              Education
            </h2>
            <dl>
              <div className="resume-skill-row">
                <dt>Degree</dt>
                <dd>
                  {profile.education.field} — {profile.education.status}
                </dd>
              </div>
              <div className="resume-skill-row">
                <dt>Details</dt>
                <dd>{profile.education.note}</dd>
              </div>
            </dl>
          </section>

          <section className="resume-section" aria-labelledby="resume-availability">
            <h2 className="resume-section__title" id="resume-availability">
              Availability
            </h2>
            <p className="resume-summary">
              {profile.availability.detail} Based in {profile.location} ({profile.timezone}) and
              open to remote work. The portfolio case studies contain architecture, testing, and
              delivery details for each project.
            </p>
          </section>

          <p className="resume-footnote">
            Reference links for each project are available on request while the repositories are
            private. This resume mirrors the portfolio content and makes no claims about client
            outcomes, certifications, or years of experience.
          </p>
        </article>
      </div>
    </div>
  );
}
