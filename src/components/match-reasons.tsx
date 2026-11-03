import { Check, X } from 'lucide-react';

import type { MatchReason } from '@/lib/market/match';
import { cn } from '@/lib/cn';

export function MatchReasons({ reasons, className }: { reasons: MatchReason[]; className?: string }) {
  if (!reasons.length) return null;
  return (
    <ul className={cn('flex flex-col gap-2 text-[14px]', className)}>
      {reasons.map((r) => (
        <li key={r.text} className={cn('flex items-start gap-2.5', !r.ok && 'text-muted')}>
          <span className={cn('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full', r.ok ? 'bg-accent text-white' : 'border border-border bg-surface-2')}>
            {r.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
          </span>
          <span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}
