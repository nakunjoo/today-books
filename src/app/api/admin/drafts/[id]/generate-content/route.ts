import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent } from "@/lib/ai/generate-card";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { description, toc } = await req.json();

  if (!description?.trim()) {
    return NextResponse.json({ ok: false, error: "소개글을 입력해주세요" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: draft, error: fetchError } = await db
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    const content = await generateCardContent(
      {
        title: draft.title,
        author: draft.author ?? "",
        publisher: draft.publisher ?? undefined,
        description,
        toc: toc ?? undefined,
      },
      { theme: draft.theme ?? undefined, selectionReason: draft.selection_reason ?? undefined },
    );

    const { error } = await db
      .from("drafts")
      .update({
        status: "pending_review",
        description,
        toc: toc ?? null,
        content,
        caption: content.caption,
        hashtags: content.hashtags,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
