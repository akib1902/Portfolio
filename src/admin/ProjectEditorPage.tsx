import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { projectFilters } from '@/content/types';
import type { Project, ProjectCategory } from '@/content/types';
import { useAdmin } from './AdminContext';
import { ApiError, createProject, updateProject } from './api';
import {
  AdminField,
  ImageUpload,
  SaveBar,
  StringList,
  TextArea,
  TextInput,
  Toggle,
} from './fields';

type Status = { tone: 'ok' | 'error'; message: string } | null;

const categories = projectFilters.filter(
  (filter): filter is ProjectCategory => filter !== 'All',
);

function blankProject(position: number): Project {
  return {
    id: '',
    slug: '',
    title: '',
    shortTitle: '',
    category: 'Full-Stack',
    categories: ['Full-Stack'],
    status: 'draft',
    statusLabel: 'Draft',
    summary: '',
    value: '',
    stack: [],
    diagram: 'platform',
    diagramCaption: '',
    focus: '',
    featured: false,
    position,
    image: null,
    sections: [
      {
        id: 'problem',
        index: '01',
        title: 'Problem & motivation',
        paragraphs: [],
        bullets: [],
      },
    ],
    links: { repo: null, live: null },
    evidenceNote: '',
    updatedAt: '',
    publishedAt: null,
  };
}

