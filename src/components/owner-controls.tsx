'use client';

import { useTransition } from 'react';

import { deletePost, setPostStatus } from '@/app/actions';
import { cn } from '@/lib/cn';

const STATUSES = [
  { id: 'active', label: 'Aktiv' },
  { id: 'paused', label: 'Pauset' },
  { id: 'rented', label: 'Utleid' },
] as const;

export function OwnerControls({ id, status }: { id: string; status: 'active' | 'paused' | 'rented' | 'hidden' | 'pending' }) {
  const [pending, start] = useTransition();
  if (status === 'hidden') {
    return (
      <div className="flex flex-col gap-2 rounded-[22px] border border-danger/30 bg-danger/5 p-5">
        <h2 className="text-lg font-semibold">Skjult av Plasso</h2>
        <p className="text-sm text-muted">Annonsen er skjult etter en rapport og vises ikke for andre. Ta kontakt med oss hvis du mener dette er feil.</p>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5', pending && 'opacity-70')}>
      <div>
        <h2 className="text-lg font-semibold">Din annonse</h2>
        <p className="text-sm text-muted">Bare aktive annonser vises for andre og får matcher.</p>
      </div>
      <div className="grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {STATUSES.map((s) => (
          <button key={s.id} disabled={pending} onClick={() => start(() => setPostStatus(id, s.id))} className={cn('rounded-lg py-2 transition', status === s.id ? 'bg-surface shadow-sm' : 'text-muted')}>
            {s.label}
          </button>
        ))}
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm('Slette annonsen? Dette kan ikke angres.')) start(() => deletePost(id));
        }}
        className="text-sm font-medium text-danger hover:underline">
        Slett annonsen
      </button>
    </div>
  );
}
