'use client';

import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  label?: string;
  className?: string;
}

export function SignOutButton({
  label = 'Sign out',
  className = 'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700',
}: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: '/login' });
      }}
      className={className}
    >
      {label}
    </button>
  );
}
