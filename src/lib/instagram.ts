import type { CardContentSchema } from "@/lib/ai/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

const IG_USER_ID = process.env.INSTAGRAM_USER_ID!;
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN!;
const BASE_URL   = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

export function slideUrls(draft: Record<string, unknown>, c: CardContentSchema): string[] {
  function u(slide: string, data: Record<string, unknown>) {
    return `${BASE_URL}/api/card/${slide}?data=${encodeURIComponent(JSON.stringify(data))}`;
  }
  return [
    u("cover",   { hook: c.cover.hook, title: draft.title, author: draft.author }),
    u("book",    { title: draft.title, author: draft.author, coverUrl: draft.cover_url, selectionReason: draft.selection_reason }),
    u("target",  { title: c.targetReader.title, items: c.targetReader.items }),
    ...c.keyMessages.map((msg, i) =>
      u("key", { point: i + 1, title: msg.title, description: msg.description, dark: i % 2 === 0 })
    ),
    u("closing", { oneLiner: c.closing.oneLiner, readingTime: c.closing.readingTime, title: draft.title }),
  ];
}

async function igPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.instagram.com/v21.0${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: IG_TOKEN }),
  });
  return res.json() as Promise<{ id?: string; error?: { message: string; code: number } }>;
}

async function pollCarouselStatus(containerId: string, maxAttempts = 20, intervalMs = 3000): Promise<{ ok: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${containerId}?fields=status_code,status&access_token=${IG_TOKEN}`
    );
    const data = await res.json() as { status_code?: string; status?: string; error?: { message: string } };
    console.log(`[instagram] 컨테이너 상태 (${i + 1}/${maxAttempts}):`, data.status_code, data.status);
    if (data.error) return { ok: false, error: data.error.message };
    if (data.status_code === "FINISHED") return { ok: true };
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      return { ok: false, error: `컨테이너 처리 실패: ${data.status_code} (${data.status ?? ""})` };
    }
  }
  return { ok: false, error: "컨테이너 처리 시간 초과 (60초)" };
}

export async function publishToInstagram(draftId: string): Promise<{ ok: boolean; error?: string; igMediaId?: string }> {
  if (!IG_USER_ID || !IG_TOKEN || !BASE_URL) {
    return { ok: false, error: "Instagram 환경변수가 설정되지 않았습니다." };
  }

  const db = supabaseAdmin();
  const { data: draft, error: fetchError } = await db
    .from("drafts").select("*").eq("id", draftId).single();

  if (fetchError || !draft) return { ok: false, error: "초안을 찾을 수 없습니다" };
  if (!draft.content) return { ok: false, error: "슬라이드 데이터가 없습니다" };

  const caption = [draft.caption, "📖 프로필 링크에서 책 정보 확인하기", draft.hashtags?.join(" ")].filter(Boolean).join("\n\n");
  const urls = slideUrls(draft, draft.content as CardContentSchema);

  // 1. 슬라이드 업로드
  const itemResults = await Promise.all(
    urls.map((image_url) => igPost(`/${IG_USER_ID}/media`, { image_url, is_carousel_item: true }))
  );
  const failed = itemResults.find((r) => r.error);
  if (failed?.error) return { ok: false, error: `슬라이드 업로드 실패: ${failed.error.message}` };

  // 2. 캐러셀 생성
  const carousel = await igPost(`/${IG_USER_ID}/media`, {
    media_type: "CAROUSEL",
    children: itemResults.map((r) => r.id),
    caption,
  });
  if (carousel.error) return { ok: false, error: `캐러셀 생성 실패: ${carousel.error.message}` };

  // 3. 처리 완료 대기 (Media ID is not available 방지)
  const pollResult = await pollCarouselStatus(carousel.id!);
  if (!pollResult.ok) return { ok: false, error: pollResult.error };

  // 4. 게시
  const published = await igPost(`/${IG_USER_ID}/media_publish`, { creation_id: carousel.id });
  if (published.error) return { ok: false, error: `게시 실패: ${published.error.message}` };

  // 5. DB 업데이트
  const { error: updateError } = await db.from("drafts").update({
    status: "published",
    instagram_post_id: published.id,
    published_at: new Date().toISOString(),
  }).eq("id", draftId);

  if (updateError) {
    console.error("[instagram] DB 업데이트 실패 (Instagram에는 게시됨):", updateError.message);
  }

  return { ok: true, igMediaId: published.id };
}
