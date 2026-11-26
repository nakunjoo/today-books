import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 관리자 경로 요청마다 Supabase 로그인 세션을 확인하고, 만료가 가까운 토큰을 갱신해 쿠키에 다시 씀
// 관리자인지(tarot_admins)는 각 페이지/API의 auth()에서 확인
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // 이 호출이 토큰 검증과 갱신을 일으킴. 지우지 말 것
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    if (request.nextUrl.pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/manager", "/manager/:path*", "/api/admin/:path*"],
};
