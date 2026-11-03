import 'server-only';
import { eq } from 'drizzle-orm';

import { db, emails } from '@/db';
import { SITE_URL } from '@/lib/site-url';

/** Real delivery is on when both are set (Resend API key + a verified sender). */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function siteUrl(path = ''): string {
  return `${SITE_URL}${path}`;
}

export interface EmailOptions {
  /** Primary call-to-action rendered as a button in the HTML version. */
  button?: { label: string; url: string };
  /**
   * What to store in the outbox instead of `body`, for messages that carry a
   * secret (sign-in links). Admins read the outbox, so secrets must not land there.
   */
  outboxBody?: string;
}

/**
 * Send an e-mail. Every message is recorded in the `emails` outbox (readable
 * under /admin/epost). When Resend is configured it is also delivered; failures
 * are logged and leave the outbox row marked unsent rather than breaking the
 * request that triggered it.
 */
export async function sendEmail(to: string, subject: string, body: string, opts: EmailOptions = {}) {
  const id = crypto.randomUUID();
  const stored = opts.outboxBody ?? (opts.button ? `${body}\n\n${opts.button.label}: ${opts.button.url}` : body);
  await db.insert(emails).values({ id, to, subject, body: stored });

  if (!emailEnabled()) {
    console.log(`[email] (not sent, no provider) → ${to}: ${subject}`);
    if (process.env.NODE_ENV !== 'production' && opts.button) console.log(`[email]   ${opts.button.label}: ${opts.button.url}`);
    return;
  }

  try {
    const text = opts.button ? `${body}\n\n${opts.button.label}: ${opts.button.url}` : body;
    // RESEND_API_URL only exists so tests can point delivery at a local mock.
    const res = await fetch(`${process.env.RESEND_API_URL ?? 'https://api.resend.com'}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html: renderHtml(subject, body, opts.button),
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    await db.update(emails).set({ sent: true }).where(eq(emails.id, id));
  } catch (err) {
    console.error('[email] delivery failed', err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plain, client-safe HTML in the Fjord og betong colours. */
function renderHtml(subject: string, body: string, button?: { label: string; url: string }): string {
  const paragraphs = escapeHtml(body)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0b4a7d">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const cta = button
    ? `<p style="margin:22px 0 8px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#0b4a7d;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${escapeHtml(button.label)}</a></p>`
    : '';
  return `<!doctype html><html lang="nb"><body style="margin:0;background:#eef1f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0e2a47">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
<p style="margin:0 0 16px;font-weight:700;font-size:18px">Plasso</p>
<div style="background:#ffffff;border:1px solid #dce2e8;border-radius:18px;padding:26px 24px;font-size:15px">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(subject)}</h1>
${paragraphs}${cta}
</div>
<p style="margin:16px 4px 0;font-size:12px;color:#5e6e80">Plasso · Riktig lokale. Riktig match. · <a href="${SITE_URL}" style="color:#5e6e80">${SITE_URL.replace(/^https?:\/\//, '')}</a></p>
</div></body></html>`;
}
