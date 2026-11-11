import { supabaseAdmin } from "@/lib/supabase/server";

// cron_settings 테이블의 on/off 값 확인
// 행이 없거나 조회에 실패하면 꺼진 것으로 취급 (실수로 크론이 돌아가는 것보다 안전)
export async function isCronEnabled(name: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("cron_settings")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error(`[cron] ${name} 설정 조회 실패, 꺼진 것으로 처리:`, error.message);
    return false;
  }
  return data?.enabled === true;
}
