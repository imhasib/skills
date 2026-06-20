'use client';

import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  label?: string;
  className?: string;
}

export function SignOutButton({
  label = 'Sign out',
  className = 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary-container',
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
