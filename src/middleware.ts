import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup", "/manifest.webmanifest", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/avatars/")) return true;
  if (pathname.startsWith("/icon")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$/i.test(pathname)) {
    return true;
  }
  return false;
}

function isProtectedApi(pathname: string): boolean {
  return (
    pathname === "/api/chat" ||
    pathname.startsWith("/api/chat/") ||
    pathname === "/api/stt" ||
    pathname.startsWith("/api/stt/") ||
    pathname === "/api/tts" ||
    pathname.startsWith("/api/tts/")
  );
}

function isProtectedPage(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/webview" ||
    pathname.startsWith("/webview/") ||
    pathname === "/chat" ||
    pathname.startsWith("/chat/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname) && pathname !== "/login" && pathname !== "/signup") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: "Authentication service not configured." }, { status: 500 });
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }
    if (isProtectedPage(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      const nextTarget = `${pathname}${search || ""}`;
      if (nextTarget && nextTarget !== "/") {
        loginUrl.searchParams.set("next", nextTarget);
      }
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Redirect already authenticated users away from /login and /signup
  if (pathname === "/login" || pathname === "/signup") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|avatars/|icon-.*|manifest\\.webmanifest).*)",
  ],
};
