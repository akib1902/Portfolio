import { describe, expect, it } from 'vitest';
import { buildContactEmail, escapeHtml } from './email';

const data = {
  name: 'Akib <script>alert(1)</script>',
  email: 'hello@example.com',
  inquiry: 'project' as const,
  message: 'Please review <b>this</b> & reply soon.',
};

const meta = { id: '53b1f1d0-0000-4000-8000-000000000000', receivedAt: '2026-10-19T12:00:00.000Z' };

describe('escapeHtml', () => {
  it('escapes the characters that matter in email HTML', () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('buildContactEmail', () => {
  it('builds a subject from the inquiry type', () => {
    const email = buildContactEmail(data, meta);
    expect(email.subject).toContain('Portfolio inquiry');
    expect(email.subject.toLowerCase()).toContain('project');
  });

  it('includes the message in both text and HTML bodies', () => {
    const email = buildContactEmail(data, meta);
    expect(email.text).toContain('Please review <b>this</b> & reply soon.');
    expect(email.html).toContain('Please review &lt;b&gt;this&lt;/b&gt; &amp; reply soon.');
  });

  it('never injects raw user HTML into the email body', () => {
    const email = buildContactEmail(data, meta);
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('includes the reference id and reply address', () => {
    const email = buildContactEmail(data, meta);
    expect(email.text).toContain(meta.id);
    expect(email.html).toContain('mailto:hello@example.com');
  });
});
