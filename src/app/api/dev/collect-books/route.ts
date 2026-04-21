import { NextResponse } from "next/server";
import { collectBooks } from "@/lib/books/collect";

// 개발용 — GET /api/dev/collect-books?max=10
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const max = parseInt(searchParams.get("max") ?? "10", 10);

  try {
    const result = await collectBooks({ max });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
