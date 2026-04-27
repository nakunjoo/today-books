import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDraft } from "@/lib/books/draft";
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { draft, book } = await createDraft();
    return NextResponse.json({ ok: true, draftId: draft.id, book: book.title });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
