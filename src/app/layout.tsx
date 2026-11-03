import type { Metadata } from 'next';
import { JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';
import Link from 'next/link';

import { BottomNav, SiteHeader } from '@/components/site-header';
import { getUser, isAdmin } from '@/lib/auth';
import './globals.css';

const schibsted = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Plasso · Riktig lokale. Riktig match.', template: '%s · Plasso' },
  description: 'Gratis markedsplass for næringslokaler. Bedrifter legger ut hva de trenger, utleiere legger ut lokalene sine, og Plasso matcher dem.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="nb" className={`${schibsted.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh font-sans">
        <SiteHeader signedIn={Boolean(user)} admin={isAdmin(user)} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">{children}</main>
        <footer className="mx-auto hidden max-w-6xl justify-between px-6 pb-10 text-sm text-muted md:flex">
          <span>Plasso · Riktig lokale. Riktig match. Gratis for alle.</span>
          <Link href="/personvern" className="hover:text-foreground">
            Personvern
          </Link>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
