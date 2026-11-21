import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic redirect for signed-out page visits. Real authorization happens in
// every API route / server component via requireUser + permissions.
export const proxy = auth((req) => {
  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    const dest = req.nextUrl.pathname + req.nextUrl.search;
    if (dest !== "/") url.searchParams.set("callbackUrl", dest);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/", "/documents/:path*"],
};
