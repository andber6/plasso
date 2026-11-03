'use client';

import { MailCheck } from 'lucide-react';

import { requestMagicLink, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';

export function MagicLinkForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useActionForm<FormState>(requestMagicLink, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-success-soft px-5 py-8 text-center">
        <MailCheck className="h-8 w-8 text-success" />
        <p className="text-lg font-semibold">Sjekk e-posten din</p>
        <p className="text-sm text-muted">Vi har sendt deg en lenke. Klikk på den for å logge inn. Den virker i én time. Finner du den ikke, sjekk søppelpost.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-post</span>
        <input name="email" type="email" required autoComplete="email" placeholder="kari@firma.no" className="field" />
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Sender …' : 'Send meg en innloggingslenke'}
      </button>
      <p className="text-center text-xs text-muted">Ny her? Samme knapp. Vi lager kontoen når du klikker på lenken. Ingen passord å huske.</p>
    </form>
  );
}
