'use client';

import { useState, type SyntheticEvent } from 'react';

interface InviteAcceptStubProps {
  token: string;
}

export function InviteAcceptStub({ token }: InviteAcceptStubProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log('[stub] invitation accept', { token, name, password: password.length });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-text-rich">Your name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          autoComplete="name"
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-text-rich">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          className="w-full rounded-md border border-border-muted bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          autoComplete="new-password"
          required
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary-container"
      >
        Accept invitation
      </button>
    </form>
  );
}
