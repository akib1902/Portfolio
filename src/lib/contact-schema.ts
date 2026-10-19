import { z } from 'zod';

export const INQUIRY_OPTIONS = [
  { value: 'project', label: 'A project or freelance engagement' },
  { value: 'role', label: 'A full-time or contract role' },
  { value: 'collaboration', label: 'A collaboration or open-source idea' },
  { value: 'other', label: 'Something else' },
] as const;

export type InquiryValue = (typeof INQUIRY_OPTIONS)[number]['value'];
export type ContactField = 'name' | 'email' | 'inquiry' | 'message';
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 2000;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please use at least 2 characters.')
    .max(80, 'Please keep your name under 80 characters.'),
  email: z
    .string()
    .trim()
    .min(1, 'An email address is required so I can reply.')
    .max(254, 'That email address is too long.')
    .email('Enter a valid email address, for example name@company.com.'),
  inquiry: z.enum(['project', 'role', 'collaboration', 'other'], {
    message: 'Choose an inquiry type.',
  }),
  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, `Please add at least ${MESSAGE_MIN} characters of context.`)
    .max(MESSAGE_MAX, `Please keep the message under ${MESSAGE_MAX} characters.`),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Converts Zod issues into field-keyed messages. Structural typing keeps this
 * independent of Zod's internal type names across major versions.
 */
export function fieldErrorsFromIssues(
  issues: ReadonlyArray<{ path: readonly PropertyKey[]; message: string }>,
): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      (key === 'name' || key === 'email' || key === 'inquiry' || key === 'message') &&
      !errors[key]
    ) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function inquiryLabel(value: InquiryValue): string {
  return INQUIRY_OPTIONS.find((option) => option.value === value)?.label ?? 'General inquiry';
}
