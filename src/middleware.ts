import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPath, type UserRole } from "@/types";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/borrow",
  "/setup",
];

const PUBLIC_PREFIXES = [
  "/register/",
  "/setup/",
  "/api/public/",
  "/api/cron/",
  "/auth/",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname)) {
    if (user && (pathname === "/login" || pathname === "/")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role) {
        const dashboard = getDashboardPath(profile.role as UserRole);
        if (profile.role !== "borrower" || pathname === "/login") {
          return NextResponse.redirect(new URL(dashboard, request.url));
        }
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.account_status === "disabled") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=disabled", request.url));
  }

  const role = profile.role as UserRole;

  if (pathname.startsWith("/admin") && !["admin", "assistant_admin", "staff"].includes(role)) {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (pathname.startsWith("/borrower") && role !== "borrower") {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  if (pathname.startsWith("/admin/staff") && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (pathname.startsWith("/admin/settings") && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (pathname.startsWith("/admin/inventory") && pathname.includes("/new") && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/inventory", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
