import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from './AdminContext';
import { fetchAudit, logout, setCsrfToken } from './api';
import type { AuditEntry } from './api';

export default function SettingsPage() {
  const { email, content } = useAdmin();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void fetchAudit()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'The audit log could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    try {
      await logout();
    } finally {
      setCsrfToken(null);
      navigate('/admin/login', { replace: true });
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Settings</p>
          <h1 className="admin-title">Session, audit, and deployment</h1>
        </div>
        <button type="button" className="btn btn--secondary btn--small" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      <section className="admin-card">
        <h2 className="admin-card__title">Session</h2>
        <dl className="admin-meta">
          <div>
            <dt>Administrator</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Session cookie</dt>
            <dd>HttpOnly, SameSite=Strict, Secure in production; identified server-side.</dd>
          </div>
          <div>
            <dt>CSRF</dt>
            <dd>Every write requires the per-session token sent in <code>X-CSRF-Token</code>.</dd>
          </div>
          <div>
            <dt>Canonical origin</dt>
            <dd>{content.site.url ?? 'Not configured (SITE_URL is empty)'}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-card" aria-labelledby="audit-heading">
        <h2 className="admin-card__title" id="audit-heading">
          Audit log
        </h2>
        <p className="admin-muted">
          Sensitive changes record the administrator, action, affected record, timestamp, and a safe
          summary. Passwords, session tokens, and secrets are never written here.
        </p>

        {error ? <p className="admin-status admin-status--error">{error}</p> : null}
        {entries === null && !error ? <p className="admin-muted">Loading…</p> : null}

        {entries && entries.length === 0 ? (
          <p className="admin-muted">No changes recorded yet.</p>
        ) : null}

        {entries && entries.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">Record</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Administrator</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="admin-badge admin-badge--action">{entry.action}</span>
                    </td>
                    <td>
                      {entry.entityType}
                      {entry.entityId ? ` · ${entry.entityId}` : ''}
                    </td>
                    <td>{entry.summary}</td>
                    <td>{entry.adminEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="admin-card" aria-labelledby="deploy-heading">
        <h2 className="admin-card__title" id="deploy-heading">
          Production configuration
        </h2>
        <ul className="admin-list">
          <li>
            <code>SITE_URL</code> — canonical origin. Required in production for sitemap, robots,
            and canonical tags.
          </li>
          <li>
            <code>DATA_DIR</code> — persistent disk for the SQLite database and contact
            submissions.
          </li>
          <li>
            <code>DATABASE_PATH</code> — optional override for the SQLite file.
          </li>
          <li>
            <code>UPLOAD_DIR</code> — persistent disk for uploaded images (served at
            <code>/media</code>).
          </li>
          <li>
            <code>SESSION_TTL_HOURS</code> — administrator session lifetime, 1–72 hours (default
            8).
          </li>
        </ul>
        <p className="admin-muted">
          Administrator accounts are provisioned on the server with{' '}
          <code>npm run admin:create</code> using <code>ADMIN_EMAIL</code> and{' '}
          <code>ADMIN_PASSWORD</code>. There is no public registration and no default password.
          Back up the database file and the uploads directory together.
        </p>
      </section>
    </div>
  );
}
