import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';
import { SideNav } from '@/components/app-shell/side-nav';
import { TopNav } from '@/components/app-shell/top-nav';

interface SessionInfo {
  firm_id: string;
  firm_role: string;
  currency: string;
}

async function loadFirmRole(): Promise<string | undefined> {
  // Tolerant by design — the backend may not yet expose /session at bootstrap
  // time. Until it ships, swallow every error (network, 404, malformed body)
  // and render without a role badge rather than crashing the whole dashboard.
  try {
    const info = await serverApiFetch<SessionInfo>('/session');
    return info.firm_role;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 403 && err.code.startsWith('ADMIN_')) {
      return 'ADMIN';
    }
    return undefined;
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const role = await loadFirmRole();
  const userName = session.backendUser?.name ?? session.user?.name ?? 'there';
  const userEmail = session.backendUser?.email ?? session.user?.email ?? '';
  const avatarUrl = session.backendUser?.avatar_url ?? session.user?.image ?? undefined;

  return (
    <div className="min-h-screen bg-surface text-text-rich">
      <TopNav
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl ?? undefined}
        roleBadge={role}
      />
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border-muted bg-surface-warm px-3 py-6 md:block">
          <SideNav />
        </aside>
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
