import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  INQUIRY_OPTIONS,
  MESSAGE_MAX,
  MESSAGE_MIN,
  contactSchema,
  fieldErrorsFromIssues,
} from '@/lib/contact-schema';
import type { ContactField, ContactFieldErrors, InquiryValue } from '@/lib/contact-schema';
import { AlertIcon, ArrowRight, CheckIcon } from './icons';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface FormValues {
  name: string;
  email: string;
  inquiry: InquiryValue;
  message: string;
  website: string;
}

const initialValues: FormValues = {
  name: '',
  email: '',
  inquiry: 'project',
  message: '',
  website: '',
};

const fieldOrder: ContactField[] = ['name', 'email', 'inquiry', 'message'];

export function ContactForm() {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState('');
  const [reference, setReference] = useState('');
  const successRef = useRef<HTMLHeadingElement>(null);

  const ids: Record<ContactField, string> = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    inquiry: `${uid}-inquiry`,
    message: `${uid}-message`,
  };

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key !== 'website' && errors[key as ContactField]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
    if (status === 'error') {
      setStatus('idle');
      setFormError('');
    }
  }

  function validateField(field: ContactField) {
    const result = contactSchema.safeParse(values);
    const next = result.success ? {} : fieldErrorsFromIssues(result.error.issues);
    setErrors((current) => ({ ...current, [field]: next[field] }));
  }

  function handleBlur(field: ContactField) {
    validateField(field);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setReference('');

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors = fieldErrorsFromIssues(parsed.error.issues);
      setErrors(nextErrors);
      setStatus('error');
      setFormError('Please check the highlighted fields and try again.');
      const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
      if (firstInvalid) document.getElementById(ids[firstInvalid])?.focus();
      return;
    }

    setErrors({});
    setStatus('submitting');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          inquiry: parsed.data.inquiry,
          message: parsed.data.message,
          website: values.website,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
        fieldErrors?: ContactFieldErrors;
      };

      if (!response.ok) {
        if (payload.fieldErrors) setErrors(payload.fieldErrors);
        setFormError(
          payload.error ??
            'The message could not be sent right now. Please try again in a moment.',
        );
        setStatus('error');
        return;
      }

      setReference(payload.id ?? '');
      setStatus('success');
      setValues(initialValues);
      window.setTimeout(() => successRef.current?.focus(), 60);
    } catch (error) {
      setStatus('error');
      setFormError(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The request took too long. Check your connection and try again.'
          : 'The message could not be sent. Check your connection and try again.',
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }

  if (status === 'success') {
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span className="form-success__icon" aria-hidden="true">
          <CheckIcon size={18} />
        </span>
        <h3 className="form-success__title" ref={successRef} tabIndex={-1}>
          Message received
        </h3>
        <p className="form-success__body">
          Thanks for reaching out. Your message is safely stored, and I will reply to the email
          address you provided. If it is urgent, you can send a follow-up through the same form.
        </p>
        {reference ? (
          <p className="form-success__reference">Reference · {reference.slice(0, 8)}</p>
        ) : null}
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => {
            setStatus('idle');
            setErrors({});
            setFormError('');
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';
  const messageCount = values.message.length;

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {status === 'error' && formError ? (
        <div className="form-status form-status--error" role="alert">
          <AlertIcon size={17} />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="form-row">
        <div className={`field${errors.name ? ' field--invalid' : ''}`}>
          <label className="field__label" htmlFor={ids.name}>
            Name
          </label>
          <input
            id={ids.name}
            name="name"
            className="field__control"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            onBlur={() => handleBlur('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${ids.name}-error` : undefined}
            placeholder="Your name"
            maxLength={80}
            required
          />
          {errors.name ? (
            <p className="field__error" id={`${ids.name}-error`}>
              <AlertIcon size={13} />
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={`field${errors.email ? ' field--invalid' : ''}`}>
          <label className="field__label" htmlFor={ids.email}>
            Email
          </label>
          <input
            id={ids.email}
            name="email"
            className="field__control"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            onBlur={() => handleBlur('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${ids.email}-error` : undefined}
            placeholder="you@company.com"
            maxLength={254}
            required
          />
          {errors.email ? (
            <p className="field__error" id={`${ids.email}-error`}>
              <AlertIcon size={13} />
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className={`field${errors.inquiry ? ' field--invalid' : ''}`}>
        <label className="field__label" htmlFor={ids.inquiry}>
          What is this about?
        </label>
        <select
          id={ids.inquiry}
          name="inquiry"
          className="field__control"
          value={values.inquiry}
          onChange={(event) => update('inquiry', event.target.value as InquiryValue)}
          onBlur={() => handleBlur('inquiry')}
          aria-invalid={Boolean(errors.inquiry)}
          aria-describedby={errors.inquiry ? `${ids.inquiry}-error` : undefined}
        >
          {INQUIRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.inquiry ? (
          <p className="field__error" id={`${ids.inquiry}-error`}>
            <AlertIcon size={13} />
            {errors.inquiry}
          </p>
        ) : null}
      </div>

      <div className={`field${errors.message ? ' field--invalid' : ''}`}>
        <label className="field__label" htmlFor={ids.message}>
          <span>Message</span>
          <span className="field__optional">
            {messageCount} / {MESSAGE_MAX}
          </span>
        </label>
        <textarea
          id={ids.message}
          name="message"
          className="field__control"
          value={values.message}
          onChange={(event) => update('message', event.target.value)}
          onBlur={() => handleBlur('message')}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${ids.message}-error` : `${ids.message}-hint`}
          placeholder="What are you building, what stage is it at, and what kind of help do you need?"
          maxLength={MESSAGE_MAX}
          minLength={MESSAGE_MIN}
          required
        />
        {errors.message ? (
          <p className="field__error" id={`${ids.message}-error`}>
            <AlertIcon size={13} />
            {errors.message}
          </p>
        ) : (
          <p className="field__hint" id={`${ids.message}-hint`}>
            A few sentences of context is enough. Please do not include passwords or sensitive
            credentials.
          </p>
        )}
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update('website', event.target.value)}
        />
      </div>

      <div>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              Send message
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>

      <p className="form-legal">
        Your details are used only to reply to this inquiry. Submissions are stored on the server
        and, if email notifications are configured, delivered to a private inbox.
      </p>
    </form>
  );
}
