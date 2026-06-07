import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ error: 'PDF generation not yet implemented' }), {
    status: 501, headers: { 'Content-Type': 'application/json' },
  });
