import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { uploadDraftSlides } from "@/lib/gcs/upload";
import type { CardContentSchema } from "@/lib/ai/schema";

function buildSlideUrls(baseUrl: string, draftId: string, content: CardContentSchema, title: string | null, author: string | null, coverUrl: string | null, theme: string | null, selectionReason: string | null): string[] {
  const enc = (d: Record<string, unknown>) => encodeURIComponent(JSON.stringify(d));

  const urls = [
    `${baseUrl}/api/card/cover?data=${enc({ hook: content.cover.hook, theme: content.cover.theme, title, author })}`,
    `${baseUrl}/api/card/book?data=${enc({ title, author, coverUrl, selectionReason })}`,
    `${baseUrl}/api/card/target?data=${enc({ title: content.targetReader.title, items: content.targetReader.items })}`,
    ...content.keyMessages.map((msg, i) =>
      `${baseUrl}/api/card/key?data=${enc({ point: i + 1, title: msg.title, description: msg.description, dark: i % 2 === 0 })}`
    ),
    `${baseUrl}/api/card/quote?data=${enc({ text: content.quote.text, context: content.quote.context })}`,
    `${baseUrl}/api/card/closing?data=${enc({ oneLiner: content.closing.oneLiner, readingTime: content.closing.readingTime, title })}`,
  ];

  return urls;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  // 드래프트 조회
  const { data: draft, error: fetchError } = await db
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    // 슬라이드 이미지 생성 & GCS 업로드
    const baseUrl = new URL(req.url).origin;
    const slideUrls = buildSlideUrls(
      baseUrl, id,
      draft.content as CardContentSchema,
      draft.title, draft.author, draft.cover_url,
      draft.theme, draft.selection_reason,
    );

    const imageUrls = await uploadDraftSlides(id, slideUrls, baseUrl);

    // 상태 업데이트
    const { error } = await db
      .from("drafts")
      .update({ status: "approved", image_urls: imageUrls })
      .eq("id", id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, imageUrls });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
