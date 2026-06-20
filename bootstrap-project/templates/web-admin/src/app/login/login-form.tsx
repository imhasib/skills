'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface LoginFormProps {
  error?: string;
  nextPath?: string;
}

/**
 * Map raw NextAuth error codes (or arbitrary messages we forward from the
 * server-side signIn callback) to operator-friendly copy.
 */
function describeError(code: string): string {
  switch (code) {
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthAccountNotLinked':
      return 'Google sign-in could not complete. Please try again.';
    case 'AccessDenied':
      return 'Access denied. Your Google account is not authorised for this console.';
    case 'GoogleNoIdToken':
      return 'Google did not return an id_token. Please retry sign-in.';
    case 'Configuration':
      return 'Auth is misconfigured on the server. Contact an administrator.';
    default:
      // The signIn callback forwards plain messages from user-service — surface
      // them as-is, but guard against suspiciously long blobs.
      return code.length > 200 ? 'Sign-in failed. Please try again.' : code;
  }
}

export function LoginForm({ error, nextPath }: LoginFormProps) {
  const [pending, setPending] = useState(false);

  async function handleGoogleClick() {
    setPending(true);
    try {
      await signIn('google', { callbackUrl: nextPath ?? '/' });
    } finally {
      // Browser will navigate away on success; on cancel we reset so the user
      // can retry without a stale spinner.
      setPending(false);
    }
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

      <button
        type="button"
        onClick={() => {
          void handleGoogleClick();
        }}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-border-muted bg-surface px-4 py-2.5 text-sm font-medium text-text-rich shadow-sm transition hover:bg-surface-warm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleMark aria-hidden />
        <span>{pending ? 'Redirecting to Google…' : 'Sign in with Google'}</span>
      </button>
    </div>
  );
}

function GoogleMark({ ...props }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.88 2.69-6.63Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.25c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.72A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 0 0 .96 4.95l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
