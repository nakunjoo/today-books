import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;

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
    .select("instagram_post_id")
    .eq("id", id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }

  // Instagram 게시물 삭제
  if (draft.instagram_post_id && IG_TOKEN) {
    const igRes = await fetch(
      `https://graph.instagram.com/v21.0/${draft.instagram_post_id}?access_token=${IG_TOKEN}`,
      { method: "DELETE" }
    );
    const igData = await igRes.json();
    console.log("[delete] Instagram 삭제 결과:", JSON.stringify(igData));
    // Instagram 삭제 실패해도 DB는 삭제 진행
  }

  const { error } = await db
    .from("drafts")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
