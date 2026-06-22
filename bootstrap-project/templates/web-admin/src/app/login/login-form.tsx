'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { GoogleSignInButton } from '@/components/google-sign-in-button';

interface LoginFormProps {
  error?: string;
  nextPath?: string;
  googleClientId: string;
}

const ADMIN_BUTTON_CLASSES =
  'flex w-full items-center justify-center gap-3 rounded-md border border-border-muted bg-surface px-4 py-2.5 text-sm font-medium text-text-rich shadow-sm transition hover:bg-surface-warm disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Map raw NextAuth error codes (or arbitrary messages we forward from the
 * Credentials provider's authorize result) to operator-friendly copy.
 */
function describeError(code: string): string {
  switch (code) {
    case 'CredentialsSignin':
      return 'Sign-in failed. Please try again.';
    case 'Configuration':
      return 'Auth is misconfigured on the server. Contact an administrator.';
    default:
      return code.length > 200 ? 'Sign-in failed. Please try again.' : code;
  }
}

export function LoginForm({ error: initialError, nextPath, googleClientId }: LoginFormProps) {
  const [error, setError] = useState<string | undefined>(initialError);

  async function handleIdToken(idToken: string) {
    setError(undefined);
    const result = await signIn('google', { idToken, redirect: false });
    if (!result || result.error) {
      setError(result?.error ?? 'CredentialsSignin');
      return;
    }
    // Full-page navigation guarantees server components re-render with the
    // fresh auth cookie that Auth.js just set on the response.
    window.location.href = nextPath ?? '/';
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {describeError(error)}
        </div>
      ) : null}

      <GoogleSignInButton
        clientId={googleClientId}
        onIdToken={handleIdToken}
        onError={setError}
        className={ADMIN_BUTTON_CLASSES}
      />
    </div>
  );
}
