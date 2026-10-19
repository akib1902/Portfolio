import { describe, expect, it } from 'vitest';
import {
  contactSchema,
  fieldErrorsFromIssues,
  inquiryLabel,
  MESSAGE_MAX,
} from './contact-schema';

const valid = {
  name: '  Akib Ahmed  ',
  email: '  hello@example.com ',
  inquiry: 'project' as const,
  message: 'I would like to discuss a multi-step settlement workflow with you.',
};

describe('contactSchema', () => {
  it('accepts a valid submission and trims text fields', () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Akib Ahmed');
      expect(result.data.email).toBe('hello@example.com');
    }
  });

  it('rejects an invalid email address', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromIssues(result.error.issues);
      expect(errors.email).toMatch(/valid email/i);
    }
  });

  it('rejects a short message with a useful error', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'too short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromIssues(result.error.issues);
      expect(errors.message).toMatch(/at least/i);
    }
  });

  it('rejects an unknown inquiry type', () => {
    const result = contactSchema.safeParse({ ...valid, inquiry: 'sales' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFromIssues(result.error.issues).inquiry).toBeTruthy();
    }
  });

  it('rejects a name that is only one character', () => {
    const result = contactSchema.safeParse({ ...valid, name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFromIssues(result.error.issues).name).toMatch(/2 characters/);
    }
  });

  it('strips unknown fields such as the honeypot', () => {
    const result = contactSchema.safeParse({ ...valid, website: 'spam.example' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('website' in result.data).toBe(false);
    }
  });

  it('enforces the maximum message length', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'a'.repeat(MESSAGE_MAX + 1) });
    expect(result.success).toBe(false);
  });
});

describe('fieldErrorsFromIssues', () => {
  it('returns one message per recognised field', () => {
    const result = contactSchema.safeParse({
      name: 'A',
      email: 'bad',
      inquiry: 'nope',
      message: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFromIssues(result.error.issues);
      expect(Object.keys(errors).sort()).toEqual(['email', 'inquiry', 'message', 'name']);
    }
  });
});

describe('inquiryLabel', () => {
  it('maps values to human labels', () => {
    expect(inquiryLabel('role')).toMatch(/role/i);
    expect(inquiryLabel('other')).toBe('Something else');
  });
});
