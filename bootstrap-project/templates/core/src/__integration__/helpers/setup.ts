import { beforeAll, afterAll, beforeEach } from 'vitest';
import * as db from '../../db/index.js';
import { resetDb } from './db.js';

// Required env for integration runs — fail fast if missing.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-jwt-access-secret';

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await resetDb();
});