export default function ProjectEditorPage() {
  const { id } = useParams();
  const { content, setContent } = useAdmin();
  const navigate = useNavigate();
  const existing = id ? content.projects.find((project) => project.id === id) : undefined;
  const isNew = !existing;

  const [form, setForm] = useState<Project>(() =>
    existing
      ? structuredClone(existing)
      : blankProject(content.projects.length),
  );
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (id && !existing) {
    return (
      <div className="admin-page">
        <div className="admin-message admin-message--error" role="alert">
          <h1 className="admin-message__title">Project not found</h1>
          <p>It may have been deleted in another tab.</p>
          <Link to="/admin/projects" className="btn btn--secondary btn--small">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  function patch<K extends keyof Project>(key: K, value: Project[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(category: ProjectCategory, checked: boolean) {
    setForm((current) => {
      const next = checked
        ? Array.from(new Set([...current.categories, category]))
        : current.categories.filter((item) => item !== category);
      return {
        ...current,
        categories: next.length > 0 ? next : [category],
        category: next.includes(current.category) ? current.category : (next[0] ?? category),
      };
    });
  }

  function patchSection(index: number, values: Partial<Project['sections'][number]>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, position) =>
        position === index ? { ...section, ...values } : section,
      ),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, sections: next };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const saved = isNew ? await createProject(form) : await updateProject(form.id, form);
      setForm(structuredClone(saved));
      setContent({
        ...content,
        projects: isNew
          ? [...content.projects, saved]
          : content.projects.map((project) => (project.id === saved.id ? saved : project)),
      });
      setStatus({ tone: 'ok', message: 'Project saved.' });
      if (isNew) navigate(`/admin/projects/${encodeURIComponent(saved.id)}`, { replace: true });
    } catch (error) {
      setStatus({
        tone: 'error',
        message:
          error instanceof ApiError
            ? [error.message, ...error.details].join(' ')
            : 'The project could not be saved.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-page" onSubmit={handleSubmit} noValidate>
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">{isNew ? 'New project' : 'Edit project'}</p>
          <h1 className="admin-title">{isNew ? 'Create a case study' : form.title}</h1>
        </div>
        <div className="admin-savebar__actions">
          <Link to="/admin/projects" className="btn btn--secondary btn--small">
            Back
          </Link>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
        </div>
      </header>

      {showPreview ? (
        <section className="admin-preview" aria-label="Project preview">
          <p className="admin-eyebrow">Project preview</p>
          <h2 className="admin-preview__title">{form.title || 'Untitled project'}</h2>
          <p className="admin-preview__summary">{form.summary || 'No summary yet.'}</p>
          <p className="admin-preview__meta">
            {form.category} · {form.stack.join(', ') || 'No stack listed'} ·{' '}
            {form.status === 'published' ? 'Published' : 'Draft'}
          </p>
          {form.sections.map((section) => (
            <div key={section.id} className="admin-preview__section">
              <h3>
                {section.index}. {section.title || 'Untitled section'}
              </h3>
              {(section.paragraphs ?? []).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {(section.bullets ?? []).length > 0 ? (
                <ul>
                  {(section.bullets ?? []).map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="admin-card" aria-labelledby="basics-heading">
        <h2 className="admin-card__title" id="basics-heading">
          Basics
        </h2>
        <div className="admin-grid admin-grid--two">
          <TextInput label="Title" value={form.title} onChange={(value) => patch('title', value)} maxLength={140} />
          <TextInput
            label="Short title"
            value={form.shortTitle}
            onChange={(value) => patch('shortTitle', value)}
            maxLength={90}
          />
          <TextInput
            label="Slug"
            value={form.slug}
            onChange={(value) => patch('slug', value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
            hint="Lowercase letters, numbers, and hyphens. Changing a published slug creates a redirect."
          />
          <TextInput
            label="Status label"
            value={form.statusLabel}
            onChange={(value) => patch('statusLabel', value)}
            maxLength={80}
            hint="For example “Case study · code private”."
          />
        </div>

        <AdminField label="Publication state">
          <select
            className="admin-input"
            value={form.status}
            onChange={(event) => patch('status', event.target.value as Project['status'])}
          >
            <option value="draft">Draft — hidden from visitors</option>
            <option value="published">Published — visible and in the sitemap</option>
          </select>
        </AdminField>

        <fieldset className="admin-fieldset">
          <legend className="admin-field__label">Disciplines</legend>
          <div className="admin-checkrow">
            {categories.map((category) => (
              <label key={category} className="admin-check">
                <input
                  type="checkbox"
                  checked={form.categories.includes(category)}
                  onChange={(event) => toggleCategory(category, event.target.checked)}
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <AdminField label="Primary discipline">
          <select
            className="admin-input"
            value={form.category}
            onChange={(event) => patch('category', event.target.value as ProjectCategory)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </AdminField>

        <div className="admin-grid admin-grid--three">
          <AdminField label="Diagram">
            <select
              className="admin-input"
              value={form.diagram}
              onChange={(event) => patch('diagram', event.target.value as Project['diagram'])}
            >
              <option value="agent">Agent / event flow</option>
              <option value="platform">Platform / layers</option>
              <option value="pipeline">Pipeline / CI</option>
            </select>
          </AdminField>
          <TextInput
            label="Order"
            type="text"
            value={String(form.position)}
            onChange={(value) => patch('position', Number(value.replace(/\D/g, '')) || 0)}
            hint="Lower numbers appear first."
          />
          <div className="admin-field">
            <Toggle
              label="Featured"
              checked={form.featured}
              onChange={(value) => patch('featured', value)}
              hint="Featured projects appear on the home page."
            />
          </div>
        </div>
      </section>

      <section className="admin-card" aria-labelledby="story-heading">
        <h2 className="admin-card__title" id="story-heading">
          Summary and approach
        </h2>
        <TextArea
          label="Summary"
          value={form.summary}
          onChange={(value) => patch('summary', value)}
          rows={3}
          maxLength={500}
          hint="Used as the meta description on the project page."
        />
        <TextArea
          label="Value"
          value={form.value}
          onChange={(value) => patch('value', value)}
          rows={3}
          maxLength={400}
        />
        <div className="admin-grid admin-grid--two">
          <StringList
            label="Stack"
            value={form.stack}
            onChange={(value) => patch('stack', value)}
            rows={6}
          />
          <div>
            <TextInput
              label="Focus"
              value={form.focus}
              onChange={(value) => patch('focus', value)}
              maxLength={200}
            />
            <TextInput
              label="Diagram caption"
              value={form.diagramCaption}
              onChange={(value) => patch('diagramCaption', value)}
              maxLength={300}
            />
            <TextInput
              label="Repository URL"
              type="url"
              value={form.links.repo ?? ''}
              onChange={(value) =>
                patch('links', { ...form.links, repo: value.trim() === '' ? null : value })
              }
              hint="Leave empty when the repository is private."
            />
            <TextInput
              label="Live demo URL"
              type="url"
              value={form.links.live ?? ''}
              onChange={(value) =>
                patch('links', { ...form.links, live: value.trim() === '' ? null : value })
              }
            />
          </div>
        </div>
        <TextArea
          label="Evidence note"
          value={form.evidenceNote}
          onChange={(value) => patch('evidenceNote', value)}
          rows={3}
          maxLength={1000}
        />
        <ImageUpload
          label="Project image"
          kind="project"
          value={form.image}
          onChange={(value) => patch('image', value)}
          hint="Used on the case study and in social metadata. 1200×630 recommended."
        />
      </section>

      <section className="admin-card" aria-labelledby="sections-heading">
        <div className="admin-card__head">
          <h2 className="admin-card__title" id="sections-heading">
            Case study sections
          </h2>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() =>
              setForm((current) => ({
                ...current,
                sections: [
                  ...current.sections,
                  {
                    id: `section-${current.sections.length + 1}`,
                    index: String(current.sections.length + 1).padStart(2, '0'),
                    title: '',
                    paragraphs: [],
                    bullets: [],
                  },
                ],
              }))
            }
          >
            Add section
          </button>
        </div>

        {form.sections.map((section, index) => (
          <div className="admin-subcard" key={index}>
            <div className="admin-subcard__head">
              <span className="admin-eyebrow">Section {index + 1}</span>
              <div className="admin-savebar__actions">
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === form.sections.length - 1}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      sections: current.sections.filter((_, position) => position !== index),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="admin-grid admin-grid--three">
              <AdminField label="Anchor id">
                <input
                  className="admin-input"
                  value={section.id}
                  onChange={(event) =>
                    patchSection(index, {
                      id: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
                    })
                  }
                />
              </AdminField>
              <AdminField label="Index label">
                <input
                  className="admin-input"
                  value={section.index}
                  onChange={(event) => patchSection(index, { index: event.target.value })}
                />
              </AdminField>
              <AdminField label="Title">
                <input
                  className="admin-input"
                  value={section.title}
                  onChange={(event) => patchSection(index, { title: event.target.value })}
                />
              </AdminField>
            </div>

            <AdminField label="Paragraphs" hint="Separate paragraphs with a blank line.">
              <textarea
                className="admin-textarea"
                rows={6}
                value={(section.paragraphs ?? []).join('\n\n')}
                onChange={(event) =>
                  patchSection(index, {
                    paragraphs: event.target.value
                      .split(/\n\s*\n/)
                      .map((paragraph) => paragraph.trim())
                      .filter(Boolean),
                  })
                }
              />
            </AdminField>

            <StringList
              label="Bullets"
              value={section.bullets ?? []}
              onChange={(value) => patchSection(index, { bullets: value })}
              rows={4}
            />
          </div>
        ))}
      </section>

      <SaveBar
        pending={pending}
        status={status}
        label={isNew ? 'Create project' : 'Save project'}
        onCancel={() => {
          setForm(existing ? structuredClone(existing) : blankProject(content.projects.length));
          setStatus(null);
        }}
      />
    </form>
  );
}
