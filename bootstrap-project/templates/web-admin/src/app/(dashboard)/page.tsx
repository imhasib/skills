import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { SignOutButton } from '@/components/sign-out-button';

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const name = session.backendUser?.name ?? session.user?.name ?? 'there';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-primary">{name} logged in</h1>
      <SignOutButton />
    </main>
  );
}
