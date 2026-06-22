'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { GoogleSignInButton } from '@/components/google-sign-in-button';

interface LoginFormProps {
  error?: string;
  nextPath?: string;
  googleClientId: string;
}

/**
 * Map raw NextAuth error codes (or arbitrary messages we forward from the
 * Credentials provider's authorize result) to user-friendly copy.
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
    if (result.error) {
      setError(result.error);
      return;
    }
    // Full-page navigation guarantees server components re-render with the
    // fresh auth cookie that Auth.js just set on the response.
    window.location.href = nextPath ?? '/dashboard';
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {describeError(error)}
        </div>
      ) : null}

      <GoogleSignInButton
        clientId={googleClientId}
        onIdToken={handleIdToken}
        onError={setError}
      />
    </div>
  );
}
