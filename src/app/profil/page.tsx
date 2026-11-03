import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { deleteAccount, signOut } from '@/app/actions';
import { ConfirmButton } from '@/components/confirm-button';
import { ProfileForm } from '@/components/profile-form';
import { getUser } from '@/lib/auth';
import { getProfile } from '@/lib/queries';

export const metadata: Metadata = { title: 'Profil' };

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect('/logg-inn?neste=/profil');
  const profile = await getProfile(user.id);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 py-6">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="mt-1 text-muted">{user.email}</p>
      </div>
      <ProfileForm profile={profile} fallbackName={user.name} />
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <form action={signOut}>
          <button className="h-11 w-full rounded-full border border-border bg-surface font-semibold transition hover:border-accent/40">Logg ut</button>
        </form>
        <ConfirmButton action={deleteAccount} message="Slette kontoen og alle annonser, forespørsler og lagrede annonser? Dette kan ikke angres." className="text-sm font-medium text-danger hover:underline">
          Slett konto og alle data
        </ConfirmButton>
      </div>
    </div>
  );
}
