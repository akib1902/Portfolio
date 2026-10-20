import { useState } from 'react';
import type { SkillsDocument } from '@/content/types';
import { useAdmin } from './AdminContext';
import { ApiError, saveSkills } from './api';
import { AdminField, SaveBar, StringList, TextArea, TextInput } from './fields';

type Status = { tone: 'ok' | 'error'; message: string } | null;

export default function SkillsPage() {
  const { content, setContent } = useAdmin();
  const [form, setForm] = useState<SkillsDocument>(() => structuredClone(content.skills));
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  function patchGroup(index: number, values: Partial<SkillsDocument['groups'][number]>) {
    setForm((current) => ({
      ...current,
      groups: current.groups.map((group, position) =>
        position === index ? { ...group, ...values } : group,
      ),
    }));
  }

  function moveGroup(index: number, direction: -1 | 1) {
    setForm((current) => {
      const groups = [...current.groups];
      const target = index + direction;
      if (target < 0 || target >= groups.length) return current;
      [groups[index], groups[target]] = [groups[target], groups[index]];
      return {
        ...current,
        groups: groups.map((group, position) => ({ ...group, index: String(position + 1).padStart(2, '0') })),
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const saved = await saveSkills(form);
      setForm(structuredClone(saved));
      setContent({ ...content, skills: saved });
      setStatus({ tone: 'ok', message: 'Skills saved.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message:
          error instanceof ApiError
            ? [error.message, ...error.details].join(' ')
            : 'The skills could not be saved.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-page" onSubmit={handleSubmit} noValidate>
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Skills</p>
          <h1 className="admin-title">Capability groups</h1>
          <p className="admin-page__intro">
            Groups appear on the home page, the About page, and the resume. Highlighted items also
            appear in the compact home-page summary.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() =>
            setForm((current) => ({
              ...current,
              groups: [
                ...current.groups,
                {
                  id: `group-${current.groups.length + 1}`,
                  index: String(current.groups.length + 1).padStart(2, '0'),
                  title: '',
                  kicker: '',
                  description: '',
                  items: [],
                  highlighted: [],
                },
              ],
            }))
          }
        >
          Add group
        </button>
      </header>

      <section className="admin-card">
        <TextArea
          label="Toolkit note"
          value={form.note}
          onChange={(value) => setForm((current) => ({ ...current, note: value }))}
          rows={3}
          maxLength={600}
        />
      </section>

      {form.groups.map((group, index) => (
        <section className="admin-card" key={index} aria-label={`Skill group ${index + 1}`}>
          <div className="admin-card__head">
            <h2 className="admin-card__title">{group.title || `Group ${index + 1}`}</h2>
            <div className="admin-savebar__actions">
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => moveGroup(index, -1)}
                disabled={index === 0}
              >
                Move up
              </button>
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() => moveGroup(index, 1)}
                disabled={index === form.groups.length - 1}
              >
                Move down
              </button>
              <button
                type="button"
                className="btn btn--quiet btn--small"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    groups: current.groups.filter((_, position) => position !== index),
                  }))
                }
                disabled={form.groups.length === 1}
              >
                Remove
              </button>
            </div>
          </div>

          <div className="admin-grid admin-grid--three">
            <TextInput
              label="Group id"
              value={group.id}
              onChange={(value) =>
                patchGroup(index, { id: value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })
              }
              hint="Lowercase; used for anchors and links."
            />
            <AdminField label="Index label">
              <input
                className="admin-input"
                value={group.index}
                onChange={(event) => patchGroup(index, { index: event.target.value })}
              />
            </AdminField>
            <TextInput
              label="Title"
              value={group.title}
              onChange={(value) => patchGroup(index, { title: value })}
            />
          </div>

          <TextInput
            label="Kicker"
            value={group.kicker}
            onChange={(value) => patchGroup(index, { kicker: value })}
          />
          <TextArea
            label="Description"
            value={group.description}
            onChange={(value) => patchGroup(index, { description: value })}
            rows={3}
          />

          <div className="admin-grid admin-grid--two">
            <StringList
              label="Skills"
              value={group.items}
              onChange={(value) => patchGroup(index, { items: value })}
              rows={9}
            />
            <StringList
              label="Highlighted skills"
              value={group.highlighted}
              onChange={(value) => patchGroup(index, { highlighted: value })}
              rows={5}
              hint="One per line. Used in the home-page summary; keep 3–4 per group."
            />
          </div>
        </section>
      ))}

      <SaveBar pending={pending} status={status} onCancel={() => setForm(structuredClone(content.skills))} />
    </form>
  );
}
