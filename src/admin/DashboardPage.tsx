import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { themeLabels } from '@/content/types';
import { useAdmin } from './AdminContext';
import { fetchAudit } from './api';
import type { AuditEntry } from './api';

export default function DashboardPage() {
  const { content, email } = useAdmin();
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    let active = true;
    void fetchAudit()
      .then((entries) => {
        if (active) setAudit(entries.slice(0, 5));
      })
      .catch(() => {
        /* The overview still renders without the audit preview. */
      });
    return () => {
      active = false;
    };
  }, []);

  const published = content.projects.filter((project) => project.status === 'published');
  const drafts = content.projects.filter((project) => project.status === 'draft');
  const skillCount = content.skills.groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Overview</p>
          <h1 className="admin-title">Signed in as {email}</h1>
          <p className="admin-page__intro">
            Published content is served to visitors from the database. Drafts and private settings
            stay behind this login.
          </p>
        </div>
      </header>

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat__value">{published.length}</span>
          <span className="admin-stat__label">Published projects</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__value">{drafts.length}</span>
          <span className="admin-stat__label">Drafts</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__value">{skillCount}</span>
          <span className="admin-stat__label">Skills listed</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__value">{themeLabels[content.settings.defaultTheme]}</span>
          <span className="admin-stat__label">Default theme</span>
        </div>
      </div>

      <div className="admin-grid admin-grid--two">
        <section className="admin-card">
          <h2 className="admin-card__title">Edit content</h2>
          <ul className="admin-links">
            <li>
              <Link to="/admin/profile">Profile, portrait, and contact links</Link>
            </li>
            <li>
              <Link to="/admin/projects">Case studies and publication state</Link>
            </li>
            <li>
              <Link to="/admin/skills">Skill groups and home-page highlights</Link>
            </li>
            <li>
              <Link to="/admin/appearance">Default theme</Link>
            </li>
            <li>
              <Link to="/admin/settings">Sessions, audit log, and deployment notes</Link>
            </li>
          </ul>
        </section>

        <section className="admin-card">
          <h2 className="admin-card__title">Recent changes</h2>
          {audit.length === 0 ? (
            <p className="admin-muted">No recorded changes yet.</p>
          ) : (
            <ul className="admin-audit">
              {audit.map((entry) => (
                <li key={entry.id}>
                  <span className="admin-badge admin-badge--action">{entry.action}</span>
                  <span className="admin-audit__summary">{entry.summary}</span>
                  <time dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">Public site</h2>
        <p className="admin-muted">
          {content.site.url
            ? `Canonical origin: ${content.site.url}`
            : 'SITE_URL is not configured, so canonical URLs, sitemap.xml, and robots.txt are withheld in production.'}
        </p>
        <div className="admin-savebar__actions">
          <a className="btn btn--secondary btn--small" href="/" target="_blank" rel="noreferrer">
            Open home page ↗
          </a>
          <a className="btn btn--secondary btn--small" href="/sitemap.xml" target="_blank" rel="noreferrer">
            Open sitemap ↗
          </a>
        </div>
      </div>
    </div>
  );
}
