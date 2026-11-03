import { cn } from '@/lib/cn';

/** Circular match score. Draws itself in on mount (CSS only). */
export function MatchRing({ score, size = 112, stroke = 9, delay = 150, label = true, className }: { score: number; size?: number; stroke?: number; delay?: number; label?: boolean; className?: string }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const offset = length - (length * Math.max(0, Math.min(100, score))) / 100;
  const color = score >= 70 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--faint)';
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
          className="ring-draw"
          style={{ ['--ring-length' as string]: length, ['--ring-delay' as string]: `${delay}ms` }}
        />
      </svg>
      {label ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ fontSize: size / 4.4 }}>
            {score}%
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">samsvar</span>
        </div>
      ) : null}
    </div>
  );
}
