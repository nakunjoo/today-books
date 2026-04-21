import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent, themeForDate } from "@/lib/ai/generate-card";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: draft, error: fetchError } = await db
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }

  if (!draft.title) {
    return NextResponse.json({ ok: false, error: "책 정보 없음" }, { status: 400 });
  }

  const theme = draft.theme ?? themeForDate();
  const content = await generateCardContent(
    { title: draft.title, author: draft.author ?? "", description: draft.description ?? "", toc: draft.toc },
    { theme, selectionReason: draft.selection_reason ?? undefined },
  );

  const { error: updateError } = await db
    .from("drafts")
    .update({ content, caption: content.caption, hashtags: content.hashtags, status: "pending_review" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
