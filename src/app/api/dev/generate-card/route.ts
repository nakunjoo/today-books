import { NextResponse } from "next/server";
import { generateCardContent, themeForDate } from "@/lib/ai/generate-card";

// 개발용 테스트 엔드포인트 — 알라딘 키 없이 Gemini만 점검
// 사용: GET /api/dev/generate-card
export async function GET() {
  const mockBook = {
    title: "달리기를 말할 때 내가 하고 싶은 이야기",
    author: "무라카미 하루키",
    publisher: "문학사상",
    description:
      "소설가 무라카미 하루키가 30년 가까이 달리기를 이어오며 길 위에서 마주한 사유를 담은 에세이. " +
      "달리기라는 행위를 통해 글을 쓰는 일, 나이 들어가는 일, 자신을 관리하는 일에 대한 태도를 " +
      "담담하게 풀어낸다. 일상의 성실함이 어떻게 창작의 토대가 되는지, 하나의 리듬을 꾸준히 " +
      "지켜가는 사람의 내면을 엿볼 수 있는 기록.",
    toc:
      "1. 누가 공복을 비웃는가\n" +
      "2. 사람은 어떻게 해서 러너가 되는가\n" +
      "3. 여름의 더위, 겨울의 추위\n" +
      "4. 나는 이런 식으로 마라톤을 뛰어왔다",
  };

  try {
    const content = await generateCardContent(mockBook, {
      theme: themeForDate(),
      selectionReason:
        "한 주의 시작, 매일의 성실함이라는 주제로 부드럽게 출발하기 좋은 에세이",
    });

    return NextResponse.json({ ok: true, theme: themeForDate(), content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
