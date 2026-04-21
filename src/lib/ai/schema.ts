import { z } from "zod";

// 인스타 카드 7장 구성 (가이드 6장 참고)
export const cardContentSchema = z.object({
  cover: z.object({
    hook: z.string().max(40).describe("강렬한 한 문장 (30자 내외)"),
    theme: z.string().describe("오늘의 요일 테마"),
  }),
  targetReader: z.object({
    title: z.string().describe("섹션 제목 (예: '이런 분께 추천해요')"),
    items: z
      .array(z.string())
      .min(2)
      .max(4)
      .describe("구체적 상황/독자 3가지"),
  }),
  keyMessages: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(2)
    .max(4)
    .describe("책의 핵심 포인트 3가지"),
  quote: z.object({
    text: z
      .string()
      .max(100)
      .describe("출판사 소개에 공개된 짧은 구절 (없으면 핵심 메시지)"),
    context: z.string().max(40).describe("어떤 맥락의 문장인지"),
  }),
  closing: z.object({
    oneLiner: z.string().describe("한 줄 총평"),
    readingTime: z.string().describe("예상 독서 시간"),
  }),
  caption: z.string().max(400).describe("인스타 캡션. 감성적이고 구체적"),
  hashtags: z.array(z.string()).min(5).max(20),
});

export type CardContentSchema = z.infer<typeof cardContentSchema>;
