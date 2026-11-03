'use client';

import { Compass, LayoutList, Plus, Target, UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: 'Utforsk', icon: Compass },
  { href: '/matcher', label: 'Matcher', icon: Target },
  { href: '/mine', label: 'Mine annonser', icon: LayoutList },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteHeader({ signedIn, admin }: { signedIn: boolean; admin: boolean }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/app-icon.png" alt="" width={30} height={30} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Plasso</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                isActive(pathname, t.href) ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
              )}>
              {t.label}
            </Link>
          ))}
          {admin ? (
            <Link
              href="/admin"
              className={cn('rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider transition', pathname.startsWith('/admin') ? 'bg-foreground text-white' : 'text-muted hover:text-foreground')}>
              Etterspørsel
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/ny" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Legg ut</span>
          </Link>
          <Link
            href={signedIn ? '/profil' : '/logg-inn'}
            aria-label={signedIn ? 'Profil' : 'Logg inn'}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium transition hover:border-accent/40">
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">{signedIn ? 'Profil' : 'Logg inn'}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Mobile tab bar, mirroring the app's three tabs. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-2xl border border-border bg-surface/90 p-1.5 shadow-[0_12px_40px_-12px_rgba(14,42,71,0.35)] backdrop-blur-md md:hidden">
      {TABS.map((t) => {
        const active = isActive(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} className={cn('flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium', active ? 'bg-accent-soft text-accent' : 'text-muted')}>
            <t.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
