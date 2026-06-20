import { InviteAcceptStub } from './invite-accept-stub';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-primary">Accept invitation</h1>
        <p className="text-sm text-secondary">
          Stub — real invitation handshake lands via
          <code className="rounded-sm bg-surface-warm px-1.5 py-0.5">/run-issue</code>.
        </p>
        <p className="break-all text-xs text-secondary">
          Token: <code className="rounded-sm bg-surface-warm px-1 py-0.5">{token}</code>
        </p>
      </header>
      <InviteAcceptStub token={token} />
    </main>
  );
}
