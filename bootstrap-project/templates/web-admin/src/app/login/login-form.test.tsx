import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from './login-form';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe('LoginForm', () => {
  it('renders the Google sign-in button', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders a friendly error banner when error is "AccessDenied"', () => {
    render(<LoginForm error="AccessDenied" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/access denied/i);
  });

  it('passes through arbitrary short error messages from user-service', () => {
    render(<LoginForm error="Email not yet linked" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email not yet linked');
  });
});
