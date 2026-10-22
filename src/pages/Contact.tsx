import { Link } from 'react-router-dom';
import { activeContactLinks, contactMailto } from '@/content/profile';
import { useProfile } from '@/lib/content';
import { ContactForm } from '@/components/ContactForm';
import { ArrowUpRight, MailIcon } from '@/components/icons';

export default function Contact() {
  const profile = useProfile();
  const links = activeContactLinks(profile);
  const mailto = contactMailto('Project inquiry from your portfolio', profile);

  return (
    <div className="page">
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">
            <span className="section-index">04</span> Contact
          </p>
          <div className="page-head__grid">
            <h1 className="page-head__title">
              Let&apos;s talk about what you&apos;re <span>building.</span>
            </h1>
            <p className="page-head__intro">
              A project that needs a steady hand, a role that spans the delivery path, or a
              technical conversation — the form below is the best place to start. No pitch deck
              required.
            </p>
          </div>
          <div className="page-head__meta">
            <span
              className={`badge ${profile.availability.available ? 'badge--green' : ''}`.trim()}
            >
              {profile.availability.available
                ? profile.availability.label
                : 'Currently unavailable'}
            </span>
            <span className="badge">Freelance &amp; full-time</span>
            <span className="badge">Remote-friendly</span>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="contact-layout">
          <section className="panel contact-card" aria-labelledby="contact-form-title">
            <p className="eyebrow">Send a message</p>
            <h2 className="contact-form-title" id="contact-form-title">
              What are you working on?
            </h2>
            <ContactForm />
          </section>

          <aside className="contact-aside" aria-label="Contact details">
            <div className="info-card">
              <h2 className="info-card__title">
                Availability
                <span
                  className={`status${profile.availability.available ? '' : ' status--offline'}`}
                >
                  <span className="status__dot" aria-hidden="true" />
                  {profile.availability.available ? 'Available' : 'Closed'}
                </span>
              </h2>
              <div className="info-card__body">
                <p>{profile.availability.detail}</p>
                <p className="info-card__meta">
                  {profile.location} · {profile.timezone} · {profile.workPreference}
                </p>
              </div>
            </div>

            <div className="info-card">
              <h2 className="info-card__title">What happens next</h2>
              <div className="info-card__body">
                <p>{profile.responseNote}</p>
                <ul className="info-list">
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      01
                    </span>
                    <span>Your message is validated and saved on this site&apos;s server.</span>
                  </li>
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      02
                    </span>
                    <span>I read every message that arrives through this form.</span>
                  </li>
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      03
                    </span>
                    <span>I reply to the email address you provide.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="info-card">
              <h2 className="info-card__title">Useful context</h2>
              <div className="info-card__body">
                <ul className="info-list">
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      →
                    </span>
                    <span>What the system does and who uses it.</span>
                  </li>
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      →
                    </span>
                    <span>The stage: idea, prototype, or live product.</span>
                  </li>
                  <li>
                    <span className="info-list__mark" aria-hidden="true">
                      →
                    </span>
                    <span>The constraint that matters most — time, budget, reliability, or scale.</span>
                  </li>
                </ul>
              </div>
            </div>

            {mailto || links.length > 0 ? (
              <div className="info-card">
                <h2 className="info-card__title">Direct</h2>
                <div className="contact-links">
                  {mailto ? (
                    <a href={mailto} className="contact-link">
                      <span className="contact-link__label">
                        <MailIcon size={14} />
                        Email
                      </span>
                      <ArrowUpRight size={12} />
                    </a>
                  ) : null}
                  {links.map((link) => (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-link"
                    >
                      {link.label}
                      <ArrowUpRight size={12} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="info-card">
              <h2 className="info-card__title">Prefer to look first?</h2>
              <div className="info-card__body">
                <p>Review the case studies or the print-ready resume before reaching out.</p>
                <div className="aside-actions">
                  <Link to="/projects" className="btn btn--secondary btn--small">
                    Projects
                  </Link>
                  <Link to="/resume" className="btn btn--secondary btn--small">
                    Resume
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
