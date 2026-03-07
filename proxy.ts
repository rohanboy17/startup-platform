import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const accountStatus = (req.nextauth.token?.accountStatus as string | undefined) || "ACTIVE";

    if (isDashboard && !isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isDashboard && isLoggedIn && accountStatus !== "ACTIVE") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
