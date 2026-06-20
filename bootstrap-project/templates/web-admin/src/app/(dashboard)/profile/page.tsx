import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ApiError } from '@/lib/api-error';
import { SignOutButton } from '@/components/sign-out-button';
import { serverApiFetch } from '@/lib/server-api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface SessionInfo {
  firm_id: string;
  firm_role: string;
  currency: string;
}

async function safeFetch<T>(
  loader: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: ApiError }> {
  try {
    return { ok: true, value: await loader() };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err };
    }
    throw err;
  }
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const [profileResult, sessionResult] = await Promise.all([
    safeFetch(() => serverApiFetch<UserProfile>('/users/me')),
    safeFetch(() => serverApiFetch<SessionInfo>('/session')),
  ]);

  const profile: UserProfile = profileResult.ok
    ? profileResult.value
    : {
        id: session.backendUser?.id ?? 'unknown',
        name: session.backendUser?.name ?? session.user?.name ?? 'Unknown user',
        email: session.backendUser?.email ?? session.user?.email ?? '',
        avatar_url: session.backendUser?.avatar_url ?? session.user?.image ?? undefined,
      };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-secondary">Account</p>
        <h1 className="text-3xl font-semibold text-primary">Profile</h1>
      </header>

      <section className="flex items-center gap-4 rounded-lg border border-border-muted bg-surface px-6 py-5">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            width={72}
            height={72}
            className="rounded-full border border-border-muted bg-surface-warm"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-container text-2xl font-semibold text-surface">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-text-rich">{profile.name}</h2>
          <p className="text-sm text-secondary">{profile.email}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border-muted bg-surface px-6 py-5">
        <h2 className="text-base font-semibold text-text-rich">Firm membership</h2>
        {sessionResult.ok ? (
          <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-3 sm:gap-x-6">
            <div>
              <dt className="text-xs uppercase tracking-wider text-secondary">Firm ID</dt>
              <dd className="mt-1 font-mono text-sm text-text-rich">
                {sessionResult.value.firm_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-secondary">Role</dt>
              <dd className="mt-1">
                <RoleBadge role={sessionResult.value.firm_role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-secondary">Currency</dt>
              <dd className="mt-1 text-sm text-text-rich">{sessionResult.value.currency}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-secondary">
            Firm details unavailable: {sessionResult.error.message}
          </p>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md border border-border-muted px-4 py-2 text-sm font-medium text-text-rich hover:bg-surface-warm"
        >
          Back to dashboard
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const tone =
    role === 'OWNER'
      ? 'bg-primary text-surface'
      : role === 'ADMIN'
        ? 'bg-tertiary text-surface'
        : 'bg-surface-warm text-text-rich';
  return (
    <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {role}
    </span>
  );
}
