import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';

interface SessionInfo {
  firm_id: string;
  firm_role: string;
  currency: string;
}

type SessionResult =
  | { kind: 'firm'; info: SessionInfo }
  | { kind: 'admin' }
  | { kind: 'error'; code: string; message: string };

async function loadSession(): Promise<SessionResult> {
  try {
    const info = await serverApiFetch<SessionInfo>('/session');
    return { kind: 'firm', info };
  } catch (err) {
    if (err instanceof ApiError) {
      if (
        err.code === 'ADMIN_ROLE_FORBIDDEN_ON_FIRM_ROUTES' ||
        (err.statusCode === 403 && err.code.startsWith('ADMIN_'))
      ) {
        return { kind: 'admin' };
      }
      return { kind: 'error', code: err.code, message: err.message };
    }
    throw err;
  }
}

const QUICK_LINKS = [
  {
    href: '/firm',
    title: 'Firm',
    description: 'Firm name, currency, location, and owner bootstrap controls.',
  },
  {
    href: '/members',
    title: 'Members',
    description: 'Invite members, change roles, and transfer ownership.',
  },
  {
    href: '/animals',
    title: 'Animals',
    description: 'Track species, purpose, ear-tag, and lifecycle.',
  },
  {
    href: '/batches',
    title: 'Batches',
    description: 'Group animals into batches for shared expense attribution.',
  },
  {
    href: '/audit',
    title: 'Audit',
    description: 'Review soft-deleted records and restore them.',
  },
] as const;

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const result = await loadSession();
  const greetingName = session.backendUser?.name ?? session.user?.name ?? 'there';

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-secondary">Dashboard</p>
        <h1 className="text-3xl font-semibold text-primary">Welcome, {greetingName}.</h1>
        <p className="text-sm text-secondary">
          Pick a section to manage, or jump straight to your profile from the top right.
        </p>
      </header>

      {result.kind === 'firm' ? <FirmOverview info={result.info} /> : null}
      {result.kind === 'admin' ? <AdminBanner /> : null}
      {result.kind === 'error' ? <ErrorBlock code={result.code} message={result.message} /> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-rich">Manage</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border border-border-muted bg-surface p-5 transition hover:border-primary hover:shadow-sm"
            >
              <h3 className="text-base font-semibold text-text-rich group-hover:text-primary">
                {link.title}
              </h3>
              <p className="mt-1 text-sm text-secondary">{link.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function FirmOverview({ info }: { info: SessionInfo }) {
  return (
    <section className="rounded-lg border border-border-muted bg-surface px-6 py-5">
      <h2 className="text-lg font-semibold text-text-rich">Firm overview</h2>
      <dl className="mt-3 grid grid-cols-1 gap-y-3 sm:grid-cols-3 sm:gap-x-6">
        <div>
          <dt className="text-xs uppercase tracking-wider text-secondary">Firm ID</dt>
          <dd className="mt-1 font-mono text-sm text-text-rich">{info.firm_id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-secondary">Role</dt>
          <dd className="mt-1 text-sm text-text-rich">{info.firm_role}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-secondary">Currency</dt>
          <dd className="mt-1 text-sm text-text-rich">{info.currency}</dd>
        </div>
      </dl>
    </section>
  );
}

function AdminBanner() {
  return (
    <section className="space-y-2 rounded-lg border border-border-muted bg-surface px-6 py-5">
      <h2 className="text-lg font-semibold text-text-rich">Signed in as system admin</h2>
      <p className="text-sm text-secondary">
        Firm-scoped routes are not available to system administrators. Head to the admin tools to
        manage app configuration.
      </p>
      <Link
        href="/admin"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary-container"
      >
        Open admin tools
      </Link>
    </section>
  );
}

function ErrorBlock({ code, message }: { code: string; message: string }) {
  return (
    <section
      role="alert"
      className="space-y-2 rounded-lg border border-error/30 bg-error/10 px-6 py-5 text-sm text-error"
    >
      <p className="font-semibold">Session lookup failed.</p>
      <p>{message}</p>
      <p className="font-mono text-xs">{code}</p>
    </section>
  );
}
