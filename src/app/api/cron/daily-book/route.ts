import { NextResponse } from "next/server";
import { createDraft } from "@/lib/books/draft";
import { generateCardContent } from "@/lib/ai/generate-card";
import { publishToInstagram } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendTelegram } from "@/lib/telegram";

// Vercel Cron: 매일 오후 6시 (KST = UTC 9시)
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const managerUrl = `${process.env.NEXTAUTH_URL}/manager`;

  try {
    // 1. 책 선정 + 초안 생성
    const { draft, book } = await createDraft();

    // 2. 슬라이드 콘텐츠 생성
    const content = await generateCardContent(
      { title: book.title!, author: book.author ?? "", publisher: book.publisher ?? undefined, description: book.description },
      { theme: draft.theme ?? undefined, selectionReason: draft.selection_reason ?? undefined },
    );

    // 3. DB 저장 + approved로 상태 변경
    const db = supabaseAdmin();
    await db.from("drafts").update({
      status: "approved",
      description: book.description,
      content,
      caption: content.caption,
      hashtags: content.hashtags,
    }).eq("id", draft.id);

    // 4. Instagram 게시
    const result = await publishToInstagram(draft.id);

    if (!result.ok) {
      await sendTelegram(`❌ Instagram 게시 실패\n\n제목: ${book.title}\n오류: ${result.error}\n\n${managerUrl}`);
      return NextResponse.json({ ok: false, error: result.error });
    }

    await sendTelegram(`✅ 오늘의 책 자동 게시 완료\n\n제목: ${book.title}\n\n${managerUrl}`);
    return NextResponse.json({ ok: true, draftId: draft.id, book: book.title });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/daily-book] 실패:", message);
    await sendTelegram(`❌ 오늘의 책 초안 생성 실패\n\n${message}\n\n${managerUrl}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
