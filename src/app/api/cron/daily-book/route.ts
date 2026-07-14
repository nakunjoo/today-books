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
  const db = supabaseAdmin();

  try {
    // 0. 이미 승인됐지만 게시되지 않은 초안이 있으면(과거 게시 실패로 남은 것 포함) 오래된 순으로 우선 게시
    const { data: backlog } = await db
      .from("drafts")
      .select("id, title")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (backlog) {
      const result = await publishToInstagram(backlog.id);

      if (!result.ok) {
        await sendTelegram(`❌ Instagram 게시 실패 (대기 중이던 초안)\n\n제목: ${backlog.title}\n오류: ${result.error}\n\n${managerUrl}`);
        return NextResponse.json({ ok: false, error: result.error });
      }

      await sendTelegram(`✅ 대기 중이던 책 게시 완료\n\n제목: ${backlog.title}\n\n${managerUrl}`);
      return NextResponse.json({ ok: true, draftId: backlog.id, book: backlog.title });
    }

    // 1. 책 선정 + 초안 생성
    const { draft, book } = await createDraft();

    // 2. 슬라이드 콘텐츠 생성
    const content = await generateCardContent(
      { title: book.title!, author: book.author ?? "", publisher: book.publisher ?? undefined, description: book.description },
      { theme: draft.theme ?? undefined, selectionReason: draft.selection_reason ?? undefined },
    );

    // 3. DB 저장 + approved로 상태 변경
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
