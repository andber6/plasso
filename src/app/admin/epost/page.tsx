import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db, emails, profiles } from '@/db';
import { getUser, isAdmin } from '@/lib/auth';
import { formatRelative } from '@/lib/market/format';

/** Every e-mail the app has queued. Until a provider is connected, this is where they land. */
export default async function EmailLogPage() {
  const u = await getUser();
  if (!isAdmin(u)) notFound();
  const [rows, people] = await Promise.all([db.select().from(emails).orderBy(desc(emails.created_at)).limit(100), db.select().from(profiles)]);

  // Admins only see contact details of people who agreed to be contacted
  // (same rule as /admin and the CSV). Everything else is masked.
  const allowed = new Set(
    people.filter((p) => p.contact_ok).flatMap((p) => [p.email.toLowerCase(), p.phone.replace(/\s/g, '')].filter(Boolean)),
  );
  const redact = (text: string) =>
    text
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, (m) => (allowed.has(m.toLowerCase()) ? m : '•••@•••'))
      .replace(/(\+\d{2}\s?)?\b\d{3}\s?\d{2}\s?\d{3}\b/g, (m) => (allowed.has(m.replace(/\s/g, '')) ? m : '••• •• •••'));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">← Etterspørsel</Link>
        <h1 className="mt-2 text-3xl font-bold">E-postlogg</h1>
        <p className="mt-1 text-muted">Matchvarsler og forespørsler Plasso sender. E-post er ikke koblet til en leverandør ennå, så de samles her. Kontaktinfo vises bare for dem som har sagt ja til å bli kontaktet.</p>
      </div>
      {rows.length ? (
        <ul className="flex flex-col gap-3">
          {rows.map((e) => (
            <li key={e.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{e.subject}</p>
                <span className="text-sm text-muted">{formatRelative(e.created_at)}</span>
              </div>
              <p className="font-mono text-xs text-muted">til {redact(e.to)}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{redact(e.body)}</pre>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Ingen e-poster ennå.</p>
      )}
    </div>
  );
}
