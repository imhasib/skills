import { Decimal128 } from 'mongodb';
import { Decimal } from 'decimal.js';

/**
 * Wrap a string or number as a MongoDB Decimal128. All monetary fields
 * (amounts, totals) MUST use Decimal128 — never `number`, which loses precision
 * past 2^53 and breaks financial arithmetic.
 *
 * Throws if the value is not a finite decimal.
 */
export function toDecimal(value: string | number): Decimal128 {
  let normalized: string;
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) {
      throw new Error('non-finite');
    }
    // Preserve input precision (e.g. '10000.00' stays '10000.00'). decimal.js's
    // toFixed() strips trailing zeros; Decimal128 preserves them, so feed it the
    // original string. Numbers stringify via decimal.js to normalise notation.
    normalized = typeof value === 'string' ? value.trim() : d.toString();
  } catch {
    throw new Error(`Invalid decimal value: ${String(value)}`);
  }
  return Decimal128.fromString(normalized);
}
