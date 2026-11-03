'use client';

import { Ban, Flag } from 'lucide-react';
import { useState, useTransition } from 'react';

import { blockUser, reportPost } from '@/app/actions';

const REPORT_REASONS = ['Falsk eller villedende', 'Svindel', 'Støtende innhold', 'Allerede utleid'];

/** Report a listing or block its owner (from the Newly app's post screen). */
export function PostMenu({ postId, ownerId, ownerName }: { postId: string; ownerId: string; ownerName: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) return <p className="text-sm text-muted">Takk. Vi ser på annonsen innen 24 timer.</p>;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex gap-4">
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
          <Flag className="h-4 w-4" /> Rapporter annonse
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Blokker ${ownerName}? Du ser ikke lenger annonsene deres, og de kan ikke kontakte deg.`)) start(() => blockUser(ownerId));
          }}
          className="inline-flex items-center gap-1.5 text-muted hover:text-danger">
          <Ban className="h-4 w-4" /> Blokker
        </button>
      </div>
      {open ? (
        <div className="flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await reportPost(postId, r);
                  setDone(true);
                })
              }
              className="rounded-full border border-border px-3 py-1.5 hover:border-danger hover:text-danger">
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
