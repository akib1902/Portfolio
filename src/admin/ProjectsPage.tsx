import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from './AdminContext';
import { ApiError, deleteProject, setProjectStatus } from './api';

export default function ProjectsPage() {
  const { content, setContent } = useAdmin();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const projects = content.projects;

  async function toggleStatus(id: string, status: 'draft' | 'published') {
    setBusyId(id);
    setMessage(null);
    try {
      const updated = await setProjectStatus(id, status);
      setContent({
        ...content,
        projects: content.projects.map((project) => (project.id === id ? updated : project)),
      });
      setMessage({
        tone: 'ok',
        text: `${updated.title} is now ${status === 'published' ? 'published' : 'a draft'}.`,
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof ApiError ? error.message : 'The status could not be changed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”? This removes the case study. Published URLs will stop working.`)) {
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      await deleteProject(id);
      setContent({
        ...content,
        projects: content.projects.filter((project) => project.id !== id),
      });
      setMessage({ tone: 'ok', text: `${title} was deleted.` });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof ApiError ? error.message : 'The project could not be deleted.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Projects</p>
          <h1 className="admin-title">Case studies</h1>
          <p className="admin-page__intro">
            Drafts are invisible to visitors, the public API, metadata, and the sitemap. Publishing
            a change updates the public pages and sitemap on the next request.
          </p>
        </div>
        <Link to="/admin/projects/new" className="btn btn--primary btn--small">
          New project
        </Link>
      </header>

      {message ? (
        <p className={`admin-status admin-status--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Slug</th>
              <th scope="col">Status</th>
              <th scope="col">Featured</th>
              <th scope="col">Order</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <span className="admin-table__title">{project.title}</span>
                  <span className="admin-table__meta">{project.category}</span>
                </td>
                <td>
                  <code>/projects/{project.slug}</code>
                </td>
                <td>
                  <span className={`admin-badge admin-badge--${project.status}`}>
                    {project.status}
                  </span>
                </td>
                <td>{project.featured ? 'Yes' : 'No'}</td>
                <td>{project.position}</td>
                <td>
                  <div className="admin-table__actions">
                    <Link
                      to={`/admin/projects/${encodeURIComponent(project.id)}`}
                      className="btn btn--secondary btn--small"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      disabled={busyId === project.id}
                      onClick={() =>
                        void toggleStatus(
                          project.id,
                          project.status === 'published' ? 'draft' : 'published',
                        )
                      }
                    >
                      {project.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    {project.status === 'published' ? (
                      <a
                        className="btn btn--secondary btn--small"
                        href={`/projects/${project.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View ↗
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--quiet btn--small"
                      disabled={busyId === project.id}
                      onClick={() => void remove(project.id, project.title)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {projects.length === 0 ? (
        <div className="admin-empty">
          <p>No projects yet. Create the first case study to populate the portfolio.</p>
        </div>
      ) : null}
    </div>
  );
}
