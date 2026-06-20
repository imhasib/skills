import type { ObjectId } from 'mongodb';

type WithId = { _id?: ObjectId | string } & Record<string, unknown>;

/**
 * Convert MongoDB documents to wire format.
 * - `_id` (ObjectId or string) → `id` (string)
 * - Apply recursively to nested objects/arrays
 *
 * Repositories should call `toWire(doc)` before returning to controllers.
 * Never leak `_id` to clients — it's a Mongo implementation detail.
 */
export function toWire(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((item) => toWire(item));
  if (input instanceof Date) return input;
  if (typeof input !== 'object') return input;

  const obj = input as WithId;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id') {
      out.id = String(value);
      continue;
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      out[key] = toWire(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
