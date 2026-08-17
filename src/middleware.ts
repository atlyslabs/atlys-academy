import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAuthConfigured } from "@/lib/auth/config";

export default auth((request) => {
  if (!isAuthConfigured) return NextResponse.next();
  if (request.auth) return NextResponse.next();

  const signInUrl = new URL("/signin", request.nextUrl.origin);
  signInUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/onboarding/:path*", "/admin/:path*"],
};
