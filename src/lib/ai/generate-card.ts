import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";

const groq = createGroq();
import { cardContentSchema, type CardContentSchema } from "./schema";

const SAFETY_RULES = `
다음 규칙을 반드시 지켜줘:

1. 제공된 출판사 공식 소개문/목차에 있는 정보만 사용
2. 책에 없는 내용을 추측·생성하지 말 것 (할루시네이션 금지)
3. 책 본문 직접 인용 절대 금지
4. 책 전체 줄거리·결말·반전을 요약하거나 노출하지 말 것
5. 주제·분위기·대상 독자 위주로 소개 (구체적 스포일러 X)
6. 과장 표현 피하기: "반드시", "최고", "유일한" 금지
7. 부정적·비방성 평가 금지
`.trim();

const WEEKDAY_THEMES: Record<number, string> = {
  1: "월요병을 날려줄 에너지 있는 책",
  2: "퇴근 후 30분 읽기 좋은 가벼운 책",
  3: "불면증에 도움되는 차분한 책",
  4: "주말을 기대하게 만드는 책",
  5: "주말에 몰입할 수 있는 두꺼운 책",
  6: "마음을 다독여주는 책",
  0: "다음 주를 준비하는 책",
};

export function themeForDate(d: Date = new Date()): string {
  return WEEKDAY_THEMES[d.getDay()];
}

export type BookInput = {
  title: string;
  author: string;
  publisher?: string;
  description: string;
  toc?: string;
};

export async function generateCardContent(
  book: BookInput,
  opts: { theme?: string; selectionReason?: string } = {},
): Promise<CardContentSchema> {
  const theme = opts.theme ?? themeForDate();

  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: cardContentSchema,
    prompt: `
${SAFETY_RULES}

[오늘의 테마]
${theme}

[선정 이유]
${opts.selectionReason ?? "(생략)"}

[책 정보]
- 제목: ${book.title}
- 저자: ${book.author}
- 출판사: ${book.publisher ?? "(미상)"}

[출판사 공식 소개]
${book.description}

[목차]
${book.toc ?? "(미제공)"}

위 정보만으로 인스타그램 캐러셀 카드 콘텐츠를 만들어줘.
톤: 부드럽지만 정확하게, 과장 없이 구체적으로.
한국어로 작성. 해시태그는 #책추천 #${WEEKDAY_THEMES_EN_LABEL[new Date().getDay()]}의책 같은 한국어 중심.
`.trim(),
  });

  return object;
}

const WEEKDAY_THEMES_EN_LABEL: Record<number, string> = {
  0: "일요일",
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
  6: "토요일",
};
