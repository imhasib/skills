import { describe, it, expect } from 'vitest';
import { toWire } from './serialize.js';

describe('toWire', () => {
  it('maps _id (string) to id', () => {
    expect(toWire({ _id: 'abc123', title: 'Feed' })).toEqual({ id: 'abc123', title: 'Feed' });
  });

  it('recurses into nested objects', () => {
    const input = { _id: 'p', owner: { _id: 'u', name: 'A' } };
    expect(toWire(input)).toEqual({ id: 'p', owner: { id: 'u', name: 'A' } });
  });

  it('maps each item in an array', () => {
    expect(toWire([{ _id: '1' }, { _id: '2' }])).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('handles nested arrays of docs', () => {
    const input = { _id: 'f', members: [{ _id: 'm1', role: 'owner' }, { _id: 'm2', role: 'manager' }] };
    expect(toWire(input)).toEqual({
      id: 'f',
      members: [
        { id: 'm1', role: 'owner' },
        { id: 'm2', role: 'manager' },
      ],
    });
  });

  it('passes through null and undefined', () => {
    expect(toWire(null)).toBe(null);
    expect(toWire(undefined)).toBe(undefined);
  });

  it('preserves Date instances', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    expect(toWire({ _id: 'x', createdAt: d })).toEqual({ id: 'x', createdAt: d });
  });

  it('preserves primitives', () => {
    expect(toWire(42)).toBe(42);
    expect(toWire('hello')).toBe('hello');
    expect(toWire(true)).toBe(true);
  });
});
