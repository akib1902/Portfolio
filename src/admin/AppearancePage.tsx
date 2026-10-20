import { useEffect, useState } from 'react';
import type { ThemeId } from '@/content/types';
import { useAdmin } from './AdminContext';
import { useTheme } from '@/lib/theme';
import { themes } from '@/lib/themes';
import { ApiError, saveSettings } from './api';
import { SaveBar } from './fields';

type Status = { tone: 'ok' | 'error'; message: string } | null;

export default function AppearancePage() {
  const { content, setContent } = useAdmin();
  const { theme: visitorTheme } = useTheme();
  const [selected, setSelected] = useState<ThemeId>(content.settings.defaultTheme);
  const [preview, setPreview] = useState<ThemeId | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // A preview is temporary: leaving the page restores the visitor's own theme.
  useEffect(() => {
    return () => {
      document.documentElement.dataset.theme = visitorTheme;
    };
  }, [visitorTheme]);

  function previewTheme(theme: ThemeId) {
    setPreview(theme);
    document.documentElement.dataset.theme = theme;
  }

  function stopPreview() {
    setPreview(null);
    document.documentElement.dataset.theme = visitorTheme;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      const saved = await saveSettings({ defaultTheme: selected });
      setContent({ ...content, settings: saved });
      setStatus({
        tone: 'ok',
        message: `${saved.defaultTheme} is now the default. Visitors without a saved preference will see it on their next page load.`,
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message:
          error instanceof ApiError
            ? [error.message, ...error.details].join(' ')
            : 'The default theme could not be saved.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-page" onSubmit={handleSubmit}>
      <header className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Appearance</p>
          <h1 className="admin-title">Default theme</h1>
          <p className="admin-page__intro">
            The default applies to new visitors only. Visitors who chose a theme keep their own
            preference in this browser; theme choice never changes content, metadata, or access.
          </p>
        </div>
      </header>

      <div className="admin-card">
        <fieldset className="admin-fieldset">
          <legend className="admin-field__label">Choose the default theme</legend>
          <div className="admin-theme-grid">
            {themes.map((item) => (
              <label
                key={item.id}
                className={`admin-theme${selected === item.id ? ' admin-theme--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="defaultTheme"
                  value={item.id}
                  checked={selected === item.id}
                  onChange={() => setSelected(item.id)}
                  className="admin-theme__radio"
                />
                <span className={`admin-theme__swatch admin-theme__swatch--${item.id}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="admin-theme__name">{item.label}</span>
                <span className="admin-theme__desc">{item.description}</span>
                <button
                  type="button"
                  className="btn btn--quiet btn--small admin-theme__preview"
                  onClick={() => previewTheme(item.id)}
                >
                  Preview
                </button>
              </label>
            ))}
          </div>
        </fieldset>

        {preview ? (
          <p className="admin-status" role="status">
            Previewing <strong>{preview}</strong>. This is local to your browser and is not saved.
            <button type="button" className="btn btn--secondary btn--small" onClick={stopPreview}>
              Stop preview
            </button>
          </p>
        ) : null}
      </div>

      <div className="admin-card">
        <h2 className="admin-card__title">How the preference is stored</h2>
        <ul className="admin-list">
          <li>The default theme lives in the database and is read by every server-rendered page.</li>
          <li>A visitor’s choice is stored in their own browser under <code>akib-portfolio-theme</code>.</li>
          <li>An invalid or removed theme falls back to the configured default instead of breaking the page.</li>
          <li>The chosen theme is applied before first paint so the page does not flash the wrong colours.</li>
        </ul>
      </div>

      <SaveBar pending={pending} status={status} label="Save default theme" />
    </form>
  );
}
