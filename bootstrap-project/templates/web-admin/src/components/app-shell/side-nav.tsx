'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
      </svg>
    ),
  },
  {
    href: '/firm',
    label: 'Firm',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M3 4a1 1 0 011-1h5a1 1 0 011 1v13H3V4zm8 4a1 1 0 011-1h5a1 1 0 011 1v9h-7V8zM5 6h3v2H5V6zm0 4h3v2H5v-2zm8 0h3v2h-3v-2zm0 4h3v2h-3v-2z" />
      </svg>
    ),
  },
  {
    href: '/members',
    label: 'Members',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    href: '/animals',
    label: 'Animals',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M4 4a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0zM2 9a2 2 0 114 0 2 2 0 01-4 0zm12 0a2 2 0 114 0 2 2 0 01-4 0zM6 14c0-2.21 1.79-4 4-4s4 1.79 4 4v.5c0 1.38-1.12 2.5-2.5 2.5h-3A2.5 2.5 0 016 14.5V14z" />
      </svg>
    ),
  },
  {
    href: '/batches',
    label: 'Batches',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
      </svg>
    ),
  },
  {
    href: '/audit',
    label: 'Audit',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm1 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h5a1 1 0 100-2H6z" />
      </svg>
    ),
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname() || '/';
  return (
    <nav className="space-y-0.5" aria-label="Primary">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-secondary">
        Manage
      </p>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-surface'
                : 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-rich transition hover:bg-surface'
            }
          >
            <span aria-hidden="true" className={active ? 'text-surface' : 'text-secondary'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
