import { randomUUID } from 'node:crypto';

/**
 * Generate a time-sortable, URL-safe id with a domain prefix.
 *   newId('exp') → 'exp_<uuid-v4>'
 * Use prefixes to make ids self-documenting in logs and tracebacks.
 *
 * Placeholder uses crypto.randomUUID(); swap for `ulid` package when sortability matters.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}
