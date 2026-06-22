import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from './login-form';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// The GoogleSignInButton injects the GIS script and reads `window.google`
// during a useEffect; replace it with a static button so the test stays
// focused on LoginForm's own behavior (error rendering, prop wiring).
vi.mock('@/components/google-sign-in-button', () => ({
  GoogleSignInButton: ({ clientId }: { clientId: string }) => (
    <button type="button" data-client-id={clientId}>
      Sign in with Google
    </button>
  ),
}));

describe('LoginForm', () => {
  it('renders the Google sign-in button', () => {
    render(<LoginForm googleClientId="test-client-id" />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('forwards googleClientId to the sign-in button', () => {
    render(<LoginForm googleClientId="test-client-id" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-client-id', 'test-client-id');
  });

  it('renders a friendly error banner for a known code', () => {
    render(<LoginForm googleClientId="x" error="CredentialsSignin" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/sign-in failed/i);
  });

  it('passes through arbitrary short error messages from user-service', () => {
    render(<LoginForm googleClientId="x" error="Email not yet linked" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email not yet linked');
  });
});
