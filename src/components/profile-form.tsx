'use client';



import { saveProfile, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import type { ProfileRow } from '@/db/schema';
import { ROLES } from '@/lib/market/catalog';

export function ProfileForm({ profile, fallbackName }: { profile: ProfileRow | null; fallbackName: string }) {
  const [state, action, pending] = useActionForm<FormState>(saveProfile, undefined);
  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Jeg er</legend>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <label key={r.id} className="cursor-pointer">
              <input type="radio" name="role" value={r.id} defaultChecked={(profile?.role ?? 'leietaker') === r.id} className="peer sr-only" />
              <span className="block rounded-xl border border-border bg-surface py-2.5 text-center text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {(
        [
          ['name', 'Navn', profile?.name ?? fallbackName],
          ['company', 'Firma', profile?.company ?? ''],
          ['phone', 'Telefon', profile?.phone ?? ''],
        ] as const
      ).map(([name, label, value]) => (
        <label key={name} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          <input name={name} defaultValue={value} className="field" />
        </label>
      ))}
      <label className="flex items-start gap-3 rounded-xl bg-surface-2/70 p-3 text-sm">
        <input type="checkbox" name="contact_ok" defaultChecked={profile?.contact_ok ?? false} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>
          <strong className="font-semibold">Plasso kan kontakte meg</strong>
          <span className="text-muted"> om lokaler eller leietakere som passer det jeg ser etter.</span>
        </span>
      </label>
      {state?.ok ? <p className="text-sm text-success">Lagret.</p> : null}
      <button disabled={pending} className="h-11 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Lagrer …' : 'Lagre profil'}
      </button>
    </form>
  );
}
