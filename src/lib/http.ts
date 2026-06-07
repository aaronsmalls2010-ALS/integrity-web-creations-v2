export function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
export const badRequest = (msg: string) => json({ error: msg }, 400);
export const unauthorized = (msg = 'Unauthorized') => json({ error: msg }, 401);
export const unprocessable = (msg: string) => json({ error: msg }, 422);
export const serverError = (msg = 'Server error') => json({ error: msg }, 500);
