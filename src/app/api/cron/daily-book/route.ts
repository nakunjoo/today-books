import { NextResponse } from "next/server";
import { createDraft } from "@/lib/books/draft";

// Vercel Cron: 매일 오전 6시 (KST = UTC 21시 전날)
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { draft, book } = await createDraft();
    return NextResponse.json({ ok: true, draftId: draft.id, book: book.title, status: draft.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/daily-book] 실패:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
