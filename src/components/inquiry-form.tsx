'use client';

import { CalendarCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { sendInquiry, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import { cn } from '@/lib/cn';

export function InquiryForm({
  postId,
  fromPostId,
  isOffer,
  days,
  defaultMessage,
}: {
  postId: string;
  fromPostId: string | null;
  isOffer: boolean;
  days: { iso: string; label: string }[];
  defaultMessage: string;
}) {
  const [kind, setKind] = useState<'contact' | 'viewing'>(isOffer ? 'viewing' : 'contact');
  const [state, action, pending] = useActionForm<FormState>(sendInquiry, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-success-soft px-5 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-lg font-semibold">Forespørselen er sendt</p>
        <p className="text-sm text-muted">De får navnet, firmaet og kontaktinfoen din og svarer deg direkte. Du finner den under Mine annonser.</p>
      </div>
    );
  }

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="kind" value={kind} />
      {fromPostId ? <input type="hidden" name="from_post_id" value={fromPostId} /> : null}
      {isOffer ? (
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
          {(
            [
              ['viewing', 'Be om visning', CalendarCheck],
              ['contact', 'Kontakt utleier', MessageSquare],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg py-2 transition', kind === k ? 'bg-surface shadow-sm' : 'text-muted')}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {kind === 'viewing' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Når passer det?</legend>
          <div className="flex flex-wrap gap-2">
            {days.map((d, i) => (
              <label key={d.iso} className="cursor-pointer">
                <input type="radio" name="preferred_date" value={d.iso} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block rounded-full border border-border px-3 py-1.5 text-sm transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white">{d.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Melding</span>
        <textarea name="message" rows={4} defaultValue={defaultMessage} className="field resize-y" />
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Sender …' : kind === 'viewing' ? 'Send forespørsel om visning' : isOffer ? 'Send melding til utleier' : 'Tilby lokalet ditt'}
      </button>
    </form>
  );
}
