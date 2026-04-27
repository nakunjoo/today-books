import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { CardContentSchema } from "@/lib/ai/schema";

const IG_USER_ID = process.env.INSTAGRAM_USER_ID!;
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN!;
const BASE_URL   = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

function slideUrls(draft: Record<string, unknown>, c: CardContentSchema): string[] {
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

async function ig(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.instagram.com/v21.0${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: IG_TOKEN }),
  });
  return res.json() as Promise<{ id?: string; error?: { message: string; code: number } }>;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!IG_USER_ID || !IG_TOKEN || !BASE_URL) {
    return NextResponse.json({ ok: false, error: "Instagram 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: draft, error: fetchError } = await db
    .from("drafts").select("*").eq("id", id).single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }
  if (!draft.content) {
    return NextResponse.json({ ok: false, error: "슬라이드 데이터가 없습니다" }, { status: 400 });
  }

  const caption = [draft.caption, "📖 프로필 링크에서 책 정보 확인하기", draft.hashtags?.join(" ")].filter(Boolean).join("\n\n");
  const urls = slideUrls(draft, draft.content as CardContentSchema);

  try {
    // 1. 슬라이드 각각 업로드 (carousel item)
    const itemResults = await Promise.all(
      urls.map((image_url) => ig(`/${IG_USER_ID}/media`, { image_url, is_carousel_item: true }))
    );
    console.log("[publish] 1. item results:", JSON.stringify(itemResults));

    const failed = itemResults.find((r) => r.error);
    if (failed?.error) {
      return NextResponse.json({ ok: false, error: `슬라이드 업로드 실패: ${failed.error.message}` }, { status: 500 });
    }

    // 2. 캐러셀 컨테이너 생성
    const carousel = await ig(`/${IG_USER_ID}/media`, {
      media_type: "CAROUSEL",
      children: itemResults.map((r) => r.id),
      caption,
    });
    console.log("[publish] 2. carousel:", JSON.stringify(carousel));

    if (carousel.error) {
      return NextResponse.json({ ok: false, error: `캐러셀 생성 실패: ${carousel.error.message}` }, { status: 500 });
    }

    // 3. 게시
    const published = await ig(`/${IG_USER_ID}/media_publish`, { creation_id: carousel.id });
    console.log("[publish] 3. published:", JSON.stringify(published));

    if (published.error) {
      return NextResponse.json({ ok: false, error: `게시 실패: ${published.error.message}` }, { status: 500 });
    }

    // 4. DB 업데이트
    await db.from("drafts").update({
      status: "published",
      instagram_post_id: published.id,
      published_at: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ ok: true, igMediaId: published.id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
