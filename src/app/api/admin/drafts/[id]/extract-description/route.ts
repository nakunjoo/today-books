import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq();

type ImageInput = { base64: string; mimeType: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // id 사용 안 하지만 Next.js 요구사항

  const { images } = await req.json() as { images: ImageInput[] };
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ ok: false, error: "이미지를 첨부해주세요" }, { status: 400 });
  }

  try {
    const imageContent = images.map(({ base64, mimeType }) => ({
      type: "image" as const,
      image: new URL(`data:${mimeType};base64,${base64}`),
    }));

    const { text } = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      messages: [{
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `위 스크린샷${images.length > 1 ? ` ${images.length}장` : ""}은 알라딘 책 상세페이지야.
책 내용을 소개하는 글과 목차 텍스트만 추출해줘.

규칙:
- 책 제목, 저자명, 가격, 별점, 버튼, 메뉴, 광고, UI 요소 제외
- 여러 장에서 중복되는 문장은 한 번만 포함
- 내용이 이어지는 경우 자연스럽게 합쳐서 하나의 텍스트로 출력
- 소개글이 전혀 없으면 "소개글 없음"이라고만 출력`,
          },
        ],
      }],
    });

    return NextResponse.json({ ok: true, description: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
