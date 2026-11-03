'use client';

import { useTransition } from 'react';

export function ConfirmButton({ action, message, className, children }: { action: () => Promise<void>; message: string; className?: string; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className={className} onClick={() => confirm(message) && start(() => action())}>
      {children}
    </button>
  );
}
