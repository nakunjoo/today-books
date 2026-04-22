import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent } from "@/lib/ai/generate-card";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq();

async function extractDescriptionFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const { text } = await generateText({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new URL(`data:${mimeType};base64,${imageBase64}`),
          },
          {
            type: "text",
            text: `이 알라딘 책 상세페이지 스크린샷에서 책 소개글과 목차 텍스트만 추출해줘.
책 제목, 저자명, 가격, 별점, 버튼, 메뉴, 광고, UI 요소는 전부 제외하고
책 내용을 설명하는 소개글과 목차만 원문 그대로 텍스트로 출력해줘.
없으면 "소개글 없음"이라고만 출력해.`,
          },
        ],
      },
    ],
  });
  return text;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

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
    let description: string;

    if (body.imageBase64) {
      // 이미지에서 소개글 추출
      description = await extractDescriptionFromImage(body.imageBase64, body.mimeType ?? "image/jpeg");
      if (!description || description.includes("소개글 없음")) {
        return NextResponse.json({ ok: false, error: "이미지에서 소개글을 읽지 못했습니다. 책 소개 부분이 잘 보이는 스크린샷을 첨부해주세요." }, { status: 400 });
      }
    } else if (body.description?.trim()) {
      // 텍스트 직접 입력 (fallback)
      description = body.description;
    } else {
      return NextResponse.json({ ok: false, error: "이미지 또는 소개글을 입력해주세요" }, { status: 400 });
    }

    const content = await generateCardContent(
      {
        title: draft.title,
        author: draft.author ?? "",
        publisher: draft.publisher ?? undefined,
        description,
        toc: body.toc ?? undefined,
      },
      { theme: draft.theme ?? undefined, selectionReason: draft.selection_reason ?? undefined },
    );

    const { error } = await db
      .from("drafts")
      .update({
        status: "pending_review",
        description,
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
