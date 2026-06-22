'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reusable "Sign in with Google" button that uses Google Identity Services
 * (GIS) directly. No OAuth client secret is needed — Google issues an
 * `id_token` straight to the browser, which the caller forwards to
 * user-service via `onIdToken`.
 *
 * The visual is a plain styled `<button>` (CSS-controlled) rather than
 * Google's iframe-rendered button, so the design system can theme it freely.
 * The official GIS script is loaded once on mount; clicking the button calls
 * `google.accounts.id.prompt()` which opens Google's account chooser /
 * One Tap UI and routes the resulting credential through the callback.
 */

interface GoogleIdServices {
  initialize: (config: {
    client_id: string;
    callback: (res: { credential?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: (
    momentListener?: (notification: {
      isNotDisplayed?: () => boolean;
      isSkippedMoment?: () => boolean;
      getNotDisplayedReason?: () => string;
      getSkippedReason?: () => string;
    }) => void,
  ) => void;
  disableAutoSelect?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdServices;
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  clientId: string;
  onIdToken: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
  label?: string;
  pendingLabel?: string;
  className?: string;
}

const DEFAULT_CLASSES =
  'flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export function GoogleSignInButton({
  clientId,
  onIdToken,
  onError,
  disabled,
  label = 'Sign in with Google',
  pendingLabel = 'Signing in…',
  className,
}: GoogleSignInButtonProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [pending, setPending] = useState(false);
  const initialized = useRef(false);

  const handleCredential = useCallback(
    async (idToken: string) => {
      setPending(true);
      try {
        await onIdToken(idToken);
      } finally {
        setPending(false);
      }
    },
    [onIdToken],
  );

  useEffect(() => {
    if (!scriptReady || initialized.current || !clientId) return;
    if (!window.google?.accounts.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        if (typeof res.credential === 'string' && res.credential.length > 0) {
          void handleCredential(res.credential);
        } else {
          onError?.('Google did not return a credential.');
        }
      },
      cancel_on_tap_outside: true,
    });
    initialized.current = true;
  }, [scriptReady, clientId, handleCredential, onError]);

  function handleClick() {
    if (!initialized.current || !window.google?.accounts.id) {
      onError?.('Google sign-in is still loading. Please try again.');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      // `prompt()` can silently no-op when One Tap is in cooldown or the
      // user has dismissed it repeatedly. Surface that so the UI doesn't
      // appear inert. The chooser dialog itself fires the callback above.
      if (notification.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.() ?? 'unknown';
        onError?.(`Google sign-in could not be displayed (${reason}).`);
      } else if (notification.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.() ?? 'unknown';
        onError?.(`Google sign-in was dismissed (${reason}).`);
      }
    });
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
        }}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={(disabled ?? false) || pending || !scriptReady || !clientId}
        className={className ?? DEFAULT_CLASSES}
      >
        <GoogleMark aria-hidden />
        <span>{pending ? pendingLabel : label}</span>
      </button>
    </>
  );
}

function GoogleMark(props: { 'aria-hidden'?: boolean }) {
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
