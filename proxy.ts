import { NextResponse, type NextRequest } from "next/server";

// Optimistic redirect only: if there's no Auth.js session cookie at all, send the
// visitor to /login before rendering. This deliberately doesn't verify the token
// (no DB/crypto in the proxy). Real checks happen in every server component
// (getPageUser) and API route (requireUser) + the permissions module.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = new URL("/login", req.nextUrl.origin);
  const dest = req.nextUrl.pathname + req.nextUrl.search;
  if (dest !== "/") url.searchParams.set("callbackUrl", dest);
  return NextResponse.redirect(url);
}

// Only the dashboard. Document pages decide for themselves, because public
// ("anyone with the link") documents are viewable without signing in.
export const config = {
  matcher: ["/"],
};
