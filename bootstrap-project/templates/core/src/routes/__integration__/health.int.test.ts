import { describe, it, expect } from 'vitest';
import { api } from '../../__integration__/helpers/http.js';

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await api().get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

describe('GET /health/ready', () => {
  it('returns 200 when DB is reachable', async () => {
    const res = await api().get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ready' });
  });
});
