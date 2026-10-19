import type { ContactInput } from '../src/lib/contact-schema';
import { inquiryLabel } from '../src/lib/contact-schema';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface ContactEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildContactEmail(
  data: ContactInput,
  meta: { id: string; receivedAt: string },
): ContactEmail {
  const label = inquiryLabel(data.inquiry);
  const subject = `Portfolio inquiry — ${label}`;

  const text = [
    `New message from your portfolio`,
    ``,
    `Name:      ${data.name}`,
    `Email:     ${data.email}`,
    `Inquiry:   ${label}`,
    `Received:  ${meta.receivedAt}`,
    `Reference: ${meta.id}`,
    ``,
    `Message`,
    `-------`,
    data.message,
    ``,
    `Reply directly to this email to answer ${data.name}.`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#282720;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFCF6;border:1px solid #D9D0C3;border-radius:10px;">
      <tr>
        <td style="padding:24px 28px;border-bottom:1px solid #D9D0C3;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6E6A60;">Portfolio inquiry</p>
          <h1 style="margin:0;font-size:20px;line-height:1.3;">${escapeHtml(label)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 4px;font-size:12px;color:#6E6A60;">From</p>
          <p style="margin:0 0 16px;font-size:15px;"><strong>${escapeHtml(data.name)}</strong><br />
            <a href="mailto:${escapeHtml(data.email)}" style="color:#8A5714;">${escapeHtml(data.email)}</a>
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#6E6A60;">Message</p>
          <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;">${escapeHtml(data.message)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #D9D0C3;font-size:11px;color:#6E6A60;">
          Received ${escapeHtml(meta.receivedAt)} · Reference ${escapeHtml(meta.id)}
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
