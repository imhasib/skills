import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('merges class strings and resolves Tailwind conflicts', () => {
    expect(cn('p-2', 'p-4', 'text-sm')).toBe('p-4 text-sm');
  });
});
