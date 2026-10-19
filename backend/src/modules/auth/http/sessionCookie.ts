import type { FastifyReply } from 'fastify';

/**
 * Session cookie transport. The JWT is owned by this layer: routes put it
 * here and it must never be serialized back into a response body (an XSS
 * could read a body token at login time; it cannot read an httpOnly cookie).
 */
export const SESSION_COOKIE = 'rc_session';

export interface SessionCookieOptions {
  secure: boolean;
  maxAgeSeconds?: number;
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  { secure, maxAgeSeconds }: SessionCookieOptions,
): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/api',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(
  reply: FastifyReply,
  { secure }: { secure: boolean },
): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: '/api',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
}
