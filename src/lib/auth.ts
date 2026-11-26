import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

// 관리자 로그인: tarot-saju와 같은 Supabase 프로젝트의 계정(Supabase Auth, 아이디/비밀번호)을 공유
// 관리자는 tarot-saju의 tarot_admins 테이블에 들어있는 계정만 (SQL·대시보드로 관리)

// 로그인 쿠키를 읽고 쓰는 서버용 Supabase 클라이언트 (요청마다 새로 생성)
export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env");

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없음. 세션 갱신은 proxy가 처리하므로 무시
        }
      },
    },
  });
}

// 지금 로그인한 사람이 관리자면 { userId }, 아니면 null
export async function auth(): Promise<{ userId: string } | null> {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;

  const { data: row } = await supabaseAdmin().from("tarot_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return row ? { userId } : null;
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
}
