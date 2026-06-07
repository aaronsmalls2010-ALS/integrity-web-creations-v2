import { describe, it, expect } from 'vitest';
import { json, badRequest } from './http';

describe('http helpers', () => {
  it('builds a JSON response with status + content-type', async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ ok: true });
  });
  it('badRequest returns 400 with error message', async () => {
    const res = badRequest('nope');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'nope' });
  });
});
