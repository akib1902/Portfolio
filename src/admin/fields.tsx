import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { deleteMedia, uploadImage } from './api';

export function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {children}
      {hint ? <span className="admin-field__hint">{hint}</span> : null}
      {error ? (
        <span className="admin-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  hint,
  maxLength,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  maxLength?: number;
  type?: 'text' | 'url' | 'email';
  placeholder?: string;
}) {
  return (
    <AdminField label={label} hint={hint}>
      <input
        className="admin-input"
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </AdminField>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  rows = 5,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <AdminField label={label} hint={hint}>
      <textarea
        className="admin-textarea"
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </AdminField>
  );
}

export function StringList({
  label,
  value,
  onChange,
  hint,
  rows = 6,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  rows?: number;
}) {
  return (
    <AdminField label={label} hint={hint ?? 'One item per line.'}>
      <textarea
        className="admin-textarea admin-textarea--mono"
        rows={rows}
        value={value.join('\n')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
      />
    </AdminField>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="admin-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="admin-toggle__label">{label}</span>
        {hint ? <span className="admin-field__hint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SaveBar({
  pending,
  status,
  onCancel,
  label = 'Save changes',
}: {
  pending: boolean;
  status: { tone: 'ok' | 'error'; message: string } | null;
  onCancel?: () => void;
  label?: string;
}) {
  return (
    <div className="admin-savebar">
      <div className="admin-savebar__actions">
        <button type="submit" className="btn btn--primary btn--small" disabled={pending}>
          {pending ? 'Saving…' : label}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
      </div>
      {status ? (
        <p
          className={`admin-status admin-status--${status.tone}`}
          role={status.tone === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

export function ImageUpload({
  label,
  kind,
  value,
  onChange,
  hint,
}: {
  label: string;
  kind: 'portrait' | 'share' | 'project';
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function chooseFile(next: File | null) {
    setStatus(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setFile(next);
    if (!next) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setStatus({ tone: 'error', message: 'Choose a JPEG, PNG, or WebP image.' });
      setFile(null);
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setStatus({ tone: 'error', message: 'Images must be 5 MB or smaller.' });
      setFile(null);
      return;
    }
    setObjectUrl(URL.createObjectURL(next));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const media = await uploadImage(kind, file);
      onChange(media.url);
      setStatus({ tone: 'ok', message: 'Uploaded. Save the form to publish it.' });
      setFile(null);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'The upload failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeStored() {
    if (value?.startsWith('/media/')) {
      const filename = value.slice('/media/'.length);
      setBusy(true);
      try {
        await deleteMedia(filename);
      } catch {
        /* Removing the reference still works if the file is already gone. */
      } finally {
        setBusy(false);
      }
    }
    onChange(null);
    setStatus({ tone: 'ok', message: 'Image removed from this form. Save to apply.' });
    if (inputRef.current) inputRef.current.value = '';
  }

  const shown = objectUrl ?? value;

  return (
    <div className="admin-field admin-media">
      <span className="admin-field__label">{label}</span>
      {hint ? <span className="admin-field__hint">{hint}</span> : null}

      <div className="admin-media__preview">
        {shown ? (
          <img src={shown} alt={`${label} preview`} />
        ) : (
          <span className="admin-media__empty">No image selected</span>
        )}
      </div>

      <input
        ref={inputRef}
        className="admin-input admin-input--file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      />

      <div className="admin-savebar__actions">
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => void upload()}
          disabled={!file || busy}
        >
          {busy ? 'Uploading…' : 'Upload image'}
        </button>
        {value ? (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => void removeStored()}
            disabled={busy}
          >
            Remove
          </button>
        ) : null}
      </div>

      {status ? (
        <span className={`admin-status admin-status--${status.tone}`} role="status">
          {status.message}
        </span>
      ) : null}
    </div>
  );
}
