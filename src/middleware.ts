import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/tokens";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // ─── Refresh Supabase session ───────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Protect /tree, /person, /search, /requests (member routes) ────────
  const isMemberRoute =
    pathname.startsWith("/tree") ||
    pathname.startsWith("/person") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/requests");

  if (isMemberRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Protect /record/* (contributor routes) ────────────────────────────
  // The /record/[token] page itself handles the token → cookie exchange on
  // first visit. Subsequent API calls under /api/upload require the cookie.
  if (pathname.startsWith("/api/upload")) {
    const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
    if (!cookieValue) {
      return NextResponse.json({ error: "No contributor session" }, { status: 401 });
    }
    const session = await verifySession(cookieValue);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }
  }

  // ─── Redirect authenticated users away from /login ─────────────────────
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/tree", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
