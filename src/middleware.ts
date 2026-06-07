import { defineMiddleware } from 'astro:middleware';
import { getAdminSession } from './lib/auth';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return next();
  }
  if (PUBLIC_ADMIN_PATHS.includes(pathname) || pathname === '/api/admin/auth/login') {
    return next();
  }

  const session = await getAdminSession(ctx.cookies);
  if (!session) {
    return ctx.redirect('/admin/login');
  }
  if (session.needsMfa && pathname !== '/admin/setup-2fa') {
    return ctx.redirect('/admin/setup-2fa');
  }
  ctx.locals.admin = session;
  return next();
});
