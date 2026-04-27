import { NextResponse } from "next/server";
import { createDraft } from "@/lib/books/draft";

// Vercel Cron: 매일 오후 6시 (KST = UTC 9시)
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { draft, book } = await createDraft();
    const managerUrl = `${process.env.NEXTAUTH_URL}/manager`;
    await sendTelegram(`📚 오늘의 책 초안 생성됨\n\n제목: ${book.title}\n상태: 슬라이드 생성 대기\n\n${managerUrl}`);
    return NextResponse.json({ ok: true, draftId: draft.id, book: book.title, status: draft.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/daily-book] 실패:", message);
    await sendTelegram(`❌ 오늘의 책 초안 생성 실패\n\n${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => null);
}
