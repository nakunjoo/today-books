import { supabaseAdmin } from "@/lib/supabase/server";

// DB에 저장된 토큰이 없으면(최초 1회) 환경변수 값으로 시딩
export async function getInstagramToken(): Promise<string> {
  const db = supabaseAdmin();
  const { data } = await db.from("instagram_token").select("access_token").eq("id", 1).maybeSingle();
  if (data?.access_token) return data.access_token;

  const seed = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!seed) throw new Error("INSTAGRAM_ACCESS_TOKEN 환경변수가 설정되지 않았습니다.");

  await db.from("instagram_token").upsert({ id: 1, access_token: seed, updated_at: new Date().toISOString() });
  return seed;
}

export async function refreshInstagramToken(): Promise<{ ok: boolean; error?: string }> {
  const current = await getInstagramToken();

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${current}`
  );
  const data = await res.json() as { access_token?: string; error?: { message: string } };

  if (!data.access_token) {
    return { ok: false, error: data.error?.message ?? "토큰 갱신 응답에 access_token이 없습니다." };
  }

  const db = supabaseAdmin();
  const { error } = await db.from("instagram_token").upsert({
    id: 1,
    access_token: data.access_token,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
