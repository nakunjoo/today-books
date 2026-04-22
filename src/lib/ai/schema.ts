import { z } from "zod";

export const cardContentSchema = z.object({
  cover: z.object({
    hook: z.string().describe("강렬한 한 문장 (30자 내외)"),
    theme: z.string().describe("오늘의 요일 테마"),
  }),
  targetReader: z.object({
    title: z.string().describe("섹션 제목 (예: '이런 분께 추천해요')"),
    items: z.array(z.string()).describe("구체적 상황/독자 2~3가지"),
  }),
  keyMessages: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ).describe("책의 핵심 포인트 2~3가지"),
  closing: z.object({
    oneLiner: z.string().describe("한 줄 총평"),
    readingTime: z.string().describe("예상 독서 시간"),
  }),
  caption: z.string().describe("인스타 캡션 (400자 이내, 감성적이고 구체적)"),
  hashtags: z.array(z.string()).describe("해시태그 5~15개"),
});

export type CardContentSchema = z.infer<typeof cardContentSchema>;
