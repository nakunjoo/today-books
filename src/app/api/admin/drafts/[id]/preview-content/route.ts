import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateCardContent } from "@/lib/ai/generate-card";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq();

type ImageInput = { base64: string; mimeType: string };

async function extractFromImages(images: ImageInput[]): Promise<string> {
  const { text } = await generateText({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    messages: [{
      role: "user",
      content: [
        ...images.map(({ base64, mimeType }) => ({
          type: "image" as const,
          image: new URL(`data:${mimeType};base64,${base64}`),
        })),
        {
          type: "text",
          text: `위 스크린샷${images.length > 1 ? ` ${images.length}장` : ""}은 알라딘 책 상세페이지야.
책 소개글과 목차 텍스트만 추출해줘.
책 제목, 저자명, 가격, 별점, 버튼, 메뉴, 광고, UI 요소 제외.
여러 장 중복 문장은 한 번만, 이어지는 내용은 자연스럽게 합쳐서 출력.
소개글이 전혀 없으면 "소개글 없음"이라고만 출력.`,
        },
      ],
    }],
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
    .from("drafts").select("*").eq("id", id).single();

  if (fetchError || !draft) {
    return NextResponse.json({ ok: false, error: "초안을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    let description: string;

    if (body.useExisting) {
      if (!draft.description?.trim()) {
        return NextResponse.json({ ok: false, error: "저장된 소개글이 없습니다." }, { status: 400 });
      }
      description = draft.description;
    } else if (Array.isArray(body.images) && body.images.length > 0) {
      description = await extractFromImages(body.images);
      if (!description || description.includes("소개글 없음")) {
        return NextResponse.json({ ok: false, error: "이미지에서 소개글을 읽지 못했습니다." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ ok: false, error: "소개글 또는 이미지를 입력해주세요" }, { status: 400 });
    }

    const content = await generateCardContent(
      { title: draft.title, author: draft.author ?? "", publisher: draft.publisher ?? undefined, description },
      { theme: draft.theme ?? undefined, selectionReason: draft.selection_reason ?? undefined },
    );

    // DB 저장 없이 content만 반환
    return NextResponse.json({ ok: true, content, description });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
