import { useState } from 'react';
import type { ContactLink, Profile } from '@/content/types';
import { useAdmin } from './AdminContext';
import { ApiError, saveProfile } from './api';
import {
  AdminField,
  FileUpload,
  ImageUpload,
  SaveBar,
  StringList,
  TextArea,
  TextInput,
  Toggle,
} from './fields';

type Status = { tone: 'ok' | 'error'; message: string } | null;

const MAX_EXTRA_LINKS = 10;

/** Stable client-side key for a link row that has not been saved yet. */
function newLinkId(): string {
  return `link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProfilePage() {
  const { content, setContent } = useAdmin();
  const [form, setForm] = useState<Profile>(() => structuredClone(content.profile));
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  function patch<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchLink(key: 'github' | 'linkedin' | 'upwork', value: string) {
    setForm((current) => ({
      ...current,
      links: { ...current.links, [key]: value.trim() === '' ? null : value },
    }));
  }

  function patchExtraLinks(update: (links: ContactLink[]) => ContactLink[]) {
    setForm((current) => ({
      ...current,
      links: { ...current.links, more: update(current.links.more ?? []) },
    }));
  }

  function patchExtraLink(index: number, key: 'label' | 'href', value: string) {
    patchExtraLinks((links) =>
      links.map((link, position) => (position === index ? { ...link, [key]: value } : link)),
    );
  }

  function moveExtraLink(index: number, direction: -1 | 1) {
    patchExtraLinks((links) => {
      const target = index + direction;
      if (target < 0 || target >= links.length) return links;
      const next = [...links];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function patchPrinciple(index: number, key: 'title' | 'body', value: string) {
    setForm((current) => ({
      ...current,
      principles: current.principles.map((principle, position) =>
        position === index ? { ...principle, [key]: value } : principle,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const saved = await saveProfile(form);
      setForm(structuredClone(saved));
      setContent({ ...content, profile: saved });
      setStatus({ tone: 'ok', message: 'Profile saved. Public pages now use this content.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message:
          error instanceof ApiError
            ? [error.message, ...error.details].join(' ')
            : 'The profile could not be saved.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-page" onSubmit={handleSubmit} noValidate>
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Profile</p>
          <h1 className="admin-title">Public identity and details</h1>
          <p className="admin-page__intro">
            Everything here is rendered on the public site. Leave a link empty to hide it rather
            than publishing an address you cannot verify.
          </p>
        </div>
      </header>

      <section className="admin-card" aria-labelledby="identity-heading">
        <h2 className="admin-card__title" id="identity-heading">
          Identity
        </h2>
        <div className="admin-grid admin-grid--two">
          <TextInput label="Name" value={form.name} onChange={(value) => patch('name', value)} maxLength={80} />
          <TextInput
            label="First name"
            value={form.firstName}
            onChange={(value) => patch('firstName', value)}
            maxLength={40}
          />
          <TextInput
            label="Monogram initials"
            value={form.initials}
            onChange={(value) => patch('initials', value)}
            maxLength={4}
          />
          <TextInput label="Role" value={form.role} onChange={(value) => patch('role', value)} maxLength={80} />
        </div>
        <TextInput
          label="Professional headline"
          value={form.headline}
          onChange={(value) => patch('headline', value)}
          maxLength={160}
          hint="Used in structured data and social descriptions."
        />
        <StringList
          label="Roles and disciplines"
          value={form.disciplines}
          onChange={(value) => patch('disciplines', value)}
          rows={4}
        />
        <TextInput
          label="Positioning line"
          value={form.positioning}
          onChange={(value) => patch('positioning', value)}
          maxLength={160}
          hint="The compact line printed at the top of the resume."
        />
      </section>

      <section className="admin-card" aria-labelledby="copy-heading">
        <h2 className="admin-card__title" id="copy-heading">
          Introduction
        </h2>
        <TextArea
          label="Intro"
          value={form.intro}
          onChange={(value) => patch('intro', value)}
          rows={4}
          maxLength={600}
        />
        <TextArea
          label="Short intro"
          value={form.shortIntro}
          onChange={(value) => patch('shortIntro', value)}
          rows={3}
          maxLength={300}
        />
        <TextArea
          label="Response note"
          value={form.responseNote}
          onChange={(value) => patch('responseNote', value)}
          rows={3}
          maxLength={400}
          hint="Shown on the contact page under “What happens next”."
        />
      </section>

      <section className="admin-card" aria-labelledby="details-heading">
        <h2 className="admin-card__title" id="details-heading">
          Location, availability, and education
        </h2>
        <div className="admin-grid admin-grid--three">
          <TextInput
            label="Location"
            value={form.location}
            onChange={(value) => patch('location', value)}
            maxLength={80}
          />
          <TextInput
            label="Time zone"
            value={form.timezone}
            onChange={(value) => patch('timezone', value)}
            maxLength={40}
          />
          <TextInput
            label="Work preference"
            value={form.workPreference}
            onChange={(value) => patch('workPreference', value)}
            maxLength={80}
          />
        </div>

        <div className="admin-grid admin-grid--three">
          <TextInput
            label="Education field"
            value={form.education.field}
            onChange={(value) => patch('education', { ...form.education, field: value })}
            maxLength={120}
          />
          <TextInput
            label="Education status"
            value={form.education.status}
            onChange={(value) => patch('education', { ...form.education, status: value })}
            maxLength={80}
          />
          <TextInput
            label="Education note"
            value={form.education.note}
            onChange={(value) => patch('education', { ...form.education, note: value })}
            maxLength={300}
          />
        </div>

        <Toggle
          label="Available for work"
          checked={form.availability.available}
          onChange={(value) =>
            patch('availability', { ...form.availability, available: value })
          }
          hint="Controls the status pills across the site."
        />
        <div className="admin-grid admin-grid--two">
          <TextInput
            label="Availability label"
            value={form.availability.label}
            onChange={(value) => patch('availability', { ...form.availability, label: value })}
            maxLength={80}
          />
          <TextInput
            label="Availability detail"
            value={form.availability.detail}
            onChange={(value) => patch('availability', { ...form.availability, detail: value })}
            maxLength={240}
          />
        </div>
      </section>

      <section className="admin-card" aria-labelledby="links-heading">
        <h2 className="admin-card__title" id="links-heading">
          Contact links
        </h2>
        <p className="admin-page__intro">
          Every link with a URL appears on the contact page. Leave a field empty to hide that
          link. Extra links can be labelled and ordered however you like.
        </p>
        <div className="admin-grid admin-grid--two">
          <TextInput
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(value) => patch('email', value.trim() === '' ? null : value)}
            hint="Leave empty to hide mailto links."
          />
          <TextInput
            label="GitHub"
            type="url"
            value={form.links.github ?? ''}
            onChange={(value) => patchLink('github', value)}
            hint="Full https:// URL."
          />
          <TextInput
            label="LinkedIn"
            type="url"
            value={form.links.linkedin ?? ''}
            onChange={(value) => patchLink('linkedin', value)}
          />
          <TextInput
            label="Upwork"
            type="url"
            value={form.links.upwork ?? ''}
            onChange={(value) => patchLink('upwork', value)}
          />
        </div>

        <h3 className="admin-eyebrow admin-links-heading">More links</h3>
        <p className="admin-field__hint">
          Add any other profile or contact page, for example X, Instagram, Stack Overflow, or a
          personal site. Links appear directly below GitHub, LinkedIn, and Upwork.
        </p>
        {(form.links.more ?? []).map((link, index) => (
          <div className="admin-subcard" key={link.id}>
            <div className="admin-subcard__head">
              <span className="admin-eyebrow">Extra link {index + 1}</span>
              <div className="admin-savebar__actions">
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => moveExtraLink(index, -1)}
                  disabled={index === 0}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => moveExtraLink(index, 1)}
                  disabled={index === form.links.more.length - 1}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() =>
                    patchExtraLinks((links) => links.filter((_, position) => position !== index))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="admin-grid admin-grid--two">
              <TextInput
                label="Label"
                value={link.label}
                onChange={(value) => patchExtraLink(index, 'label', value)}
                maxLength={40}
                placeholder="X (Twitter)"
              />
              <TextInput
                label="URL"
                type="url"
                value={link.href}
                onChange={(value) => patchExtraLink(index, 'href', value)}
                placeholder="https://example.com/you"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() =>
            patchExtraLinks((links) => [...links, { id: newLinkId(), label: '', href: '' }])
          }
          disabled={(form.links.more ?? []).length >= MAX_EXTRA_LINKS}
        >
          Add link
        </button>
      </section>

      <section className="admin-card" aria-labelledby="media-heading">
        <h2 className="admin-card__title" id="media-heading">
          Portrait and sharing image
        </h2>
        <div className="admin-grid admin-grid--two">
          <ImageUpload
            label="Portrait"
            kind="portrait"
            value={form.portrait}
            onChange={(value) => patch('portrait', value)}
            hint="JPEG, PNG, or WebP up to 5 MB. Uploaded to durable media storage."
          />
          <div>
            <TextInput
              label="Portrait alt text"
              value={form.portraitAlt}
              onChange={(value) => patch('portraitAlt', value)}
              maxLength={160}
            />
            <ImageUpload
              label="Social sharing image"
              kind="share"
              value={form.shareImage}
              onChange={(value) => patch('shareImage', value)}
              hint="Used for Open Graph/Twitter cards when set. Recommended 1200×630."
            />
          </div>
        </div>
      </section>

      <section className="admin-card" aria-labelledby="resume-heading">
        <h2 className="admin-card__title" id="resume-heading">
          Resume
        </h2>
        <div className="admin-grid admin-grid--two">
          <TextInput
            label="Resume page path"
            value={form.resume.href}
            onChange={(value) => patch('resume', { ...form.resume, href: value })}
            hint="Site-relative path, usually /resume."
          />
          <TextInput
            label="Resume PDF path"
            value={form.resume.pdf}
            onChange={(value) => patch('resume', { ...form.resume, pdf: value })}
            hint="For example /akib-ahmed-resume.pdf or an uploaded /media path."
          />
          <TextInput
            label="Resume label"
            value={form.resume.label}
            onChange={(value) => patch('resume', { ...form.resume, label: value })}
            maxLength={60}
          />
          <TextInput
            label="Resume note"
            value={form.resume.note}
            onChange={(value) => patch('resume', { ...form.resume, note: value })}
            maxLength={300}
          />
        </div>
        <FileUpload
          label="Replace the resume PDF"
          value={form.resume.pdf || null}
          onChange={(value) =>
            patch('resume', { ...form.resume, pdf: value ?? '/akib-ahmed-resume.pdf' })
          }
          hint="PDF up to 5 MB. Uploading replaces the download behind the resume page without a rebuild."
        />
      </section>

      <section className="admin-card" aria-labelledby="principles-heading">
        <h2 className="admin-card__title" id="principles-heading">
          Engineering principles
        </h2>
        {form.principles.map((principle, index) => (
          <div className="admin-subcard" key={index}>
            <div className="admin-subcard__head">
              <span className="admin-eyebrow">Principle {index + 1}</span>
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    principles: current.principles.filter((_, position) => position !== index),
                  }))
                }
              >
                Remove
              </button>
            </div>
            <AdminField label="Title">
              <input
                className="admin-input"
                value={principle.title}
                maxLength={120}
                onChange={(event) => patchPrinciple(index, 'title', event.target.value)}
              />
            </AdminField>
            <TextArea
              label="Body"
              value={principle.body}
              onChange={(value) => patchPrinciple(index, 'body', value)}
              rows={3}
              maxLength={600}
            />
          </div>
        ))}
        {form.principles.length < 6 ? (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() =>
              setForm((current) => ({
                ...current,
                principles: [...current.principles, { title: '', body: '' }],
              }))
            }
          >
            Add principle
          </button>
        ) : null}
      </section>

      <SaveBar pending={pending} status={status} onCancel={() => setForm(structuredClone(content.profile))} />
    </form>
  );
}
