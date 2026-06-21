import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class strings while resolving conflicts.
 * Standard utility from the shadcn/ui playbook.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
