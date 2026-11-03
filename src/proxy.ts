import { NextResponse, type NextRequest } from 'next/server';

export const ANON_COOKIE = 'pl_anon';

/** Give every visitor an anonymous id so demand can be measured before sign-up. */
export function proxy(request: NextRequest) {
  if (request.cookies.has(ANON_COOKIE)) return NextResponse.next();
  const id = crypto.randomUUID();
  // Make the id visible to this same request's server components too.
  request.cookies.set(ANON_COOKIE, id);
  const res = NextResponse.next({ request });
  res.cookies.set(ANON_COOKIE, id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|photos|uploads|icon.png|app-icon.png).*)'],
};
