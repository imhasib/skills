import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';

/**
 * Stub admin landing for system-admin accounts. Real screens (app_config,
 * enum review, audit) land via /run-issue.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-secondary">System admin</p>
        <h1 className="text-3xl font-semibold text-primary">Admin tools</h1>
      </header>

      <section className="space-y-3 rounded-lg border border-border-muted bg-surface px-6 py-5">
        <h2 className="text-lg font-semibold text-text-rich">Coming soon</h2>
        <p className="text-sm text-secondary">
          App configuration, enum review, and the global audit log will live here. The first screen
          lands via <code className="rounded-sm bg-surface-warm px-1.5 py-0.5">/run-issue</code>.
        </p>
      </section>

      <Link
        href="/"
        className="inline-flex items-center rounded-md border border-border-muted px-4 py-2 text-sm font-medium text-text-rich hover:bg-surface-warm"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
