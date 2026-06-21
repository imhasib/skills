import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }
  return <>{children}</>;
}
