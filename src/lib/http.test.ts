import { describe, it, expect } from 'vitest';
import { json, badRequest, unauthorized, unprocessable, serverError } from './http';

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
  it('unauthorized returns 401 (default + custom message)', async () => {
    expect(unauthorized().status).toBe(401);
    expect(await unauthorized().json()).toEqual({ error: 'Unauthorized' });
    expect(await unauthorized('nope').json()).toEqual({ error: 'nope' });
  });
  it('unprocessable returns 422 with message', async () => {
    const res = unprocessable('bad field');
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'bad field' });
  });
  it('serverError returns 500 (default + custom message)', async () => {
    expect(serverError().status).toBe(500);
    expect(await serverError().json()).toEqual({ error: 'Server error' });
    expect(await serverError('boom').json()).toEqual({ error: 'boom' });
  });
});
